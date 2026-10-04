import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Couldn&apos;t load this</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.message}>
        {message}
      </ThemedText>
      {onRetry && (
        <Pressable onPress={onRetry}>
          <ThemedView type="backgroundElement" style={styles.retryButton}>
            <ThemedText type="smallBold">Try again</ThemedText>
          </ThemedView>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 18, fontWeight: '600' },
  message: { textAlign: 'center' },
  retryButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
  },
});
