import { haversineDistanceKm } from './haversine.util';

describe('haversineDistanceKm', () => {
  it('returns 0 for identical coordinates', () => {
    const point = { latitude: 19.076, longitude: 72.8777 };
    expect(haversineDistanceKm(point, point)).toBe(0);
  });

  it('matches the known distance between Mumbai and Delhi within 1%', () => {
    const mumbai = { latitude: 19.076, longitude: 72.8777 };
    const delhi = { latitude: 28.7041, longitude: 77.1025 };
    const distance = haversineDistanceKm(mumbai, delhi);
    // Widely-cited straight-line distance is ~1150km
    expect(distance).toBeGreaterThan(1140);
    expect(distance).toBeLessThan(1160);
  });
});
