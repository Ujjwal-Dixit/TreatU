import { useState, type ComponentProps } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface PickerFieldProps {
  mode: 'time' | 'date';
  value: Date;
  /** Text shown in the field, e.g. "04:00 PM". */
  displayValue: string;
  onChange: (value: Date) => void;
  icon: ComponentProps<typeof Ionicons>['name'];
  minimumDate?: Date;
  accessibilityLabel: string;
}

/** Field-styled button that opens the platform picker: a bottom sheet with
 * a spinner on iOS (Done/Cancel, so scrolling doesn't commit mid-spin), and
 * the native dialog on Android (which already has its own OK/Cancel). */
export function PickerField({
  mode,
  value,
  displayValue,
  onChange,
  icon,
  minimumDate,
  accessibilityLabel,
}: PickerFieldProps) {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const open = (): void => {
    setDraft(value);
    setIsOpen(true);
  };

  return (
    <>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}>
        <View style={styles.iconBubble}>
          <Ionicons name={icon} size={20} color={Colors.primaryText} />
        </View>
        <AppText variant="body" style={styles.value} numberOfLines={1}>
          {displayValue}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={Colors.text} />
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.two }]}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setIsOpen(false)} hitSlop={8}>
                <AppText variant="bodyStrong" color={Colors.textSecondary}>
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  onChange(draft);
                  setIsOpen(false);
                }}
                hitSlop={8}>
                <AppText variant="bodyStrong" color={Colors.primaryText}>
                  Done
                </AppText>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode={mode}
              display="spinner"
              minuteInterval={mode === 'time' ? 15 : undefined}
              minimumDate={minimumDate}
              themeVariant="light"
              textColor={Colors.text}
              onValueChange={(_, date) => setDraft(date)}
            />
          </View>
        </Modal>
      ) : (
        isOpen && (
          <DateTimePicker
            value={value}
            mode={mode}
            minimumDate={minimumDate}
            onValueChange={(_, date) => {
              setIsOpen(false);
              onChange(date);
            }}
            onDismiss={() => setIsOpen(false)}
          />
        )
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    minHeight: 56,
    backgroundColor: Colors.background,
  },
  fieldPressed: { backgroundColor: Colors.surfaceMuted },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
});
