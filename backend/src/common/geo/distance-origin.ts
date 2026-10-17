import { LAUNCH_CITY } from '../../config/city.config';
import { haversineDistanceKm, type Coordinates } from './haversine.util';

/** Beyond this, the customer is browsing from another city (planning a
 * trip, or GPS is off) and "1,400 km away" on every card helps no one —
 * distances fall back to the city centre, which is what the app's
 * out-of-area banner already tells them they're looking at. */
export const MAX_ORIGIN_DISTANCE_KM = 50;

/** Where "X km away" is measured from: the customer, when we know where
 * they are and they're in the launch city; otherwise the city centre. */
export function resolveDistanceOrigin(query?: {
  lat?: number;
  lng?: number;
}): Coordinates {
  if (query?.lat === undefined || query.lng === undefined) {
    return LAUNCH_CITY.center;
  }
  const customer = { latitude: query.lat, longitude: query.lng };
  return haversineDistanceKm(LAUNCH_CITY.center, customer) <=
    MAX_ORIGIN_DISTANCE_KM
    ? customer
    : LAUNCH_CITY.center;
}
