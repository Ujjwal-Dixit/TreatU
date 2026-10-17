/**
 * TreatU Partner palette — sampled from the partner-app design mocks.
 * Deliberately green rather than the customer app's orange, so staff can
 * tell at a glance which app they're in. Light-only for now (app.json sets
 * userInterfaceStyle: "light"); the mocks don't define a dark theme.
 */
export const Colors = {
  primary: '#0B5A30',
  primaryPressed: '#084624',
  primaryText: '#17703A',
  primaryTint: '#EEF5F0',
  primaryTintStrong: '#E1F0E5',
  onPrimary: '#FFFFFF',

  text: '#111111',
  textSecondary: '#5F646B',
  textMuted: '#8A8F96',
  background: '#FFFFFF',
  surfaceMuted: '#F5F6F5',
  border: '#E6E8EB',
  borderStrong: '#D5D9DD',

  danger: '#C9372C',
  warning: '#B26A00',
  warningTint: '#FFF4E0',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
  pill: 999,
} as const;

export const ScreenPadding = Spacing.four;
