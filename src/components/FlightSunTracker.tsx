'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import FlightHeaderBar from './FlightHeaderBar';
import HeroVerdictBanner from './HeroVerdictBanner';
import CabinCrossSection from './CabinCrossSection';
import FlightTimelineScrubber from './FlightTimelineScrubber';
import LightweightCanvasMap from './LightweightCanvasMap';
import FlightRouteModal from './FlightRouteModal';
import { calculateSunPositionForFlight, type FlightRecommendation, type FlightDetails } from '@/lib/flightCalculator';
import { IconCompass } from './AviationIcons';
import { formatHeading, formatElevation } from '@/lib/solarTerminator';

// Dynamically import Three.js 3D Earth Globe with client-side only rendering
const ThreeGlobeView = dynamic(() => import('./ThreeGlobeView'), {
  ssr: false,
  loading: () => (
    <div className="cockpit-card rounded-xl p-8 border border-[var(--cockpit-border)] flex flex-col items-center justify-center min-h-[440px] text-center font-mono-numbers">
      <div className="w-8 h-8 border-2 border-[var(--cabin-cyan)] border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
        INITIALIZING 3D WEBGL EARTH GLOBE...
      </span>
    </div>
  ),
});

// Default initial flight: JFK -> LHR daytime transatlantic
function getInitialFlight(): FlightDetails {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 30, 0, 0); // 08:30 morning departure

  return {
    departure: 'JFK',
    arrival: 'LHR',
    departureTime: tomorrow,
    durationMinutes: 420, // 7h 00m
    preference: 'shade',
  };
}

export default function FlightSunTracker() {
  const [flightDetails, setFlightDetails] = useState<FlightDetails>(getInitialFlight);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(5);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState<boolean>(false);
  const [mapMode, setMapMode] = useState<'3d' | '2d'>('3d');

  // Calculate recommendation and flight path data
  const result: FlightRecommendation = useMemo(() => {
    return calculateSunPositionForFlight(flightDetails);
  }, [flightDetails]);

  const { globeData, recommendation, confidence, preference, events } = result;
  const flightPath = globeData?.flightPath || [];
  const totalPoints = Math.max(1, flightPath.length);

  // Reset or clamp scrubber index when flight path changes
  useEffect(() => {
    setCurrentWaypointIndex(0);
    setIsPlaying(false);
  }, [flightDetails.departure, flightDetails.arrival, flightDetails.departureTime]);

  const currentPoint = flightPath[Math.min(currentWaypointIndex, totalPoints - 1)] || null;

  // Calculate relative azimuth of the sun to aircraft nose
  const currentSunAzimuth = currentPoint?.sunPosition.azimuth ?? 0;
  const currentSunElevation = currentPoint?.sunPosition.elevation ?? 0;
  const currentAircraftBearing = currentPoint?.aircraftBearing ?? 0;
  const relativeAzimuth = ((currentSunAzimuth - currentAircraftBearing + 360) % 360);

  // Preference Toggle Handler
  const handleTogglePreference = useCallback((pref: 'sun' | 'shade') => {
    setFlightDetails((prev) => ({
      ...prev,
      preference: pref,
    }));
  }, []);

  // Quick Select Route Handler
  const handleSelectRoute = useCallback((dep: string, arr: string, durationMin?: number) => {
    setFlightDetails((prev) => ({
      ...prev,
      departure: dep,
      arrival: arr,
      durationMinutes: durationMin || prev.durationMinutes,
    }));
  }, []);

  // Custom Route Apply Handler
  const handleApplyRoute = useCallback((source: string, dest: string, depTimeStr: string, durationStr: string) => {
    const depTime = new Date(depTimeStr);

    // Parse duration string to minutes
    let durationMins = 420;
    const matchH = durationStr.match(/(\d+)\s*h(?:ours?)?/i);
    const matchM = durationStr.match(/(\d+)\s*m(?:inutes?|ins?)?/i);
    if (matchH || matchM) {
      const h = matchH ? parseInt(matchH[1], 10) : 0;
      const m = matchM ? parseInt(matchM[1], 10) : 0;
      durationMins = h * 60 + m;
    } else {
      const parsedNum = parseInt(durationStr.replace(/[^\d]/g, ''), 10);
      if (!isNaN(parsedNum) && parsedNum > 0) durationMins = parsedNum;
    }

    setFlightDetails((prev) => ({
      ...prev,
      departure: source,
      arrival: dest,
      departureTime: isNaN(depTime.getTime()) ? prev.departureTime : depTime,
      durationMinutes: durationMins,
    }));
  }, []);

  const currentTime = currentPoint?.time ? new Date(currentPoint.time) : flightDetails.departureTime;
  const isNight = currentSunElevation <= 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-[var(--foreground)] selection:bg-[var(--solar-amber)] selection:text-black">
      {/* Cockpit HUD Scanlines background */}
      <div className="fixed inset-0 pointer-events-none cockpit-grid-bg opacity-75 z-0" />

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-4 sm:py-6 lg:px-8">
        {/* Top Executive Boarding Pass Header Bar */}
        <FlightHeaderBar
          departureIata={globeData.departure.iata}
          arrivalIata={globeData.arrival.iata}
          departureName={globeData.departure.name}
          arrivalName={globeData.arrival.name}
          departureTime={flightDetails.departureTime}
          durationMinutes={flightDetails.durationMinutes}
          distanceMeters={globeData.totalDistance}
          preference={preference}
          mapMode={mapMode}
          onTogglePreference={handleTogglePreference}
          onToggleMapMode={setMapMode}
          onSelectRoute={handleSelectRoute}
          onOpenRouteConfig={() => setIsRouteModalOpen(true)}
        />

        {/* Desktop Viewport Layout */}
        <div className="hidden md:flex flex-col gap-6">
          {/* Primary Hero Verdict Banner */}
          <HeroVerdictBanner
            recommendation={recommendation}
            confidence={confidence}
            preference={preference}
            sunSideDistribution={globeData.summary.sunSideDistribution}
            totalSunriseEvents={globeData.summary.totalSunriseEvents}
            totalSunsetEvents={globeData.summary.totalSunsetEvents}
            totalDurationMinutes={flightDetails.durationMinutes}
          />

          {/* Cockpit HUD Two-Column Grid */}
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Left Column (7 cols): Map (3D Globe or Default 2D Canvas) & Scrubber */}
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
              {mapMode === '3d' ? (
                <ThreeGlobeView
                  departure={globeData.departure}
                  arrival={globeData.arrival}
                  flightPath={flightPath}
                  currentWaypoint={currentPoint}
                  currentTime={currentTime}
                />
              ) : (
                <LightweightCanvasMap
                  departure={globeData.departure}
                  arrival={globeData.arrival}
                  flightPath={flightPath}
                  currentWaypoint={currentPoint}
                  currentTime={currentTime}
                />
              )}

              <FlightTimelineScrubber
                flightPath={flightPath}
                currentIndex={currentWaypointIndex}
                onIndexChange={setCurrentWaypointIndex}
                events={events}
                totalDurationMinutes={flightDetails.durationMinutes}
                departureTime={flightDetails.departureTime}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                playbackSpeed={playbackSpeed}
                onChangeSpeed={setPlaybackSpeed}
              />
            </div>

            {/* Right Column (5 cols): Cabin Cross-Section & Live Telemetry HUD */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
              <CabinCrossSection
                sunElevation={currentSunElevation}
                relativeAzimuth={relativeAzimuth}
                recommendedSide={recommendation}
                activePreference={preference}
                aircraftBearing={currentAircraftBearing}
                sunAzimuth={currentSunAzimuth}
              />

              {/* Live Avionics Telemetry Card */}
              <div className="cockpit-card rounded-xl p-5 border border-[var(--cockpit-border)]">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--cockpit-border)] mb-3">
                  <div className="flex items-center gap-2">
                    <IconCompass size={16} className="text-[var(--cabin-cyan)]" />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono-numbers text-white">
                      INSTANTANEOUS FLIGHT EPHEMERIS
                    </span>
                  </div>
                  <span className="text-[11px] font-mono-numbers text-[var(--foreground-muted)]">
                    60 FPS GEODESIC SYNC
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono-numbers">
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-[var(--cockpit-border)]">
                    <span className="text-[10px] text-[var(--foreground-muted)] uppercase block">
                      AIRCRAFT HEADING
                    </span>
                    <span className="text-sm font-bold text-[var(--alert-emerald)]">
                      {formatHeading(currentAircraftBearing)} TRK
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-[var(--cockpit-border)]">
                    <span className="text-[10px] text-[var(--foreground-muted)] uppercase block">
                      SOLAR AZIMUTH
                    </span>
                    <span className="text-sm font-bold text-[var(--solar-amber)]">
                      {formatHeading(currentSunAzimuth)} AZ
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-[var(--cockpit-border)]">
                    <span className="text-[10px] text-[var(--foreground-muted)] uppercase block">
                      SOLAR ELEVATION
                    </span>
                    <span className={`text-sm font-bold ${currentSunElevation > 0 ? 'text-[var(--solar-amber)]' : 'text-slate-400'}`}>
                      {formatElevation(currentSunElevation)} ALT
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-[var(--cockpit-border)]">
                    <span className="text-[10px] text-[var(--foreground-muted)] uppercase block">
                      CABIN SOLAR VECTOR
                    </span>
                    <span className="text-sm font-bold text-white">
                      {isNight ? 'NIGHT SKY' : relativeAzimuth > 180 ? 'PORT (LEFT)' : 'STARBOARD (RIGHT)'}
                    </span>
                  </div>
                </div>

                {/* Solar Events Notice */}
                {events.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[var(--cockpit-border)]">
                    <div className="text-[11px] font-bold uppercase tracking-wider font-mono-numbers text-[var(--solar-amber)] mb-2">
                      TRANSITION EVENTS ALONG ROUTE
                    </div>
                    <div className="space-y-1.5 text-xs font-mono-numbers">
                      {events.map((evt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded bg-zinc-900/60 border border-[var(--cockpit-border)]"
                        >
                          <span className="text-white font-bold uppercase">
                            {evt.type}
                          </span>
                          <span className="text-[var(--cabin-cyan)]">
                            {evt.time.toISOString().slice(11, 16)} UTC
                          </span>
                          <span className="text-[var(--foreground-muted)]">
                            Viewing: <span className="text-white">{evt.viewingSide.toUpperCase()}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Viewport Layout: Responsive Bottom Sheet Pattern */}
        <div className="md:hidden flex flex-col gap-4">
          {/* Top Half: Map & Scrubber */}
          <div className="sticky top-0 z-20 bg-[#09090b] pt-1 pb-2">
            {mapMode === '3d' ? (
              <ThreeGlobeView
                departure={globeData.departure}
                arrival={globeData.arrival}
                flightPath={flightPath}
                currentWaypoint={currentPoint}
                currentTime={currentTime}
              />
            ) : (
              <LightweightCanvasMap
                departure={globeData.departure}
                arrival={globeData.arrival}
                flightPath={flightPath}
                currentWaypoint={currentPoint}
                currentTime={currentTime}
              />
            )}

            <div className="mt-3">
              <FlightTimelineScrubber
                flightPath={flightPath}
                currentIndex={currentWaypointIndex}
                onIndexChange={setCurrentWaypointIndex}
                events={events}
                totalDurationMinutes={flightDetails.durationMinutes}
                departureTime={flightDetails.departureTime}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                playbackSpeed={playbackSpeed}
                onChangeSpeed={setPlaybackSpeed}
              />
            </div>
          </div>

          {/* Bottom Half: Sliding Bottom Sheet Container */}
          <div className="cockpit-panel rounded-2xl p-4 border border-[var(--cockpit-border)] flex flex-col gap-4">
            {/* Sheet Handle */}
            <div className="flex justify-center -mt-1 mb-1">
              <div className="w-12 h-1 rounded-full bg-zinc-700" />
            </div>

            {/* Hero Verdict Banner */}
            <HeroVerdictBanner
              recommendation={recommendation}
              confidence={confidence}
              preference={preference}
              sunSideDistribution={globeData.summary.sunSideDistribution}
              totalSunriseEvents={globeData.summary.totalSunriseEvents}
              totalSunsetEvents={globeData.summary.totalSunsetEvents}
              totalDurationMinutes={flightDetails.durationMinutes}
            />

            {/* Cabin Cross-Section */}
            <CabinCrossSection
              sunElevation={currentSunElevation}
              relativeAzimuth={relativeAzimuth}
              recommendedSide={recommendation}
              activePreference={preference}
              aircraftBearing={currentAircraftBearing}
              sunAzimuth={currentSunAzimuth}
            />
          </div>
        </div>
      </div>

      {/* Flight Route Configuration Modal */}
      <FlightRouteModal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
        onApplyRoute={handleApplyRoute}
        currentSource={flightDetails.departure}
        currentDest={flightDetails.arrival}
        currentDepartureTime={flightDetails.departureTime.toISOString().slice(0, 16)}
        currentDurationStr={`${Math.floor(flightDetails.durationMinutes / 60)}h ${flightDetails.durationMinutes % 60}m`}
      />
    </div>
  );
}