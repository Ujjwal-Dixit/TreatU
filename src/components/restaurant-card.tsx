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
          <OfferBadge
            discountPercentage={restaurant.bestActiveOffer.discountPercentage}
            conditionLabel={restaurant.bestActiveOffer.conditionLabel}
            size={width ? CAROUSEL_BADGE_SIZE : FULL_WIDTH_BADGE_SIZE}
            backgroundColor={theme.accent}
            textColor={theme.accentText}
          />
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

const CAROUSEL_BADGE_SIZE = 84;
const FULL_WIDTH_BADGE_SIZE = 96;
const BADGE_RING_INSET = 4;
/** Text sits in a box this fraction of the badge's width. Content spans
 * ~±24pt vertically; at that height the ring's chord is ~0.7 of the
 * diameter, so a box this wide never pokes past the curve top or bottom. */
const BADGE_TEXT_WIDTH_RATIO = 0.66;

interface OfferBadgeProps {
  discountPercentage: number;
  conditionLabel: string;
  size: number;
  backgroundColor: string;
  textColor: string;
}

/** Round "50% off / Arrive before 9:00 PM" sticker with an inner ring.
 * The condition copy is server-rendered and varies in length, so it wraps
 * to at most two lines and shrinks a little rather than overflow. */
function OfferBadge({ discountPercentage, conditionLabel, size, backgroundColor, textColor }: OfferBadgeProps) {
  const isLarge = size >= FULL_WIDTH_BADGE_SIZE;
  return (
    <View
      style={[styles.offerBadge, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}
      accessible
      accessibilityLabel={`${discountPercentage}% off, ${conditionLabel}`}>
      <View
        pointerEvents="none"
        style={[styles.offerBadgeRing, { borderRadius: (size - BADGE_RING_INSET * 2) / 2, borderColor: textColor }]}
      />
      <View style={[styles.offerBadgeContent, { width: size * BADGE_TEXT_WIDTH_RATIO }]}>
        <ThemedText
          style={[styles.offerBadgeDiscount, isLarge && styles.offerBadgeDiscountLarge, { color: textColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}>
          {discountPercentage}% off
        </ThemedText>
        <ThemedText
          style={[styles.offerBadgeCondition, isLarge && styles.offerBadgeConditionLarge, { color: textColor }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}>
          {conditionLabel}
        </ThemedText>
      </View>
    </View>
  );
}

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
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerBadgeRing: {
    position: 'absolute',
    top: BADGE_RING_INSET,
    left: BADGE_RING_INSET,
    right: BADGE_RING_INSET,
    bottom: BADGE_RING_INSET,
    borderWidth: 1.5,
    opacity: 0.9,
  },
  offerBadgeContent: { alignItems: 'center' },
  offerBadgeDiscount: { fontSize: 16, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  offerBadgeDiscountLarge: { fontSize: 19, lineHeight: 23 },
  offerBadgeCondition: { fontSize: 11, lineHeight: 13, fontWeight: '500', textAlign: 'center' },
  offerBadgeConditionLarge: { fontSize: 12.5, lineHeight: 15 },
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
