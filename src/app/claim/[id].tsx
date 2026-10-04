import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCancelClaim, useClaim } from '@/hooks/use-claims';
import { useTheme } from '@/hooks/use-theme';
import { isApiError } from '@/api/api-error';
import { formatCurrencyFromPaise } from '@/lib/format';
import type { ClaimDto } from '@/api/types';

const STATUS_COPY: Record<ClaimDto['status'], string> = {
  claimed: 'Show this code at the restaurant to redeem your offer.',
  redeemed: 'This offer has already been redeemed.',
  expired: "This offer's window has ended.",
  cancelled: 'This booking was cancelled.',
};

export default function ClaimDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, refetch } = useClaim(id);
  const cancelClaim = useCancelClaim();
  const theme = useTheme();

  if (isPending) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <LoadingState />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isError || !data) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ErrorState message="Couldn't load this booking." onRetry={() => void refetch()} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const handleCancel = (): void => {
    Alert.alert('Cancel this booking?', 'You can claim this offer again later if seats are still available.', [
      { text: 'Keep booking', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: () => {
          cancelClaim.mutate(data.id, {
            onError: (error) => {
              Alert.alert('Couldn’t cancel', isApiError(error) ? error.message : 'Please try again.');
            },
          });
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.content}>
          <View style={styles.restaurantRow}>
            <Image source={{ uri: data.restaurant.coverImageUrl }} style={styles.image} contentFit="cover" />
            <ThemedText type="smallBold">{data.restaurant.name}</ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.codeCard}>
            <ThemedText type="small" themeColor="textSecondary">
              Redemption code
            </ThemedText>
            <ThemedText type="code" style={styles.code}>
              {data.redemptionCode}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.statusCopy}>
              {STATUS_COPY[data.status]}
            </ThemedText>
          </ThemedView>

          <View style={styles.detailRow}>
            <ThemedText themeColor="textSecondary">Discount</ThemedText>
            <ThemedText type="smallBold">{data.discountPercentage}% off</ThemedText>
          </View>
          {data.minSpendPaise !== null && (
            <View style={styles.detailRow}>
              <ThemedText themeColor="textSecondary">Minimum spend</ThemedText>
              <ThemedText type="smallBold">{formatCurrencyFromPaise(data.minSpendPaise)}</ThemedText>
            </View>
          )}
          <View style={styles.detailRow}>
            <ThemedText themeColor="textSecondary">Valid until</ThemedText>
            <ThemedText type="smallBold">
              {new Date(data.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </ThemedText>
          </View>

          {data.status === 'claimed' && (
            <Pressable onPress={handleCancel} disabled={cancelClaim.isPending} style={styles.cancelButton}>
              {cancelClaim.isPending ? (
                <ActivityIndicator color={theme.danger} />
              ) : (
                <ThemedText type="smallBold" themeColor="danger">
                  Cancel booking
                </ThemedText>
              )}
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  restaurantRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  image: { width: 44, height: 44, borderRadius: Spacing.two },
  codeCard: { alignItems: 'center', gap: Spacing.two, borderRadius: Spacing.four, padding: Spacing.five },
  code: { fontSize: 32, letterSpacing: 6 },
  statusCopy: { textAlign: 'center' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { marginTop: Spacing.three, alignItems: 'center', paddingVertical: Spacing.two },
});
