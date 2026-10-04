import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ClaimDto } from '@/api/types';

const STATUS_LABEL: Record<ClaimDto['status'], string> = {
  claimed: 'Active',
  redeemed: 'Redeemed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

interface ClaimRowProps {
  claim: ClaimDto;
}

export function ClaimRow({ claim }: ClaimRowProps) {
  const theme = useTheme();
  const isActive = claim.status === 'claimed';

  return (
    <Pressable
      onPress={() => router.push(`/claim/${claim.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Image source={{ uri: claim.restaurant.coverImageUrl }} style={styles.image} contentFit="cover" />
      <View style={styles.info}>
        <ThemedText numberOfLines={1}>{claim.restaurant.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {claim.discountPercentage}% off
        </ThemedText>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: isActive ? theme.accent : theme.backgroundElement }]}>
        <ThemedText type="small" style={isActive ? { color: theme.accentText } : undefined}>
          {STATUS_LABEL[claim.status]}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pressed: { opacity: 0.8 },
  image: {
    width: 56,
    height: 56,
    borderRadius: Spacing.two,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
});
