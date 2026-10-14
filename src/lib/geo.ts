/** Port of App\Classes\HelperClass::distance_in_miles(..., "M") — including its +2 and ×0.8684 fudge. */
export function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const rad = (d: number) => (d * Math.PI) / 180;
  const theta = lon1 - lon2;
  let dist = Math.sin(rad(lat1)) * Math.sin(rad(lat2)) + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(theta));
  dist = Math.acos(Math.min(1, Math.max(-1, dist)));
  const miles = (dist * 180) / Math.PI * 60 * 1.1515 + 2;
  return Math.round(miles * 0.8684 * 10) / 10;
}
