import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';

const TAGLINE = 'Explore more. Pay less.';

interface BrandLogoProps {
  /** Height of the app-icon mark; the wordmark scales with it. */
  size?: number;
  showWordmark?: boolean;
  showTagline?: boolean;
}

/**
 * The wordmark is live text rather than an image so it stays sharp at any
 * size and follows the theme's text colour in dark mode.
 */
export function BrandLogo({ size = 40, showWordmark = true, showTagline = false }: BrandLogoProps) {
  const wordmarkSize = Math.round(size * 0.72);

  return (
    <View style={styles.row} accessible accessibilityRole="image" accessibilityLabel="TreatU">
      <Image source={require('@/assets/images/brand-mark.png')} style={{ width: size, height: size }} />
      {showWordmark && (
        <View>
          <ThemedText style={[styles.wordmark, { fontSize: wordmarkSize, lineHeight: wordmarkSize * 1.15 }]}>
            Treat<ThemedText style={[styles.wordmark, { fontSize: wordmarkSize, color: Brand.orange }]}>U</ThemedText>
          </ThemedText>
          {showTagline && (
            <ThemedText type="small" themeColor="textSecondary">
              {TAGLINE}
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  wordmark: { fontWeight: '800', letterSpacing: -0.5 },
});
