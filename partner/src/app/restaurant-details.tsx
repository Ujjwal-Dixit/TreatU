import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/screen-header';
import { AppText, Button, Card, ErrorState, InfoNote, LoadingState } from '@/components/ui';
import { Colors, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useRestaurant, useUpdateRestaurant } from '@/hooks/use-owner';
import { isApiError } from '@/api/api-error';
import type { RestaurantDto, RestaurantUpdateInput } from '@/api/types';

// Mirror the backend's UpdateRestaurantDto limits.
const NAME_MAX = 120;
const ADDRESS_MAX = 200;
const DESCRIPTION_MAX = 500;
const CUISINE_MAX_LENGTH = 30;
const CUISINES_MAX = 6;
const PRICE_TIERS = [1, 2, 3, 4] as const;

interface FormState {
  name: string;
  cuisines: string[];
  cuisineDraft: string;
  priceTier: number;
  addressLine: string;
  description: string;
}

function initialState(restaurant: RestaurantDto): FormState {
  return {
    name: restaurant.name,
    cuisines: restaurant.cuisines,
    cuisineDraft: '',
    priceTier: restaurant.priceTier,
    addressLine: restaurant.addressLine,
    description: restaurant.description,
  };
}

export default function RestaurantDetailsScreen() {
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
        <ErrorState message="Couldn't load your restaurant." onRetry={() => void refetch()} />
      </Screen>
    );
  }
  return <DetailsForm restaurant={restaurant} />;
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Restaurant Details" fallbackHref="/profile" bordered />
      {children}
    </View>
  );
}

function DetailsForm({ restaurant }: { restaurant: RestaurantDto }) {
  const [form, setForm] = useState<FormState>(() => initialState(restaurant));
  const [error, setError] = useState<string | null>(null);
  const updateRestaurant = useUpdateRestaurant();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const addCuisine = (): void => {
    const cuisine = form.cuisineDraft.trim();
    if (!cuisine) return;
    const isDuplicate = form.cuisines.some((c) => c.toLowerCase() === cuisine.toLowerCase());
    setForm((f) => ({ ...f, cuisines: isDuplicate ? f.cuisines : [...f.cuisines, cuisine], cuisineDraft: '' }));
    setError(null);
  };

  /** Only the fields that actually changed, so an untouched field never
   * overwrites an edit made from another phone in the meantime. */
  const buildInput = (): RestaurantUpdateInput | string => {
    const name = form.name.trim();
    const addressLine = form.addressLine.trim();
    const description = form.description.trim();
    if (!name) return 'Enter your restaurant name.';
    if (!addressLine) return 'Enter your address.';
    if (form.cuisines.length === 0) return 'Add at least one cuisine.';

    const input: RestaurantUpdateInput = {};
    if (name !== restaurant.name) input.name = name;
    if (addressLine !== restaurant.addressLine) input.addressLine = addressLine;
    if (description !== restaurant.description) input.description = description;
    if (form.priceTier !== restaurant.priceTier) input.priceTier = form.priceTier;
    if (form.cuisines.join('\n') !== restaurant.cuisines.join('\n')) input.cuisines = form.cuisines;
    return input;
  };

  const handleSave = (): void => {
    const input = buildInput();
    if (typeof input === 'string') {
      setError(input);
      return;
    }
    if (Object.keys(input).length === 0) {
      router.back();
      return;
    }
    updateRestaurant.mutate(input, {
      onSuccess: () => router.back(),
      onError: (err) => setError(isApiError(err) ? err.message : 'Something went wrong. Please try again.'),
    });
  };

  const canAddCuisine = form.cuisines.length < CUISINES_MAX;

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.photoCard}>
            <Image source={{ uri: restaurant.coverImageUrl }} style={styles.cover} contentFit="cover" />
            <AppText variant="small" color={Colors.textSecondary} style={styles.photoNote}>
              To change your photos, contact TreatU support.
            </AppText>
          </Card>

          <Card style={styles.section}>
            <AppText variant="heading">Restaurant Name</AppText>
            <View style={styles.inputRow}>
              <TextInput
                value={form.name}
                onChangeText={(text) => update('name', text)}
                placeholder="Your restaurant's name"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                maxLength={NAME_MAX}
                autoCapitalize="words"
              />
            </View>
          </Card>

          <Card style={styles.section}>
            <View style={styles.headingRow}>
              <AppText variant="heading">Cuisines</AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                {form.cuisines.length}/{CUISINES_MAX}
              </AppText>
            </View>
            {form.cuisines.length > 0 && (
              <View style={styles.tags}>
                {form.cuisines.map((cuisine) => (
                  <Pressable
                    key={cuisine}
                    onPress={() =>
                      update(
                        'cuisines',
                        form.cuisines.filter((c) => c !== cuisine),
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${cuisine}`}
                    style={styles.tag}>
                    <AppText variant="smallStrong" color={Colors.primaryText}>
                      {cuisine}
                    </AppText>
                    <Ionicons name="close" size={16} color={Colors.primaryText} />
                  </Pressable>
                ))}
              </View>
            )}
            {canAddCuisine && (
              <View style={styles.inputRow}>
                <TextInput
                  value={form.cuisineDraft}
                  onChangeText={(text) => update('cuisineDraft', text)}
                  onSubmitEditing={addCuisine}
                  submitBehavior="submit"
                  returnKeyType="done"
                  placeholder="Add a cuisine, e.g. Street Food"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.input}
                  maxLength={CUISINE_MAX_LENGTH}
                  autoCapitalize="words"
                />
                <Pressable
                  onPress={addCuisine}
                  disabled={!form.cuisineDraft.trim()}
                  hitSlop={8}
                  accessibilityLabel="Add cuisine"
                  style={!form.cuisineDraft.trim() && styles.addDisabled}>
                  <Ionicons name="add-circle" size={28} color={Colors.primary} />
                </Pressable>
              </View>
            )}
            <AppText variant="caption" color={Colors.textSecondary}>
              The first cuisine is shown under your name. Customers also find you by these when they tap a category.
            </AppText>
          </Card>

          <Card style={styles.section}>
            <AppText variant="heading">Price Range</AppText>
            <View style={styles.chips}>
              {PRICE_TIERS.map((tier) => {
                const selected = form.priceTier === tier;
                return (
                  <Pressable
                    key={tier}
                    onPress={() => update('priceTier', tier)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Price range ${tier} of 4`}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <AppText variant={selected ? 'bodyStrong' : 'body'}>{'₹'.repeat(tier)}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card style={styles.section}>
            <AppText variant="heading">Address</AppText>
            <View style={styles.textAreaWrapper}>
              <TextInput
                value={form.addressLine}
                onChangeText={(text) => update('addressLine', text)}
                placeholder="Shop number, street, area"
                placeholderTextColor={Colors.textMuted}
                style={styles.textArea}
                multiline
                maxLength={ADDRESS_MAX}
                textAlignVertical="top"
              />
            </View>
            <InfoNote>Your map location doesn&apos;t change with this. If you&apos;ve moved, contact TreatU support.</InfoNote>
          </Card>

          <Card style={styles.section}>
            <AppText variant="heading">
              About <AppText variant="body">(Optional)</AppText>
            </AppText>
            <View style={styles.textAreaWrapper}>
              <TextInput
                value={form.description}
                onChangeText={(text) => update('description', text.slice(0, DESCRIPTION_MAX))}
                placeholder="Tell customers what makes your place special"
                placeholderTextColor={Colors.textMuted}
                style={[styles.textArea, styles.textAreaTall]}
                multiline
                maxLength={DESCRIPTION_MAX}
                textAlignVertical="top"
              />
              <AppText variant="caption" color={Colors.textSecondary} style={styles.counter}>
                {form.description.length}/{DESCRIPTION_MAX}
              </AppText>
            </View>
          </Card>

          {error && (
            <AppText variant="smallStrong" color={Colors.danger} style={styles.error}>
              {error}
            </AppText>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Save Changes" onPress={handleSave} loading={updateRestaurant.isPending} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { padding: ScreenPadding, gap: Spacing.three, paddingBottom: Spacing.six },
  section: { gap: Spacing.four, paddingVertical: Spacing.five },
  photoCard: { gap: Spacing.three },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.medium, backgroundColor: Colors.surfaceMuted },
  photoNote: { textAlign: 'center' },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  input: { flex: 1, fontSize: 16, color: Colors.text, paddingVertical: Spacing.three },
  addDisabled: { opacity: 0.35 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.pill,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
  },
  chips: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  chipSelected: { borderColor: Colors.primary, borderWidth: 1.5, backgroundColor: Colors.primaryTint },
  textAreaWrapper: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.medium,
    padding: Spacing.four,
  },
  textArea: { fontSize: 16, color: Colors.text, minHeight: 48, padding: 0 },
  textAreaTall: { minHeight: 96 },
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
