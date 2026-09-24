/**
 * Haversine formula to calculate the great-circle distance between two points
 * on a sphere (Earth) given their latitudes and longitudes in decimal degrees.
 *
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a GPS point is within a given radius of a reference point.
 */
export function isWithinRadius(
  empLat: number,
  empLon: number,
  refLat: number,
  refLon: number,
  radiusMeters: number
): { allowed: boolean; distance: number } {
  const distance = haversineDistance(empLat, empLon, refLat, refLon);
  return { allowed: distance <= radiusMeters, distance: Math.round(distance) };
}
