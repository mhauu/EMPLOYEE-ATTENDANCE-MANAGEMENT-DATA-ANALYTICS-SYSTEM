import { describe, it, expect } from 'vitest';
import { haversineDistance, isWithinRadius } from '../src/utils/haversine';

describe('GPS Geofencing - Haversine Distance Formula', () => {
  // Reference point: Vincom Center D1, HCMC (10.776889, 106.700806)
  const officeLat = 10.776889;
  const officeLng = 106.700806;

  it('should return 0 meters when employee is at exact office coordinate', () => {
    const dist = haversineDistance(officeLat, officeLng, officeLat, officeLng);
    expect(Math.round(dist)).toBe(0);
  });

  it('should allow check-in when employee is within allowed radius (e.g. 50m away with 100m radius)', () => {
    // 0.0003 deg latitude is ~33 meters
    const empLat = officeLat + 0.0003;
    const empLng = officeLng;
    const result = isWithinRadius(empLat, empLng, officeLat, officeLng, 100);

    expect(result.allowed).toBe(true);
    expect(result.distance).toBeLessThanOrEqual(100);
  });

  it('should reject check-in when employee is outside allowed radius (e.g. 500m away with 100m radius)', () => {
    // 0.005 deg latitude is ~550 meters
    const empLat = officeLat + 0.005;
    const empLng = officeLng;
    const result = isWithinRadius(empLat, empLng, officeLat, officeLng, 100);

    expect(result.allowed).toBe(false);
    expect(result.distance).toBeGreaterThan(100);
  });

  it('should correctly measure distance between HCMC and Da Nang (approx 600km)', () => {
    const daNangLat = 16.054407;
    const daNangLng = 108.202167;
    const dist = haversineDistance(officeLat, officeLng, daNangLat, daNangLng);
    const distKm = dist / 1000;

    expect(distKm).toBeGreaterThan(580);
    expect(distKm).toBeLessThan(650);
  });
});
