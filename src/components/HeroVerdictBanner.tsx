'use client';

import React from 'react';
import { IconCheck, IconSun, IconShade } from './AviationIcons';

interface HeroVerdictBannerProps {
  recommendation: 'left' | 'right' | 'either';
  confidence: number;
  preference: 'sun' | 'shade';
  sunSideDistribution: {
    leftPercent: number;
    rightPercent: number;
    nightPercent: number;
  };
  totalSunriseEvents: number;
  totalSunsetEvents: number;
  totalDurationMinutes: number;
}

export default function HeroVerdictBanner({
  recommendation,
  confidence,
  preference,
  sunSideDistribution,
  totalSunriseEvents,
  totalSunsetEvents,
  totalDurationMinutes,
}: HeroVerdictBannerProps) {
  const isShadeMode = preference === 'shade';

  const durationHrs = Math.floor(totalDurationMinutes / 60);
  const durationMins = totalDurationMinutes % 60;
  const flightDurationFormatted = `${durationHrs}h ${durationMins}m`;

  // Determine Seat & Label
  let seatLabel = 'SEAT 12A [PORT / LEFT SIDE]';
  let badgeText = '82% Shaded Flight Duration';
  let sideDesc = `Avoid direct sunlight glare on your screen across this ${flightDurationFormatted} flight.`;

  if (recommendation === 'left') {
    seatLabel = 'SEAT 12A [PORT / LEFT SIDE]';
    if (isShadeMode) {
      const shadePct = Math.max(50, 100 - sunSideDistribution.leftPercent);
      badgeText = `${shadePct}% Shaded Flight Duration`;
      sideDesc = `Port side keeps you in cabin shadow. Direct solar glare strikes Starboard for ${sunSideDistribution.rightPercent}% of this ${flightDurationFormatted} flight.`;
    } else {
      badgeText = `${sunSideDistribution.leftPercent}% Daylight Scenic Exposure`;
      sideDesc = `Port side gives prime views of the sun, cloudscapes, and horizon illumination throughout this ${flightDurationFormatted} route.`;
    }
  } else if (recommendation === 'right') {
    seatLabel = 'SEAT 12K [STARBOARD / RIGHT SIDE]';
    if (isShadeMode) {
      const shadePct = Math.max(50, 100 - sunSideDistribution.rightPercent);
      badgeText = `${shadePct}% Shaded Flight Duration`;
      sideDesc = `Starboard side keeps you in cabin shadow. Direct solar glare strikes Port for ${sunSideDistribution.leftPercent}% of this ${flightDurationFormatted} flight.`;
    } else {
      badgeText = `${sunSideDistribution.rightPercent}% Daylight Scenic Exposure`;
      sideDesc = `Starboard side provides prime views of the sun, golden hour horizons, and daylight scenery throughout this ${flightDurationFormatted} route.`;
    }
  } else {
    // Either / Night flight
    seatLabel = 'SEAT 12A OR 12K [BALANCED REST]';
    if (sunSideDistribution.nightPercent > 50) {
      badgeText = `${sunSideDistribution.nightPercent}% Night Flight (Zero Glare)`;
      sideDesc = `Predominantly night flight (${flightDurationFormatted}) with zero direct solar glare. Either side offers optimal darkness for rest and sleep.`;
    } else {
      badgeText = 'Symmetric Solar Exposure';
      sideDesc = `Solar exposure is balanced between both sides during this ${flightDurationFormatted} flight path. Either side provides comparable conditions.`;
    }
  }

  const totalEvents = totalSunriseEvents + totalSunsetEvents;

  return (
    <div className="cockpit-card rounded-xl p-5 border border-[var(--cockpit-border)] relative overflow-hidden bg-gradient-to-r from-zinc-950 via-[#0a1210] to-zinc-950">
      {/* Top Banner Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/80 text-[var(--alert-emerald)] text-xs font-bold uppercase tracking-wider font-mono-numbers">
          <IconCheck size={14} className="text-[var(--alert-emerald)]" />
          <span>RECOMMENDED VERDICT</span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400">{confidence}% CONFIDENCE</span>
        </div>

        {/* Concise Badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono-numbers ${
            isShadeMode
              ? 'bg-sky-950/80 text-[var(--cabin-cyan)] border border-sky-800/60'
              : 'bg-amber-950/80 text-[var(--solar-amber)] border border-amber-800/60'
          }`}
        >
          {isShadeMode ? <IconShade size={14} /> : <IconSun size={14} />}
          <span>{badgeText}</span>
        </div>
      </div>

      {/* Hero Seat Verdict Headline */}
      <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight font-mono-numbers text-white my-2 flex items-baseline gap-2">
        <span className="text-[var(--alert-emerald)]">{seatLabel}</span>
      </h2>

      {/* Concise Tactical Description */}
      <p className="text-sm text-[var(--foreground-muted)] max-w-2xl leading-relaxed">
        {sideDesc}
      </p>

      {/* Route Telemetry Badges Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-4 border-t border-[var(--cockpit-border)] font-mono-numbers text-xs">
        <div className="bg-zinc-900/60 p-2 rounded-lg border border-[var(--cockpit-border)]">
          <span className="text-[var(--foreground-muted)] block text-[10px] uppercase">PORT GLARE</span>
          <span className="text-white font-bold">{sunSideDistribution.leftPercent}%</span>
        </div>
        <div className="bg-zinc-900/60 p-2 rounded-lg border border-[var(--cockpit-border)]">
          <span className="text-[var(--foreground-muted)] block text-[10px] uppercase">STARBOARD GLARE</span>
          <span className="text-white font-bold">{sunSideDistribution.rightPercent}%</span>
        </div>
        <div className="bg-zinc-900/60 p-2 rounded-lg border border-[var(--cockpit-border)]">
          <span className="text-[var(--foreground-muted)] block text-[10px] uppercase">NIGHT / TWILIGHT</span>
          <span className="text-white font-bold">{sunSideDistribution.nightPercent}%</span>
        </div>
        <div className="bg-zinc-900/60 p-2 rounded-lg border border-[var(--cockpit-border)]">
          <span className="text-[var(--foreground-muted)] block text-[10px] uppercase">SOLAR EVENTS</span>
          <span className="text-[var(--solar-amber)] font-bold">
            {totalEvents > 0 ? `${totalEvents} EVENT${totalEvents > 1 ? 'S' : ''}` : 'NONE'}
          </span>
        </div>
      </div>
    </div>
  );
}
