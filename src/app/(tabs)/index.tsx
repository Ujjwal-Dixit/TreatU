import { useCallback, useEffect, useRef } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BrandLogo } from '@/components/brand-logo';
import { CategoryChipRow } from '@/components/category-chip-row';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { OutOfAreaBanner } from '@/components/out-of-area-banner';
import { RestaurantCard } from '@/components/restaurant-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { LAUNCH_CITY_NAME } from '@/config/launch-city';
import { useHomeFeed } from '@/hooks/use-home-feed';
import { useToggleFavorite } from '@/hooks/use-favorites';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';
import type { RestaurantCardDto } from '@/api/types';

const CARD_WIDTH = 200;

export default function HomeScreen() {
  const theme = useTheme();
  const { data, isPending, isError, refetch, isRefetching } = useHomeFeed();
  const toggleFavorite = useToggleFavorite();
  const { status: locationStatus, detectedCity, requestLocation } = useUserLocation();

  // Ask once per app session, like most discovery apps do — see
  // use-user-location.ts for why every outcome (denied/unavailable/out of
  // area) still lets the person keep browsing.
  const hasRequestedLocation = useRef(false);
  useEffect(() => {
    if (hasRequestedLocation.current) return;
    hasRequestedLocation.current = true;
    void requestLocation();
  }, [requestLocation]);

  const handleToggleFavorite = useCallback(
    (restaurant: RestaurantCardDto) => {
      toggleFavorite.mutate({ restaurantId: restaurant.id, isFavorited: restaurant.isFavorited });
    },
    [toggleFavorite],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BrandLogo size={32} showWordmark={false} />
            <Pressable
              style={styles.regionPicker}
              onPress={() => Alert.alert('Single city for now', 'More cities are coming soon.')}>
              <ThemedText style={styles.regionText}>{LAUNCH_CITY_NAME}</ThemedText>
              <Ionicons name="chevron-down" size={18} color={theme.text} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/explore')}
            hitSlop={8}
            accessibilityLabel="Search restaurants">
            <Ionicons name="search" size={22} color={theme.text} />
          </Pressable>
        </View>

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Couldn't load restaurants near you." onRetry={() => void refetch()} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}>
            {locationStatus === 'out-of-city' && <OutOfAreaBanner detectedCity={detectedCity} />}

            <CategoryChipRow
              categories={data.categories}
              onSelect={(key) => router.push(key ? `/(tabs)/explore?category=${key}` : '/(tabs)/explore')}
            />

            {data.sections.every((section) => section.restaurants.length === 0) ? (
              <EmptyState
                title="No offers here yet"
                message="We're still onboarding restaurants in your area — check back soon."
              />
            ) : (
              data.sections.map(
                (section) =>
                  section.restaurants.length > 0 && (
                    <View key={section.key} style={styles.section}>
                      <ThemedText type="subtitle" style={styles.sectionTitle}>
                        {section.title}
                      </ThemedText>
                      <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={section.restaurants}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.sectionList}
                        renderItem={({ item }) => (
                          <RestaurantCard
                            restaurant={item}
                            width={CARD_WIDTH}
                            onPress={() => router.push(`/restaurant/${item.id}`)}
                            onToggleFavorite={() => handleToggleFavorite(item)}
                          />
                        )}
                      />
                    </View>
                  ),
              )
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  regionPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  regionText: {
    fontSize: 22,
    fontWeight: '700',
  },
  scrollContent: {
    gap: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.four + (Platform.OS === 'web' ? Spacing.six : 0),
  },
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    paddingHorizontal: Spacing.four,
  },
  sectionList: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
});
