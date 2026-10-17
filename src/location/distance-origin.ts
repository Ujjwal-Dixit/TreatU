import { useSyncExternalStore } from 'react';

/** Coarse customer location sent as `?lat=&lng=` so "X km away" is measured
 * from them, not the city centre (the server ignores it when they're
 * outside the launch city). Rounded to 2 decimals (~1 km): enough for a
 * distance label, less precise than we need to know — and it keeps query
 * keys stable while someone walks around, instead of refetching on every
 * GPS jitter. */
export interface DistanceOrigin {
  lat: number;
  lng: number;
}

let origin: DistanceOrigin | null = null;
const listeners = new Set<() => void>();

const round = (value: number): number => Math.round(value * 100) / 100;

export function setDistanceOrigin(latitude: number, longitude: number): void {
  const next = { lat: round(latitude), lng: round(longitude) };
  if (origin && origin.lat === next.lat && origin.lng === next.lng) return;
  origin = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getOrigin = (): DistanceOrigin | null => origin;

/** Null until the Home screen's location request succeeds. */
export function useDistanceOrigin(): DistanceOrigin | null {
  return useSyncExternalStore(subscribe, getOrigin, () => null);
}
