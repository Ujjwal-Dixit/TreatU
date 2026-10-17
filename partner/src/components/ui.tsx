import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radius, Spacing } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// --- Text ------------------------------------------------------------------

type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'small' | 'smallStrong' | 'caption';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
}

export function AppText({ variant = 'body', color = Colors.text, style, ...rest }: AppTextProps) {
  return <Text style={[textStyles[variant], { color }, style]} {...rest} />;
}

const textStyles = StyleSheet.create<Record<TextVariant, TextStyle>>({
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  smallStrong: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
});

// --- Buttons ---------------------------------------------------------------

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, style }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;
  const contentColor = isPrimary ? Colors.onPrimary : Colors.primaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        isPrimary
          ? { backgroundColor: pressed ? Colors.primaryPressed : Colors.primary }
          : [styles.buttonOutline, pressed && { backgroundColor: Colors.primaryTint }],
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <Ionicons name={icon} size={24} color={contentColor} />}
          <AppText variant="bodyStrong" color={contentColor} style={styles.buttonLabel}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

// --- Containers --------------------------------------------------------------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface IconTileProps {
  icon: IconName;
  /** A text glyph drawn instead of the icon — Ionicons has no ₹. */
  glyph?: string;
  size?: number;
  iconSize?: number;
}

export function IconTile({ icon, glyph, size = 56, iconSize = 26 }: IconTileProps) {
  return (
    <View style={[styles.iconTile, { width: size, height: size }]}>
      {glyph ? (
        <Text style={{ fontSize: iconSize, lineHeight: iconSize * 1.2, fontWeight: '600', color: Colors.primaryText }}>
          {glyph}
        </Text>
      ) : (
        <Ionicons name={icon} size={iconSize} color={Colors.primaryText} />
      )}
    </View>
  );
}

export function InfoNote({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.infoNote, style]}>
      <Ionicons name="information-circle-outline" size={22} color={Colors.primaryText} />
      <AppText variant="small" color={Colors.primaryText} style={styles.infoNoteText}>
        {children}
      </AppText>
    </View>
  );
}

const PILL_COLORS = {
  active: { bg: Colors.primaryTintStrong, fg: Colors.primaryText, label: 'Active' },
  scheduled: { bg: '#E7EEF9', fg: '#2E5AAC', label: 'Scheduled' },
  paused: { bg: Colors.warningTint, fg: Colors.warning, label: 'Paused' },
  ended: { bg: Colors.surfaceMuted, fg: Colors.textSecondary, label: 'Ended' },
} as const;

export function StatusPill({ status }: { status: keyof typeof PILL_COLORS }) {
  const { bg, fg, label } = PILL_COLORS[status];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <AppText variant="smallStrong" color={fg}>
        {label}
      </AppText>
    </View>
  );
}

// --- States ----------------------------------------------------------------

export function LoadingState() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={[styles.centered, styles.stateGap]}>
      <AppText variant="bodyStrong">{message}</AppText>
      <Button label="Try again" variant="outline" onPress={onRetry} style={styles.retry} />
    </View>
  );
}

export function EmptyState({ icon, title, message }: { icon: IconName; title: string; message: string }) {
  return (
    <View style={[styles.centered, styles.stateGap]}>
      <IconTile icon={icon} />
      <AppText variant="bodyStrong">{title}</AppText>
      <AppText variant="small" color={Colors.textSecondary} style={styles.centerText}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.five },
  buttonLabel: { fontSize: 18 },
  disabled: { opacity: 0.5 },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.four,
  },
  iconTile: {
    borderRadius: Radius.medium,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  infoNoteText: { flex: 1 },
  pill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    alignSelf: 'center',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  stateGap: { gap: Spacing.three },
  centerText: { textAlign: 'center' },
  retry: { alignSelf: 'stretch' },
});
