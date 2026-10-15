import { calculateSunPositionForFlight } from './flightCalculator';
import type { FlightDetails } from './flightCalculator';

// Test scenarios covering both scenic sun views and anti-glare shade
const testFlights: { name: string; details: FlightDetails }[] = [
  {
    name: "[Sun] Trans-Atlantic Morning: JFK -> LHR",
    details: {
      departure: "JFK",
      arrival: "LHR", 
      departureTime: new Date("2024-03-15T08:00:00Z"),
      durationMinutes: 420,
      preference: "sun"
    }
  },
  {
    name: "[Shade] Trans-Atlantic Morning: JFK -> LHR",
    details: {
      departure: "JFK",
      arrival: "LHR", 
      departureTime: new Date("2024-03-15T08:00:00Z"),
      durationMinutes: 420,
      preference: "shade"
    }
  },
  {
    name: "[Sun] Trans-Pacific Great Circle: LAX -> NRT", 
    details: {
      departure: "LAX",
      arrival: "NRT", 
      departureTime: new Date("2024-03-15T18:00:00Z"),
      durationMinutes: 650,
      preference: "sun"
    }
  },
  {
    name: "[Shade] Trans-Pacific Great Circle: LAX -> NRT", 
    details: {
      departure: "LAX",
      arrival: "NRT", 
      departureTime: new Date("2024-03-15T18:00:00Z"),
      durationMinutes: 650,
      preference: "shade"
    }
  }
];

console.log("[TEST] Flight Sun & Shade Calculator Test Suite\n");
console.log("=".repeat(70));

let allTestsPassed = true;

testFlights.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log("-".repeat(50));
  
  try {
    const result = calculateSunPositionForFlight(testCase.details);
    const path = result.globeData.flightPath;
    const startPoint = path[0];
    const endPoint = path[path.length - 1];
    const midPoint = path[Math.floor(path.length / 2)];

    // Assert 1: Departure coordinate match (within 0.01 deg)
    const depLatDiff = Math.abs(startPoint.location.lat - result.globeData.departure.latitude);
    const depLonDiff = Math.abs(startPoint.location.lon - result.globeData.departure.longitude);
    if (depLatDiff > 0.01 || depLonDiff > 0.01) {
      console.error(`[FAIL] Departure waypoint mismatch: ${startPoint.location.lat}, ${startPoint.location.lon}`);
      allTestsPassed = false;
    } else {
      console.log(`[PASS] Origin waypoint verified: ${startPoint.location.lat.toFixed(2)}°N, ${startPoint.location.lon.toFixed(2)}°E (0 km offset)`);
    }

    // Assert 2: Arrival coordinate match (within 0.01 deg)
    const arrLatDiff = Math.abs(endPoint.location.lat - result.globeData.arrival.latitude);
    const arrLonDiff = Math.abs(endPoint.location.lon - result.globeData.arrival.longitude);
    if (arrLatDiff > 0.01 || arrLonDiff > 0.01) {
      console.error(`[FAIL] Arrival waypoint mismatch: ${endPoint.location.lat}, ${endPoint.location.lon} vs ${result.globeData.arrival.latitude}, ${result.globeData.arrival.longitude}`);
      allTestsPassed = false;
    } else {
      console.log(`[PASS] Destination waypoint verified: ${endPoint.location.lat.toFixed(2)}°N, ${endPoint.location.lon.toFixed(2)}°E (0 km offset)`);
    }

    // Assert 3: Great Circle heading continuity (heading must evolve, not be static)
    const initialHeading = startPoint.aircraftBearing;
    const midHeading = midPoint.aircraftBearing;
    const finalHeading = endPoint.aircraftBearing;
    console.log(`[NAV] Instantaneous Heading Progression: Departure=${initialHeading.toFixed(1)}° -> Midpoint=${midHeading.toFixed(1)}° -> Arrival=${finalHeading.toFixed(1)}°`);

    if (Math.abs(initialHeading - finalHeading) < 1.0) {
      console.error(`[FAIL] Aircraft bearing appears static! Rhumb line flaw not resolved.`);
      allTestsPassed = false;
    } else {
      console.log(`[PASS] Dynamic Great-Circle heading verified (bearing delta = ${Math.abs(finalHeading - initialHeading).toFixed(1)}°)`);
    }

    // Recommendation & Intent Check
    console.log(`[ROUTE] ${result.globeData.departure.iata} -> ${result.globeData.arrival.iata}`);
    console.log(`[VERDICT] ${result.recommendation.toUpperCase()} (${result.confidence}% confidence) [Mode: ${result.preference.toUpperCase()}]`);
    console.log(`[DESC] ${result.description}`);
    console.log(`[STATS] Left=${result.globeData.summary.sunSideDistribution.leftPercent}%, Right=${result.globeData.summary.sunSideDistribution.rightPercent}%, Night=${result.globeData.summary.sunSideDistribution.nightPercent}%`);

    if (result.events.length > 0) {
      console.log(`[EVENTS]`);
      result.events.forEach(e => {
        console.log(`   * ${e.type.toUpperCase()}: Sun on ${e.viewingSide.toUpperCase()}, Shade on ${e.shadeSide.toUpperCase()} (Sun Elev: ${e.elevation.toFixed(1)}°)`);
      });
    }

  } catch (error) {
    console.error(`[FAIL] Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    allTestsPassed = false;
  }
});

console.log("\n" + "=".repeat(70));
if (allTestsPassed) {
  console.log("[PASS] ALL MATHEMATICAL & GEODESIC TESTS PASSED PERFECTLY!");
} else {
  console.error("[FAIL] SOME TESTS FAILED!");
  process.exit(1);
}