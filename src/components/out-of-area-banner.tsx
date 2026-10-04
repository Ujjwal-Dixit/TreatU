import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LAUNCH_CITY_NAME } from '@/config/launch-city';

interface OutOfAreaBannerProps {
  detectedCity: string | null;
}

/** Non-blocking on purpose — someone outside the launch city can still
 * browse it (e.g. planning a trip), they just get an honest heads-up
 * about what they're looking at instead of the app silently pretending
 * they're in Mumbai. */
export function OutOfAreaBanner({ detectedCity }: OutOfAreaBannerProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        {detectedCity ? `You're in ${detectedCity} — showing ` : 'Showing '}
        {LAUNCH_CITY_NAME}, our only city so far.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  text: {
    flex: 1,
  },
});
