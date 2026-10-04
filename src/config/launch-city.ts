/**
 * MVP supports exactly one city — no region switcher backend endpoint
 * exists (see backend/src/config/city.config.ts, which this must match).
 * The design shows a working "Change region" control; for MVP the picker
 * is shown but inert (see the Home header) rather than silently pretending
 * to work, since there's nowhere else to switch to yet.
 */
export const LAUNCH_CITY_NAME = 'Mumbai';
