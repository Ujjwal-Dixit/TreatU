import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CategoryChipRow } from '@/components/category-chip-row';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { RestaurantCard } from '@/components/restaurant-card';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { CATEGORIES } from '@/config/categories';
import { useRestaurantSearch } from '@/hooks/use-restaurant-search';
import { useToggleFavorite } from '@/hooks/use-favorites';
import { useTheme } from '@/hooks/use-theme';
import type { RestaurantCardDto } from '@/api/types';

export default function ExploreScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState<string | undefined>(params.category);
  const [search, setSearch] = useState('');
  const toggleFavorite = useToggleFavorite();

  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useRestaurantSearch({
    category,
    search: search.trim() || undefined,
  });

  const restaurants = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  const handleToggleFavorite = useCallback(
    (restaurant: RestaurantCardDto) => {
      toggleFavorite.mutate({ restaurantId: restaurant.id, isFavorited: restaurant.isFavorited });
    },
    [toggleFavorite],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.searchRow}>
          <ThemedView type="backgroundElement" style={styles.searchBox}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search restaurants or cuisines"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
              returnKeyType="search"
            />
          </ThemedView>
        </View>

        <CategoryChipRow categories={CATEGORIES} selectedKey={category} onSelect={setCategory} />

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Couldn't load restaurants." onRetry={() => void refetch()} />
        ) : restaurants.length === 0 ? (
          <EmptyState title="No restaurants found" message="Try a different search or category." />
        ) : (
          <FlatList
            data={restaurants}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
            }}
            ListFooterComponent={isFetchingNextPage ? <LoadingState /> : null}
            renderItem={({ item }) => (
              <RestaurantCard
                restaurant={item}
                onPress={() => router.push(`/restaurant/${item.id}`)}
                onToggleFavorite={() => handleToggleFavorite(item)}
              />
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
  searchRow: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  list: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four + (Platform.OS === 'web' ? Spacing.six : 0),
  },
});
