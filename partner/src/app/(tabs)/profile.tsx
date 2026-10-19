import type { ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { AppText, Card, ErrorState, LoadingState } from '@/components/ui';
import { Colors, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-context';
import { useRestaurant } from '@/hooks/use-owner';

function comingSoon(feature: string): void {
  Alert.alert(feature, "This isn't built yet — coming in a later version.");
}

export default function ProfileScreen() {
  const { logout } = useAuth();
  const { data: restaurant, isPending, isError, refetch } = useRestaurant();

  const confirmLogout = (): void => {
    Alert.alert('Log out?', "You'll need an OTP to log back in.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title">Profile</AppText>

        {isPending ? (
          <LoadingState />
        ) : isError || !restaurant ? (
          <ErrorState message="Couldn't load your restaurant." onRetry={() => void refetch()} />
        ) : (
          <Pressable
            onPress={() => router.push('/restaurant-details')}
            accessibilityRole="button"
            accessibilityLabel={`${restaurant.name}. Edit restaurant details.`}
            style={({ pressed }) => [styles.restaurantCard, pressed && styles.rowPressed]}>
            <Image source={{ uri: restaurant.coverImageUrl }} style={styles.cover} contentFit="cover" />
            <View style={styles.restaurantText}>
              <AppText variant="heading">{restaurant.name}</AppText>
              <AppText variant="small" color={Colors.textSecondary}>
                {restaurant.cuisines.join(' · ')}
              </AppText>
              <AppText variant="small" color={Colors.textSecondary}>
                {restaurant.addressLine}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </Pressable>
        )}

        <Card style={styles.menu}>
          <MenuRow icon="qr-code-outline" label="Redeem a customer code" onPress={() => router.push('/customers-today')} />
          <MenuRow icon="pricetags-outline" label="My offers" onPress={() => router.navigate('/offers')} />
          <MenuRow icon="storefront-outline" label="Restaurant details" onPress={() => router.push('/restaurant-details')} />
          <MenuRow icon="time-outline" label="Opening hours" onPress={() => router.push('/opening-hours')} />
          <MenuRow icon="headset-outline" label="Help & support" onPress={() => comingSoon('Help & support')} last />
        </Card>

        <Card style={styles.menu}>
          <MenuRow icon="log-out-outline" label="Log out" onPress={confirmLogout} danger last />
        </Card>

        <AppText variant="caption" color={Colors.textMuted} style={styles.version}>
          TreatU Partner · Version {Constants.expoConfig?.version}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

interface MenuRowProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}

function MenuRow({ icon, label, onPress, danger, last }: MenuRowProps) {
  const color = danger ? Colors.danger : Colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && styles.rowPressed]}>
      <Ionicons name={icon} size={22} color={danger ? Colors.danger : Colors.primaryText} />
      <AppText variant="body" color={color} style={styles.rowLabel}>
        {label}
      </AppText>
      {!danger && <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: { padding: ScreenPadding, gap: Spacing.four, paddingBottom: Spacing.six },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.four,
  },
  cover: { width: 72, height: 72, borderRadius: Radius.medium, backgroundColor: Colors.surfaceMuted },
  restaurantText: { flex: 1, gap: Spacing.half },
  menu: { paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, paddingVertical: Spacing.four },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  rowPressed: { opacity: 0.6 },
  rowLabel: { flex: 1 },
  version: { textAlign: 'center' },
});
