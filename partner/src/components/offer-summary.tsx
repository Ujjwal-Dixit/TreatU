import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

import { AppText, Card, IconTile } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { formatRupeesFromPaise } from '@/lib/format';
import type { OwnerOfferDto } from '@/api/types';

interface SummaryRow {
  icon: ComponentProps<typeof Ionicons>['name'];
  glyph?: string;
  value: string;
  label: string;
}

function rowsFor(offer: OwnerOfferDto): SummaryRow[] {
  return [
    { icon: 'pricetag-outline', value: `${offer.discountPercentage}% OFF`, label: 'Discount' },
    { icon: 'time-outline', value: offer.timeLabel, label: 'Time' },
    {
      icon: 'cash-outline',
      glyph: '₹',
      value: offer.minSpendPaise ? `Min. bill ${formatRupeesFromPaise(offer.minSpendPaise)}` : 'No minimum bill',
      label: 'Minimum Bill',
    },
    { icon: 'people-outline', value: `${offer.capacityPerDay} seats`, label: 'Seats per Day' },
    { icon: 'calendar-outline', value: offer.availabilityLabel, label: 'Availability' },
    { icon: 'document-text-outline', value: offer.description || 'No description', label: 'Description' },
  ];
}

/** "Offer Summary" card from the Offer Created mock. */
export function OfferSummary({ offer, title = 'Offer Summary' }: { offer: OwnerOfferDto; title?: string }) {
  const rows = rowsFor(offer);
  return (
    <Card style={styles.card}>
      <AppText variant="heading" style={styles.title}>
        {title}
      </AppText>
      {rows.map((row, index) => (
        <View key={row.label} style={[styles.row, index < rows.length - 1 && styles.rowDivider]}>
          <IconTile icon={row.icon} glyph={row.glyph} size={52} iconSize={26} />
          <View style={styles.rowText}>
            <AppText variant="heading">{row.value}</AppText>
            <AppText variant="small" color={Colors.textSecondary}>
              {row.label}
            </AppText>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: Spacing.two },
  title: { paddingTop: Spacing.three, paddingBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.five, paddingVertical: Spacing.three },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  rowText: { flex: 1, gap: Spacing.half },
});
