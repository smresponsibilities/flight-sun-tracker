import { getDistance, getRhumbLineBearing, computeDestinationPoint } from 'geolib';
import { getPosition, getTimes } from 'suncalc';
import { formatInTimeZone } from 'date-fns-tz';
import airportsData from './data/airports.json';

// Types
interface Airport {
  iata: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface FlightDetails {
  departure: string; // IATA code
  arrival: string;   // IATA code
  departureTime: Date; // Local departure time
  durationMinutes: number;
}

interface SunEvent {
  type: 'sunrise' | 'sunset';
  time: Date;
  location: { lat: number; lon: number };
  sunAzimuth: number;
  aircraftBearing: number;
  viewingSide: 'left' | 'right';
  elevation: number;
}

// New: Flight path point for globe visualization
interface FlightPathPoint {
  time: Date;
  location: { lat: number; lon: number };
  progress: number; // 0 to 1
  sunPosition: {
    azimuth: number; // degrees
    elevation: number; // degrees
    visible: boolean; // above horizon
  };
  aircraftBearing: number;
  viewingSide?: 'left' | 'right'; // only when sun is visible
}

// Enhanced recommendation with globe visualization data
interface FlightRecommendation {
  recommendation: 'left' | 'right' | 'either';
  confidence: number; // 0-100
  description: string;
  events: SunEvent[];
  
  // New: Complete data for globe visualization
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
    };
  };
}

export type { FlightDetails, FlightRecommendation, FlightPathPoint, SunEvent };

export function calculateSunPositionForFlight(flightDetails: FlightDetails): FlightRecommendation {
  try {
    // Step 1: Lookup airport coordinates
    const airports = airportsData.airports;
    const departureAirport = airports.find(airport => airport.iata === flightDetails.departure);
    const arrivalAirport = airports.find(airport => airport.iata === flightDetails.arrival);

    if (!departureAirport || !arrivalAirport) {
      throw new Error(`Airport not found: ${!departureAirport ? flightDetails.departure : flightDetails.arrival}`);
    }

    // Step 2: Create coordinate objects for geolib
    const departureCoords = { latitude: departureAirport.latitude, longitude: departureAirport.longitude };
    const arrivalCoords = { latitude: arrivalAirport.latitude, longitude: arrivalAirport.longitude };

    // Step 3: Calculate flight path details
    const totalDistance = getDistance(departureCoords, arrivalCoords); // Distance in meters
    const flightBearing = getRhumbLineBearing(departureCoords, arrivalCoords); // Bearing in degrees

    // Step 4: Create comprehensive flight path for globe visualization (every 5 minutes)
    const intervalMinutes = 5; // More granular for smooth globe animation
    const numIntervals = Math.ceil(flightDetails.durationMinutes / intervalMinutes);
    const flightPath: FlightPathPoint[] = [];
    const sunEvents: SunEvent[] = [];
    
    let sunVisibleCount = 0;
    let leftSideCount = 0;
    let rightSideCount = 0;

    // Step 5: Calculate data for every point along the flight path
    for (let i = 0; i <= numIntervals; i++) {
      const timeOffsetMinutes = Math.min(i * intervalMinutes, flightDetails.durationMinutes);
      
      // Calculate progress along flight path (0 to 1)
      const progress = timeOffsetMinutes / flightDetails.durationMinutes;
      
      // Calculate intermediate position
      const intermediateDistance = totalDistance * progress;
      const currentPosition = computeDestinationPoint(
        departureCoords,
        intermediateDistance,
        flightBearing
      );

      // Calculate current time
      const currentTime = new Date(flightDetails.departureTime.getTime() + timeOffsetMinutes * 60 * 1000);

      // Get sun position
      const sunPosition = getPosition(currentTime, currentPosition.latitude, currentPosition.longitude);
      
      // Convert sun azimuth from radians to degrees (0-360)
      const sunAzimuthDegrees = ((sunPosition.azimuth * 180 / Math.PI) + 180) % 360;
      const sunElevationDegrees = sunPosition.altitude * 180 / Math.PI;
      const sunVisible = sunElevationDegrees > 0;

      let viewingSide: 'left' | 'right' | undefined = undefined;
      
      if (sunVisible) {
        sunVisibleCount++;
        
        // Determine which side of aircraft has better sun view
        let azimuthDiff = sunAzimuthDegrees - flightBearing;
        if (azimuthDiff < 0) azimuthDiff += 360;
        if (azimuthDiff > 360) azimuthDiff -= 360;

        viewingSide = (azimuthDiff > 0 && azimuthDiff < 180) ? 'right' : 'left';
        
        if (viewingSide === 'left') leftSideCount++;
        else rightSideCount++;

        // Check for sunrise/sunset events (within 15 minutes)
        const sunTimes = getTimes(currentTime, currentPosition.latitude, currentPosition.longitude);
        const currentTimeMs = currentTime.getTime();
        const isNearSunrise = Math.abs(currentTimeMs - sunTimes.sunrise.getTime()) < 15 * 60 * 1000;
        const isNearSunset = Math.abs(currentTimeMs - sunTimes.sunset.getTime()) < 15 * 60 * 1000;

        if ((isNearSunrise || isNearSunset) && sunElevationDegrees > -5) { // Include events near horizon
          sunEvents.push({
            type: isNearSunrise ? 'sunrise' : 'sunset',
            time: currentTime,
            location: { lat: currentPosition.latitude, lon: currentPosition.longitude },
            sunAzimuth: sunAzimuthDegrees,
            aircraftBearing: flightBearing,
            viewingSide,
            elevation: sunElevationDegrees
          });
        }
      }

      // Add point to flight path for globe visualization
      flightPath.push({
        time: currentTime,
        location: { lat: currentPosition.latitude, lon: currentPosition.longitude },
        progress,
        sunPosition: {
          azimuth: sunAzimuthDegrees,
          elevation: sunElevationDegrees,
          visible: sunVisible
        },
        aircraftBearing: flightBearing,
        viewingSide
      });
    }

    // Step 6: Generate recommendation and summary
    let recommendation: 'left' | 'right' | 'either' = 'either';
    let confidence = 50;
    let description = 'No significant sunrise or sunset events detected during this flight.';

    // Remove duplicate sunrise/sunset events (keep the most prominent)
    const uniqueEvents = sunEvents.filter((event, index, self) => 
      index === self.findIndex(e => 
        e.type === event.type && 
        Math.abs(e.time.getTime() - event.time.getTime()) < 10 * 60 * 1000
      )
    );

    if (uniqueEvents.length > 0) {
      // Count events by side
      const leftEvents = uniqueEvents.filter(e => e.viewingSide === 'left').length;
      const rightEvents = uniqueEvents.filter(e => e.viewingSide === 'right').length;

      if (leftEvents > rightEvents) {
        recommendation = 'left';
        confidence = Math.min(95, 60 + (leftEvents * 15));
        description = `Choose the LEFT side for the best view! ${leftEvents} sunrise/sunset event(s) visible on the left side.`;
      } else if (rightEvents > leftEvents) {
        recommendation = 'right';
        confidence = Math.min(95, 60 + (rightEvents * 15));
        description = `Choose the RIGHT side for the best view! ${rightEvents} sunrise/sunset event(s) visible on the right side.`;
      } else {
        recommendation = 'either';
        confidence = 75;
        description = `Either side works well! Sunrise/sunset events are visible from both sides of the aircraft.`;
      }

      // Add event details to description
      if (uniqueEvents.length > 0) {
        const eventDescriptions = uniqueEvents.map(event => {
          const timeStr = formatInTimeZone(event.time, 'UTC', 'HH:mm');
          return `${event.type} at ${timeStr} UTC (${event.viewingSide} side)`;
        });
        description += ` Events: ${eventDescriptions.join(', ')}.`;
      }
    } else if (sunVisibleCount > 0) {
      // No specific events, but sun is visible - base on overall viewing
      if (leftSideCount > rightSideCount * 1.2) {
        recommendation = 'left';
        confidence = Math.min(80, 50 + (leftSideCount / sunVisibleCount * 30));
        description = `Choose the LEFT side for better sun exposure during the flight.`;
      } else if (rightSideCount > leftSideCount * 1.2) {
        recommendation = 'right';
        confidence = Math.min(80, 50 + (rightSideCount / sunVisibleCount * 30));
        description = `Choose the RIGHT side for better sun exposure during the flight.`;
      }
    }

    // Calculate summary statistics
    const averageSunVisibility = flightPath.length > 0 ? (sunVisibleCount / flightPath.length) * 100 : 0;
    const sunriseEvents = uniqueEvents.filter(e => e.type === 'sunrise').length;
    const sunsetEvents = uniqueEvents.filter(e => e.type === 'sunset').length;

    return {
      recommendation,
      confidence,
      description,
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
          bestViewingSide: recommendation
        }
      }
    };

  } catch (error) {
    console.error('Flight calculation error:', error);
    return {
      recommendation: 'either',
      confidence: 0,
      description: `Unable to calculate sun position: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
          bestViewingSide: 'either'
        }
      }
    };
  }
} 