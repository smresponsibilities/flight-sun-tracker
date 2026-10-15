'use client';

import React, { useState, useEffect } from 'react';
import { IconSun, IconShade } from './AviationIcons';

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

  // Window Shades State (Defaults: Auto-lower on glare side)
  const [portShadeDown, setPortShadeDown] = useState(false);
  const [starboardShadeDown, setStarboardShadeDown] = useState(false);
  const [autoShade, setAutoShade] = useState(true);

  // Sync shades with glare when auto-shade is enabled
  useEffect(() => {
    if (autoShade) {
      setPortShadeDown(isSunOnPort);
      setStarboardShadeDown(isSunOnStarboard);
    }
  }, [autoShade, isSunOnPort, isSunOnStarboard]);

  // Geometric volumetric ray projection inside SVG viewBox="0 0 540 340"
  // Port Window: cx=48, cy=145
  // Starboard Window: cx=492, cy=145
  // Cabin Floor: y=275
  const clampedElev = Math.max(8, Math.min(75, Math.abs(sunElevation)));
  const rayAngleRad = (clampedElev * Math.PI) / 180;

  const portWindowX = 54;
  const starboardWindowX = 486;

  // Floor target calculation
  const beamDepth = 130 / Math.tan(rayAngleRad);
  const portBeamTargetX = Math.min(340, portWindowX + Math.max(80, beamDepth));
  const starboardBeamTargetX = Math.max(200, starboardWindowX - Math.max(80, beamDepth));

  const isPortRecommended = recommendedSide === 'left' || recommendedSide === 'either';
  const isStarboardRecommended = recommendedSide === 'right' || recommendedSide === 'either';

  return (
    <div className="cockpit-card rounded-xl p-5 border border-[var(--cockpit-border)] relative overflow-hidden flex flex-col justify-between">
      {/* HUD Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[var(--cockpit-border)] mb-4 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--cabin-cyan)] animate-pulse" />
          <span className="text-xs uppercase tracking-wider font-mono-numbers text-white font-bold">
            CABIN HUD [B787 / A350 GLASS CUTAWAY]
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-[var(--foreground-muted)] font-mono-numbers">
            {activePreference === 'shade' ? 'MAX SHADE' : 'SCENIC SUN'}
          </span>
        </div>

        {/* Telemetry Metrics */}
        <div className="flex items-center gap-3 text-xs font-mono-numbers">
          <span className="text-[var(--foreground-muted)]">
            TRK: <span className="text-white font-bold">{Math.round(aircraftBearing)}°</span>
          </span>
          <span className="text-[var(--foreground-muted)]">
            SUN AZ: <span className="text-[var(--solar-amber)] font-bold">{Math.round(sunAzimuth)}°</span>
          </span>
          <span className="text-[var(--foreground-muted)]">
            REL:{' '}
            <span className={isNight ? 'text-slate-400' : 'text-[var(--solar-amber)] font-bold'}>
              {isNight ? 'NIGHT' : `${Math.round(relativeAzimuth)}°`}
            </span>
          </span>
          <span className="text-[var(--foreground-muted)]">
            ALT:{' '}
            <span className={sunElevation > 0 ? 'text-[var(--solar-amber)] font-bold' : 'text-slate-400 font-bold'}>
              {sunElevation > 0 ? `+${sunElevation.toFixed(1)}°` : `${sunElevation.toFixed(1)}°`}
            </span>
          </span>
        </div>
      </div>

      {/* Luxury Cutaway SVG Graphic */}
      <div className="relative w-full aspect-[540/340] flex items-center justify-center">
        <svg
          viewBox="0 0 540 340"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Metallic Titanium Outer Rim Gradient */}
            <linearGradient id="titaniumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="30%" stopColor="#1e293b" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Carbon Fiber Fuselage Wall Gradient */}
            <linearGradient id="carbonWall" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0c101d" />
              <stop offset="100%" stopColor="#060911" />
            </linearGradient>

            {/* Volumetric Sunbeam Port */}
            <linearGradient id="volumetricBeamPort" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.65" />
              <stop offset="25%" stopColor="#fbbf24" stopOpacity="0.4" />
              <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            {/* Volumetric Sunbeam Starboard */}
            <linearGradient id="volumetricBeamStarboard" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.65" />
              <stop offset="25%" stopColor="#fbbf24" stopOpacity="0.4" />
              <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            {/* Emerald Recommendation Glow */}
            <filter id="emeraldBeaconGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#10b981" floodOpacity="0.75" />
            </filter>

            {/* Solar Flare Glow */}
            <filter id="solarFlare" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#fbbf24" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* 1. Titanium Metallic Outer Airframe Rim */}
          <ellipse
            cx="270"
            cy="170"
            rx="255"
            ry="155"
            fill="url(#titaniumGrad)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="3.5"
          />

          {/* 2. Inner Carbon Composite Cabin Wall */}
          <ellipse
            cx="270"
            cy="170"
            rx="240"
            ry="142"
            fill={isNight ? '#080c18' : 'url(#carbonWall)'}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="2"
          />

          {/* 3. Arched Ceiling & Overhead Bins (B787 / A350 Signature Architecture) */}
          <path
            d="M 90 85 Q 270 52 450 85 L 430 110 Q 270 88 110 110 Z"
            fill="#111827"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1.2"
          />
          {/* Bin Partition Latches */}
          <path d="M 130 90 L 210 96 L 205 118 L 125 112 Z" fill="#182030" stroke="rgba(255, 255, 255, 0.08)" />
          <path d="M 410 90 L 330 96 L 335 118 L 415 112 Z" fill="#182030" stroke="rgba(255, 255, 255, 0.08)" />

          {/* Dynamic Ambient Ceiling Mood LED Strip */}
          <line
            x1="220"
            y1="70"
            x2="320"
            y2="70"
            stroke={isNight ? '#38bdf8' : '#fbbf24'}
            strokeWidth="3"
            strokeLinecap="round"
            opacity={isNight ? 0.9 : 0.75}
          />

          {/* 4. Cabin Floor Structure */}
          <line x1="60" y1="270" x2="480" y2="270" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="3" />
          <line x1="85" y1="277" x2="455" y2="277" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />

          {/* 5. Left (Port) Window Assembly */}
          <g transform="translate(36, 120)">
            {/* Window Cutout Bevel */}
            <rect
              x="0"
              y="0"
              width="24"
              height="60"
              rx="10"
              fill={isSunOnPort ? '#fbbf24' : isNight ? '#050814' : '#38bdf8'}
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="2.5"
              filter={isSunOnPort ? 'url(#solarFlare)' : undefined}
            />

            {/* Night Stars outside Port Window */}
            {isNight && (
              <>
                <circle cx="8" cy="18" r="0.8" fill="#ffffff" opacity="0.9" />
                <circle cx="16" cy="32" r="1.0" fill="#ffffff" opacity="0.8" />
                <circle cx="10" cy="45" r="0.7" fill="#67e8f9" opacity="0.85" />
              </>
            )}

            {/* Window Blind / Electrochromic Shade */}
            <rect
              x="2"
              y="2"
              width="20"
              height={portShadeDown ? 56 : 14}
              rx="4"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="1"
              className="transition-all duration-500 ease-in-out"
            />
            {portShadeDown && (
              <line x1="4" y1="30" x2="20" y2="30" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
            )}
          </g>

          {/* 6. Right (Starboard) Window Assembly */}
          <g transform="translate(480, 120)">
            <rect
              x="0"
              y="0"
              width="24"
              height="60"
              rx="10"
              fill={isSunOnStarboard ? '#fbbf24' : isNight ? '#050814' : '#38bdf8'}
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="2.5"
              filter={isSunOnStarboard ? 'url(#solarFlare)' : undefined}
            />

            {/* Night Stars outside Starboard Window */}
            {isNight && (
              <>
                <circle cx="16" cy="20" r="0.8" fill="#ffffff" opacity="0.9" />
                <circle cx="8" cy="35" r="1.0" fill="#ffffff" opacity="0.8" />
                <circle cx="14" cy="48" r="0.7" fill="#67e8f9" opacity="0.85" />
              </>
            )}

            {/* Window Blind / Electrochromic Shade */}
            <rect
              x="2"
              y="2"
              width="20"
              height={starboardShadeDown ? 56 : 14}
              rx="4"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="1"
              className="transition-all duration-500 ease-in-out"
            />
            {starboardShadeDown && (
              <line x1="4" y1="30" x2="20" y2="30" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
            )}
          </g>

          {/* 7. DYNAMIC VOLUMETRIC LIGHT BEAMS */}
          {/* Port Sun Beam (If sun hitting Port and shade is open) */}
          {isSunOnPort && !portShadeDown && (
            <polygon
              points={`${portWindowX},122 ${portWindowX},178 ${portBeamTargetX},270 ${Math.max(80, portBeamTargetX - 90)},270`}
              fill="url(#volumetricBeamPort)"
            />
          )}

          {/* Starboard Sun Beam (If sun hitting Starboard and shade is open) */}
          {isSunOnStarboard && !starboardShadeDown && (
            <polygon
              points={`${starboardWindowX},122 ${starboardWindowX},178 ${starboardBeamTargetX},270 ${Math.min(460, starboardBeamTargetX + 90)},270`}
              fill="url(#volumetricBeamStarboard)"
            />
          )}

          {/* 8. LUXURY SEAT 12A [PORT] (Window Left Suite) */}
          <g transform="translate(86, 150)">
            {/* Emerald Beacon Aura & Stitching if Recommended */}
            {isPortRecommended && (
              <rect
                x="-10"
                y="-18"
                width="84"
                height="136"
                rx="14"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                filter="url(#emeraldBeaconGlow)"
              />
            )}

            {/* Seat Back Cushion Shell */}
            <rect
              x="4"
              y="0"
              width="56"
              height="85"
              rx="8"
              fill={isPortRecommended ? '#064e3b' : isSunOnPort && !portShadeDown ? '#451a03' : '#1e293b'}
              stroke={isPortRecommended ? '#10b981' : isSunOnPort ? '#f59e0b' : 'rgba(255,255,255,0.2)'}
              strokeWidth="2"
            />

            {/* Emerald Stitching Accents */}
            {isPortRecommended && (
              <>
                <line x1="12" y1="15" x2="52" y2="15" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 2" />
                <line x1="12" y1="45" x2="52" y2="45" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 2" />
                <line x1="12" y1="75" x2="52" y2="75" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 2" />
              </>
            )}

            {/* Ergonomic Headrest */}
            <rect
              x="12"
              y="-12"
              width="40"
              height="24"
              rx="6"
              fill={isPortRecommended ? '#047857' : isSunOnPort ? '#78350f' : '#334155'}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1.2"
            />

            {/* Seat Base Cushion */}
            <rect
              x="0"
              y="80"
              width="64"
              height="22"
              rx="6"
              fill={isPortRecommended ? '#065f46' : isSunOnPort && !portShadeDown ? '#451a03' : '#1e293b'}
              stroke={isPortRecommended ? '#10b981' : 'rgba(255,255,255,0.2)'}
              strokeWidth="1.5"
            />

            {/* Armrest Console */}
            <rect x="58" y="60" width="12" height="30" rx="3" fill="#334155" />

            {/* Structural Pedestal */}
            <line x1="14" y1="102" x2="14" y2="120" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
            <line x1="50" y1="102" x2="50" y2="120" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
          </g>

          {/* 9. LUXURY SEAT 12K [STARBOARD] (Window Right Suite) */}
          <g transform="translate(390, 150)">
            {/* Emerald Beacon Aura & Stitching if Recommended */}
            {isStarboardRecommended && (
              <rect
                x="-10"
                y="-18"
                width="84"
                height="136"
                rx="14"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                filter="url(#emeraldBeaconGlow)"
              />
            )}

            {/* Seat Back Cushion Shell */}
            <rect
              x="4"
              y="0"
              width="56"
              height="85"
              rx="8"
              fill={isStarboardRecommended ? '#064e3b' : isSunOnStarboard && !starboardShadeDown ? '#451a03' : '#1e293b'}
              stroke={isStarboardRecommended ? '#10b981' : isSunOnStarboard ? '#f59e0b' : 'rgba(255,255,255,0.2)'}
              strokeWidth="2"
            />

            {/* Emerald Stitching Accents */}
            {isStarboardRecommended && (
              <>
                <line x1="12" y1="15" x2="52" y2="15" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 2" />
                <line x1="12" y1="45" x2="52" y2="45" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 2" />
                <line x1="12" y1="75" x2="52" y2="75" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 2" />
              </>
            )}

            {/* Ergonomic Headrest */}
            <rect
              x="12"
              y="-12"
              width="40"
              height="24"
              rx="6"
              fill={isStarboardRecommended ? '#047857' : isSunOnStarboard ? '#78350f' : '#334155'}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1.2"
            />

            {/* Seat Base Cushion */}
            <rect
              x="0"
              y="80"
              width="64"
              height="22"
              rx="6"
              fill={isStarboardRecommended ? '#065f46' : isSunOnStarboard && !starboardShadeDown ? '#451a03' : '#1e293b'}
              stroke={isStarboardRecommended ? '#10b981' : 'rgba(255,255,255,0.2)'}
              strokeWidth="1.5"
            />

            {/* Armrest Console */}
            <rect x="-6" y="60" width="12" height="30" rx="3" fill="#334155" />

            {/* Structural Pedestal */}
            <line x1="14" y1="102" x2="14" y2="120" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
            <line x1="50" y1="102" x2="50" y2="120" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
          </g>

          {/* Central Aisle Label */}
          <text
            x="270"
            y="262"
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.25)"
            fontSize="10"
            fontFamily="monospace"
            letterSpacing="2"
          >
            CENTER AISLE
          </text>

          {/* Seat Badges */}
          <text
            x="118"
            y="298"
            textAnchor="middle"
            fill={isPortRecommended ? '#10b981' : '#f4f4f5'}
            fontSize="12"
            fontWeight="bold"
            fontFamily="monospace"
          >
            SEAT 12A [PORT]
          </text>

          <text
            x="422"
            y="298"
            textAnchor="middle"
            fill={isStarboardRecommended ? '#10b981' : '#f4f4f5'}
            fontSize="12"
            fontWeight="bold"
            fontFamily="monospace"
          >
            SEAT 12K [STARBOARD]
          </text>

          {/* Recommended Floating Badges */}
          {isPortRecommended && (
            <g transform="translate(118, 316)">
              <rect x="-48" y="-10" width="96" height="18" rx="9" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
              <text x="0" y="3" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace">
                [RECOMMENDED]
              </text>
            </g>
          )}

          {isStarboardRecommended && (
            <g transform="translate(422, 316)">
              <rect x="-48" y="-10" width="96" height="18" rx="9" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
              <text x="0" y="3" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace">
                [RECOMMENDED]
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Interactive Window Shade Toggles & Seat Status Cards */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--cockpit-border)] text-xs mt-3">
        {/* Port Status & Shade Toggle */}
        <div
          className={`p-3 rounded-lg border ${
            isPortRecommended ? 'border-[var(--alert-emerald)] bg-emerald-950/20' : 'border-[var(--cockpit-border)] bg-zinc-900/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-[var(--foreground)]">PORT [12A]</span>
            <button
              type="button"
              onClick={() => {
                setAutoShade(false);
                setPortShadeDown(!portShadeDown);
              }}
              className="px-2 py-0.5 rounded text-[10px] font-mono-numbers bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-[var(--cockpit-border)] transition-colors"
            >
              {portShadeDown ? '[SHADE: DOWN]' : '[SHADE: UP]'}
            </button>
          </div>
          <div className="flex items-center gap-1.5 font-mono-numbers">
            {isSunOnPort ? (
              <span className="text-[var(--solar-amber)] font-medium inline-flex items-center gap-1">
                <IconSun size={13} /> {portShadeDown ? 'GLARE BLOCKED' : 'DIRECT SOLAR GLARE'}
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
        </div>

        {/* Starboard Status & Shade Toggle */}
        <div
          className={`p-3 rounded-lg border ${
            isStarboardRecommended ? 'border-[var(--alert-emerald)] bg-emerald-950/20' : 'border-[var(--cockpit-border)] bg-zinc-900/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-[var(--foreground)]">STARBOARD [12K]</span>
            <button
              type="button"
              onClick={() => {
                setAutoShade(false);
                setStarboardShadeDown(!starboardShadeDown);
              }}
              className="px-2 py-0.5 rounded text-[10px] font-mono-numbers bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-[var(--cockpit-border)] transition-colors"
            >
              {starboardShadeDown ? '[SHADE: DOWN]' : '[SHADE: UP]'}
            </button>
          </div>
          <div className="flex items-center gap-1.5 font-mono-numbers">
            {isSunOnStarboard ? (
              <span className="text-[var(--solar-amber)] font-medium inline-flex items-center gap-1">
                <IconSun size={13} /> {starboardShadeDown ? 'GLARE BLOCKED' : 'DIRECT SOLAR GLARE'}
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
        </div>
      </div>
    </div>
  );
}
