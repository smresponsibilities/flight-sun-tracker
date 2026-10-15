'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import type { Airport, FlightPathPoint } from '@/lib/flightCalculator';
import { CONTINENTS } from '@/lib/data/worldLand';
import { calculateTerminatorPath, getSubsolarPoint, formatHeading, formatElevation } from '@/lib/solarTerminator';

interface LightweightCanvasMapProps {
  departure: Airport;
  arrival: Airport;
  flightPath: FlightPathPoint[];
  currentWaypoint: FlightPathPoint | null;
  currentTime: Date;
}

export default function LightweightCanvasMap({
  departure,
  arrival,
  flightPath,
  currentWaypoint,
  currentTime,
}: LightweightCanvasMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Coordinate projections: Equirectangular projection [-180, 180] x [-90, 90]
  const project = useCallback((lon: number, lat: number, width: number, height: number) => {
    // Clamp coordinates
    const clampedLon = Math.max(-180, Math.min(180, lon));
    const clampedLat = Math.max(-85, Math.min(85, lat));
    const x = ((clampedLon + 180) / 360) * width;
    const y = ((90 - clampedLat) / 180) * height;
    return { x, y };
  }, []);

  // Main 60 FPS Canvas draw routine
  const renderMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    // Reset transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cssWidth = width / dpr;
    const cssHeight = height / dpr;

    // 1. Dark Cockpit Radar Space Background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // 2. Graticules (Latitude / Longitude Grid)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';

    // Longitude lines
    for (let lon = -120; lon <= 120; lon += 60) {
      const p1 = project(lon, 80, cssWidth, cssHeight);
      const p2 = project(lon, -80, cssWidth, cssHeight);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.fillText(`${Math.abs(lon)}°${lon < 0 ? 'W' : lon > 0 ? 'E' : ''}`, p1.x + 4, cssHeight - 12);
    }

    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
      const p1 = project(-180, lat, cssWidth, cssHeight);
      const p2 = project(180, lat, cssWidth, cssHeight);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      if (lat !== 0) {
        ctx.fillText(`${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`, 6, p1.y - 4);
      } else {
        ctx.fillText('EQ', 6, p1.y - 4);
      }
    }

    // 3. Simplified World Continents
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.2;

    CONTINENTS.forEach((poly) => {
      if (poly.length < 2) return;
      ctx.beginPath();
      const first = project(poly[0][0], poly[0][1], cssWidth, cssHeight);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < poly.length; i++) {
        const pt = project(poly[i][0], poly[i][1], cssWidth, cssHeight);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // 4. Solar Day / Night Terminator & Golden Hour Band
    try {
      const subsolar = getSubsolarPoint(currentTime);
      const terminator = calculateTerminatorPath(currentTime, 120);

      // Draw Night Shade Polygon
      if (terminator.length > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(3, 7, 18, 0.68)';
        ctx.beginPath();

        // Trace terminator line from West to East
        const isNorthSun = subsolar.lat >= 0;
        const poleY = isNorthSun ? cssHeight : 0;

        const firstPt = project(terminator[0].lon, terminator[0].nightLat, cssWidth, cssHeight);
        ctx.moveTo(firstPt.x, firstPt.y);

        for (let i = 1; i < terminator.length; i++) {
          const pt = project(terminator[i].lon, terminator[i].nightLat, cssWidth, cssHeight);
          ctx.lineTo(pt.x, pt.y);
        }

        // Close along the dark pole
        const lastPt = project(
          terminator[terminator.length - 1].lon,
          terminator[terminator.length - 1].nightLat,
          cssWidth,
          cssHeight
        );
        ctx.lineTo(lastPt.x, poleY);
        ctx.lineTo(firstPt.x, poleY);
        ctx.closePath();
        ctx.fill();

        // Draw Golden Hour Twilight Band along terminator
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i < terminator.length; i++) {
          const pt = project(terminator[i].lon, terminator[i].nightLat, cssWidth, cssHeight);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        ctx.restore();
      }

      // Draw Subsolar Sun Marker on Map
      const subsolarPt = project(subsolar.lon, subsolar.lat, cssWidth, cssHeight);
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(subsolarPt.x, subsolarPt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.font = '9px monospace';
      ctx.fillText('ZENITH', subsolarPt.x + 6, subsolarPt.y - 4);
    } catch {
      // Ephemeris fallback
    }

    // 5. Geodesic Flight Path
    if (flightPath && flightPath.length > 1) {
      // Glow background path
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      flightPath.forEach((pt, idx) => {
        const p = project(pt.location.lon, pt.location.lat, cssWidth, cssHeight);
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Sharp Core Great Circle Path
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      flightPath.forEach((pt, idx) => {
        const p = project(pt.location.lon, pt.location.lat, cssWidth, cssHeight);
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    // 6. Airport Markers (Departure & Arrival)
    const depPt = project(departure.longitude, departure.latitude, cssWidth, cssHeight);
    const arrPt = project(arrival.longitude, arrival.latitude, cssWidth, cssHeight);

    // Departure (Amber Beacon)
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(depPt.x, depPt.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`[DEP] ${departure.iata}`, depPt.x + 7, depPt.y - 5);

    // Arrival (Emerald Beacon)
    ctx.fillStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(arrPt.x, arrPt.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`[ARR] ${arrival.iata}`, arrPt.x + 7, arrPt.y - 5);

    // 7. Aircraft Position & Heading Vector
    if (currentWaypoint) {
      const acPt = project(
        currentWaypoint.location.lon,
        currentWaypoint.location.lat,
        cssWidth,
        cssHeight
      );

      // Instantaneous aircraft bearing in radians
      const bearingRad = ((currentWaypoint.aircraftBearing - 90) * Math.PI) / 180;

      // Draw Forward Heading Vector Line (40px ahead)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(acPt.x, acPt.y);
      const forwardX = acPt.x + Math.cos(bearingRad) * 45;
      const forwardY = acPt.y + Math.sin(bearingRad) * 45;
      ctx.lineTo(forwardX, forwardY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Sun Vector Arrow radiating from Aircraft toward Sun Azimuth
      if (currentWaypoint.sunPosition.elevation > 0) {
        const sunAzRad = ((currentWaypoint.sunPosition.azimuth - 90) * Math.PI) / 180;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(acPt.x, acPt.y);
        const sunRayX = acPt.x + Math.cos(sunAzRad) * 35;
        const sunRayY = acPt.y + Math.sin(sunAzRad) * 35;
        ctx.lineTo(sunRayX, sunRayY);
        ctx.stroke();

        // Mini Sun glyph at ray tip
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(sunRayX, sunRayY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Aircraft Silhouette Icon
      ctx.save();
      ctx.translate(acPt.x, acPt.y);
      ctx.rotate((currentWaypoint.aircraftBearing * Math.PI) / 180);

      // Glowing Halo
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';

      // Fuselage & Wings (Clean Vector Aircraft)
      ctx.beginPath();
      ctx.moveTo(0, -12); // Nose
      ctx.lineTo(2, -4);
      ctx.lineTo(12, 2);  // Right wing tip
      ctx.lineTo(12, 4);
      ctx.lineTo(3, 3);
      ctx.lineTo(2, 9);
      ctx.lineTo(6, 12);  // Right tail
      ctx.lineTo(6, 13);
      ctx.lineTo(0, 11);  // Tail center
      ctx.lineTo(-6, 13); // Left tail
      ctx.lineTo(-6, 12);
      ctx.lineTo(-2, 9);
      ctx.lineTo(-3, 3);
      ctx.lineTo(-12, 4); // Left wing tip
      ctx.lineTo(-12, 2);
      ctx.lineTo(-2, -4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }, [departure, arrival, flightPath, currentWaypoint, currentTime, project]);

  // Resize observer to maintain crisp resolution
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;
      renderMap();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderMap]);

  useEffect(() => {
    renderMap();
  }, [renderMap]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[16/9] min-h-[280px] md:min-h-[380px] rounded-xl overflow-hidden border border-[var(--cockpit-border)] cockpit-card flex flex-col justify-between"
    >
      {/* Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Top Left Cockpit HUD Overlay */}
      <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[var(--cockpit-border)] flex items-center gap-3 text-xs font-mono-numbers">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--alert-emerald)]" />
          <span className="font-bold text-[var(--foreground)]">GREAT CIRCLE NAV</span>
        </div>
        <span className="text-[var(--foreground-muted)]">
          {departure.iata} → {arrival.iata}
        </span>
      </div>

      {/* Bottom HUD Telemetry Strip */}
      {currentWaypoint && (
        <div className="absolute bottom-3 left-3 right-3 bg-zinc-950/85 backdrop-blur-md px-3 py-2 rounded-lg border border-[var(--cockpit-border)] flex flex-wrap items-center justify-between gap-2 text-xs font-mono-numbers">
          <div className="flex items-center gap-3">
            <span className="text-[var(--foreground-muted)]">
              POS:{' '}
              <span className="text-white font-bold">
                {Math.abs(currentWaypoint.location.lat).toFixed(1)}°{currentWaypoint.location.lat >= 0 ? 'N' : 'S'}{' '}
                {Math.abs(currentWaypoint.location.lon).toFixed(1)}°{currentWaypoint.location.lon >= 0 ? 'E' : 'W'}
              </span>
            </span>
            <span className="text-[var(--foreground-muted)]">
              HDG:{' '}
              <span className="text-[var(--alert-emerald)] font-bold">
                {formatHeading(currentWaypoint.aircraftBearing)} TRK
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[var(--foreground-muted)]">
              SUN AZ:{' '}
              <span className="text-[var(--solar-amber)] font-bold">
                {formatHeading(currentWaypoint.sunPosition.azimuth)}
              </span>
            </span>
            <span className="text-[var(--foreground-muted)]">
              ALT:{' '}
              <span className={currentWaypoint.sunPosition.elevation > 0 ? 'text-[var(--solar-amber)] font-bold' : 'text-slate-400 font-bold'}>
                {formatElevation(currentWaypoint.sunPosition.elevation)}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
