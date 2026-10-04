import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequiredState } from '@/components/auth-required-state';
import { ClaimRow } from '@/components/claim-row';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-context';
import { useClaims } from '@/hooks/use-claims';
import type { ClaimDto } from '@/api/types';

interface ClaimSection {
  title: string;
  data: ClaimDto[];
}

export default function BookingsScreen() {
  const { isAuthenticated, isHydrated } = useAuth();
  const { data, isPending, isError, refetch } = useClaims();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          Bookings
        </ThemedText>

        {!isHydrated ? (
          <LoadingState />
        ) : !isAuthenticated ? (
          <AuthRequiredState
            title="See your bookings"
            message="Log in to view offers you've claimed and their redemption codes."
          />
        ) : isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Couldn't load your bookings." onRetry={() => void refetch()} />
        ) : (
          <BookingsList claims={data ?? []} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function BookingsList({ claims }: { claims: ClaimDto[] }) {
  const active = claims.filter((claim) => claim.status === 'claimed');
  const history = claims.filter((claim) => claim.status !== 'claimed');
  const sections: ClaimSection[] = [
    ...(active.length > 0 ? [{ title: 'Active', data: active }] : []),
    ...(history.length > 0 ? [{ title: 'Past', data: history }] : []),
  ];

  if (sections.length === 0) {
    return <EmptyState title="No bookings yet" message="Claim an offer from a restaurant to see it here." />;
  }

  return (
    <FlatList
      data={sections}
      keyExtractor={(section) => section.title}
      contentContainerStyle={styles.list}
      renderItem={({ item: section }) => (
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {section.title}
          </ThemedText>
          {section.data.map((claim) => (
            <ClaimRow key={claim.id} claim={claim} />
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
  title: { fontSize: 28, lineHeight: 34, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  list: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four + (Platform.OS === 'web' ? Spacing.six : 0),
  },
  section: { gap: Spacing.three },
});
