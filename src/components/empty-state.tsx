import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

interface EmptyStateProps {
  title: string;
  message?: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      {message && (
        <ThemedText themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  message: { textAlign: 'center' },
});
