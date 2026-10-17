import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { OfferRow } from '@/components/offer-row';
import { AppText, Button, Card, ErrorState, LoadingState } from '@/components/ui';
import { Colors, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useDashboard } from '@/hooks/use-owner';
import { greetingForNow } from '@/lib/format';

const HOME_OFFER_LIMIT = 3;

export default function HomeScreen() {
  const { data, isPending, isError, refetch, isRefetching } = useDashboard();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.navigate('/profile')} hitSlop={12} accessibilityLabel="Menu">
          <Ionicons name="menu-outline" size={30} color={Colors.text} />
        </Pressable>
        <Pressable
          onPress={() => Alert.alert('Notifications', "Notifications aren't built yet — coming in a later version.")}
          hitSlop={12}
          accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={26} color={Colors.text} />
        </Pressable>
      </View>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Couldn't load your dashboard." onRetry={() => void refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />
          }>
          <View style={styles.identity}>
            <View style={styles.identityText}>
              <AppText variant="body">
                {greetingForNow()}, {data.restaurant.name} 👋
              </AppText>
              <Pressable
                style={styles.nameRow}
                onPress={() =>
                  Alert.alert('One restaurant for now', 'Managing several outlets from one account is coming later.')
                }>
                <AppText variant="display" numberOfLines={2} style={styles.name}>
                  {data.restaurant.name}
                </AppText>
                <Ionicons name="chevron-down" size={24} color={Colors.text} />
              </Pressable>
              {data.restaurant.cuisines[0] && (
                <AppText variant="body" color={Colors.textSecondary}>
                  {data.restaurant.cuisines[0]} Restaurant
                </AppText>
              )}
            </View>
            <Image source={{ uri: data.restaurant.coverImageUrl }} style={styles.logo} contentFit="cover" />
          </View>

          <Button label="Create New Offer" icon="add" onPress={() => router.navigate('/offers/new')} />

          <Pressable
            onPress={() => router.push('/customers-today')}
            style={({ pressed }) => [styles.customersCard, pressed && styles.customersPressed]}
            accessibilityRole="button"
            accessibilityLabel={`${data.customersToday} customers today. View and redeem codes.`}>
            <View style={styles.customersIcon}>
              <Ionicons name="people-outline" size={34} color={Colors.primaryText} />
            </View>
            <View style={styles.customersText}>
              <AppText style={styles.customersCount}>{data.customersToday}</AppText>
              <AppText variant="body" color={Colors.textSecondary}>
                Customers Today
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </Pressable>

          <Card style={styles.offersCard}>
            <View style={styles.offersHeader}>
              <AppText variant="heading">Active Offers</AppText>
              <Pressable onPress={() => router.navigate('/offers')} hitSlop={8}>
                <AppText variant="bodyStrong" color={Colors.primaryText}>
                  View all
                </AppText>
              </Pressable>
            </View>

            {data.activeOffers.length === 0 ? (
              <AppText variant="small" color={Colors.textSecondary} style={styles.emptyOffers}>
                No offers are live right now. Create one to start bringing in customers.
              </AppText>
            ) : (
              data.activeOffers
                .slice(0, HOME_OFFER_LIMIT)
                .map((offer) => (
                  <OfferRow key={offer.id} offer={offer} onPress={() => router.navigate(`/offers/${offer.id}`)} />
                ))
            )}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ScreenPadding,
    paddingVertical: Spacing.three,
  },
  content: { paddingHorizontal: ScreenPadding, paddingBottom: Spacing.six, gap: Spacing.five },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  identityText: { flex: 1, gap: Spacing.two },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { flexShrink: 1 },
  logo: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: Colors.surfaceMuted,
  },
  customersCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.five,
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.large,
    padding: Spacing.five,
  },
  customersPressed: { backgroundColor: Colors.primaryTintStrong },
  customersIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryTintStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customersText: { flex: 1 },
  customersCount: { fontSize: 34, lineHeight: 40, fontWeight: '800' },
  offersCard: { gap: Spacing.four },
  offersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.one },
  emptyOffers: { paddingBottom: Spacing.two },
});
