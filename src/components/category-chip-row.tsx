import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CategoryDto } from '@/api/types';

interface CategoryChipRowProps {
  categories: CategoryDto[];
  selectedKey?: string;
  onSelect: (key: string | undefined) => void;
}

export function CategoryChipRow({ categories, selectedKey, onSelect }: CategoryChipRowProps) {
  const theme = useTheme();

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={categories}
      keyExtractor={(item) => item.key}
      style={styles.list}
      contentContainerStyle={styles.row}
      renderItem={({ item }) => {
        const isSelected = selectedKey === item.key;
        return (
          <Pressable onPress={() => onSelect(isSelected ? undefined : item.key)} style={styles.chip}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: theme.backgroundElement },
                isSelected && { borderColor: theme.accent, borderWidth: 2 },
              ]}>
              <ThemedText style={styles.emoji}>{item.iconEmoji}</ThemedText>
            </View>
            <ThemedText type="small" numberOfLines={1} style={styles.label}>
              {item.label}
            </ThemedText>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  // Never let a flex:1 sibling (e.g. the results list on Explore) squeeze this row and clip the labels.
  list: { flexGrow: 0, flexShrink: 0 },
  row: { gap: Spacing.four, paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  chip: { alignItems: 'center', gap: Spacing.one, width: 64 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24, lineHeight: 30 },
  label: { textAlign: 'center' },
});
