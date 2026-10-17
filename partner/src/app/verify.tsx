import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ScreenHeader } from '@/components/screen-header';
import { AppText, Button } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-context';
import { isApiError } from '@/api/api-error';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

function formatPhone(phoneNumber: string): string {
  const digits = phoneNumber.replace(/^\+91/, '');
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export default function VerifyScreen() {
  const { verifyOtp, requestOtp } = useAuth();
  const { phoneNumber = '' } = useLocalSearchParams<{ phoneNumber: string }>();
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async (): Promise<void> => {
    if (code.length !== CODE_LENGTH || !phoneNumber) return;
    setError(null);
    setIsSubmitting(true);
    try {
      // On success the root layout's Stack.Protected guard flips and
      // routes to the dashboard — no manual navigation needed here.
      await verifyOtp(phoneNumber, code);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Something went wrong. Please try again.');
      setCode('');
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
    <View style={styles.container}>
      <ScreenHeader title="Verify OTP" fallbackHref="/login" />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.heading}>
            <AppText variant="title">Enter the code</AppText>
            <AppText variant="body" color={Colors.textSecondary}>
              We sent a 6-digit OTP to {formatPhone(phoneNumber)}
            </AppText>
          </View>

          {/* One hidden input drives six display boxes, so paste and the
              iOS SMS one-time-code autofill both work naturally. */}
          <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
            {Array.from({ length: CODE_LENGTH }, (_, index) => {
              const isActive = index === code.length;
              return (
                <View key={index} style={[styles.box, isActive && styles.boxActive]}>
                  <AppText style={styles.boxDigit}>{code[index] ?? ''}</AppText>
                </View>
              );
            })}
          </Pressable>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, CODE_LENGTH))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={CODE_LENGTH}
            autoFocus
            style={styles.hiddenInput}
          />

          {error && (
            <AppText variant="small" color={Colors.danger}>
              {error}
            </AppText>
          )}

          <Button
            label="Verify & Continue"
            onPress={() => void handleVerify()}
            disabled={code.length !== CODE_LENGTH}
            loading={isSubmitting}
          />

          <Pressable onPress={() => void handleResend()} disabled={cooldown > 0} style={styles.resend}>
            <AppText variant="smallStrong" color={cooldown > 0 ? Colors.textMuted : Colors.primaryText}>
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </AppText>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.five, paddingTop: Spacing.five, gap: Spacing.five },
  heading: { gap: Spacing.two },
  boxes: { flexDirection: 'row', justifyContent: 'space-between' },
  box: {
    width: 48,
    height: 58,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: Colors.primary, borderWidth: 1.5 },
  boxDigit: { fontSize: 24, fontWeight: '700' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  resend: { alignItems: 'center', paddingVertical: Spacing.two },
});
