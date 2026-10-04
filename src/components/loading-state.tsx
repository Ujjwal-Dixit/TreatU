import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export function LoadingState() {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 40, alignItems: 'center', justifyContent: 'center' },
});
