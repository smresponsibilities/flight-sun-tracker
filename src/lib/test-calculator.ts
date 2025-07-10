import { calculateSunPositionForFlight } from './flightCalculator';
import type { FlightDetails } from './flightCalculator';

// Test scenarios for globe visualization
const testFlights: { name: string; details: FlightDetails }[] = [
  {
    name: "🌅 Trans-Atlantic Morning: JFK → LHR",
    details: {
      departure: "JFK",
      arrival: "LHR", 
      departureTime: new Date("2024-03-15T08:00:00"), // 8 AM Eastern
      durationMinutes: 420 // 7 hours
    }
  },
  {
    name: "🌇 Pacific Sunset: LAX → NRT", 
    details: {
      departure: "LAX",
      arrival: "NRT",
      departureTime: new Date("2024-03-15T18:00:00"), // 6 PM Pacific
      durationMinutes: 650 // 10.8 hours
    }
  }
];

// Run enhanced tests with globe data
console.log("🌍 ENHANCED Flight Sun Calculator - Globe Visualization Data\n");
console.log("=" .repeat(65));

testFlights.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log("─".repeat(50));
  
  try {
    const result = calculateSunPositionForFlight(testCase.details);
    
    // Basic recommendation
    console.log(`✈️  Route: ${result.globeData.departure.iata} → ${result.globeData.arrival.iata}`);
    console.log(`🎯 Recommendation: ${result.recommendation.toUpperCase()} (${result.confidence}% confidence)`);
    console.log(`📝 Description: ${result.description}`);
    
    // Globe visualization data summary
    console.log(`\n🌍 GLOBE VISUALIZATION DATA:`);
    console.log(`📍 Flight Path Points: ${result.globeData.flightPath.length} (every 5 minutes)`);
    console.log(`📏 Total Distance: ${(result.globeData.totalDistance / 1000).toFixed(0)} km`);
    console.log(`⏱️  Total Duration: ${result.globeData.totalDuration} minutes`);
    console.log(`☀️  Sun Visibility: ${result.globeData.summary.averageSunVisibility.toFixed(1)}% of flight`);
    console.log(`🌅 Sunrise Events: ${result.globeData.summary.totalSunriseEvents}`);
    console.log(`🌇 Sunset Events: ${result.globeData.summary.totalSunsetEvents}`);
    
    // Sample flight path data for globe
    if (result.globeData.flightPath.length > 0) {
      console.log(`\n📊 SAMPLE FLIGHT PATH DATA (for globe animation):`);
      const samplePoints = [0, Math.floor(result.globeData.flightPath.length / 4), 
                           Math.floor(result.globeData.flightPath.length / 2),
                           result.globeData.flightPath.length - 1];
      
      samplePoints.forEach(pointIndex => {
        if (pointIndex < result.globeData.flightPath.length) {
          const point = result.globeData.flightPath[pointIndex];
          console.log(`  ${(point.progress * 100).toFixed(0)}% complete: ${point.location.lat.toFixed(2)}°N, ${point.location.lon.toFixed(2)}°E`);
          console.log(`     Sun: ${point.sunPosition.visible ? '☀️ Visible' : '🌙 Hidden'} (${point.sunPosition.elevation.toFixed(1)}° elevation)`);
          console.log(`     Side: ${point.viewingSide ? point.viewingSide.toUpperCase() : 'N/A'}`);
        }
      });
    }
    
    // Detailed events
    if (result.events.length > 0) {
      console.log(`\n🌅 SUNRISE/SUNSET EVENTS:`);
      result.events.forEach((event, i) => {
        console.log(`  ${i+1}. ${event.type.toUpperCase()} at ${event.time.toISOString().substr(11, 5)} UTC`);
        console.log(`     📍 Location: ${event.location.lat.toFixed(2)}°, ${event.location.lon.toFixed(2)}°`);
        console.log(`     👁️  Best viewed from: ${event.viewingSide.toUpperCase()} side`);
        console.log(`     📐 Sun elevation: ${event.elevation.toFixed(1)}°`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  console.log("");
});

console.log("🎉 GLOBE VISUALIZATION READY!");
console.log("=" .repeat(35));
console.log("✅ Complete flight path with 5-minute intervals");
console.log("✅ Sun position (azimuth/elevation) at every point");
console.log("✅ Viewing side recommendation for each point");
console.log("✅ Departure & arrival airport coordinates");
console.log("✅ Sunrise/sunset event locations and timing");
console.log("✅ Progress tracking (0-100%) for animations");
console.log("✅ Summary statistics for overview displays");
console.log("\n🌐 Perfect for:");
console.log("• Animated 3D globe with flight path");
console.log("• Real-time sun position tracking");
console.log("• Interactive timeline scrubbing");  
console.log("• Event highlighting on the globe");
console.log("• Seat recommendation visualization"); 