import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PickerField } from '@/components/picker-field';
import { ScreenHeader } from '@/components/screen-header';
import { AppText, Button, Card, ErrorState, InfoNote, LoadingState } from '@/components/ui';
import { Colors, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useCreateOffer, useOffer, useUpdateOffer } from '@/hooks/use-owner';
import { isApiError } from '@/api/api-error';
import { formatDateField, formatTimeField, fromDateOnly, fromHHmm, toDateOnly, toHHmm } from '@/lib/format';
import type { OfferAvailabilityKind, OfferInput, OwnerOfferDto } from '@/api/types';

const PRESET_DISCOUNTS = [10, 15, 20, 30, 40, 50] as const;
const DESCRIPTION_MAX = 100;
const DEFAULT_SEATS = 20;
const MAX_SEATS = 500; // matches the backend's capacityPerDay @Max

interface FormState {
  /** A preset percentage, or 'other' when the custom field is in use. */
  discountChoice: number | 'other' | null;
  customDiscount: string;
  startTime: string;
  endTime: string;
  minBillRupees: string;
  /** Kept as text so the field can be briefly empty while typing. */
  seats: string;
  availability: OfferAvailabilityKind;
  startDate: string;
  endDate: string;
  description: string;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function initialState(offer?: OwnerOfferDto): FormState {
  const today = new Date();
  if (!offer) {
    return {
      discountChoice: 30,
      customDiscount: '',
      startTime: '16:00',
      endTime: '20:00',
      minBillRupees: '',
      seats: String(DEFAULT_SEATS),
      availability: 'today',
      startDate: toDateOnly(today),
      endDate: toDateOnly(addDays(today, 6)),
      description: '',
    };
  }
  const isPreset = (PRESET_DISCOUNTS as readonly number[]).includes(offer.discountPercentage);
  return {
    discountChoice: isPreset ? offer.discountPercentage : 'other',
    customDiscount: isPreset ? '' : String(offer.discountPercentage),
    startTime: offer.startTime,
    endTime: offer.endTime,
    minBillRupees: offer.minSpendPaise ? String(offer.minSpendPaise / 100) : '',
    seats: String(offer.capacityPerDay),
    availability: offer.availability,
    startDate: offer.startDate ?? toDateOnly(today),
    endDate: offer.endDate ?? toDateOnly(addDays(today, 6)),
    description: offer.description,
  };
}

/** Create New Offer (no id) or Edit Offer (?id=…) — same form either way. */
export default function OfferFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useOffer(id);

  if (id && existing.isPending) {
    return (
      <Screen title="Edit Offer">
        <LoadingState />
      </Screen>
    );
  }
  if (id && (existing.isError || !existing.data)) {
    return (
      <Screen title="Edit Offer">
        <ErrorState message="Couldn't load this offer." onRetry={() => void existing.refetch()} />
      </Screen>
    );
  }
  // Keyed so the form re-initialises if a different offer is opened.
  return <OfferForm key={id ?? 'new'} offer={existing.data} />;
}

function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.container}>
      <ScreenHeader title={title} fallbackHref="/offers" bordered />
      {children}
    </View>
  );
}

function OfferForm({ offer }: { offer?: OwnerOfferDto }) {
  const isEdit = Boolean(offer);
  const [form, setForm] = useState<FormState>(() => initialState(offer));
  const [error, setError] = useState<string | null>(null);
  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();
  const isSaving = createOffer.isPending || updateOffer.isPending;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const discount =
    form.discountChoice === 'other' ? Number.parseInt(form.customDiscount, 10) : (form.discountChoice ?? NaN);

  const buildInput = (): OfferInput | string => {
    if (!Number.isInteger(discount) || discount < 1 || discount > 100) {
      return 'Choose a discount between 1% and 100%.';
    }
    if (form.endTime <= form.startTime) {
      return 'End time must be after start time.';
    }
    const minBill = form.minBillRupees.trim() === '' ? null : Number(form.minBillRupees);
    if (minBill !== null && (!Number.isFinite(minBill) || minBill < 0)) {
      return 'Enter a valid minimum bill amount.';
    }
    const seats = Number.parseInt(form.seats, 10);
    if (!Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS) {
      return `Seats per day must be between 1 and ${MAX_SEATS}.`;
    }
    if (form.availability === 'dateRange' && form.endDate < form.startDate) {
      return 'End date must be on or after the start date.';
    }
    return {
      discountPercentage: discount,
      startTime: form.startTime,
      endTime: form.endTime,
      minSpendPaise: minBill === null ? null : Math.round(minBill * 100),
      capacityPerDay: seats,
      description: form.description.trim(),
      availability: form.availability,
      ...(form.availability === 'dateRange' ? { startDate: form.startDate, endDate: form.endDate } : {}),
      ...(form.availability === 'weekly' ? { daysOfWeek: offer?.daysOfWeek } : {}),
    };
  };

  const handleSubmit = (): void => {
    const input = buildInput();
    if (typeof input === 'string') {
      setError(input);
      return;
    }
    const onError = (err: Error): void => {
      setError(isApiError(err) ? err.message : 'Something went wrong. Please try again.');
    };

    if (offer) {
      updateOffer.mutate({ id: offer.id, input }, { onSuccess: () => router.back(), onError });
    } else {
      createOffer.mutate(input, {
        onSuccess: (created) => router.replace({ pathname: '/offers/created', params: { id: created.id } }),
        onError,
      });
    }
  };

  return (
    <Screen title={isEdit ? 'Edit Offer' : 'Create New Offer'}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.section}>
            <AppText variant="heading">Offer Discount</AppText>
            <View style={styles.chips}>
              {PRESET_DISCOUNTS.map((value) => (
                <Chip
                  key={value}
                  label={`${value}%`}
                  selected={form.discountChoice === value}
                  onPress={() => setForm((f) => ({ ...f, discountChoice: value, customDiscount: '' }))}
                />
              ))}
              <Chip label="Other" selected={form.discountChoice === 'other'} onPress={() => update('discountChoice', 'other')} />
            </View>
            <View style={[styles.inputRow, form.discountChoice === 'other' && styles.inputRowFocused]}>
              <TextInput
                value={form.customDiscount}
                onChangeText={(text) =>
                  setForm((f) => ({
                    ...f,
                    customDiscount: text.replace(/\D/g, '').slice(0, 3),
                    discountChoice: 'other',
                  }))
                }
                keyboardType="number-pad"
                placeholder="Custom Discount (%)"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                maxLength={3}
              />
              <AppText variant="body" color={Colors.textSecondary}>
                %
              </AppText>
            </View>
          </Card>

          <Card style={styles.section}>
            <AppText variant="heading">Offer Time</AppText>
            <View style={styles.twoColumn}>
              <View style={styles.column}>
                <AppText variant="small">Start Time</AppText>
                <PickerField
                  mode="time"
                  icon="time-outline"
                  value={fromHHmm(form.startTime)}
                  displayValue={formatTimeField(form.startTime)}
                  onChange={(date) => update('startTime', toHHmm(date))}
                  accessibilityLabel="Start time"
                />
              </View>
              <View style={styles.column}>
                <AppText variant="small">End Time</AppText>
                <PickerField
                  mode="time"
                  icon="time-outline"
                  value={fromHHmm(form.endTime)}
                  displayValue={formatTimeField(form.endTime)}
                  onChange={(date) => update('endTime', toHHmm(date))}
                  accessibilityLabel="End time"
                />
              </View>
            </View>
          </Card>

          <Card style={styles.section}>
            <AppText variant="heading">
              Minimum Bill <AppText variant="body">(Optional)</AppText>
            </AppText>
            <View style={styles.inputRow}>
              <AppText variant="body" color={Colors.textSecondary} style={styles.rupee}>
                ₹
              </AppText>
              <View style={styles.inputDivider} />
              <TextInput
                value={form.minBillRupees}
                onChangeText={(text) => update('minBillRupees', text.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                placeholder="Enter minimum bill amount"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
            </View>
          </Card>

          <Card style={styles.section}>
            <View style={styles.seatsRow}>
              <View style={styles.seatsText}>
                <AppText variant="heading">Seats per Day</AppText>
                <AppText variant="small" color={Colors.textSecondary}>
                  How many customers can claim this offer each day
                </AppText>
              </View>
              <SeatsStepper value={form.seats} onChange={(seats) => update('seats', seats)} />
            </View>
            {isEdit && (
              <AppText variant="caption" color={Colors.textSecondary}>
                Changes apply from today. Seats already claimed stay booked.
              </AppText>
            )}
          </Card>

          <Card style={styles.section}>
            <AppText variant="heading">Offer Availability</AppText>
            <View style={styles.twoColumn}>
              <RadioOption
                label="Today Only"
                selected={form.availability === 'today'}
                onPress={() => update('availability', 'today')}
              />
              <RadioOption
                label="Date Range"
                selected={form.availability === 'dateRange'}
                onPress={() => update('availability', 'dateRange')}
              />
            </View>
            {form.availability === 'weekly' && offer && (
              <AppText variant="small" color={Colors.textSecondary}>
                Currently repeats: {offer.availabilityLabel}. Pick an option above to change it.
              </AppText>
            )}
            {form.availability === 'dateRange' && (
              <View style={styles.twoColumn}>
                <View style={styles.column}>
                  <AppText variant="small">From</AppText>
                  <PickerField
                    mode="date"
                    icon="calendar-outline"
                    value={fromDateOnly(form.startDate)}
                    displayValue={formatDateField(form.startDate)}
                    minimumDate={new Date()}
                    onChange={(date) => {
                      const startDate = toDateOnly(date);
                      setForm((f) => ({ ...f, startDate, endDate: f.endDate < startDate ? startDate : f.endDate }));
                    }}
                    accessibilityLabel="Start date"
                  />
                </View>
                <View style={styles.column}>
                  <AppText variant="small">To</AppText>
                  <PickerField
                    mode="date"
                    icon="calendar-outline"
                    value={fromDateOnly(form.endDate)}
                    displayValue={formatDateField(form.endDate)}
                    minimumDate={fromDateOnly(form.startDate)}
                    onChange={(date) => update('endDate', toDateOnly(date))}
                    accessibilityLabel="End date"
                  />
                </View>
              </View>
            )}
          </Card>

          <Card style={styles.section}>
            <AppText variant="heading">
              Offer Description <AppText variant="body">(Optional)</AppText>
            </AppText>
            <View style={styles.textAreaWrapper}>
              <TextInput
                value={form.description}
                onChangeText={(text) => update('description', text.slice(0, DESCRIPTION_MAX))}
                placeholder="Add a short description for customers"
                placeholderTextColor={Colors.textMuted}
                style={styles.textArea}
                multiline
                maxLength={DESCRIPTION_MAX}
                textAlignVertical="top"
              />
              <AppText variant="caption" color={Colors.textSecondary} style={styles.counter}>
                {form.description.length}/{DESCRIPTION_MAX}
              </AppText>
            </View>
            <InfoNote>
              This offer will be visible to nearby customers on TreatU.{'\n'}You can pause or edit it anytime.
            </InfoNote>
          </Card>

          {error && (
            <AppText variant="smallStrong" color={Colors.danger} style={styles.error}>
              {error}
            </AppText>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button label={isEdit ? 'Save Changes' : 'Create Offer'} onPress={handleSubmit} loading={isSaving} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}>
      <AppText variant={selected ? 'bodyStrong' : 'body'} style={styles.chipLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** − [ 20 ] + — buttons for quick nudges, the middle is typeable for
 * bigger jumps (e.g. a 120-cover restaurant). */
function SeatsStepper({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const current = Number.parseInt(value, 10) || 0;
  const step = (delta: number): void => {
    onChange(String(Math.min(MAX_SEATS, Math.max(1, current + delta))));
  };

  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => step(-1)}
        disabled={current <= 1}
        accessibilityLabel="Fewer seats"
        hitSlop={6}
        style={({ pressed }) => [styles.stepButton, pressed && styles.stepPressed, current <= 1 && styles.stepDisabled]}>
        <Ionicons name="remove" size={22} color={Colors.primaryText} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 3))}
        onBlur={() => onChange(String(Math.min(MAX_SEATS, Math.max(1, current || DEFAULT_SEATS))))}
        keyboardType="number-pad"
        maxLength={3}
        style={styles.stepValue}
        accessibilityLabel="Seats per day"
      />
      <Pressable
        onPress={() => step(1)}
        disabled={current >= MAX_SEATS}
        accessibilityLabel="More seats"
        hitSlop={6}
        style={({ pressed }) => [
          styles.stepButton,
          pressed && styles.stepPressed,
          current >= MAX_SEATS && styles.stepDisabled,
        ]}>
        <Ionicons name="add" size={22} color={Colors.primaryText} />
      </Pressable>
    </View>
  );
}

function RadioOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.radio, selected && styles.radioSelected]}>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <AppText variant="body">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { padding: ScreenPadding, gap: Spacing.three, paddingBottom: Spacing.six },
  section: { gap: Spacing.four, paddingVertical: Spacing.five },
  // All seven chips share one row, as in the mock — flex:1 each with no
  // horizontal padding so "Other" still fits on a 375pt-wide phone.
  chips: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  chipSelected: { borderColor: Colors.primary, borderWidth: 1.5, backgroundColor: Colors.primaryTint },
  chipLabel: { fontSize: 14 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.four,
    minHeight: 56,
    backgroundColor: Colors.surfaceMuted,
  },
  inputRowFocused: { borderColor: Colors.primary, backgroundColor: Colors.background },
  input: { flex: 1, fontSize: 16, color: Colors.text, paddingVertical: Spacing.three },
  rupee: { fontSize: 18 },
  inputDivider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.border },
  seatsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  seatsText: { flex: 1, gap: Spacing.half },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.medium,
  },
  stepButton: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  stepPressed: { backgroundColor: Colors.primaryTint },
  stepDisabled: { opacity: 0.35 },
  stepValue: {
    width: 52,
    height: 48,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  twoColumn: { flexDirection: 'row', gap: Spacing.four },
  column: { flex: 1, gap: Spacing.two },
  radio: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.four,
    minHeight: 56,
  },
  radioSelected: { borderColor: Colors.primary, borderWidth: 1.5, backgroundColor: Colors.primaryTint },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: Colors.primary, borderWidth: 6 },
  radioInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.background },
  textAreaWrapper: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.medium,
    padding: Spacing.four,
    minHeight: 120,
  },
  textArea: { flex: 1, fontSize: 16, color: Colors.text, minHeight: 64, padding: 0 },
  counter: { alignSelf: 'flex-end' },
  error: { textAlign: 'center' },
  footer: {
    paddingHorizontal: ScreenPadding,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
