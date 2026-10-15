import {
  calculateGreatCircleDistance,
  calculateGreatCircleBearing,
  interpolateGreatCirclePoint,
  calculateSunPositionForFlight,
} from '@/lib/flightCalculator';
import {
  getSubsolarPoint,
  calculateTerminatorPath,
  metersToNauticalMiles,
  formatHeading,
  getApproxUtcOffset,
} from '@/lib/solarTerminator';

describe('Flight Sun Tracker Mathematical & Aviation Unit Tests', () => {
  describe('Spherical Trigonometry and Geodesic Functions', () => {
    it('calculates true Great Circle distance between JFK and LHR', () => {
      // JFK approx: 40.64° N, 73.78° W
      // LHR approx: 51.47° N, 0.46° W
      const distMeters = calculateGreatCircleDistance(40.64, -73.78, 51.47, -0.46);
      const distNm = metersToNauticalMiles(distMeters);
      
      // Great circle distance JFK to LHR is ~5,550 km (~2,997 NM)
      expect(distMeters).toBeGreaterThan(5500000);
      expect(distMeters).toBeLessThan(5600000);
      expect(distNm).toBeGreaterThan(2900);
      expect(distNm).toBeLessThan(3100);
    });

    it('calculates initial Great Circle bearing from JFK to LHR', () => {
      const bearing = calculateGreatCircleBearing(40.64, -73.78, 51.47, -0.46);
      // North Atlantic Great Circle heading from JFK starts pointing Northeast (~50° to 56°)
      expect(bearing).toBeGreaterThan(45);
      expect(bearing).toBeLessThan(60);
      expect(formatHeading(bearing)).toMatch(/^\d{3}°$/);
    });

    it('interpolates intermediate waypoints via spherical Slerp', () => {
      const start = { lat: 40.64, lon: -73.78 };
      const end = { lat: 51.47, lon: -0.46 };

      const pt0 = interpolateGreatCirclePoint(start.lat, start.lon, end.lat, end.lon, 0);
      const pt50 = interpolateGreatCirclePoint(start.lat, start.lon, end.lat, end.lon, 0.5);
      const pt100 = interpolateGreatCirclePoint(start.lat, start.lon, end.lat, end.lon, 1);

      expect(pt0.latitude).toBeCloseTo(start.lat, 1);
      expect(pt0.longitude).toBeCloseTo(start.lon, 1);

      // Great circle arcs arc northward over the North Atlantic
      expect(pt50.latitude).toBeGreaterThan(50);
      expect(pt50.longitude).toBeLessThan(-20);
      expect(pt50.longitude).toBeGreaterThan(-50);

      expect(pt100.latitude).toBeCloseTo(end.lat, 1);
      expect(pt100.longitude).toBeCloseTo(end.lon, 1);
    });
  });

  describe('Solar Ephemeris & Terminator Calculations', () => {
    it('computes subsolar coordinates correctly for summer solstice', () => {
      const juneSolstice = new Date('2024-06-21T12:00:00Z');
      const subsolar = getSubsolarPoint(juneSolstice);

      // At June solstice noon UTC, subsolar latitude is ~23.44° N and longitude is ~0°
      expect(subsolar.lat).toBeCloseTo(23.44, 0.5);
      expect(Math.abs(subsolar.lon)).toBeLessThan(5);
    });

    it('generates continuous day/night terminator path across 360 degrees', () => {
      const date = new Date('2024-03-20T12:00:00Z'); // Equinox
      const path = calculateTerminatorPath(date, 36);

      expect(path.length).toBe(37);
      expect(path[0].lon).toBe(-180);
      expect(path[path.length - 1].lon).toBe(180);
      path.forEach((pt) => {
        expect(pt.nightLat).toBeGreaterThanOrEqual(-90);
        expect(pt.nightLat).toBeLessThanOrEqual(90);
        expect(pt.twilightLat).toBeGreaterThanOrEqual(-90);
        expect(pt.twilightLat).toBeLessThanOrEqual(90);
      });
    });

    it('returns correct UTC offsets for major aviation hubs', () => {
      expect(getApproxUtcOffset(0, 'JFK')).toBe('UTC-4');
      expect(getApproxUtcOffset(0, 'LHR')).toBe('UTC+1');
      expect(getApproxUtcOffset(0, 'SFO')).toBe('UTC-7');
      expect(getApproxUtcOffset(0, 'NRT')).toBe('UTC+9');
      expect(getApproxUtcOffset(0, 'DXB')).toBe('UTC+4');
      expect(getApproxUtcOffset(0, 'DEL')).toBe('UTC+5:30');
    });
  });

  describe('Flight Sun Tracker Seat Recommendation Logic', () => {
    it('evaluates daytime Eastbound transatlantic flight JFK -> LHR with shade preference', () => {
      const flightResult = calculateSunPositionForFlight({
        departure: 'JFK',
        arrival: 'LHR',
        departureTime: new Date('2024-03-15T08:00:00Z'),
        durationMinutes: 420,
        preference: 'shade',
      });

      expect(flightResult.globeData.departure.iata).toBe('JFK');
      expect(flightResult.globeData.arrival.iata).toBe('LHR');
      expect(flightResult.globeData.flightPath.length).toBeGreaterThan(50);
      expect(flightResult.confidence).toBeGreaterThan(50);
      expect(['left', 'right']).toContain(flightResult.recommendation);
      expect(flightResult.description).toBeDefined();

      // Ensure zero emojis in generated description
      const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;
      expect(flightResult.description).not.toMatch(emojiRegex);
    });

    it('inverts or shifts recommendation when toggling between sun and shade preferences', () => {
      const shadeFlight = calculateSunPositionForFlight({
        departure: 'JFK',
        arrival: 'LHR',
        departureTime: new Date('2024-03-15T08:00:00Z'),
        durationMinutes: 420,
        preference: 'shade',
      });

      const sunFlight = calculateSunPositionForFlight({
        departure: 'JFK',
        arrival: 'LHR',
        departureTime: new Date('2024-03-15T08:00:00Z'),
        durationMinutes: 420,
        preference: 'sun',
      });

      expect(shadeFlight.preference).toBe('shade');
      expect(sunFlight.preference).toBe('sun');

      // In daytime eastbound flight where sun is predominantly to the right (south),
      // shade mode should pick Left (Port) and sun mode should pick Right (Starboard)
      if (shadeFlight.recommendation !== 'either') {
        expect(sunFlight.recommendation).not.toBe(shadeFlight.recommendation);
      }
    });

    it('handles transpacific flight LAX -> NRT with valid waypoints and bearings', () => {
      const laxNrt = calculateSunPositionForFlight({
        departure: 'LAX',
        arrival: 'NRT',
        departureTime: new Date('2024-03-15T18:00:00Z'),
        durationMinutes: 650,
        preference: 'shade',
      });

      const path = laxNrt.globeData.flightPath;
      expect(path.length).toBeGreaterThan(100);

      const firstPoint = path[0];
      const midPoint = path[Math.floor(path.length / 2)];
      const lastPoint = path[path.length - 1];

      // Instantaneous bearings must evolve along great circle
      expect(firstPoint.aircraftBearing).not.toBe(lastPoint.aircraftBearing);
      expect(midPoint.location.lat).toBeGreaterThan(45); // Arcs over the Aleutian islands / Alaska
    });
  });
});
