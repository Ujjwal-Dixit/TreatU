import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { BrandLogo } from '@/components/brand-logo';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { isApiError } from '@/api/api-error';

const COUNTRY_CODE = '+91';

export default function PhoneScreen() {
  const theme = useTheme();
  const { requestOtp } = useAuth();
  const [digits, setDigits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = digits.length === 10;

  const handleSubmit = async (): Promise<void> => {
    if (!isValid) return;
    setError(null);
    setIsSubmitting(true);
    const phoneNumber = `${COUNTRY_CODE}${digits}`;
    try {
      await requestOtp(phoneNumber);
      router.push(`/auth/verify?phoneNumber=${encodeURIComponent(phoneNumber)}`);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
          <View style={styles.logo}>
            <BrandLogo size={56} showTagline />
          </View>
          <ThemedText style={styles.title}>What&apos;s your number?</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            We&apos;ll text you a code to verify it&apos;s you.
          </ThemedText>

          <View style={[styles.inputRow, { borderColor: theme.backgroundElement }]}>
            <ThemedText style={styles.countryCode}>{COUNTRY_CODE}</ThemedText>
            <TextInput
              value={digits}
              onChangeText={(text) => setDigits(text.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              placeholder="98765 43210"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text }]}
              maxLength={10}
              autoFocus
            />
          </View>

          {error && (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          )}

          <PrimaryButton
            label="Send code"
            onPress={() => void handleSubmit()}
            disabled={!isValid}
            loading={isSubmitting}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    paddingTop: Spacing.five,
  },
  logo: { marginBottom: Spacing.four },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { marginBottom: Spacing.two },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  countryCode: { fontSize: 16, fontWeight: '600' },
  input: { flex: 1, fontSize: 16 },
});
