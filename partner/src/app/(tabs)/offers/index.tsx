import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { OfferRow } from '@/components/offer-row';
import { AppText, Button, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Colors, ScreenPadding, Spacing } from '@/constants/theme';
import { useOffers } from '@/hooks/use-owner';
import type { OwnerOfferDisplayStatus, OwnerOfferDto } from '@/api/types';

const SECTIONS: { status: OwnerOfferDisplayStatus; title: string }[] = [
  { status: 'active', title: 'Active Offers' },
  { status: 'scheduled', title: 'Scheduled' },
  { status: 'paused', title: 'Paused' },
  { status: 'ended', title: 'Ended' },
];

export default function OffersScreen() {
  const { data, isPending, isError, refetch, isRefetching } = useOffers();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <AppText variant="title">My Offers</AppText>
      </View>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Couldn't load your offers." onRetry={() => void refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />
          }>
          <Button label="Create New Offer" icon="add" onPress={() => router.push('/offers/new')} />

          {data.length === 0 ? (
            <EmptyState
              icon="pricetag-outline"
              title="No offers yet"
              message="Create your first offer to start showing up for customers nearby."
            />
          ) : (
            SECTIONS.map(({ status, title }) => (
              <OfferSection
                key={status}
                title={title}
                offers={data.filter((offer) => offer.displayStatus === status)}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function OfferSection({ title, offers }: { title: string; offers: OwnerOfferDto[] }) {
  if (offers.length === 0) return null;
  return (
    <View style={styles.section}>
      <AppText variant="heading">
        {title} <AppText color={Colors.textSecondary}>({offers.length})</AppText>
      </AppText>
      {offers.map((offer) => (
        <OfferRow key={offer.id} offer={offer} onPress={() => router.push(`/offers/${offer.id}`)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.four, paddingBottom: Spacing.three },
  content: { paddingHorizontal: ScreenPadding, paddingBottom: Spacing.six, gap: Spacing.five },
  section: { gap: Spacing.three },
});
