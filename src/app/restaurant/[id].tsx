import { useCallback } from 'react';
import { Alert, FlatList, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-context';
import { useClaimOffer } from '@/hooks/use-claims';
import { useRestaurantDetail } from '@/hooks/use-restaurant-detail';
import { useToggleFavorite } from '@/hooks/use-favorites';
import { useTheme } from '@/hooks/use-theme';
import { isApiError } from '@/api/api-error';
import { formatDistanceKm, formatRating } from '@/lib/format';
import type { OfferCardDto } from '@/api/types';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, refetch } = useRestaurantDetail(id);
  const { isAuthenticated } = useAuth();
  const toggleFavorite = useToggleFavorite();
  const claimOffer = useClaimOffer();
  const theme = useTheme();

  const handleRedeem = useCallback(
    (offer: OfferCardDto) => {
      if (!isAuthenticated) {
        router.push('/auth/phone');
        return;
      }
      Alert.alert(
        `${offer.discountPercentage}% off`,
        `${offer.conditionLabel}${offer.minSpendPaise ? `\nMinimum spend applies.` : ''}\n\nClaim this offer now? You'll get a code to show at the restaurant.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Claim offer',
            onPress: () => {
              claimOffer.mutate(offer.offerAvailabilityId, {
                onSuccess: (claim) =>
                  router.push({ pathname: '/claim/[id]', params: { id: claim.id, activated: '1' } }),
                onError: (error) => {
                  Alert.alert('Couldn’t claim this offer', isApiError(error) ? error.message : 'Please try again.');
                },
              });
            },
          },
        ],
      );
    },
    [claimOffer, isAuthenticated],
  );

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
          <ErrorState message="Couldn't load this restaurant." onRetry={() => void refetch()} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroWrapper}>
          <Image source={{ uri: data.coverImageUrl }} style={styles.hero} contentFit="cover" />
          <SafeAreaView style={styles.heroOverlay} edges={['top']}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
              style={[styles.circleButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
              <Ionicons name="arrow-back" size={20} color="#ffffff" />
            </Pressable>
            <View style={styles.heroActions}>
              <Pressable
                onPress={() => void Share.share({ message: `Check out ${data.name} on our app!` })}
                style={[styles.circleButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                <Ionicons name="share-outline" size={18} color="#ffffff" />
              </Pressable>
              <Pressable
                onPress={() =>
                  isAuthenticated
                    ? toggleFavorite.mutate({ restaurantId: data.id, isFavorited: data.isFavorited })
                    : router.push('/auth/phone')
                }
                style={[styles.circleButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                <Ionicons
                  name={data.isFavorited ? 'heart' : 'heart-outline'}
                  size={18}
                  color={data.isFavorited ? theme.danger : '#ffffff'}
                />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <ThemedText style={styles.name}>{data.name}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {formatRating(data.ratingAvg, data.ratingCount)} · {data.cuisines.join(', ')} · {'₹'.repeat(data.priceTier)}
          </ThemedText>
          <ThemedText themeColor={data.isOpen ? 'accent' : 'danger'} type="smallBold">
            {data.isOpen ? 'Open' : 'Closed'} · {data.closesAtLabel}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDistanceKm(data.distanceKm)} · {data.addressLine}
          </ThemedText>

          {data.description ? <ThemedText style={styles.description}>{data.description}</ThemedText> : null}

          {data.activeOffers.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                Deals
              </ThemedText>
              {data.activeOffers.map((offer) => (
                <ThemedView key={offer.offerAvailabilityId} type="backgroundElement" style={styles.dealCard}>
                  <View style={styles.dealInfo}>
                    <ThemedText type="smallBold">
                      {offer.discountPercentage}% off · dine in
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {offer.conditionLabel}
                    </ThemedText>
                    {offer.description ? <ThemedText type="small">{offer.description}</ThemedText> : null}
                    <View style={[styles.seatsPill, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText type="small" themeColor={offer.status === 'exhausted' ? 'danger' : undefined}>
                        {offer.status === 'exhausted' ? 'Sold out for now' : `${offer.seatsLeft} left`}
                      </ThemedText>
                    </View>
                  </View>
                  <PrimaryButton
                    label={offer.status === 'exhausted' ? 'Sold out' : 'Redeem'}
                    onPress={() => handleRedeem(offer)}
                    disabled={offer.status === 'exhausted'}
                    style={styles.redeemButton}
                  />
                </ThemedView>
              ))}
            </View>
          )}

          {data.pastOffersToday.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                Here&apos;s what you missed
              </ThemedText>
              {data.pastOffersToday.map((offer) => (
                <View key={offer.offerAvailabilityId} style={styles.pastOfferRow}>
                  <Ionicons name="flash-outline" size={16} color={theme.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.pastOfferText}>
                    {offer.discountPercentage}% off · dine in · {offer.conditionLabel}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {data.galleryUrls.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                Gallery
              </ThemedText>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={data.galleryUrls}
                keyExtractor={(url) => url}
                contentContainerStyle={styles.galleryList}
                renderItem={({ item }) => (
                  <Image source={{ uri: item }} style={styles.galleryImage} contentFit="cover" />
                )}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.six },
  heroWrapper: { aspectRatio: 4 / 3 },
  hero: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.three,
  },
  heroActions: { flexDirection: 'row', gap: Spacing.two },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: Spacing.four, gap: Spacing.one },
  name: { fontSize: 24, fontWeight: '700', marginBottom: Spacing.one },
  description: { marginTop: Spacing.two },
  section: { marginTop: Spacing.five, gap: Spacing.three },
  sectionTitle: { fontSize: 16 },
  dealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  dealInfo: { flex: 1, gap: 2 },
  seatsPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: Spacing.one,
  },
  redeemButton: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  pastOfferRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pastOfferText: { flex: 1 },
  galleryList: { gap: Spacing.two },
  galleryImage: { width: 120, height: 120, borderRadius: Spacing.three },
});
