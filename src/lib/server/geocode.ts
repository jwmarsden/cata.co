export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

  const res = await fetch(url, {
    headers: {
      // Nominatim requires a User-Agent identifying your app
      'User-Agent': 'cata-app/1.0'
    }
  });

  if (!res.ok) throw new Error('Geocode failed');

  const data = await res.json();
  const { city, town, suburb, village, county, state } = data.address ?? {};

  // Pick the most specific available name
  return city ?? town ?? suburb ?? village ?? county ?? state ?? 'Unknown';
}