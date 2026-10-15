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

  // Electrochromic Window Shades State (Smart auto-dimming on glare side)
  const [portShadeDown, setPortShadeDown] = useState(false);
  const [starboardShadeDown, setStarboardShadeDown] = useState(false);
  const [autoDim, setAutoDim] = useState(true);

  // Auto-dim window on glare side
  useEffect(() => {
    if (autoDim) {
      setPortShadeDown(isSunOnPort);
      setStarboardShadeDown(isSunOnStarboard);
    }
  }, [autoDim, isSunOnPort, isSunOnStarboard]);

  // Geometric volumetric ray projection inside SVG viewBox="0 0 600 380"
  // Port Window: cx=48, cy=150
  // Starboard Window: cx=552, cy=150
  // Cabin Floor: y=300
  const clampedElev = Math.max(8, Math.min(75, Math.abs(sunElevation)));
  const rayAngleRad = (clampedElev * Math.PI) / 180;

  const portWindowX = 64;
  const starboardWindowX = 536;

  // Floor target calculation
  const beamDepth = 150 / Math.tan(rayAngleRad);
  const portBeamTargetX = Math.min(380, portWindowX + Math.max(90, beamDepth));
  const starboardBeamTargetX = Math.max(220, starboardWindowX - Math.max(90, beamDepth));

  const isPortRecommended = recommendedSide === 'left' || recommendedSide === 'either';
  const isStarboardRecommended = recommendedSide === 'right' || recommendedSide === 'either';

  return (
    <div className="cockpit-card rounded-xl p-5 border border-[var(--cockpit-border)] relative overflow-hidden flex flex-col justify-between shadow-2xl">
      {/* HUD Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[var(--cockpit-border)] mb-3 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--cabin-cyan)] animate-pulse" />
          <span className="text-xs uppercase tracking-wider font-mono-numbers text-white font-bold">
            CABIN HUD [B787 / A350 GLASS CUTAWAY]
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-[var(--foreground-muted)] font-mono-numbers font-medium">
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
      <div className="relative w-full aspect-[600/380] flex items-center justify-center bg-zinc-950/80 rounded-lg p-2 border border-white/5">
        <svg
          viewBox="0 0 600 380"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Outer Airframe Titanium Bevel */}
            <linearGradient id="fuselageOuterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#334155" />
              <stop offset="75%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Inner Cabin Wall Gradient */}
            <linearGradient id="cabinInnerWallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isNight ? '#111827' : '#1e293b'} />
              <stop offset="100%" stopColor={isNight ? '#0a0f1d' : '#0f172a'} />
            </linearGradient>

            {/* Volumetric Sunbeam Port */}
            <linearGradient id="volBeamPort" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
              <stop offset="20%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            {/* Volumetric Sunbeam Starboard */}
            <linearGradient id="volBeamStarboard" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
              <stop offset="20%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            {/* Emerald Recommendation Halo */}
            <filter id="emeraldSuiteGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#10b981" floodOpacity="0.85" />
            </filter>

            {/* Solar Window Flare */}
            <filter id="windowSunFlare" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#fbbf24" floodOpacity="0.9" />
            </filter>
          </defs>

          {/* 1. Titanium Outer Airframe Hull */}
          <ellipse
            cx="300"
            cy="190"
            rx="285"
            ry="175"
            fill="url(#fuselageOuterGrad)"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="3.5"
          />

          {/* Structural Stringers / Ribs */}
          <ellipse
            cx="300"
            cy="190"
            rx="275"
            ry="165"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />

          {/* 2. Inner Carbon Composite Cabin Wall */}
          <ellipse
            cx="300"
            cy="190"
            rx="265"
            ry="155"
            fill="url(#cabinInnerWallGrad)"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="2"
          />

          {/* 3. Arched Ceiling & Overhead Bins (B787 / A350 Architecture) */}
          <path
            d="M 100 95 Q 300 58 500 95 L 480 125 Q 300 98 120 125 Z"
            fill="#1e293b"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="1.5"
          />

          {/* Overhead Bins Division Panels */}
          <path d="M 140 100 L 230 108 L 225 132 L 135 124 Z" fill="#243048" stroke="rgba(255,255,255,0.12)" />
          <path d="M 460 100 L 370 108 L 375 132 L 465 124 Z" fill="#243048" stroke="rgba(255,255,255,0.12)" />

          {/* Center Ceiling Ambient LED Cove Lighting Strip */}
          <line
            x1="240"
            y1="82"
            x2="360"
            y2="82"
            stroke={isNight ? '#818cf8' : '#fbbf24'}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.95"
          />
          {/* Secondary Ceiling Wash Glow */}
          <ellipse
            cx="300"
            cy="84"
            rx="80"
            ry="12"
            fill={isNight ? 'rgba(129, 140, 248, 0.2)' : 'rgba(251, 191, 36, 0.25)'}
          />

          {/* 4. Heavy Aircraft Floor Structure */}
          <line x1="70" y1="300" x2="530" y2="300" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="3.5" />
          <line x1="90" y1="308" x2="510" y2="308" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />

          {/* Aisle Emergency Escape LED Path Lighting */}
          <line x1="240" y1="298" x2="360" y2="298" stroke="#38bdf8" strokeWidth="2" strokeDasharray="8 4" opacity="0.8" />

          {/* 5. Left (Port) Dreamliner Window Assembly */}
          <g transform="translate(42, 130)">
            {/* Window Outer Bevel Frame */}
            <rect
              x="-4"
              y="-4"
              width="36"
              height="88"
              rx="16"
              fill="#334155"
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="2"
            />
            {/* Glass Pane */}
            <rect
              x="0"
              y="0"
              width="28"
              height="80"
              rx="12"
              fill={isSunOnPort ? '#fbbf24' : isNight ? '#030712' : '#38bdf8'}
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="1.5"
              filter={isSunOnPort ? 'url(#windowSunFlare)' : undefined}
            />

            {/* Night Stars outside Port Window */}
            {isNight && (
              <>
                <circle cx="10" cy="22" r="1.2" fill="#ffffff" />
                <circle cx="18" cy="40" r="1.5" fill="#fef08a" />
                <circle cx="8" cy="60" r="1.0" fill="#67e8f9" />
              </>
            )}

            {/* Electrochromic Shade / Polarized Blind */}
            <rect
              x="2"
              y="2"
              width="24"
              height={portShadeDown ? 76 : 18}
              rx="6"
              fill="#0f172a"
              stroke="#64748b"
              strokeWidth="1.2"
              className="transition-all duration-500 ease-in-out"
            />
            {portShadeDown && (
              <>
                <line x1="4" y1="40" x2="24" y2="40" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
                <text x="14" y="65" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  DIM
                </text>
              </>
            )}
          </g>

          {/* 6. Right (Starboard) Dreamliner Window Assembly */}
          <g transform="translate(530, 130)">
            <rect
              x="-4"
              y="-4"
              width="36"
              height="88"
              rx="16"
              fill="#334155"
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="2"
            />
            <rect
              x="0"
              y="0"
              width="28"
              height="80"
              rx="12"
              fill={isSunOnStarboard ? '#fbbf24' : isNight ? '#030712' : '#38bdf8'}
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="1.5"
              filter={isSunOnStarboard ? 'url(#windowSunFlare)' : undefined}
            />

            {/* Night Stars outside Starboard Window */}
            {isNight && (
              <>
                <circle cx="18" cy="24" r="1.2" fill="#ffffff" />
                <circle cx="10" cy="44" r="1.5" fill="#fef08a" />
                <circle cx="16" cy="62" r="1.0" fill="#67e8f9" />
              </>
            )}

            {/* Electrochromic Shade */}
            <rect
              x="2"
              y="2"
              width="24"
              height={starboardShadeDown ? 76 : 18}
              rx="6"
              fill="#0f172a"
              stroke="#64748b"
              strokeWidth="1.2"
              className="transition-all duration-500 ease-in-out"
            />
            {starboardShadeDown && (
              <>
                <line x1="4" y1="40" x2="24" y2="40" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
                <text x="14" y="65" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  DIM
                </text>
              </>
            )}
          </g>

          {/* 7. DYNAMIC VOLUMETRIC LIGHT BEAMS */}
          {/* Port Sun Beam (If sun hitting Port and shade is not dimmed) */}
          {isSunOnPort && !portShadeDown && (
            <polygon
              points={`${portWindowX},135 ${portWindowX},205 ${portBeamTargetX},300 ${Math.max(100, portBeamTargetX - 110)},300`}
              fill="url(#volBeamPort)"
            />
          )}

          {/* Starboard Sun Beam (If sun hitting Starboard and shade is not dimmed) */}
          {isSunOnStarboard && !starboardShadeDown && (
            <polygon
              points={`${starboardWindowX},135 ${starboardWindowX},205 ${starboardBeamTargetX},300 ${Math.min(500, starboardBeamTargetX + 110)},300`}
              fill="url(#volBeamStarboard)"
            />
          )}

          {/* 8. LUXURY FIRST/BUSINESS SUITE 12A [PORT] (Window Left) */}
          <g transform="translate(95, 160)">
            {/* Emerald Halo if Recommended */}
            {isPortRecommended && (
              <rect
                x="-12"
                y="-18"
                width="104"
                height="150"
                rx="16"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                filter="url(#emeraldSuiteGlow)"
              />
            )}

            {/* Outer Pod Privacy Shell */}
            <rect
              x="0"
              y="0"
              width="80"
              height="100"
              rx="12"
              fill={isPortRecommended ? '#064e3b' : isSunOnPort && !portShadeDown ? '#451a03' : '#1e293b'}
              stroke={isPortRecommended ? '#10b981' : isSunOnPort ? '#f59e0b' : 'rgba(255,255,255,0.3)'}
              strokeWidth="2.5"
            />

            {/* Quilted Leather Horizontal Stitching */}
            <line x1="12" y1="25" x2="68" y2="25" stroke={isPortRecommended ? '#34d399' : 'rgba(255,255,255,0.2)'} strokeWidth="1.5" strokeDasharray="4 2" />
            <line x1="12" y1="50" x2="68" y2="50" stroke={isPortRecommended ? '#34d399' : 'rgba(255,255,255,0.2)'} strokeWidth="1.5" strokeDasharray="4 2" />
            <line x1="12" y1="75" x2="68" y2="75" stroke={isPortRecommended ? '#34d399' : 'rgba(255,255,255,0.2)'} strokeWidth="1.5" strokeDasharray="4 2" />

            {/* Ergonomic Adjustable Headrest with Wings */}
            <rect
              x="12"
              y="-14"
              width="56"
              height="28"
              rx="8"
              fill={isPortRecommended ? '#047857' : isSunOnPort ? '#78350f' : '#334155'}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.5"
            />
            {/* Headrest Comfort Fold Wings */}
            <path d="M 14 -12 L 20 12 L 14 12 Z" fill="rgba(0,0,0,0.3)" />
            <path d="M 66 -12 L 60 12 L 66 12 Z" fill="rgba(0,0,0,0.3)" />

            {/* Seat Base Cushion */}
            <rect
              x="-4"
              y="94"
              width="88"
              height="24"
              rx="8"
              fill={isPortRecommended ? '#065f46' : isSunOnPort && !portShadeDown ? '#451a03' : '#1e293b'}
              stroke={isPortRecommended ? '#10b981' : 'rgba(255,255,255,0.3)'}
              strokeWidth="2"
            />

            {/* Suite Armrest Console & IFE Screen Mount */}
            <rect x="74" y="65" width="16" height="42" rx="4" fill="#334155" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            {/* Mini IFE Screen */}
            <rect x="78" y="72" width="8" height="14" rx="2" fill="#0284c7" />

            {/* Structural Floor Mount Stems */}
            <line x1="16" y1="118" x2="16" y2="140" stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
            <line x1="64" y1="118" x2="64" y2="140" stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
          </g>

          {/* 9. LUXURY FIRST/BUSINESS SUITE 12K [STARBOARD] (Window Right) */}
          <g transform="translate(425, 160)">
            {/* Emerald Halo if Recommended */}
            {isStarboardRecommended && (
              <rect
                x="-12"
                y="-18"
                width="104"
                height="150"
                rx="16"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                filter="url(#emeraldSuiteGlow)"
              />
            )}

            {/* Outer Pod Privacy Shell */}
            <rect
              x="0"
              y="0"
              width="80"
              height="100"
              rx="12"
              fill={isStarboardRecommended ? '#064e3b' : isSunOnStarboard && !starboardShadeDown ? '#451a03' : '#1e293b'}
              stroke={isStarboardRecommended ? '#10b981' : isSunOnStarboard ? '#f59e0b' : 'rgba(255,255,255,0.3)'}
              strokeWidth="2.5"
            />

            {/* Quilted Leather Horizontal Stitching */}
            <line x1="12" y1="25" x2="68" y2="25" stroke={isStarboardRecommended ? '#34d399' : 'rgba(255,255,255,0.2)'} strokeWidth="1.5" strokeDasharray="4 2" />
            <line x1="12" y1="50" x2="68" y2="50" stroke={isStarboardRecommended ? '#34d399' : 'rgba(255,255,255,0.2)'} strokeWidth="1.5" strokeDasharray="4 2" />
            <line x1="12" y1="75" x2="68" y2="75" stroke={isStarboardRecommended ? '#34d399' : 'rgba(255,255,255,0.2)'} strokeWidth="1.5" strokeDasharray="4 2" />

            {/* Ergonomic Adjustable Headrest with Wings */}
            <rect
              x="12"
              y="-14"
              width="56"
              height="28"
              rx="8"
              fill={isStarboardRecommended ? '#047857' : isSunOnStarboard ? '#78350f' : '#334155'}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.5"
            />
            {/* Headrest Wings */}
            <path d="M 14 -12 L 20 12 L 14 12 Z" fill="rgba(0,0,0,0.3)" />
            <path d="M 66 -12 L 60 12 L 66 12 Z" fill="rgba(0,0,0,0.3)" />

            {/* Seat Base Cushion */}
            <rect
              x="-4"
              y="94"
              width="88"
              height="24"
              rx="8"
              fill={isStarboardRecommended ? '#065f46' : isSunOnStarboard && !starboardShadeDown ? '#451a03' : '#1e293b'}
              stroke={isStarboardRecommended ? '#10b981' : 'rgba(255,255,255,0.3)'}
              strokeWidth="2"
            />

            {/* Suite Armrest Console & IFE */}
            <rect x="-10" y="65" width="16" height="42" rx="4" fill="#334155" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <rect x="-6" y="72" width="8" height="14" rx="2" fill="#0284c7" />

            {/* Structural Floor Mount Stems */}
            <line x1="16" y1="118" x2="16" y2="140" stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
            <line x1="64" y1="118" x2="64" y2="140" stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
          </g>

          {/* 10. Center Aisle Readout */}
          <text
            x="300"
            y="288"
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.4)"
            fontSize="11"
            fontFamily="monospace"
            letterSpacing="3"
            fontWeight="bold"
          >
            MAIN CABIN AISLE
          </text>

          {/* Seat Identifiers */}
          <text
            x="135"
            y="330"
            textAnchor="middle"
            fill={isPortRecommended ? '#10b981' : '#ffffff'}
            fontSize="13"
            fontWeight="bold"
            fontFamily="monospace"
          >
            SUITE 12A [PORT]
          </text>

          <text
            x="465"
            y="330"
            textAnchor="middle"
            fill={isStarboardRecommended ? '#10b981' : '#ffffff'}
            fontSize="13"
            fontWeight="bold"
            fontFamily="monospace"
          >
            SUITE 12K [STARBOARD]
          </text>

          {/* Floating Recommended Badges */}
          {isPortRecommended && (
            <g transform="translate(135, 350)">
              <rect x="-56" y="-10" width="112" height="20" rx="10" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
              <text x="0" y="4" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold" fontFamily="monospace">
                [RECOMMENDED]
              </text>
            </g>
          )}

          {isStarboardRecommended && (
            <g transform="translate(465, 350)">
              <rect x="-56" y="-10" width="112" height="20" rx="10" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
              <text x="0" y="4" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold" fontFamily="monospace">
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
            isPortRecommended ? 'border-[var(--alert-emerald)] bg-emerald-950/30' : 'border-[var(--cockpit-border)] bg-zinc-900/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-white text-xs">PORT SUITE [12A]</span>
            <button
              type="button"
              onClick={() => {
                setAutoDim(false);
                setPortShadeDown(!portShadeDown);
              }}
              className="px-2 py-0.5 rounded text-[10px] font-mono-numbers bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 transition-colors"
            >
              {portShadeDown ? '[TINT: 100%]' : '[TINT: 0%]'}
            </button>
          </div>
          <div className="flex items-center gap-1.5 font-mono-numbers">
            {isSunOnPort ? (
              <span className="text-[var(--solar-amber)] font-medium inline-flex items-center gap-1">
                <IconSun size={13} /> {portShadeDown ? 'GLARE DEFLECTED' : 'DIRECT SOLAR GLARE'}
              </span>
            ) : isNight ? (
              <span className="text-slate-300 inline-flex items-center gap-1">
                <IconShade size={13} /> NIGHT CABIN REST
              </span>
            ) : (
              <span className="text-[var(--cabin-cyan)] font-medium inline-flex items-center gap-1">
                <IconShade size={13} /> COOL SHADE
              </span>
            )}
          </div>
        </div>

        {/* Starboard Status & Shade Toggle */}
        <div
          className={`p-3 rounded-lg border ${
            isStarboardRecommended ? 'border-[var(--alert-emerald)] bg-emerald-950/30' : 'border-[var(--cockpit-border)] bg-zinc-900/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-white text-xs">STARBOARD SUITE [12K]</span>
            <button
              type="button"
              onClick={() => {
                setAutoDim(false);
                setStarboardShadeDown(!starboardShadeDown);
              }}
              className="px-2 py-0.5 rounded text-[10px] font-mono-numbers bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 transition-colors"
            >
              {starboardShadeDown ? '[TINT: 100%]' : '[TINT: 0%]'}
            </button>
          </div>
          <div className="flex items-center gap-1.5 font-mono-numbers">
            {isSunOnStarboard ? (
              <span className="text-[var(--solar-amber)] font-medium inline-flex items-center gap-1">
                <IconSun size={13} /> {starboardShadeDown ? 'GLARE DEFLECTED' : 'DIRECT SOLAR GLARE'}
              </span>
            ) : isNight ? (
              <span className="text-slate-300 inline-flex items-center gap-1">
                <IconShade size={13} /> NIGHT CABIN REST
              </span>
            ) : (
              <span className="text-[var(--cabin-cyan)] font-medium inline-flex items-center gap-1">
                <IconShade size={13} /> COOL SHADE
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
