/**
 * Astronomical and solar calculation utilities for aviation cockpit display.
 * Calculates subsolar coordinates, solar terminator lines, and twilight bands.
 */

export interface SubsolarPoint {
  lat: number;
  lon: number;
}

export interface TerminatorPoint {
  lon: number;
  nightLat: number;     // Horizon (elevation = 0 deg)
  twilightLat: number;  // Civil twilight (elevation = -6 deg)
}

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Calculates instantaneous subsolar point (lat, lon where sun is directly overhead at zenith)
 * using standard astronomical ephemeris formulas.
 */
export function getSubsolarPoint(date: Date): SubsolarPoint {
  const JD = date.getTime() / 86400000 + 2440587.5;
  const d = JD - 2451545.0;

  // Mean anomaly and mean longitude of the Sun
  const g = (((357.529 + 0.98560028 * d) % 360 + 360) % 360) * RAD;
  const q = (((280.459 + 0.98564736 * d) % 360 + 360) % 360) * RAD;
  const L = q + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;

  // Obliquity of the ecliptic
  const e = (23.439 - 0.00000036 * d) * RAD;

  // Solar declination (subsolar latitude)
  const sinDec = Math.sin(e) * Math.sin(L);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));

  // Solar right ascension
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));

  // Greenwich Mean Sidereal Time
  const GMST = (((280.46061837 + 360.98564736629 * d) % 360 + 360) % 360) * RAD;

  // Subsolar longitude
  let lon = (ra - GMST) * DEG;
  lon = (((lon + 180) % 360 + 360) % 360) - 180;

  return {
    lat: dec * DEG,
    lon,
  };
}

/**
 * Computes the solar day/night terminator curve across all longitudes [-180, 180].
 * Returns array of points defining the night shadow boundary and twilight transition band.
 */
export function calculateTerminatorPath(date: Date, steps = 180): TerminatorPoint[] {
  const subsolar = getSubsolarPoint(date);
  const decRad = subsolar.lat * RAD;
  const tanDec = Math.tan(decRad);

  const points: TerminatorPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const lon = -180 + (i / steps) * 360;
    const deltaLonRad = (lon - subsolar.lon) * RAD;
    const cosDelta = Math.cos(deltaLonRad);

    // Horizon line (elevation = 0)
    // tan(lat) = -cos(deltaLon) / tan(dec)
    let nightLat: number;
    if (Math.abs(tanDec) < 1e-6) {
      // Near equinox: vertical line
      nightLat = cosDelta >= 0 ? 89.9 : -89.9;
    } else {
      nightLat = Math.atan(-cosDelta / tanDec) * DEG;
    }

    // Civil twilight line (elevation = -6 deg)
    // sin(-6) = sin(lat)*sin(dec) + cos(lat)*cos(dec)*cos(deltaLon)
    // Approximate by small latitude shift proportional to solar elevation gradient
    const twilightLat = Math.max(-89.9, Math.min(89.9, nightLat + (subsolar.lat >= 0 ? -6 : 6)));

    points.push({
      lon,
      nightLat: Math.max(-89.9, Math.min(89.9, nightLat)),
      twilightLat,
    });
  }

  return points;
}

/**
 * Converts meters to nautical miles (NM) rounded to nearest whole number.
 */
export function metersToNauticalMiles(meters: number): number {
  return Math.round(meters * 0.000539957);
}

/**
 * Converts meters to kilometers.
 */
export function metersToKm(meters: number): number {
  return Math.round(meters / 1000);
}

/**
 * Formats a 3-digit aviation compass heading/bearing string, e.g. 058 deg TRK
 */
export function formatHeading(degrees: number): string {
  const norm = ((Math.round(degrees) % 360) + 360) % 360;
  return `${norm.toString().padStart(3, '0')}°`;
}

/**
 * Formats signed elevation angle, e.g. +34.2 deg or -12.5 deg
 */
export function formatElevation(degrees: number): string {
  const sign = degrees >= 0 ? '+' : '';
  return `${sign}${degrees.toFixed(1)}°`;
}

/**
 * Approximate airport UTC offset from longitude
 */
export function getApproxUtcOffset(longitude: number, iata?: string): string {
  // Known airport offsets for top popular routes
  const overrides: Record<string, string> = {
    JFK: 'UTC-4',
    EWR: 'UTC-4',
    LGA: 'UTC-4',
    LHR: 'UTC+1',
    LGW: 'UTC+1',
    SFO: 'UTC-7',
    LAX: 'UTC-7',
    NRT: 'UTC+9',
    HND: 'UTC+9',
    DXB: 'UTC+4',
    CDG: 'UTC+2',
    DEL: 'UTC+5:30',
    SIN: 'UTC+8',
    HKG: 'UTC+8',
    SYD: 'UTC+10',
  };

  if (iata && overrides[iata.toUpperCase()]) {
    return overrides[iata.toUpperCase()];
  }

  const hours = Math.round(longitude / 15);
  const sign = hours >= 0 ? '+' : '-';
  return `UTC${sign}${Math.abs(hours)}`;
}
