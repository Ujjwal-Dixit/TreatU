import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';

import { PickerField } from '@/components/picker-field';
import { ScreenHeader } from '@/components/screen-header';
import { AppText, Button, Card, ErrorState, InfoNote, LoadingState } from '@/components/ui';
import { Colors, ScreenPadding, Spacing } from '@/constants/theme';
import { useRestaurant, useUpdateRestaurant } from '@/hooks/use-owner';
import { isApiError } from '@/api/api-error';
import { formatTimeField, fromHHmm, toHHmm } from '@/lib/format';
import type { OperatingHoursEntry, RestaurantDto } from '@/api/types';

/** ISO weekday order, 1 = Monday .. 7 = Sunday, matching the backend. */
const DAYS = [
  { dayOfWeek: 1, label: 'Monday' },
  { dayOfWeek: 2, label: 'Tuesday' },
  { dayOfWeek: 3, label: 'Wednesday' },
  { dayOfWeek: 4, label: 'Thursday' },
  { dayOfWeek: 5, label: 'Friday' },
  { dayOfWeek: 6, label: 'Saturday' },
  { dayOfWeek: 7, label: 'Sunday' },
] as const;

const DEFAULT_OPEN = '11:00';
const DEFAULT_CLOSE = '23:00';
/** The time picker steps in 15 minutes, so "12:00 AM" is the only way to
 * say "until midnight" — stored as 23:59 since hours can't cross midnight. */
const END_OF_DAY = '23:59';

interface DayState {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

type WeekState = Record<number, DayState>;

function initialWeek(hours: readonly OperatingHoursEntry[]): WeekState {
  const week: WeekState = {};
  for (const { dayOfWeek } of DAYS) {
    const entry = hours.find((h) => h.dayOfWeek === dayOfWeek);
    week[dayOfWeek] = entry
      ? { isOpen: true, openTime: entry.openTime, closeTime: entry.closeTime }
      : { isOpen: false, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE };
  }
  return week;
}

function isValidDay(day: DayState): boolean {
  return !day.isOpen || day.closeTime > day.openTime;
}

export default function OpeningHoursScreen() {
  const { data: restaurant, isPending, isError, refetch } = useRestaurant();

  if (isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (isError || !restaurant) {
    return (
      <Screen>
        <ErrorState message="Couldn't load your opening hours." onRetry={() => void refetch()} />
      </Screen>
    );
  }
  return <HoursForm restaurant={restaurant} />;
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Opening Hours" fallbackHref="/profile" bordered />
      {children}
    </View>
  );
}

function HoursForm({ restaurant }: { restaurant: RestaurantDto }) {
  const [week, setWeek] = useState<WeekState>(() => initialWeek(restaurant.operatingHours));
  const [error, setError] = useState<string | null>(null);
  const updateRestaurant = useUpdateRestaurant();

  const updateDay = (dayOfWeek: number, patch: Partial<DayState>): void => {
    setWeek((current) => ({ ...current, [dayOfWeek]: { ...current[dayOfWeek]!, ...patch } }));
    setError(null);
  };

  const copyMondayToAll = (): void => {
    const monday = week[1]!;
    setWeek(Object.fromEntries(DAYS.map(({ dayOfWeek }) => [dayOfWeek, { ...monday }])));
    setError(null);
  };

  const handleSave = (): void => {
    const invalid = DAYS.find(({ dayOfWeek }) => !isValidDay(week[dayOfWeek]!));
    if (invalid) {
      setError(`${invalid.label}: closing time must be after opening time.`);
      return;
    }
    const operatingHours: OperatingHoursEntry[] = DAYS.filter(({ dayOfWeek }) => week[dayOfWeek]!.isOpen).map(
      ({ dayOfWeek }) => ({
        dayOfWeek,
        openTime: week[dayOfWeek]!.openTime,
        closeTime: week[dayOfWeek]!.closeTime,
      }),
    );
    updateRestaurant.mutate(
      { operatingHours },
      {
        onSuccess: () => router.back(),
        onError: (err) => setError(isApiError(err) ? err.message : 'Something went wrong. Please try again.'),
      },
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <InfoNote>
          Customers see &quot;Open · Closes at …&quot; on your page from these hours. Your offers keep their own times.
        </InfoNote>

        <Card style={styles.week}>
          {DAYS.map(({ dayOfWeek, label }, index) => {
            const day = week[dayOfWeek]!;
            const valid = isValidDay(day);
            return (
              <View key={dayOfWeek} style={[styles.day, index < DAYS.length - 1 && styles.dayDivider]}>
                <View style={styles.dayHeader}>
                  <AppText variant="bodyStrong" style={styles.dayLabel}>
                    {label}
                  </AppText>
                  <AppText variant="small" color={day.isOpen ? Colors.primaryText : Colors.textSecondary}>
                    {day.isOpen ? 'Open' : 'Closed'}
                  </AppText>
                  <Switch
                    value={day.isOpen}
                    onValueChange={(isOpen) => updateDay(dayOfWeek, { isOpen })}
                    trackColor={{ true: Colors.primary, false: Colors.borderStrong }}
                    accessibilityLabel={`${label} open`}
                  />
                </View>

                {day.isOpen && (
                  <View style={styles.times}>
                    <View style={styles.column}>
                      <AppText variant="caption" color={Colors.textSecondary}>
                        Opens
                      </AppText>
                      <PickerField
                        mode="time"
                        value={fromHHmm(day.openTime)}
                        displayValue={formatTimeField(day.openTime)}
                        onChange={(date) => updateDay(dayOfWeek, { openTime: toHHmm(date) })}
                        accessibilityLabel={`${label} opening time`}
                      />
                    </View>
                    <View style={styles.column}>
                      <AppText variant="caption" color={Colors.textSecondary}>
                        Closes
                      </AppText>
                      <PickerField
                        mode="time"
                        value={fromHHmm(day.closeTime)}
                        displayValue={formatTimeField(day.closeTime)}
                        onChange={(date) => {
                          const time = toHHmm(date);
                          updateDay(dayOfWeek, { closeTime: time === '00:00' ? END_OF_DAY : time });
                        }}
                        accessibilityLabel={`${label} closing time`}
                      />
                    </View>
                  </View>
                )}
                {!valid && (
                  <AppText variant="caption" color={Colors.danger}>
                    Closing time must be after opening time. Choose 12:00 AM to stay open until midnight.
                  </AppText>
                )}
              </View>
            );
          })}
        </Card>

        <Pressable onPress={copyMondayToAll} hitSlop={8} style={styles.copy} accessibilityRole="button">
          <AppText variant="bodyStrong" color={Colors.primaryText}>
            Copy Monday&apos;s hours to every day
          </AppText>
        </Pressable>

        {error && (
          <AppText variant="smallStrong" color={Colors.danger} style={styles.error}>
            {error}
          </AppText>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Save Hours" onPress={handleSave} loading={updateRestaurant.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: ScreenPadding, gap: Spacing.four, paddingBottom: Spacing.six },
  week: { paddingVertical: 0 },
  day: { gap: Spacing.three, paddingVertical: Spacing.four },
  dayDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dayLabel: { flex: 1 },
  times: { flexDirection: 'row', gap: Spacing.three },
  column: { flex: 1, gap: Spacing.one },
  copy: { alignSelf: 'center', paddingVertical: Spacing.two },
  error: { textAlign: 'center' },
  footer: {
    paddingHorizontal: ScreenPadding,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
