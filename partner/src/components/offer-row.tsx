import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText, IconTile, StatusPill } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatRupeesFromPaise } from '@/lib/format';
import type { OwnerOfferDto } from '@/api/types';

/** The offer card from the Home mock's "Active Offers" list:
 * tag tile · discount / time / min bill · status pill + today's claims · chevron. */
export function OfferRow({ offer, onPress }: { offer: OwnerOfferDto; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      <IconTile icon="pricetag-outline" size={60} iconSize={30} />

      <View style={styles.info}>
        <AppText variant="heading" style={styles.discount}>
          {offer.discountPercentage}% OFF
        </AppText>
        <AppText variant="body">{offer.timeLabel}</AppText>
        <AppText variant="small" color={Colors.textSecondary}>
          {offer.minSpendPaise ? `Min. bill ${formatRupeesFromPaise(offer.minSpendPaise)}` : 'No minimum bill'}
        </AppText>
      </View>

      <View style={styles.status}>
        <StatusPill status={offer.displayStatus} />
        {offer.today ? (
          <View style={styles.claims}>
            <AppText variant="smallStrong" color={Colors.primaryText}>
              {offer.today.claimed} / {offer.today.total}
            </AppText>
            <AppText variant="small" color={Colors.textSecondary}>
              Claimed
            </AppText>
          </View>
        ) : (
          <AppText variant="small" color={Colors.textSecondary} style={styles.claims}>
            {offer.availabilityLabel}
          </AppText>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color={Colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    backgroundColor: Colors.background,
  },
  pressed: { backgroundColor: Colors.surfaceMuted },
  info: { flex: 1, gap: Spacing.half },
  discount: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  status: { alignItems: 'center', gap: Spacing.two, minWidth: 80 },
  claims: { alignItems: 'center', textAlign: 'center' },
});
