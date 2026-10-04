import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from './themed-text';
import { PrimaryButton } from './primary-button';
import { Spacing } from '@/constants/theme';

interface AuthRequiredStateProps {
  title: string;
  message: string;
}

export function AuthRequiredState({ title, message }: AuthRequiredStateProps) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.message}>
        {message}
      </ThemedText>
      <PrimaryButton label="Log in" onPress={() => router.push('/auth/phone')} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 18, fontWeight: '600' },
  message: { textAlign: 'center' },
  button: { marginTop: Spacing.two, minWidth: 160 },
});
