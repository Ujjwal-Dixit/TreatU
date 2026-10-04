import { memo } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDistanceKm, formatRating } from '@/lib/format';
import type { RestaurantCardDto } from '@/api/types';

interface RestaurantCardProps {
  restaurant: RestaurantCardDto;
  onPress: () => void;
  onToggleFavorite: () => void;
  /** Fixed width for horizontal carousels (Home sections). Omit for a
   * full-width card (Explore list, Favourites list). */
  width?: number;
}

export const RestaurantCard = memo(function RestaurantCard({
  restaurant,
  onPress,
  onToggleFavorite,
  width,
}: RestaurantCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, width ? { width } : styles.fullWidth, pressed && styles.pressed]}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: restaurant.coverImageUrl }} style={styles.image} contentFit="cover" transition={150} />
        {restaurant.bestActiveOffer && (
          <View style={[styles.offerBadge, { backgroundColor: theme.accent }]}>
            <ThemedText type="smallBold" style={[styles.offerBadgeText, { color: theme.accentText }]}>
              {restaurant.bestActiveOffer.discountPercentage}% off
            </ThemedText>
            <ThemedText type="small" style={[styles.offerBadgeText, { color: theme.accentText }]} numberOfLines={2}>
              {restaurant.bestActiveOffer.conditionLabel}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoText}>
          <ThemedText numberOfLines={1}>{restaurant.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {formatRating(restaurant.ratingAvg, restaurant.ratingCount)} · {formatDistanceKm(restaurant.distanceKm)} ·{' '}
            {restaurant.cuisines.join(', ')}
          </ThemedText>
        </View>
        <Pressable onPress={onToggleFavorite} hitSlop={8}>
          <Ionicons
            name={restaurant.isFavorited ? 'heart' : 'heart-outline'}
            size={20}
            color={restaurant.isFavorited ? theme.danger : theme.textSecondary}
          />
        </Pressable>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
  imageWrapper: {
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  offerBadge: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    borderRadius: 999,
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  offerBadgeText: {
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
});
