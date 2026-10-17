import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { OfferSummary } from '@/components/offer-summary';
import { ScreenHeader } from '@/components/screen-header';
import { AppText, Button, Card, ErrorState, LoadingState, StatusPill } from '@/components/ui';
import { Colors, ScreenPadding, Spacing } from '@/constants/theme';
import { useOffer, useUpdateOffer } from '@/hooks/use-owner';
import { isApiError } from '@/api/api-error';
import type { OfferStatus } from '@/api/types';

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: offer, isPending, isError, refetch } = useOffer(id);
  const updateOffer = useUpdateOffer();

  const setStatus = (status: OfferStatus, onSuccess?: () => void): void => {
    updateOffer.mutate(
      { id, input: { status } },
      {
        onSuccess,
        onError: (err) => Alert.alert("Couldn't update offer", isApiError(err) ? err.message : 'Please try again.'),
      },
    );
  };

  const confirmEnd = (): void => {
    Alert.alert(
      'End this offer?',
      'Customers will stop seeing it right away. Bookings already made stay valid.',
      [
        { text: 'Keep offer', style: 'cancel' },
        { text: 'End offer', style: 'destructive', onPress: () => setStatus('archived', () => router.back()) },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Offer Details" fallbackHref="/offers" />

      {isPending ? (
        <LoadingState />
      ) : isError || !offer ? (
        <ErrorState message="Couldn't load this offer." onRetry={() => void refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.statusCard}>
            <View style={styles.statusText}>
              <AppText variant="small" color={Colors.textSecondary}>
                Today
              </AppText>
              <AppText variant="heading">
                {offer.today ? `${offer.today.claimed} / ${offer.today.total} claimed` : 'Not running today'}
              </AppText>
            </View>
            <StatusPill status={offer.displayStatus} />
          </Card>

          <OfferSummary offer={offer} />

          {offer.displayStatus !== 'ended' && (
            <View style={styles.actions}>
              <Button
                label="Edit Offer"
                variant="outline"
                icon="create-outline"
                onPress={() => router.push({ pathname: '/offers/new', params: { id: offer.id } })}
              />
              {offer.status === 'paused' ? (
                <Button
                  label="Resume Offer"
                  icon="play"
                  loading={updateOffer.isPending}
                  onPress={() => setStatus('active')}
                />
              ) : (
                <Button
                  label="Pause Offer"
                  icon="pause"
                  loading={updateOffer.isPending}
                  onPress={() => setStatus('paused')}
                />
              )}
            </View>
          )}

          <Pressable onPress={confirmEnd} style={styles.endButton} disabled={updateOffer.isPending}>
            <AppText variant="bodyStrong" color={Colors.danger}>
              {offer.displayStatus === 'ended' ? 'Remove from list' : 'End Offer'}
            </AppText>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: ScreenPadding, paddingBottom: Spacing.six, gap: Spacing.four },
  statusCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusText: { gap: Spacing.half },
  actions: { gap: Spacing.three },
  endButton: { alignItems: 'center', paddingVertical: Spacing.three },
});
