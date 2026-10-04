const EARTH_RADIUS_KM = 6371;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Straight-line distance, not driving distance — enough for an MVP "X km
 * away" display sorted from a fixed city-center point (see city.config.ts).
 * No PostGIS/spatial index needed at this scale; revisit if/when real
 * GPS-radius search is built. */
export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
