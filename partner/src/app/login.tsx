import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GoogleG, PartnerWordmark, StorefrontIllustration } from '@/components/illustrations';
import { AppText, Button } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-context';
import { isApiError } from '@/api/api-error';

const COUNTRY_CODE = '+91';

const FEATURES = [
  { icon: 'shield-checkmark-outline', label: 'Secure & Safe' },
  { icon: 'time-outline', label: 'Save Time' },
  { icon: 'people-outline', label: 'Grow Business' },
] as const;

export default function LoginScreen() {
  const { requestOtp } = useAuth();
  const [digits, setDigits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = digits.length === 10;

  const handleSendOtp = async (): Promise<void> => {
    if (!isValid) {
      setError('Enter your 10-digit mobile number.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const phoneNumber = `${COUNTRY_CODE}${digits}`;
    try {
      await requestOtp(phoneNumber);
      router.push({ pathname: '/verify', params: { phoneNumber } });
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <PartnerWordmark />

          <View style={styles.illustration}>
            <StorefrontIllustration width={320} />
          </View>

          <View style={styles.heading}>
            <AppText variant="title" style={styles.welcome}>
              Welcome Back!
            </AppText>
            <AppText variant="body" color={Colors.textSecondary}>
              Login to manage your restaurant and offers
            </AppText>
          </View>

          <View style={styles.form}>
            <AppText variant="bodyStrong">Mobile Number</AppText>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <AppText variant="body">{COUNTRY_CODE}</AppText>
                <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
              </View>
              <TextInput
                value={digits}
                onChangeText={(text) => setDigits(text.replace(/\D/g, '').slice(0, 10))}
                keyboardType="number-pad"
                placeholder="Enter your mobile number"
                placeholderTextColor={Colors.textMuted}
                style={styles.phoneInput}
                maxLength={10}
                textContentType="telephoneNumber"
                autoComplete="tel"
              />
            </View>

            {error && (
              <AppText variant="small" color={Colors.danger}>
                {error}
              </AppText>
            )}

            <Button label="Send OTP" onPress={() => void handleSendOtp()} loading={isSubmitting} />

            <View style={styles.otpHint}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primaryText} />
              <AppText variant="small" color={Colors.textSecondary}>
                We&apos;ll send a 6-digit OTP to your number
              </AppText>
            </View>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <AppText variant="small" color={Colors.textSecondary}>
              or continue with
            </AppText>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.googleButton, pressed && styles.googlePressed]}
            onPress={() =>
              Alert.alert('Coming soon', "Google sign-in isn't available yet. Please log in with your mobile number.")
            }>
            <GoogleG size={26} />
            <AppText variant="bodyStrong" style={styles.googleLabel}>
              Continue with Google
            </AppText>
          </Pressable>

          <View style={styles.signupRow}>
            <AppText variant="body" color={Colors.textSecondary}>
              Don&apos;t have an account?{' '}
            </AppText>
            <Pressable
              onPress={() =>
                Alert.alert(
                  'List your restaurant',
                  'Partner accounts are set up by the TreatU team. Get in touch with us to bring your restaurant on board.',
                )
              }
              hitSlop={8}>
              <AppText variant="bodyStrong" color={Colors.primaryText}>
                Sign up
              </AppText>
            </Pressable>
          </View>

          <View style={styles.features}>
            {FEATURES.map((feature, index) => (
              <View key={feature.label} style={[styles.feature, index > 0 && styles.featureDivider]}>
                <Ionicons name={feature.icon} size={30} color={Colors.primaryText} />
                <AppText variant="small" color={Colors.textSecondary}>
                  {feature.label}
                </AppText>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.five, paddingTop: Spacing.five, paddingBottom: Spacing.five, gap: Spacing.five },
  illustration: { alignItems: 'center', marginTop: -Spacing.two },
  heading: { alignItems: 'center', gap: Spacing.two },
  welcome: { fontSize: 32, lineHeight: 38 },
  form: { gap: Spacing.three },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.medium,
    minHeight: 58,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRightWidth: 1,
    borderRightColor: Colors.borderStrong,
  },
  phoneInput: { flex: 1, paddingHorizontal: Spacing.four, fontSize: 17, color: Colors.text },
  otpHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderStrong },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
    minHeight: 56,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.medium,
  },
  googlePressed: { backgroundColor: Colors.surfaceMuted },
  googleLabel: { fontSize: 18, fontWeight: '500' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  features: { flexDirection: 'row', marginTop: Spacing.two },
  feature: { flex: 1, alignItems: 'center', gap: Spacing.two },
  featureDivider: { borderLeftWidth: 1, borderLeftColor: Colors.border },
});
