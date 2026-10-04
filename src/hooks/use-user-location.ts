import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { LAUNCH_CITY_NAME } from '@/config/launch-city';

export type UserLocationStatus =
  | 'idle'
  | 'requesting'
  | 'in-city'
  | 'out-of-city'
  /** Permission denied, GPS unavailable, or reverse geocoding failed —
   * treated the same way on purpose: fail open. MVP has exactly one
   * supported city, so "we couldn't confirm your location" should never
   * block someone from browsing it, only "confirmed you're somewhere
   * else" is worth telling them about. */
  | 'unavailable';

interface UseUserLocationResult {
  status: UserLocationStatus;
  detectedCity: string | null;
  requestLocation: () => Promise<void>;
}

export function useUserLocation(): UseUserLocationResult {
  const [status, setStatus] = useState<UserLocationStatus>('idle');
  const [detectedCity, setDetectedCity] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    setStatus('requesting');
    try {
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== 'granted') {
        setStatus('unavailable');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const city = place?.city ?? place?.subregion ?? null;
      setDetectedCity(city);

      const matchesLaunchCity = city?.toLowerCase().includes(LAUNCH_CITY_NAME.toLowerCase()) ?? false;
      setStatus(matchesLaunchCity ? 'in-city' : 'out-of-city');
    } catch {
      setStatus('unavailable');
    }
  }, []);

  return { status, detectedCity, requestLocation };
}
