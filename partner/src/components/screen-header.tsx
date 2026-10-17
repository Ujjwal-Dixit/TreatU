import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  /** Where back goes when there's no history to pop (e.g. opened fresh). */
  fallbackHref?: Href;
  /** Override back behaviour entirely (e.g. "Offer Created" -> list). */
  onBack?: () => void;
  bordered?: boolean;
}

/** Back arrow + centred title, as on the Create New Offer / Offer Created
 * mocks. Rendered by each screen (headerShown: false in the stack) rather
 * than as a native header, so the layout matches the design exactly. */
export function ScreenHeader({ title, fallbackHref = '/', onBack, bordered = false }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  const handleBack = (): void => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace(fallbackHref);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }, bordered && styles.bordered]}>
      <View style={styles.row}>
        <Pressable onPress={handleBack} hitSlop={12} accessibilityLabel="Go back" style={styles.side}>
          <Ionicons name="arrow-back" size={28} color={Colors.text} />
        </Pressable>
        <AppText variant="heading" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        <View style={styles.side} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.background },
  bordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  side: { width: 32 },
  title: { flex: 1, textAlign: 'center', fontSize: 20 },
});
