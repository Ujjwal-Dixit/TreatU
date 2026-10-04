import { useCallback } from 'react';
import { FlatList, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AuthRequiredState } from '@/components/auth-required-state';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { RestaurantCard } from '@/components/restaurant-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-context';
import { useFavorites, useToggleFavorite } from '@/hooks/use-favorites';
import type { RestaurantCardDto } from '@/api/types';

export default function FavouritesScreen() {
  const { isAuthenticated, isHydrated } = useAuth();
  const { data, isPending, isError, refetch } = useFavorites();
  const toggleFavorite = useToggleFavorite();

  const handleToggleFavorite = useCallback(
    (restaurant: RestaurantCardDto) => {
      toggleFavorite.mutate({ restaurantId: restaurant.id, isFavorited: restaurant.isFavorited });
    },
    [toggleFavorite],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          Favourites
        </ThemedText>

        {!isHydrated ? (
          <LoadingState />
        ) : !isAuthenticated ? (
          <AuthRequiredState title="Save your favourites" message="Log in to save restaurants you want to try." />
        ) : isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Couldn't load your favourites." onRetry={() => void refetch()} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState title="No favourites yet" message="Tap the heart on a restaurant to save it here." />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
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
  title: { fontSize: 28, lineHeight: 34, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  list: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four + (Platform.OS === 'web' ? Spacing.six : 0),
  },
});
