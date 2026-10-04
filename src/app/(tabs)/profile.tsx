import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import { BrandLogo } from '@/components/brand-logo';
import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { ProfileMenuRow } from '@/components/profile-menu-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { LAUNCH_CITY_NAME } from '@/config/launch-city';
import { useAuth } from '@/auth/auth-context';
import { useMe } from '@/hooks/use-me';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrencyFromPaise } from '@/lib/format';

function showComingSoon(feature: string): void {
  Alert.alert(feature, "This isn't built yet — coming in a later version.");
}

export default function ProfileScreen() {
  const { isAuthenticated, isHydrated, logout } = useAuth();

  if (!isHydrated) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <LoadingState />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="subtitle" style={styles.title}>
            Profile
          </ThemedText>

          {isAuthenticated ? <SignedInProfile onSignOut={() => void logout()} /> : <SignedOutProfile />}

          <View style={styles.menuGroup}>
            <ProfileMenuRow
              icon="earth-outline"
              label="Change region"
              subtitle={LAUNCH_CITY_NAME}
              onPress={() => Alert.alert('Single city for now', 'More cities are coming soon.')}
            />
            <ProfileMenuRow icon="notifications-outline" label="Notifications" onPress={() => showComingSoon('Notifications')} />
            <ProfileMenuRow icon="help-circle-outline" label="How it works" onPress={() => showComingSoon('How it works')} />
            <ProfileMenuRow icon="headset-outline" label="Get help" onPress={() => showComingSoon('Get help')} />
          </View>

          <View style={styles.menuGroup}>
            <ProfileMenuRow icon="chatbubble-outline" label="Feedback" onPress={() => showComingSoon('Feedback')} />
            <ProfileMenuRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => showComingSoon('Privacy Policy')} />
            <ProfileMenuRow icon="document-text-outline" label="Terms of Service" onPress={() => showComingSoon('Terms of Service')} />
          </View>

          <View style={styles.footer}>
            <BrandLogo size={28} showTagline />
            <ThemedText type="small" themeColor="textSecondary">
              Version {Constants.expoConfig?.version}
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SignedInProfile({ onSignOut }: { onSignOut: () => void }) {
  const theme = useTheme();
  const { data: me, isPending, isError, refetch } = useMe();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.identityRow}>
        <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
          <ThemedText type="subtitle" style={[styles.avatarInitial, { color: theme.accentText }]}>
            {(me?.name ?? '?').charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.identityText}>
          <ThemedText type="smallBold">{me?.name ?? 'Loading…'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {me?.phoneNumber}
          </ThemedText>
        </View>
      </View>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.statsError} onPress={() => void refetch()}>
          Couldn&apos;t load your stats — tap to retry.
        </ThemedText>
      ) : (
        <View style={styles.statsRow}>
          <Stat label="Total saved" value={formatCurrencyFromPaise(me?.stats.totalSavedPaise ?? 0)} />
          <Stat label="Offers redeemed" value={String(me?.stats.offersRedeemed ?? 0)} />
          <Stat label="Restaurants visited" value={String(me?.stats.restaurantsVisited ?? 0)} />
        </View>
      )}

      <View style={styles.quickLinks}>
        <ProfileMenuRow icon="heart-outline" label="Favourites" subtitle="Your saved restaurants" onPress={() => router.push('/(tabs)/favourites')} />
        <ProfileMenuRow icon="calendar-outline" label="My Bookings" subtitle="View your bookings" onPress={() => router.push('/(tabs)/bookings')} />
      </View>

      <Pressable onPress={onSignOut} style={styles.signOutButton}>
        <ThemedText type="smallBold" themeColor="danger" style={styles.signOutLabel}>
          Sign out
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function SignedOutProfile() {
  return (
    <View style={styles.signedOutGroup}>
      <ProfileMenuRow
        icon="person-circle-outline"
        label="Create an account or log in"
        subtitle="Save favourites, manage bookings and unlock offers."
        onPress={() => router.push('/auth/phone')}
      />
      <PrimaryButton label="Log in / Sign up" onPress={() => router.push('/auth/phone')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
  footer: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  title: { fontSize: 28, lineHeight: 34, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  scrollContent: {
    gap: Spacing.four,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four + (Platform.OS === 'web' ? Spacing.six : 0),
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, lineHeight: 26 },
  identityText: { gap: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statsError: { textAlign: 'center' },
  stat: { alignItems: 'center', gap: 2, flex: 1 },
  quickLinks: { gap: 0 },
  signOutButton: { marginTop: Spacing.one, alignItems: 'center', paddingVertical: Spacing.two },
  signOutLabel: { fontSize: 16 },
  signedOutGroup: { gap: Spacing.three },
  menuGroup: {
    paddingHorizontal: Spacing.two,
  },
});
