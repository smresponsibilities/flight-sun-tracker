import { getPosition, getTimes } from 'suncalc';
import { formatInTimeZone } from 'date-fns-tz';
import airportsData from './data/airports.json';

// Constants
const EARTH_RADIUS_METERS = 6371000;

// Geodesic / Spherical Trigonometry Utilities
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates Great Circle distance between two points on the sphere in meters (Haversine formula).
 */
export function calculateGreatCircleDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates instantaneous Great Circle initial bearing from point 1 to point 2 in degrees [0, 360).
 */
export function calculateGreatCircleBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (toDegrees(theta) + 360) % 360;
}

/**
 * Computes intermediate point along Great Circle arc using Spherical Linear Interpolation (Slerp).
 * fraction f in [0, 1].
 */
export function interpolateGreatCirclePoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  f: number
): { latitude: number; longitude: number } {
  if (f <= 0) return { latitude: lat1, longitude: lon1 };
  if (f >= 1) return { latitude: lat2, longitude: lon2 };

  const phi1 = toRadians(lat1);
  const lambda1 = toRadians(lon1);
  const phi2 = toRadians(lat2);
  const lambda2 = toRadians(lon2);

  // Angular distance delta
  const cosDelta =
    Math.sin(phi1) * Math.sin(phi2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);
  const delta = Math.acos(Math.max(-1, Math.min(1, cosDelta)));

  if (delta < 1e-9) {
    return { latitude: lat1, longitude: lon1 };
  }

  const sinDelta = Math.sin(delta);
  const A = Math.sin((1 - f) * delta) / sinDelta;
  const B = Math.sin(f * delta) / sinDelta;

  const x = A * Math.cos(phi1) * Math.cos(lambda1) + B * Math.cos(phi2) * Math.cos(lambda2);
  const y = A * Math.cos(phi1) * Math.sin(lambda1) + B * Math.cos(phi2) * Math.sin(lambda2);
  const z = A * Math.sin(phi1) + B * Math.sin(phi2);

  const phiF = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lambdaF = Math.atan2(y, x);

  return {
    latitude: toDegrees(phiF),
    longitude: toDegrees(lambdaF),
  };
}

// Types
export interface Airport {
  iata: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface FlightDetails {
  departure: string; // IATA code
  arrival: string;   // IATA code
  departureTime: Date; // Local departure time
  durationMinutes: number;
  preference?: 'sun' | 'shade'; // User preference: scenic sun views vs max shade / sleep
}

export interface SunEvent {
  type: 'sunrise' | 'sunset';
  time: Date;
  location: { lat: number; lon: number };
  sunAzimuth: number;
  aircraftBearing: number;
  viewingSide: 'left' | 'right';
  shadeSide: 'left' | 'right';
  elevation: number;
}

export interface FlightPathPoint {
  time: Date;
  location: { lat: number; lon: number };
  progress: number; // 0 to 1
  sunPosition: {
    azimuth: number; // degrees [0, 360)
    elevation: number; // degrees
    visible: boolean; // above horizon
  };
  aircraftBearing: number; // instantaneous Great-Circle heading [0, 360)
  viewingSide?: 'left' | 'right'; // side where sun is visible
  shadeSide?: 'left' | 'right';   // side in shadow
}

export interface FlightRecommendation {
  recommendation: 'left' | 'right' | 'either';
  confidence: number; // 0-100
  description: string;
  preference: 'sun' | 'shade';
  events: SunEvent[];
  
  // Complete data for globe visualization
  globeData: {
    departure: Airport;
    arrival: Airport;
    flightPath: FlightPathPoint[];
    totalDistance: number; // meters
    totalDuration: number; // minutes
    summary: {
      totalSunriseEvents: number;
      totalSunsetEvents: number;
      averageSunVisibility: number; // percentage of flight with sun above horizon
      bestViewingSide: 'left' | 'right' | 'either';
      bestShadeSide: 'left' | 'right' | 'either';
      sunSideDistribution: {
        leftPercent: number;
        rightPercent: number;
        nightPercent: number;
      };
    };
  };
}

export function calculateSunPositionForFlight(flightDetails: FlightDetails): FlightRecommendation {
  const preference: 'sun' | 'shade' = flightDetails.preference === 'shade' ? 'shade' : 'sun';

  try {
    // Step 1: Lookup airport coordinates
    const airports = airportsData.airports as Airport[];
    const departureAirport = airports.find(airport => airport.iata.toUpperCase() === flightDetails.departure.toUpperCase());
    const arrivalAirport = airports.find(airport => airport.iata.toUpperCase() === flightDetails.arrival.toUpperCase());

    if (!departureAirport || !arrivalAirport) {
      throw new Error(`Airport not found: ${!departureAirport ? flightDetails.departure : flightDetails.arrival}`);
    }

    // Step 2: Compute true Great Circle orthodromic distance
    const totalDistance = calculateGreatCircleDistance(
      departureAirport.latitude,
      departureAirport.longitude,
      arrivalAirport.latitude,
      arrivalAirport.longitude
    );

    // Step 3: Create comprehensive flight path for globe visualization (every 5 minutes)
    const intervalMinutes = 5;
    const numIntervals = Math.max(1, Math.ceil(flightDetails.durationMinutes / intervalMinutes));
    const flightPath: FlightPathPoint[] = [];
    const sunEvents: SunEvent[] = [];
    
    let sunVisibleCount = 0;
    let leftSideCount = 0;
    let rightSideCount = 0;

    // Precalculate all waypoints using spherical Slerp
    const intermediateCoords: { latitude: number; longitude: number; progress: number; time: Date }[] = [];
    for (let i = 0; i <= numIntervals; i++) {
      const timeOffsetMinutes = Math.min(i * intervalMinutes, flightDetails.durationMinutes);
      const progress = flightDetails.durationMinutes > 0 ? timeOffsetMinutes / flightDetails.durationMinutes : 0;
      
      const pos = interpolateGreatCirclePoint(
        departureAirport.latitude,
        departureAirport.longitude,
        arrivalAirport.latitude,
        arrivalAirport.longitude,
        progress
      );

      const currentTime = new Date(flightDetails.departureTime.getTime() + timeOffsetMinutes * 60 * 1000);
      intermediateCoords.push({ ...pos, progress, time: currentTime });
    }

    // Step 4: Calculate instantaneous heading, solar position, and side for each point
    for (let i = 0; i <= numIntervals; i++) {
      const current = intermediateCoords[i];
      
      // Calculate true instantaneous aircraft heading
      let aircraftBearing: number;
      if (i < numIntervals) {
        const next = intermediateCoords[i + 1];
        aircraftBearing = calculateGreatCircleBearing(
          current.latitude,
          current.longitude,
          next.latitude,
          next.longitude
        );
      } else {
        const prev = intermediateCoords[numIntervals - 1];
        aircraftBearing = calculateGreatCircleBearing(
          prev.latitude,
          prev.longitude,
          current.latitude,
          current.longitude
        );
      }

      // Calculate solar position via SunCalc
      const sunPosition = getPosition(current.time, current.latitude, current.longitude);
      
      // Convert SunCalc azimuth (radians South-to-West: S=0, W=pi/2, N=pi, E=-pi/2)
      // to standard navigation compass bearing (degrees [0, 360), 0=North, 90=East)
      const sunAzimuthDegrees = ((sunPosition.azimuth * 180 / Math.PI) + 180) % 360;
      const sunElevationDegrees = (sunPosition.altitude * 180) / Math.PI;
      const sunVisible = sunElevationDegrees > 0;

      let viewingSide: 'left' | 'right' | undefined = undefined;
      let shadeSide: 'left' | 'right' | undefined = undefined;
      
      if (sunVisible) {
        sunVisibleCount++;
        
        // Relative azimuth difference from aircraft heading: [0, 360)
        // 0-180: Sun is on STARBOARD (RIGHT side)
        // 180-360: Sun is on PORT (LEFT side)
        const relativeAzimuth = (sunAzimuthDegrees - aircraftBearing + 360) % 360;

        if (relativeAzimuth > 0 && relativeAzimuth < 180) {
          viewingSide = 'right';
          shadeSide = 'left';
          rightSideCount++;
        } else if (relativeAzimuth > 180 && relativeAzimuth < 360) {
          viewingSide = 'left';
          shadeSide = 'right';
          leftSideCount++;
        }

        // Check for sunrise/sunset events (within 15 minutes window)
        try {
          const sunTimes = getTimes(current.time, current.latitude, current.longitude);
          const currentTimeMs = current.time.getTime();
          const sunriseValid = sunTimes.sunrise && !isNaN(sunTimes.sunrise.getTime());
          const sunsetValid = sunTimes.sunset && !isNaN(sunTimes.sunset.getTime());

          const isNearSunrise = sunriseValid && Math.abs(currentTimeMs - sunTimes.sunrise.getTime()) < 15 * 60 * 1000;
          const isNearSunset = sunsetValid && Math.abs(currentTimeMs - sunTimes.sunset.getTime()) < 15 * 60 * 1000;

          if ((isNearSunrise || isNearSunset) && sunElevationDegrees > -5 && viewingSide && shadeSide) {
            sunEvents.push({
              type: isNearSunrise ? 'sunrise' : 'sunset',
              time: current.time,
              location: { lat: current.latitude, lon: current.longitude },
              sunAzimuth: sunAzimuthDegrees,
              aircraftBearing,
              viewingSide,
              shadeSide,
              elevation: sunElevationDegrees
            });
          }
        } catch {
          // Guard against extreme polar latitudes in SunCalc getTimes
        }
      }

      // Add point to flight path for globe visualization
      flightPath.push({
        time: current.time,
        location: { lat: current.latitude, lon: current.longitude },
        progress: current.progress,
        sunPosition: {
          azimuth: sunAzimuthDegrees,
          elevation: sunElevationDegrees,
          visible: sunVisible
        },
        aircraftBearing,
        viewingSide,
        shadeSide
      });
    }

    // Step 5: Filter duplicate sunrise/sunset events
    const uniqueEvents = sunEvents.filter((event, index, self) => 
      index === self.findIndex(e => 
        e.type === event.type && 
        Math.abs(e.time.getTime() - event.time.getTime()) < 10 * 60 * 1000
      )
    );

    // Calculate distributions
    const totalPoints = flightPath.length;
    const averageSunVisibility = totalPoints > 0 ? (sunVisibleCount / totalPoints) * 100 : 0;
    const leftPercent = totalPoints > 0 ? Math.round((leftSideCount / totalPoints) * 100) : 0;
    const rightPercent = totalPoints > 0 ? Math.round((rightSideCount / totalPoints) * 100) : 0;
    const nightPercent = Math.max(0, 100 - leftPercent - rightPercent);

    // Determine baseline best viewing (sun) side
    let bestViewingSide: 'left' | 'right' | 'either' = 'either';
    const leftEvents = uniqueEvents.filter(e => e.viewingSide === 'left').length;
    const rightEvents = uniqueEvents.filter(e => e.viewingSide === 'right').length;

    if (uniqueEvents.length > 0) {
      if (leftEvents > rightEvents) bestViewingSide = 'left';
      else if (rightEvents > leftEvents) bestViewingSide = 'right';
      else bestViewingSide = 'either';
    } else if (sunVisibleCount > 0) {
      if (leftSideCount > rightSideCount * 1.2) bestViewingSide = 'left';
      else if (rightSideCount > leftSideCount * 1.2) bestViewingSide = 'right';
      else bestViewingSide = 'either';
    }

    // Determine best shade side (opposite of dominant sun)
    let bestShadeSide: 'left' | 'right' | 'either' = 'either';
    if (bestViewingSide === 'left') bestShadeSide = 'right';
    else if (bestViewingSide === 'right') bestShadeSide = 'left';
    else bestShadeSide = 'either';

    // Step 6: Generate recommendation and description tailored to user preference
    let recommendation: 'left' | 'right' | 'either' = 'either';
    let confidence = 50;
    let description = '';

    if (preference === 'shade') {
      // SHADE PREFERENCE: Passenger wants shadow, sleep, or laptop work without direct glare
      if (uniqueEvents.length > 0) {
        if (leftEvents > rightEvents) {
          recommendation = 'right';
          confidence = Math.min(95, 65 + (leftEvents * 15));
          description = `Choose the RIGHT side for shade! Avoids harsh ${leftEvents} sunrise/sunset event(s) directly on the left side.`;
        } else if (rightEvents > leftEvents) {
          recommendation = 'left';
          confidence = Math.min(95, 65 + (rightEvents * 15));
          description = `Choose the LEFT side for shade! Avoids harsh ${rightEvents} sunrise/sunset event(s) directly on the right side.`;
        } else {
          recommendation = 'either';
          confidence = 70;
          description = `Sunrise/sunset events occur on both sides. Keep window shades lowered during low-elevation angles.`;
        }

        const eventDescs = uniqueEvents.map(e => {
          const timeStr = formatInTimeZone(e.time, 'UTC', 'HH:mm');
          return `${e.type} at ${timeStr} UTC (sun on ${e.viewingSide}, shade on ${e.shadeSide})`;
        });
        description += ` Events: ${eventDescs.join(', ')}.`;

      } else if (sunVisibleCount > 0) {
        if (leftSideCount > rightSideCount * 1.2) {
          recommendation = 'right';
          confidence = Math.min(90, 55 + Math.round((leftSideCount / sunVisibleCount) * 35));
          description = `Choose the RIGHT side for complete shade. Direct sun is on the left side for ${leftPercent}% of this flight.`;
        } else if (rightSideCount > leftSideCount * 1.2) {
          recommendation = 'left';
          confidence = Math.min(90, 55 + Math.round((rightSideCount / sunVisibleCount) * 35));
          description = `Choose the LEFT side for complete shade. Direct sun is on the right side for ${rightPercent}% of this flight.`;
        } else {
          recommendation = 'either';
          confidence = 65;
          description = `Sun exposure is balanced between both sides. Either side provides comparable shade throughout the flight.`;
        }
      } else {
        recommendation = 'either';
        confidence = 90;
        description = `This is a night flight with zero solar glare. Either side is dark and ideal for rest.`;
      }
    } else {
      // SUN / SCENIC PREFERENCE (Default)
      if (uniqueEvents.length > 0) {
        if (leftEvents > rightEvents) {
          recommendation = 'left';
          confidence = Math.min(95, 60 + (leftEvents * 15));
          description = `Choose the LEFT side for the best scenic view! ${leftEvents} sunrise/sunset event(s) visible on the left side.`;
        } else if (rightEvents > leftEvents) {
          recommendation = 'right';
          confidence = Math.min(95, 60 + (rightEvents * 15));
          description = `Choose the RIGHT side for the best scenic view! ${rightEvents} sunrise/sunset event(s) visible on the right side.`;
        } else {
          recommendation = 'either';
          confidence = 75;
          description = `Either side works well! Sunrise/sunset events are visible from both sides of the aircraft.`;
        }

        const eventDescs = uniqueEvents.map(e => {
          const timeStr = formatInTimeZone(e.time, 'UTC', 'HH:mm');
          return `${e.type} at ${timeStr} UTC (${e.viewingSide} side)`;
        });
        description += ` Events: ${eventDescs.join(', ')}.`;

      } else if (sunVisibleCount > 0) {
        if (leftSideCount > rightSideCount * 1.2) {
          recommendation = 'left';
          confidence = Math.min(85, 50 + Math.round((leftSideCount / sunVisibleCount) * 35));
          description = `Choose the LEFT side for better sun exposure and daylight views (${leftPercent}% of flight).`;
        } else if (rightSideCount > leftSideCount * 1.2) {
          recommendation = 'right';
          confidence = Math.min(85, 50 + Math.round((rightSideCount / sunVisibleCount) * 35));
          description = `Choose the RIGHT side for better sun exposure and daylight views (${rightPercent}% of flight).`;
        } else {
          recommendation = 'either';
          confidence = 60;
          description = `Sunlight is evenly distributed across both sides during this flight.`;
        }
      } else {
        recommendation = 'either';
        confidence = 80;
        description = `This is a night flight with no direct sunlight. Choose either side for stargazing or sleep.`;
      }
    }

    const sunriseEvents = uniqueEvents.filter(e => e.type === 'sunrise').length;
    const sunsetEvents = uniqueEvents.filter(e => e.type === 'sunset').length;

    return {
      recommendation,
      confidence,
      description,
      preference,
      events: uniqueEvents,
      globeData: {
        departure: departureAirport,
        arrival: arrivalAirport,
        flightPath,
        totalDistance,
        totalDuration: flightDetails.durationMinutes,
        summary: {
          totalSunriseEvents: sunriseEvents,
          totalSunsetEvents: sunsetEvents,
          averageSunVisibility,
          bestViewingSide,
          bestShadeSide,
          sunSideDistribution: {
            leftPercent,
            rightPercent,
            nightPercent
          }
        }
      }
    };

  } catch (error) {
    console.error('Flight calculation error:', error);
    return {
      recommendation: 'either',
      confidence: 0,
      description: `Unable to calculate sun position: ${error instanceof Error ? error.message : 'Unknown error'}`,
      preference,
      events: [],
      globeData: {
        departure: { iata: flightDetails.departure, name: 'Unknown', latitude: 0, longitude: 0 },
        arrival: { iata: flightDetails.arrival, name: 'Unknown', latitude: 0, longitude: 0 },
        flightPath: [],
        totalDistance: 0,
        totalDuration: flightDetails.durationMinutes,
        summary: {
          totalSunriseEvents: 0,
          totalSunsetEvents: 0,
          averageSunVisibility: 0,
          bestViewingSide: 'either',
          bestShadeSide: 'either',
          sunSideDistribution: {
            leftPercent: 0,
            rightPercent: 0,
            nightPercent: 0
          }
        }
      }
    };
  }
}