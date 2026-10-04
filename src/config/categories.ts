import type { CategoryDto } from '@/api/types';

// Mirrors backend/src/config/categories.config.ts — a fixed content list,
// not admin-manageable data, so it's duplicated rather than fetched. Kept
// here (rather than only reading `homeFeed.categories`) so Explore has
// categories to filter by even when opened directly, without waiting on
// the home-feed request.
export const CATEGORIES: CategoryDto[] = [
  { key: 'biryani', label: 'Biryani', iconEmoji: '🍚' },
  { key: 'pizza', label: 'Pizza', iconEmoji: '🍕' },
  { key: 'cafe', label: 'Cafe', iconEmoji: '☕' },
  { key: 'burgers', label: 'Burgers', iconEmoji: '🍔' },
  { key: 'sushi', label: 'Sushi', iconEmoji: '🍣' },
  { key: 'dessert', label: 'Dessert', iconEmoji: '🍰' },
];
