import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { AppText, Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Colors, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useRedeemClaim, useTodayClaims } from '@/hooks/use-owner';
import { isApiError } from '@/api/api-error';
import { formatRupeesFromPaise } from '@/lib/format';
import type { ClaimStatus, OwnerClaimDto } from '@/api/types';

const STATUS_LABEL: Record<ClaimStatus, { label: string; color: string; bg: string }> = {
  claimed: { label: 'Booked', color: Colors.primaryText, bg: Colors.primaryTintStrong },
  redeemed: { label: 'Redeemed', color: Colors.textSecondary, bg: Colors.surfaceMuted },
  expired: { label: 'Expired', color: Colors.warning, bg: Colors.warningTint },
  cancelled: { label: 'Cancelled', color: Colors.textSecondary, bg: Colors.surfaceMuted },
};

/** Opened from Home's "Customers Today" card. Staff type the code the
 * customer shows them; the list below is today's bookings to reconcile
 * against walk-ins. */
export default function CustomersTodayScreen() {
  const { data, isPending, isError, refetch, isRefetching } = useTodayClaims();
  const redeem = useRedeemClaim();
  const [code, setCode] = useState('');
  const [billRupees, setBillRupees] = useState('');

  const handleRedeem = (): void => {
    const bill = Number.parseInt(billRupees, 10);
    redeem.mutate(
      { code: code.trim(), ...(bill > 0 ? { billAmountPaise: bill * 100 } : {}) },
      {
        onSuccess: (claim) => {
          setCode('');
          setBillRupees('');
          Alert.alert(
            'Redeemed ✓',
            claim.billAmountPaise !== null && claim.savedPaise !== null
              ? `${claim.discountPercentage}% off ${formatRupeesFromPaise(claim.billAmountPaise)} — customer pays ${formatRupeesFromPaise(claim.billAmountPaise - claim.savedPaise)}.`
              : `${claim.discountPercentage}% off${claim.minSpendPaise ? ` on a minimum bill of ${formatRupeesFromPaise(claim.minSpendPaise)}` : ''}.`,
          );
        },
        onError: (err) =>
          Alert.alert("Couldn't redeem", isApiError(err) ? err.message : 'Please check the code and try again.'),
      },
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Customers Today" fallbackHref="/" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <Card style={styles.redeemCard}>
                <AppText variant="heading">Redeem a code</AppText>
                <AppText variant="small" color={Colors.textSecondary}>
                  Enter the 6-character code from the customer&apos;s TreatU app.
                </AppText>
                <TextInput
                  value={code}
                  onChangeText={(text) => setCode(text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6))}
                  placeholder="e.g. K7M2QX"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={styles.codeInput}
                  maxLength={6}
                  returnKeyType="next"
                />
                <View style={styles.billRow}>
                  <AppText variant="body" color={Colors.textSecondary}>
                    ₹
                  </AppText>
                  <TextInput
                    value={billRupees}
                    onChangeText={(text) => setBillRupees(text.replace(/\D/g, '').slice(0, 7))}
                    placeholder="Bill amount (optional)"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.billInput}
                    onSubmitEditing={handleRedeem}
                  />
                </View>
                <AppText variant="caption" color={Colors.textSecondary}>
                  Adding the bill checks the minimum spend and shows the customer what they saved.
                </AppText>
                <Button label="Redeem" onPress={handleRedeem} disabled={code.length < 4} loading={redeem.isPending} />
              </Card>
              <AppText variant="heading">Today&apos;s bookings</AppText>
            </View>
          }
          ListEmptyComponent={
            isPending ? (
              <LoadingState />
            ) : isError ? (
              <ErrorState message="Couldn't load today's bookings." onRetry={() => void refetch()} />
            ) : (
              <EmptyState
                icon="people-outline"
                title="No bookings yet today"
                message="Claims from customers will show up here as they come in."
              />
            )
          }
          renderItem={({ item }) => <ClaimItem claim={item} />}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

function ClaimItem({ claim }: { claim: OwnerClaimDto }) {
  const status = STATUS_LABEL[claim.status];
  return (
    <View style={styles.claim}>
      <View style={styles.claimText}>
        <AppText variant="bodyStrong">
          {claim.customer?.name ?? 'Customer'}{' '}
          <AppText variant="small" color={Colors.textSecondary}>
            ••{claim.customer?.phoneLast4}
          </AppText>
        </AppText>
        <AppText variant="small" color={Colors.textSecondary}>
          {claim.discountPercentage}% off · claimed{' '}
          {new Date(claim.claimedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </AppText>
        {claim.billAmountPaise !== null && claim.savedPaise !== null && (
          <AppText variant="small" color={Colors.textSecondary}>
            Bill {formatRupeesFromPaise(claim.billAmountPaise)} · saved {formatRupeesFromPaise(claim.savedPaise)}
          </AppText>
        )}
        <AppText variant="smallStrong" style={styles.code}>
          {claim.redemptionCode}
        </AppText>
      </View>
      <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
        <AppText variant="smallStrong" color={status.color}>
          {status.label}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingBottom: Spacing.six, gap: Spacing.three, flexGrow: 1 },
  header: { gap: Spacing.five, marginBottom: Spacing.one },
  redeemCard: { gap: Spacing.three },
  codeInput: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.medium,
    minHeight: 56,
    paddingHorizontal: Spacing.four,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    color: Colors.text,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.medium,
    minHeight: 52,
    paddingHorizontal: Spacing.four,
  },
  billInput: { flex: 1, fontSize: 17, color: Colors.text },
  claim: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.medium,
    padding: Spacing.four,
  },
  claimText: { flex: 1, gap: Spacing.half },
  code: { letterSpacing: 2 },
  statusPill: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
});
