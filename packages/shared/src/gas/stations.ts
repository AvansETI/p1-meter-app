/**
 * KNMI land stations with hourly temperature and wind since at least 2006, so each has a full
 * 20-year normal (docs/design/2026-11-15-gas-analysis.md §5). Offshore, platform and
 * wind-only stations are left out.
 */
export interface Station {
  code: number;
  name: string;
  lat: number;
  lon: number;
}

export const STATIONS: readonly Station[] = [
  { code: 235, name: 'De Kooy', lat: 52.928, lon: 4.781 },
  { code: 240, name: 'Schiphol', lat: 52.318, lon: 4.79 },
  { code: 242, name: 'Vlieland', lat: 53.241, lon: 4.921 },
  { code: 249, name: 'Berkhout', lat: 52.644, lon: 4.979 },
  { code: 251, name: 'Hoorn (Terschelling)', lat: 53.392, lon: 5.346 },
  { code: 260, name: 'De Bilt', lat: 52.1, lon: 5.18 },
  { code: 267, name: 'Stavoren', lat: 52.898, lon: 5.384 },
  { code: 269, name: 'Lelystad', lat: 52.458, lon: 5.52 },
  { code: 270, name: 'Leeuwarden', lat: 53.224, lon: 5.752 },
  { code: 273, name: 'Marknesse', lat: 52.703, lon: 5.888 },
  { code: 275, name: 'Deelen', lat: 52.056, lon: 5.873 },
  { code: 277, name: 'Lauwersoog', lat: 53.413, lon: 6.2 },
  { code: 278, name: 'Heino', lat: 52.435, lon: 6.259 },
  { code: 279, name: 'Hoogeveen', lat: 52.75, lon: 6.574 },
  { code: 280, name: 'Eelde', lat: 53.125, lon: 6.585 },
  { code: 283, name: 'Hupsel', lat: 52.069, lon: 6.657 },
  { code: 286, name: 'Nieuw Beerta', lat: 53.196, lon: 7.15 },
  { code: 290, name: 'Twenthe', lat: 52.274, lon: 6.891 },
  { code: 310, name: 'Vlissingen', lat: 51.442, lon: 3.596 },
  { code: 319, name: 'Westdorpe', lat: 51.226, lon: 3.861 },
  { code: 330, name: 'Hoek van Holland', lat: 51.992, lon: 4.122 },
  { code: 340, name: 'Woensdrecht', lat: 51.449, lon: 4.342 },
  { code: 344, name: 'Rotterdam', lat: 51.962, lon: 4.447 },
  { code: 348, name: 'Cabauw', lat: 51.97, lon: 4.926 },
  { code: 350, name: 'Gilze-Rijen', lat: 51.566, lon: 4.936 },
  { code: 356, name: 'Herwijnen', lat: 51.859, lon: 5.146 },
  { code: 370, name: 'Eindhoven', lat: 51.451, lon: 5.377 },
  { code: 375, name: 'Volkel', lat: 51.659, lon: 5.707 },
  { code: 377, name: 'Ell', lat: 51.198, lon: 5.763 },
  { code: 380, name: 'Maastricht', lat: 50.906, lon: 5.762 },
];

/** De Bilt: the default without a location, and the reference for comparisons (§4.1). */
export const REFERENCE_STATION = 260;

export const STATION_CODES = STATIONS.map((s) => s.code);

export function stationByCode(code: number): Station | undefined {
  return STATIONS.find((s) => s.code === code);
}

/** Distance in km on a sphere; accurate enough to pick the nearest station. */
function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function nearestStation(lat: number, lon: number): Station {
  let best = STATIONS[0]!;
  let bestKm = Infinity;
  for (const station of STATIONS) {
    const km = distanceKm(lat, lon, station.lat, station.lon);
    if (km < bestKm) [best, bestKm] = [station, km];
  }
  return best;
}
