/**
 * The category chip row on Home. Fixed content list for MVP, not an
 * admin-manageable table — same reasoning as LAUNCH_CITY: promote to real
 * data once there's an actual need to add/reorder categories without a
 * deploy.
 */
export interface CategoryDefinition {
  key: string;
  label: string;
  iconEmoji: string;
}

export const CATEGORIES: readonly CategoryDefinition[] = [
  { key: 'biryani', label: 'Biryani', iconEmoji: '🍚' },
  { key: 'pizza', label: 'Pizza', iconEmoji: '🍕' },
  { key: 'cafe', label: 'Cafe', iconEmoji: '☕' },
  { key: 'burgers', label: 'Burgers', iconEmoji: '🍔' },
  { key: 'sushi', label: 'Sushi', iconEmoji: '🍣' },
  { key: 'dessert', label: 'Dessert', iconEmoji: '🍰' },
];

/** A restaurant matches a category if any of its cuisine tags contains the
 * category label, case-insensitively (e.g. cuisines: ["Indian","Cafe"]
 * matches category "cafe"). Simple substring match is enough for a
 * hand-curated, small restaurant set. */
export function matchesCategory(
  cuisines: readonly string[],
  categoryKey: string,
): boolean {
  const category = CATEGORIES.find((c) => c.key === categoryKey);
  if (!category) return false;
  const label = category.label.toLowerCase();
  return cuisines.some((cuisine) => cuisine.toLowerCase().includes(label));
}
