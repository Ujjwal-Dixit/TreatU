import { LAUNCH_CITY } from '../../config/city.config';
import { resolveDistanceOrigin } from './distance-origin';

describe('resolveDistanceOrigin', () => {
  it('uses the city centre when no location is sent', () => {
    expect(resolveDistanceOrigin()).toEqual(LAUNCH_CITY.center);
    expect(resolveDistanceOrigin({ lat: 19.1 })).toEqual(LAUNCH_CITY.center);
  });

  it("uses the customer's location inside the launch city", () => {
    expect(resolveDistanceOrigin({ lat: 19.05, lng: 72.83 })).toEqual({
      latitude: 19.05,
      longitude: 72.83,
    });
  });

  it('falls back to the city centre for a customer in another city', () => {
    // Delhi — ~1,150 km from Mumbai.
    expect(resolveDistanceOrigin({ lat: 28.61, lng: 77.21 })).toEqual(
      LAUNCH_CITY.center,
    );
  });
});
