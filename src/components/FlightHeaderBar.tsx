'use client';

import React from 'react';
import { IconPlane, IconSun, IconShade, IconSliders } from './AviationIcons';
import { metersToNauticalMiles, metersToKm, getApproxUtcOffset } from '@/lib/solarTerminator';

export interface PopularRoute {
  dep: string;
  arr: string;
  depName: string;
  arrName: string;
  durationMinutes: number;
}

export const POPULAR_ROUTES: PopularRoute[] = [
  { dep: 'JFK', arr: 'LHR', depName: 'New York', arrName: 'London', durationMinutes: 420 },
  { dep: 'SFO', arr: 'NRT', depName: 'San Francisco', arrName: 'Tokyo', durationMinutes: 650 },
  { dep: 'DXB', arr: 'CDG', depName: 'Dubai', arrName: 'Paris', durationMinutes: 440 },
  { dep: 'DEL', arr: 'LHR', depName: 'Delhi', arrName: 'London', durationMinutes: 560 },
];

interface FlightHeaderBarProps {
  departureIata: string;
  arrivalIata: string;
  departureName: string;
  arrivalName: string;
  departureTime: Date;
  durationMinutes: number;
  distanceMeters: number;
  preference: 'sun' | 'shade';
  onTogglePreference: (pref: 'sun' | 'shade') => void;
  onSelectRoute: (dep: string, arr: string, durationMinutes: number) => void;
  onOpenRouteConfig: () => void;
}

export default function FlightHeaderBar({
  departureIata,
  arrivalIata,
  departureName,
  arrivalName,
  departureTime,
  durationMinutes,
  distanceMeters,
  preference,
  onTogglePreference,
  onSelectRoute,
  onOpenRouteConfig,
}: FlightHeaderBarProps) {
  // Flight Times & Offsets
  const depUtcOffset = getApproxUtcOffset(0, departureIata);
  const arrUtcOffset = getApproxUtcOffset(0, arrivalIata);

  const depHours = String(departureTime.getHours()).padStart(2, '0');
  const depMins = String(departureTime.getMinutes()).padStart(2, '0');

  const arrivalDate = new Date(departureTime.getTime() + durationMinutes * 60 * 1000);
  const arrHours = String(arrivalDate.getHours()).padStart(2, '0');
  const arrMins = String(arrivalDate.getMinutes()).padStart(2, '0');

  const distanceNm = metersToNauticalMiles(distanceMeters);
  const distanceKm = metersToKm(distanceMeters);
  const airTimeHours = Math.floor(durationMinutes / 60);
  const airTimeMins = durationMinutes % 60;

  return (
    <div className="cockpit-panel rounded-2xl p-5 border border-[var(--cockpit-border)] shadow-2xl mb-6">
      {/* Top Bar: Route Boarding Pass and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-[var(--cockpit-border)]">
        {/* Origin Airport Block */}
        <div className="flex items-center gap-5">
          <div>
            <div className="text-3xl sm:text-4xl font-black font-mono-numbers tracking-tight text-white flex items-center gap-2">
              <span>{departureIata}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-[var(--foreground-muted)] font-normal">
                {depUtcOffset}
              </span>
            </div>
            <div className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider font-medium truncate max-w-[160px]">
              {departureName}
            </div>
            <div className="text-sm font-mono-numbers font-semibold text-zinc-300 mt-1">
              STD {depHours}:{depMins} LCL
            </div>
          </div>

          {/* Center Flight Corridor Vector Visual */}
          <div className="flex flex-col items-center px-4">
            <div className="text-[11px] font-mono-numbers text-[var(--cabin-cyan)] font-semibold tracking-wider uppercase mb-1">
              NON-STOP
            </div>
            <div className="flex items-center gap-2 w-32 sm:w-44 text-zinc-600">
              <div className="w-2 h-2 rounded-full bg-[var(--solar-amber)]" />
              <div className="flex-1 h-[2px] bg-gradient-to-r from-[var(--solar-amber)] via-zinc-500 to-[var(--alert-emerald)] relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white">
                  <IconPlane size={15} className="rotate-90 text-white" />
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-[var(--alert-emerald)]" />
            </div>
            <div className="text-[11px] font-mono-numbers text-[var(--foreground-muted)] mt-1">
              GREAT CIRCLE
            </div>
          </div>

          {/* Destination Airport Block */}
          <div>
            <div className="text-3xl sm:text-4xl font-black font-mono-numbers tracking-tight text-white flex items-center gap-2">
              <span>{arrivalIata}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-[var(--foreground-muted)] font-normal">
                {arrUtcOffset}
              </span>
            </div>
            <div className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider font-medium truncate max-w-[160px]">
              {arrivalName}
            </div>
            <div className="text-sm font-mono-numbers font-semibold text-zinc-300 mt-1">
              STA {arrHours}:{arrMins} LCL
            </div>
          </div>
        </div>

        {/* Telemetry Metrics: NM, Air Time & Config Button */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono-numbers">
          <div className="border-l border-[var(--cockpit-border)] pl-4">
            <div className="text-[10px] uppercase text-[var(--foreground-muted)] tracking-wider">
              GEODESIC DISTANCE
            </div>
            <div className="text-lg font-bold text-white">
              {distanceNm.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">NM</span>
            </div>
            <div className="text-[11px] text-zinc-500">
              {distanceKm.toLocaleString()} KM
            </div>
          </div>

          <div className="border-l border-[var(--cockpit-border)] pl-4">
            <div className="text-[10px] uppercase text-[var(--foreground-muted)] tracking-wider">
              TOTAL AIR TIME
            </div>
            <div className="text-lg font-bold text-white">
              {airTimeHours}h {airTimeMins}m
            </div>
            <div className="text-[11px] text-zinc-500">
              {durationMinutes} MINS
            </div>
          </div>

          {/* Edit Route Button */}
          <button
            type="button"
            onClick={onOpenRouteConfig}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-[var(--cockpit-border)] transition-all hover:border-zinc-500 text-xs font-mono-numbers font-bold"
          >
            <IconSliders size={14} />
            <span>CONFIGURE ROUTE</span>
          </button>
        </div>
      </div>

      {/* Bottom Sub-Bar: Dual-Intent Toggle & Popular Route Chips */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
        {/* Dual-Intent Segmented Control */}
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-mono-numbers text-[var(--foreground-muted)] mr-1 hidden sm:inline">
            FLIGHT INTENT:
          </span>
          <div className="inline-flex p-1 rounded-xl bg-zinc-950 border border-[var(--cockpit-border)]">
            <button
              type="button"
              onClick={() => onTogglePreference('shade')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono-numbers transition-all ${
                preference === 'shade'
                  ? 'bg-zinc-800 text-[var(--cabin-cyan)] shadow-sm border border-sky-800/50'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <IconShade size={14} />
              <span>AVOID SUN GLARE [MAX SHADE]</span>
            </button>
            <button
              type="button"
              onClick={() => onTogglePreference('sun')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono-numbers transition-all ${
                preference === 'sun'
                  ? 'bg-zinc-800 text-[var(--solar-amber)] shadow-sm border border-amber-800/50'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <IconSun size={14} />
              <span>SCENIC SUN & GOLDEN HOUR</span>
            </button>
          </div>
        </div>

        {/* Popular Routes Quick-Select Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs uppercase font-mono-numbers text-[var(--foreground-muted)] whitespace-nowrap">
            POPULAR:
          </span>
          {POPULAR_ROUTES.map((route) => {
            const isSelected = departureIata === route.dep && arrivalIata === route.arr;
            return (
              <button
                key={`${route.dep}-${route.arr}`}
                type="button"
                onClick={() => onSelectRoute(route.dep, route.arr, route.durationMinutes)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-numbers font-medium whitespace-nowrap border transition-all ${
                  isSelected
                    ? 'bg-emerald-950/60 text-[var(--alert-emerald)] border-[var(--alert-emerald)]'
                    : 'bg-zinc-900/60 text-zinc-300 border-[var(--cockpit-border)] hover:border-zinc-500 hover:text-white'
                }`}
              >
                {route.dep} → {route.arr}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
