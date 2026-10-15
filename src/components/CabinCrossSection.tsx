'use client';

import React from 'react';
import { IconSun, IconShade, IconCheck } from './AviationIcons';

interface CabinCrossSectionProps {
  sunElevation: number; // degrees
  relativeAzimuth: number; // degrees [0, 360) relative to aircraft nose (0=Nose, 90=Right, 270=Left)
  recommendedSide: 'left' | 'right' | 'either';
  activePreference: 'sun' | 'shade';
  aircraftBearing: number;
  sunAzimuth: number;
}

export default function CabinCrossSection({
  sunElevation,
  relativeAzimuth,
  recommendedSide,
  activePreference,
  aircraftBearing,
  sunAzimuth,
}: CabinCrossSectionProps) {
  const isNight = sunElevation <= 0;
  
  // Determine if sun hits Port (180 to 360) or Starboard (0 to 180)
  const isSunOnStarboard = !isNight && relativeAzimuth > 0 && relativeAzimuth < 180;
  const isSunOnPort = !isNight && relativeAzimuth > 180 && relativeAzimuth < 360;

  // Incident beam angle inside cabin cross-section
  // Clamp elevation between 5 and 75 deg for visual ray projection
  const clampedElev = Math.max(8, Math.min(75, Math.abs(sunElevation)));
  const rayAngleRad = (clampedElev * Math.PI) / 180;

  // Window coordinates inside SVG viewBox="0 0 500 320"
  // Port Window: cx=48, cy=140
  // Starboard Window: cx=452, cy=140
  // Cabin Floor: y=260
  const portWindowX = 54;
  const starboardWindowX = 446;

  // Calculate beam target on floor
  const beamDepth = 120 / Math.tan(rayAngleRad);
  const portBeamTargetX = Math.min(320, portWindowX + Math.max(70, beamDepth));
  const starboardBeamTargetX = Math.max(180, starboardWindowX - Math.max(70, beamDepth));

  const isPortRecommended = recommendedSide === 'left' || recommendedSide === 'either';
  const isStarboardRecommended = recommendedSide === 'right' || recommendedSide === 'either';

  return (
    <div className="cockpit-card rounded-xl p-5 border border-[var(--cockpit-border)] relative overflow-hidden flex flex-col justify-between">
      {/* HUD Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[var(--cockpit-border)] mb-4 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--cabin-cyan)] animate-pulse" />
          <span className="text-xs uppercase tracking-wider font-mono-numbers text-[var(--foreground-muted)]">
            CABIN CROSS-SECTION [B787/A350] - {activePreference === 'shade' ? 'SHADE' : 'SUN'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono-numbers">
          <span className="text-[var(--foreground-muted)]">
            HDG:{' '}
            <span className="text-white font-bold">
              {Math.round(aircraftBearing)}°
            </span>
          </span>
          <span className="text-[var(--foreground-muted)]">
            SUN AZ:{' '}
            <span className="text-[var(--solar-amber)] font-bold">
              {Math.round(sunAzimuth)}°
            </span>
          </span>
          <span className="text-[var(--foreground-muted)]">
            REL:{' '}
            <span className={isNight ? 'text-slate-400' : 'text-[var(--solar-amber)] font-bold'}>
              {isNight ? 'NIGHT' : `${Math.round(relativeAzimuth)}°`}
            </span>
          </span>
          <span className="text-[var(--foreground-muted)]">
            ELEV:{' '}
            <span className={sunElevation > 0 ? 'text-[var(--solar-amber)] font-bold' : 'text-slate-400 font-bold'}>
              {sunElevation > 0 ? `+${sunElevation.toFixed(1)}°` : `${sunElevation.toFixed(1)}°`}
            </span>
          </span>
        </div>
      </div>

      {/* 2D Cross Section SVG Graphic */}
      <div className="relative w-full aspect-[500/320] flex items-center justify-center">
        <svg
          viewBox="0 0 500 320"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="fuselageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#18181b" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>

            <linearGradient id="sunBeamPort" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="sunBeamStarboard" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="cabinShadowPort" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="cabinShadowStarboard" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>

            <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.6" />
            </filter>
            
            <filter id="amberGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#fbbf24" floodOpacity="0.7" />
            </filter>
          </defs>

          {/* Outer Fuselage Ring */}
          <ellipse
            cx="250"
            cy="160"
            rx="232"
            ry="142"
            fill="url(#fuselageGrad)"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="3"
          />

          {/* Inner Fuselage Wall */}
          <ellipse
            cx="250"
            cy="160"
            rx="218"
            ry="130"
            fill={isNight ? '#080c14' : '#0c0e14'}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1.5"
          />

          {/* Cabin Ceiling & Luggage Bins */}
          <path
            d="M 90 75 Q 250 45 410 75 L 390 95 Q 250 78 110 95 Z"
            fill="#18181b"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
          />
          {/* Overhead Bins Outlines */}
          <path d="M 120 80 L 190 85 L 185 105 L 115 98 Z" fill="#202026" stroke="rgba(255,255,255,0.08)" />
          <path d="M 380 80 L 310 85 L 315 105 L 385 98 Z" fill="#202026" stroke="rgba(255,255,255,0.08)" />
          {/* Center Ceiling Ambient LED strip */}
          <line
            x1="210"
            y1="62"
            x2="290"
            y2="62"
            stroke={isNight ? '#38bdf8' : '#fbbf24'}
            strokeWidth="2"
            opacity="0.8"
          />

          {/* Cabin Floor */}
          <line x1="60" y1="250" x2="440" y2="250" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2.5" />
          {/* Floor Under-structure */}
          <line x1="80" y1="256" x2="420" y2="256" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />

          {/* Windows */}
          {/* Port Window (Left) */}
          <rect
            x="36"
            y="115"
            width="18"
            height="50"
            rx="8"
            fill={isSunOnPort ? '#fbbf24' : isNight ? '#0b1329' : '#38bdf8'}
            stroke={isSunOnPort ? '#f59e0b' : 'rgba(255, 255, 255, 0.3)'}
            strokeWidth="2"
            filter={isSunOnPort ? 'url(#amberGlow)' : undefined}
          />
          {/* Starboard Window (Right) */}
          <rect
            x="446"
            y="115"
            width="18"
            height="50"
            rx="8"
            fill={isSunOnStarboard ? '#fbbf24' : isNight ? '#0b1329' : '#38bdf8'}
            stroke={isSunOnStarboard ? '#f59e0b' : 'rgba(255, 255, 255, 0.3)'}
            strokeWidth="2"
            filter={isSunOnStarboard ? 'url(#amberGlow)' : undefined}
          />

          {/* DYNAMIC SUN BEAM PROJECTIONS */}
          {/* Port Sun Beam */}
          {isSunOnPort && (
            <polygon
              points={`${portWindowX},118 ${portWindowX},165 ${portBeamTargetX},250 ${Math.max(80, portBeamTargetX - 70)},250`}
              fill="url(#sunBeamPort)"
            />
          )}

          {/* Starboard Sun Beam */}
          {isSunOnStarboard && (
            <polygon
              points={`${starboardWindowX},118 ${starboardWindowX},165 ${starboardBeamTargetX},250 ${Math.min(420, starboardBeamTargetX + 70)},250`}
              fill="url(#sunBeamStarboard)"
            />
          )}

          {/* SHADE OVERLAYS */}
          {isSunOnStarboard && (
            <rect x="54" y="110" width="180" height="140" fill="url(#cabinShadowPort)" />
          )}
          {isSunOnPort && (
            <rect x="266" y="110" width="180" height="140" fill="url(#cabinShadowStarboard)" />
          )}

          {/* SEAT A [PORT] (Window Left) */}
          <g transform="translate(80, 145)">
            {/* Emerald Halo if Recommended */}
            {isPortRecommended && (
              <rect
                x="-8"
                y="-12"
                width="76"
                height="115"
                rx="10"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4 2"
                filter="url(#emeraldGlow)"
              />
            )}
            {/* Seat Back */}
            <rect
              x="5"
              y="0"
              width="50"
              height="75"
              rx="6"
              fill={isPortRecommended ? '#064e3b' : isSunOnPort ? '#451a03' : '#1e293b'}
              stroke={isPortRecommended ? '#10b981' : isSunOnPort ? '#f59e0b' : 'rgba(255,255,255,0.15)'}
              strokeWidth="2"
            />
            {/* Headrest */}
            <rect
              x="12"
              y="-10"
              width="36"
              height="20"
              rx="5"
              fill={isPortRecommended ? '#047857' : isSunOnPort ? '#78350f' : '#334155'}
            />
            {/* Seat Base Cushion */}
            <rect
              x="2"
              y="70"
              width="56"
              height="18"
              rx="4"
              fill={isPortRecommended ? '#065f46' : isSunOnPort ? '#451a03' : '#1e293b'}
              stroke={isPortRecommended ? '#10b981' : isSunOnPort ? '#f59e0b' : 'rgba(255,255,255,0.15)'}
              strokeWidth="1.5"
            />
            {/* Leg Stand */}
            <line x1="12" y1="88" x2="12" y2="105" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
            <line x1="48" y1="88" x2="48" y2="105" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
          </g>

          {/* SEAT K [STARBOARD] (Window Right) */}
          <g transform="translate(360, 145)">
            {/* Emerald Halo if Recommended */}
            {isStarboardRecommended && (
              <rect
                x="-8"
                y="-12"
                width="76"
                height="115"
                rx="10"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4 2"
                filter="url(#emeraldGlow)"
              />
            )}
            {/* Seat Back */}
            <rect
              x="5"
              y="0"
              width="50"
              height="75"
              rx="6"
              fill={isStarboardRecommended ? '#064e3b' : isSunOnStarboard ? '#451a03' : '#1e293b'}
              stroke={isStarboardRecommended ? '#10b981' : isSunOnStarboard ? '#f59e0b' : 'rgba(255,255,255,0.15)'}
              strokeWidth="2"
            />
            {/* Headrest */}
            <rect
              x="12"
              y="-10"
              width="36"
              height="20"
              rx="5"
              fill={isStarboardRecommended ? '#047857' : isSunOnStarboard ? '#78350f' : '#334155'}
            />
            {/* Seat Base Cushion */}
            <rect
              x="2"
              y="70"
              width="56"
              height="18"
              rx="4"
              fill={isStarboardRecommended ? '#065f46' : isSunOnStarboard ? '#451a03' : '#1e293b'}
              stroke={isStarboardRecommended ? '#10b981' : isSunOnStarboard ? '#f59e0b' : 'rgba(255,255,255,0.15)'}
              strokeWidth="1.5"
            />
            {/* Leg Stand */}
            <line x1="12" y1="88" x2="12" y2="105" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
            <line x1="48" y1="88" x2="48" y2="105" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
          </g>

          {/* Central Aisle Label */}
          <text
            x="250"
            y="242"
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.25)"
            fontSize="10"
            fontFamily="monospace"
            letterSpacing="2"
          >
            CABIN AISLE
          </text>

          {/* Seat Labels */}
          <text
            x="110"
            y="278"
            textAnchor="middle"
            fill={isPortRecommended ? '#10b981' : '#f4f4f5'}
            fontSize="12"
            fontWeight="bold"
            fontFamily="monospace"
          >
            SEAT 12A [PORT]
          </text>

          <text
            x="390"
            y="278"
            textAnchor="middle"
            fill={isStarboardRecommended ? '#10b981' : '#f4f4f5'}
            fontSize="12"
            fontWeight="bold"
            fontFamily="monospace"
          >
            SEAT 12K [STARBOARD]
          </text>

          {/* Sun Vector Exterior Arrows */}
          {isSunOnPort && (
            <g transform="translate(10, 100)">
              <line x1="0" y1="0" x2="24" y2="28" stroke="#fbbf24" strokeWidth="2.5" />
              <polygon points="26,30 18,25 25,18" fill="#fbbf24" />
              <circle cx="-6" cy="-6" r="8" fill="#fbbf24" filter="url(#amberGlow)" />
            </g>
          )}

          {isSunOnStarboard && (
            <g transform="translate(490, 100)">
              <line x1="0" y1="0" x2="-24" y2="28" stroke="#fbbf24" strokeWidth="2.5" />
              <polygon points="-26,30 -18,25 -25,18" fill="#fbbf24" />
              <circle cx="6" cy="-6" r="8" fill="#fbbf24" filter="url(#amberGlow)" />
            </g>
          )}
        </svg>
      </div>

      {/* Real-Time Seat Status Footers */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--cockpit-border)] text-xs mt-3">
        {/* Port Status */}
        <div className={`p-2.5 rounded-lg border ${
          isPortRecommended ? 'border-[var(--alert-emerald)] bg-emerald-950/20' : 'border-[var(--cockpit-border)] bg-zinc-900/40'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-[var(--foreground)]">PORT [12A]</span>
            {isPortRecommended && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-[var(--alert-emerald)]">
                <IconCheck size={12} /> RECOMMENDED
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 font-mono-numbers">
            {isSunOnPort ? (
              <span className="text-[var(--solar-amber)] font-medium inline-flex items-center gap-1">
                <IconSun size={13} /> DIRECT SOLAR GLARE
              </span>
            ) : isNight ? (
              <span className="text-slate-400 inline-flex items-center gap-1">
                <IconShade size={13} /> NIGHT CABIN REST
              </span>
            ) : (
              <span className="text-[var(--cabin-cyan)] font-medium inline-flex items-center gap-1">
                <IconShade size={13} /> PROTECTED SHADE
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
            {isSunOnPort ? 'Window shade lowered recommended' : 'Open window for glare-free cruising'}
          </p>
        </div>

        {/* Starboard Status */}
        <div className={`p-2.5 rounded-lg border ${
          isStarboardRecommended ? 'border-[var(--alert-emerald)] bg-emerald-950/20' : 'border-[var(--cockpit-border)] bg-zinc-900/40'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-[var(--foreground)]">STARBOARD [12K]</span>
            {isStarboardRecommended && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-[var(--alert-emerald)]">
                <IconCheck size={12} /> RECOMMENDED
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 font-mono-numbers">
            {isSunOnStarboard ? (
              <span className="text-[var(--solar-amber)] font-medium inline-flex items-center gap-1">
                <IconSun size={13} /> DIRECT SOLAR GLARE
              </span>
            ) : isNight ? (
              <span className="text-slate-400 inline-flex items-center gap-1">
                <IconShade size={13} /> NIGHT CABIN REST
              </span>
            ) : (
              <span className="text-[var(--cabin-cyan)] font-medium inline-flex items-center gap-1">
                <IconShade size={13} /> PROTECTED SHADE
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
            {isSunOnStarboard ? 'Window shade lowered recommended' : 'Open window for glare-free cruising'}
          </p>
        </div>
      </div>
    </div>
  );
}
