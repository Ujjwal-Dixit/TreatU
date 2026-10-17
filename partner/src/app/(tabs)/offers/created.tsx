import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { SuccessBadge } from '@/components/illustrations';
import { OfferSummary } from '@/components/offer-summary';
import { ScreenHeader } from '@/components/screen-header';
import { AppText, Button, ErrorState, InfoNote, LoadingState } from '@/components/ui';
import { Colors, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useOffer } from '@/hooks/use-owner';

const goToOffers = (): void => router.dismissTo('/offers');

export default function OfferCreatedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: offer, isPending, isError, refetch } = useOffer(id);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Offer Created" onBack={goToOffers} />

      {isPending ? (
        <LoadingState />
      ) : isError || !offer ? (
        <ErrorState message="Couldn't load this offer." onRetry={() => void refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <SuccessBadge size={200} />
            <AppText variant="title" style={styles.heroTitle}>
              {offer.displayStatus === 'scheduled' ? 'Your offer is scheduled!' : 'Your offer is live!'}
            </AppText>
            <AppText variant="body" color={Colors.textSecondary} style={styles.heroBody}>
              {offer.displayStatus === 'scheduled'
                ? `Customers nearby will see it from ${offer.availabilityLabel.split(' – ')[0]}.`
                : 'Customers nearby can now see\nand claim your offer.'}
            </AppText>
          </View>

          <OfferSummary offer={offer} />

          <InfoNote>You can pause or edit this offer{'\n'}anytime from Active Offers.</InfoNote>

          <View style={styles.actions}>
            <Button label="View Active Offers" onPress={goToOffers} />
            <Button label="Create Another Offer" variant="outline" onPress={() => router.replace('/offers/new')} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: ScreenPadding, paddingBottom: Spacing.six, gap: Spacing.four },
  hero: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.large,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.five,
  },
  heroTitle: { textAlign: 'center', fontSize: 30, lineHeight: 36, marginTop: Spacing.three },
  heroBody: { textAlign: 'center', marginTop: Spacing.three, fontSize: 18, lineHeight: 28 },
  actions: { gap: Spacing.four, marginTop: Spacing.two },
});
