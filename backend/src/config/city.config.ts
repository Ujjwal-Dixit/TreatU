/**
 * MVP supports exactly one city (confirmed decision — no GPS-based search,
 * no multi-city yet). `center` is used as the reference point for the
 * displayed distanceKm on restaurant cards, since MVP never captures the
 * customer's own location — see haversine.util.ts.
 *
 * TODO(product): confirm the real launch city + its accurate center
 * coordinates before onboarding real restaurants. Placeholder below.
 */
export const LAUNCH_CITY = {
  slug: 'mumbai',
  name: 'Mumbai',
  timezone: 'Asia/Kolkata',
  center: { latitude: 19.076, longitude: 72.8777 },
} as const;
