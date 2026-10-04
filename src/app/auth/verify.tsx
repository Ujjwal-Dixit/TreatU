import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { isApiError } from '@/api/api-error';

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyScreen() {
  const theme = useTheme();
  const { verifyOtp, requestOtp } = useAuth();
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const isValid = code.length === 6;

  const handleVerify = async (): Promise<void> => {
    if (!isValid || !phoneNumber) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyOtp(phoneNumber, code);
      router.dismissAll();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (!phoneNumber || cooldown > 0) return;
    setError(null);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    try {
      await requestOtp(phoneNumber);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not resend the code.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
          <ThemedText style={styles.title}>Enter the code</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            We sent a 6-digit code to {phoneNumber}
          </ThemedText>

          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder="000000"
            placeholderTextColor={theme.textSecondary}
            style={[styles.codeInput, { color: theme.text, borderColor: theme.backgroundElement }]}
            maxLength={6}
            autoFocus
          />

          {error && (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          )}

          <PrimaryButton label="Verify" onPress={() => void handleVerify()} disabled={!isValid} loading={isSubmitting} />

          <Pressable onPress={() => void handleResend()} disabled={cooldown > 0} style={styles.resendRow}>
            <ThemedText type="small" themeColor={cooldown > 0 ? 'textSecondary' : 'text'}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </ThemedText>
          </Pressable>
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
    paddingTop: Spacing.six,
  },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { marginBottom: Spacing.two },
  codeInput: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  resendRow: { alignItems: 'center', paddingVertical: Spacing.two },
});
