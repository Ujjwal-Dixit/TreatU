import { useEffect, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCancelClaim, useClaim } from '@/hooks/use-claims';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isApiError } from '@/api/api-error';
import { formatCurrencyFromPaise, formatDistanceKm } from '@/lib/format';
import type { ClaimDto, ClaimStatus } from '@/api/types';

/** Dining Pass palette — the warm beige / deep green of the pass design,
 * with a dark-mode counterpart so the screen still follows the system. */
const PassColors = {
  light: {
    background: '#F4F1EA',
    card: '#FFFFFF',
    border: '#E6E1D6',
    green: '#1F5B3A',
    greenText: '#1F5B3A',
    onGreen: '#FFFFFF',
    onGreenMuted: '#CFE3D6',
    tint: '#E7F2EA',
    tintBorder: '#2E7D4F',
    text: '#141414',
    muted: '#6B6B6B',
    well: '#F1EEE6',
    danger: '#C0392B',
  },
  dark: {
    background: '#0E0F0E',
    card: '#1A1C1B',
    border: '#2C302D',
    green: '#2B6E48',
    greenText: '#7BCB97',
    onGreen: '#FFFFFF',
    onGreenMuted: '#CFE3D6',
    tint: '#16261C',
    tintBorder: '#2F7D52',
    text: '#F2F2F2',
    muted: '#A9ADB1',
    well: '#232624',
    danger: '#F0776E',
  },
} as const;

type Palette = (typeof PassColors)['light'] | (typeof PassColors)['dark'];
type IconName = ComponentProps<typeof Ionicons>['name'];

const HEADER_COPY: Record<ClaimStatus, { icon: IconName; title: string; subtitle: string }> = {
  claimed: { icon: 'checkmark', title: 'Your Dining Pass', subtitle: 'Show it to your waiter when the bill arrives' },
  redeemed: { icon: 'checkmark-done', title: 'Offer Redeemed', subtitle: 'Enjoy your meal! 🎉' },
  expired: { icon: 'time-outline', title: 'Pass Expired', subtitle: "This offer's window has ended" },
  cancelled: { icon: 'close', title: 'Booking Cancelled', subtitle: 'This pass is no longer valid' },
};

function usePassColors(): Palette {
  return useColorScheme() === 'dark' ? PassColors.dark : PassColors.light;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function DiningPassScreen() {
  const { id, activated } = useLocalSearchParams<{ id: string; activated?: string }>();
  const { data, isPending, isError, refetch } = useClaim(id);
  const colors = usePassColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/bookings'))}
          hitSlop={12}
          accessibilityLabel="Go back"
          style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>

        {isPending ? (
          <LoadingState />
        ) : isError || !data ? (
          <ErrorState message="Couldn't load this Dining Pass." onRetry={() => void refetch()} />
        ) : (
          <DiningPass claim={data} justActivated={activated === '1'} colors={colors} />
        )}
      </SafeAreaView>
    </View>
  );
}

function DiningPass({ claim, justActivated, colors }: { claim: ClaimDto; justActivated: boolean; colors: Palette }) {
  const cancelClaim = useCancelClaim();
  const queryClient = useQueryClient();
  const isActive = claim.status === 'claimed';
  const header =
    isActive && justActivated
      ? { icon: 'checkmark' as IconName, title: 'Offer Activated!', subtitle: 'Your Dining Pass is ready' }
      : claim.status === 'redeemed' && claim.savedPaise !== null
        ? { ...HEADER_COPY.redeemed, subtitle: `You saved ${formatCurrencyFromPaise(claim.savedPaise)} — enjoy your meal! 🎉` }
        : HEADER_COPY[claim.status];

  // Nothing pushes "your window ended" (the server expires claims lazily,
  // on read), so refetch right as it ends; the server then reports
  // `expired` and the pass stops showing as valid while still on screen.
  useEffect(() => {
    if (!isActive) return;
    const msUntilExpiry = new Date(claim.expiresAt).getTime() - Date.now();
    // setTimeout overflows past ~24.8 days; passes only last a day anyway.
    if (msUntilExpiry > 2 ** 31 - 1) return;
    const timer = setTimeout(
      () => void queryClient.invalidateQueries({ queryKey: ['claim', claim.id] }),
      Math.max(0, msUntilExpiry) + 1000,
    );
    return () => clearTimeout(timer);
  }, [isActive, claim.expiresAt, claim.id, queryClient]);
  const { restaurant } = claim;

  const openDirections = (): void => {
    const { latitude, longitude, name } = restaurant;
    const label = encodeURIComponent(name);
    const url = Platform.select({
      ios: `maps:?q=${label}&ll=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`),
    );
  };

  const confirmCancel = (): void => {
    Alert.alert('Cancel this booking?', 'You can claim this offer again later if seats are still available.', [
      { text: 'Keep booking', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: () =>
          cancelClaim.mutate(claim.id, {
            onError: (error) =>
              Alert.alert('Couldn’t cancel', isApiError(error) ? error.message : 'Please try again.'),
          }),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: isActive ? colors.green : colors.muted }]}>
            <Ionicons name={header.icon} size={26} color={colors.onGreen} />
          </View>
          <ThemedText style={[styles.headerTitle, { color: colors.text }]}>{header.title}</ThemedText>
          <ThemedText type="small" style={{ color: colors.muted }}>
            {header.subtitle}
          </ThemedText>
        </View>

        <View style={[styles.restaurantCard, { backgroundColor: colors.green }]}>
          <View style={styles.logo}>
            <Image source={{ uri: restaurant.coverImageUrl }} style={styles.logoImage} contentFit="cover" />
          </View>
          <View style={styles.flex}>
            <ThemedText style={[styles.restaurantName, { color: colors.onGreen }]} numberOfLines={1}>
              {restaurant.name}
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.onGreenMuted }} numberOfLines={1}>
              {restaurant.cuisines.join(', ')} · {formatDistanceKm(restaurant.distanceKm)} away
            </ThemedText>
          </View>
        </View>

        <View style={[styles.passCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.codeSection}>
            <ThemedText style={[styles.overline, { color: colors.muted }]}>DINING PASS</ThemedText>
            <ThemedText
              style={[styles.code, { color: isActive ? colors.text : colors.muted }, !isActive && styles.codeVoid]}
              selectable>
              {claim.redemptionCode}
            </ThemedText>
            <View style={[styles.validityPill, { backgroundColor: colors.tint }]}>
              <Ionicons name="calendar-outline" size={14} color={colors.greenText} />
              <ThemedText type="small" style={{ color: colors.greenText }}>
                {isActive
                  ? `Valid today until ${formatTime(claim.expiresAt)}`
                  : `${claim.discountPercentage}% off · ${claim.status}`}
              </ThemedText>
            </View>
          </View>

          {isActive && (
            <>
              <View style={[styles.dashedDivider, { borderColor: colors.border }]} />
              <View style={styles.instructionRow}>
                <View style={[styles.instructionIcon, { backgroundColor: colors.tint }]}>
                  <Ionicons name="restaurant-outline" size={20} color={colors.greenText} />
                </View>
                <ThemedText type="small" style={[styles.flex, { color: colors.text }]}>
                  Show this Dining Pass to your waiter{' '}
                  <ThemedText type="small" style={{ color: colors.muted }}>
                    when your bill arrives to claim your discount
                  </ThemedText>
                </ThemedText>
              </View>
              <View style={[styles.solidDivider, { backgroundColor: colors.border }]} />
              <SavingsCalculator claim={claim} colors={colors} />
            </>
          )}
        </View>

        {isActive && (
          <View style={[styles.note, { backgroundColor: colors.tint, borderColor: colors.tintBorder }]}>
            <Ionicons name="eye-outline" size={20} color={colors.greenText} />
            <ThemedText type="small" style={[styles.flex, { color: colors.greenText }]}>
              Show this screen to your waiter when your bill arrives. No need to say anything else.
            </ThemedText>
          </View>
        )}

        <PassButton icon="location-outline" label="Get directions" onPress={openDirections} colors={colors} />
        <PassButton
          icon="share-social-outline"
          label="Share with a friend"
          onPress={() =>
            void Share.share({
              message: `${restaurant.name} has ${claim.discountPercentage}% off on TreatU right now — check it out!`,
            })
          }
          colors={colors}
        />

        {isActive && (
          <Pressable onPress={confirmCancel} disabled={cancelClaim.isPending} style={styles.cancel}>
            {cancelClaim.isPending ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <ThemedText type="smallBold" style={{ color: colors.danger }}>
                Cancel booking
              </ThemedText>
            )}
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SavingsCalculator({ claim, colors }: { claim: ClaimDto; colors: Palette }) {
  const [billRupees, setBillRupees] = useState('');
  const billPaise = (Number.parseInt(billRupees, 10) || 0) * 100;
  const minSpend = claim.minSpendPaise ?? 0;
  const meetsMinimum = billPaise >= minSpend;
  const discountPaise = meetsMinimum ? Math.round((billPaise * claim.discountPercentage) / 100) : 0;

  return (
    <View style={styles.calculator}>
      <ThemedText style={[styles.overline, styles.overlineLeft, { color: colors.muted }]}>
        CALCULATE YOUR SAVINGS
      </ThemedText>
      <View style={[styles.well, { backgroundColor: colors.well }]}>
        <ThemedText style={[styles.rupee, { color: colors.text }]}>₹</ThemedText>
        <TextInput
          value={billRupees}
          onChangeText={(text) => setBillRupees(text.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          placeholder="Enter your bill amount"
          placeholderTextColor={colors.muted}
          style={[styles.billInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          accessibilityLabel="Bill amount in rupees"
        />
      </View>

      {billPaise > 0 && (
        <View style={[styles.result, { backgroundColor: colors.tint, borderColor: colors.tintBorder }]}>
          <ResultRow label="Your bill" value={formatCurrencyFromPaise(billPaise)} colors={colors} />
          {meetsMinimum ? (
            <ResultRow
              label={`Discount (${claim.discountPercentage}% off)`}
              value={`- ${formatCurrencyFromPaise(discountPaise)}`}
              valueColor={colors.danger}
              colors={colors}
            />
          ) : (
            <ThemedText type="small" style={{ color: colors.muted }}>
              Minimum bill is {formatCurrencyFromPaise(minSpend)} — add{' '}
              {formatCurrencyFromPaise(minSpend - billPaise)} more to get {claim.discountPercentage}% off.
            </ThemedText>
          )}
          <View style={[styles.solidDivider, { backgroundColor: colors.tintBorder, opacity: 0.35 }]} />
          <View style={styles.resultRow}>
            <ThemedText style={{ color: colors.greenText }}>You pay</ThemedText>
            <ThemedText style={[styles.payTotal, { color: colors.greenText }]}>
              {formatCurrencyFromPaise(billPaise - discountPaise)}
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

function ResultRow({
  label,
  value,
  valueColor,
  colors,
}: {
  label: string;
  value: string;
  valueColor?: string;
  colors: Palette;
}) {
  return (
    <View style={styles.resultRow}>
      <ThemedText type="small" style={{ color: colors.greenText }}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={{ color: valueColor ?? colors.greenText }}>
        {value}
      </ThemedText>
    </View>
  );
}

function PassButton({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  colors: Palette;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.passButton,
        { backgroundColor: colors.background, borderColor: colors.border },
        pressed && { backgroundColor: colors.well },
      ]}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <ThemedText style={{ color: colors.text }}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  backButton: { alignSelf: 'flex-start', paddingHorizontal: Spacing.three, paddingTop: Spacing.one },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  header: { alignItems: 'center', gap: 2, marginBottom: Spacing.one },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  headerTitle: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 14,
    padding: Spacing.three,
  },
  logo: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#FFFFFF', padding: 3 },
  logoImage: { flex: 1, borderRadius: 8 },
  restaurantName: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  passCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  codeSection: { alignItems: 'center', paddingVertical: Spacing.three, gap: Spacing.one },
  overline: { fontSize: 12, lineHeight: 16, letterSpacing: 1.5, fontWeight: '500' },
  overlineLeft: { alignSelf: 'flex-start' },
  code: { fontSize: 34, lineHeight: 42, fontWeight: '800', letterSpacing: 5 },
  codeVoid: { textDecorationLine: 'line-through' },
  validityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 2,
  },
  dashedDivider: { borderTopWidth: 1, borderStyle: 'dashed', marginHorizontal: 0 },
  solidDivider: { height: StyleSheet.hairlineWidth },
  instructionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  instructionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  calculator: { padding: Spacing.three, gap: Spacing.three },
  well: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 10, padding: Spacing.three },
  rupee: { fontSize: 18 },
  billInput: { flex: 1, fontSize: 20, borderWidth: 1, borderRadius: 8, paddingHorizontal: Spacing.three, height: 46 },
  result: { borderWidth: 1, borderRadius: 10, padding: Spacing.three, gap: Spacing.two },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payTotal: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
  },
  passButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: Spacing.three - 2,
  },
  cancel: { alignItems: 'center', paddingVertical: Spacing.two },
});
