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

  // Determine if sun strikes Port (180 to 360) or Starboard (0 to 180)
  const isSunOnStarboard = !isNight && relativeAzimuth > 0 && relativeAzimuth < 180;
  const isSunOnPort = !isNight && relativeAzimuth > 180 && relativeAzimuth < 360;

  // Real-time instantaneous dynamic seat recommendation
  const isPortRecommended = !isNight && (
    recommendedSide === 'left' || (recommendedSide === 'either' && (activePreference === 'shade' ? isSunOnStarboard : isSunOnPort))
  );
  const isStarboardRecommended = !isNight && (
    recommendedSide === 'right' || (recommendedSide === 'either' && (activePreference === 'shade' ? isSunOnPort : isSunOnStarboard))
  );

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

  // Geometric volumetric ray projection inside SVG viewBox="0 0 640 380"
  // Port Window: cx=54, cy=155
  // Starboard Window: cx=586, cy=155
  // Cabin Floor: y=295
  const clampedElev = Math.max(12, Math.min(75, Math.abs(sunElevation)));
  const rayAngleRad = (clampedElev * Math.PI) / 180;

  const portWindowX = 64;
  const starboardWindowX = 576;

  const beamSpread = 140 / Math.tan(rayAngleRad);
  const portBeamTargetX = Math.min(380, portWindowX + Math.max(100, beamSpread));
  const starboardBeamTargetX = Math.max(260, starboardWindowX - Math.max(100, beamSpread));

  return (
    <div className="cockpit-card rounded-xl p-5 border border-[var(--cockpit-border)] relative overflow-hidden flex flex-col justify-between shadow-2xl bg-[#090d16]">
      {/* HUD Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[var(--cockpit-border)] mb-3 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--cabin-cyan)] animate-pulse" />
          <span className="text-xs uppercase tracking-wider font-mono-numbers text-white font-bold">
            CABIN HUD [B787 / A350 GLASS CUTAWAY]
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-[var(--foreground-muted)] font-mono-numbers font-medium flex items-center gap-1">
            {activePreference === 'shade' ? <IconShade size={11} className="text-sky-400" /> : <IconSun size={11} className="text-amber-400" />}
            <span>{activePreference === 'shade' ? 'MAX SHADE' : 'SCENIC SUN'}</span>
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
      <div className="relative w-full aspect-[640/380] flex items-center justify-center bg-zinc-950/90 rounded-lg p-2 border border-white/10 shadow-inner">
        <svg
          viewBox="0 0 640 380"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Outer Fuselage Titanium Gradient */}
            <linearGradient id="fuselageBevel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#475569" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            {/* Inner Cabin Wall Gradient */}
            <linearGradient id="cabinInnerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isNight ? '#0b1120' : '#1e293b'} />
              <stop offset="100%" stopColor={isNight ? '#050811' : '#0f172a'} />
            </linearGradient>

            {/* Soft Volumetric Sunbeam Port */}
            <linearGradient id="volBeamPort" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            {/* Soft Volumetric Sunbeam Starboard */}
            <linearGradient id="volBeamStarboard" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            {/* Emerald Glow Filter */}
            <filter id="suiteEmeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#10b981" floodOpacity="0.85" />
            </filter>
          </defs>

          {/* 1. Fuselage Hull Outer Ring */}
          <ellipse
            cx="320"
            cy="190"
            rx="300"
            ry="175"
            fill="url(#fuselageBevel)"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="3.5"
          />

          {/* Fuselage Stringers / Ribs */}
          <ellipse
            cx="320"
            cy="190"
            rx="290"
            ry="165"
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />

          {/* 2. Inner Carbon Composite Cabin Wall */}
          <ellipse
            cx="320"
            cy="190"
            rx="280"
            ry="155"
            fill="url(#cabinInnerGrad)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="2"
          />

          {/* 3. Arched Cathedral Ceiling Structure */}
          <path
            d="M 120 100 Q 320 60 520 100 L 495 130 Q 320 100 145 130 Z"
            fill="#1e293b"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="1.5"
          />

          {/* Overhead Stowage Bins Division Panels */}
          <path d="M 165 105 L 255 112 L 250 134 L 160 127 Z" fill="#293548" stroke="rgba(255,255,255,0.12)" />
          <path d="M 475 105 L 385 112 L 390 134 L 480 127 Z" fill="#293548" stroke="rgba(255,255,255,0.12)" />

          {/* Center Ceiling Recessed Ambient LED Architectural Cove Strip (No UFO egg) */}
          <path
            d="M 210 94 Q 320 78 430 94"
            fill="none"
            stroke={isNight ? '#818cf8' : '#fbbf24'}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* 4. Heavy Aircraft Floor Structure */}
          <line x1="85" y1="295" x2="555" y2="295" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="3" />
          <line x1="105" y1="303" x2="535" y2="303" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />

          {/* Aisle Emergency Floor Track LED */}
          <line x1="260" y1="293" x2="380" y2="293" stroke="#38bdf8" strokeWidth="2" strokeDasharray="8 4" opacity="0.85" />

          {/* 5. BACKGROUND VOLUMETRIC SUNBEAM (Behind seats) */}
          {isSunOnPort && !portShadeDown && (
            <polygon
              points={`${portWindowX},135 ${portWindowX},210 ${portBeamTargetX},295 ${Math.max(100, portBeamTargetX - 120)},295`}
              fill="url(#volBeamPort)"
            />
          )}

          {isSunOnStarboard && !starboardShadeDown && (
            <polygon
              points={`${starboardWindowX},135 ${starboardWindowX},210 ${starboardBeamTargetX},295 ${Math.min(540, starboardBeamTargetX + 120)},295`}
              fill="url(#volBeamStarboard)"
            />
          )}

          {/* 6. Left (Port) Dreamliner Window Assembly */}
          <g transform="translate(44, 130)">
            <rect
              x="-3"
              y="-3"
              width="36"
              height="88"
              rx="16"
              fill="#334155"
              stroke="rgba(255, 255, 255, 0.55)"
              strokeWidth="2"
            />
            {/* Window Glass */}
            <rect
              x="0"
              y="0"
              width="30"
              height="82"
              rx="13"
              fill={isSunOnPort ? '#fbbf24' : isNight ? '#030712' : '#38bdf8'}
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="1.5"
            />

            {/* Night Stars outside Port Window */}
            {isNight && (
              <>
                <circle cx="10" cy="22" r="1.3" fill="#ffffff" />
                <circle cx="20" cy="40" r="1.5" fill="#fef08a" />
                <circle cx="8" cy="62" r="1.0" fill="#67e8f9" />
              </>
            )}

            {/* Electrochromic Blind */}
            <rect
              x="2"
              y="2"
              width="26"
              height={portShadeDown ? 78 : 18}
              rx="6"
              fill="#0b1120"
              stroke="#64748b"
              strokeWidth="1.2"
              className="transition-all duration-500 ease-in-out"
            />
            {portShadeDown && (
              <>
                <line x1="4" y1="42" x2="26" y2="42" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
                <text x="15" y="66" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  DIM
                </text>
              </>
            )}
          </g>

          {/* 7. Right (Starboard) Dreamliner Window Assembly */}
          <g transform="translate(566, 130)">
            <rect
              x="-3"
              y="-3"
              width="36"
              height="88"
              rx="16"
              fill="#334155"
              stroke="rgba(255, 255, 255, 0.55)"
              strokeWidth="2"
            />
            {/* Window Glass */}
            <rect
              x="0"
              y="0"
              width="30"
              height="82"
              rx="13"
              fill={isSunOnStarboard ? '#fbbf24' : isNight ? '#030712' : '#38bdf8'}
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="1.5"
            />

            {/* Night Stars outside Starboard Window */}
            {isNight && (
              <>
                <circle cx="20" cy="22" r="1.3" fill="#ffffff" />
                <circle cx="10" cy="42" r="1.5" fill="#fef08a" />
                <circle cx="18" cy="62" r="1.0" fill="#67e8f9" />
              </>
            )}

            {/* Electrochromic Blind */}
            <rect
              x="2"
              y="2"
              width="26"
              height={starboardShadeDown ? 78 : 18}
              rx="6"
              fill="#0b1120"
              stroke="#64748b"
              strokeWidth="1.2"
              className="transition-all duration-500 ease-in-out"
            />
            {starboardShadeDown && (
              <>
                <line x1="4" y1="42" x2="26" y2="42" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
                <text x="15" y="66" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  DIM
                </text>
              </>
            )}
          </g>

          {/* 8. LUXURY FIRST/BUSINESS SUITE 12A [PORT] (Left Window Side) */}
          <g transform="translate(110, 150)">
            {/* Emerald Halo if Recommended */}
            {isPortRecommended && (
              <rect
                x="-8"
                y="-10"
                width="106"
                height="150"
                rx="14"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                filter="url(#suiteEmeraldGlow)"
              />
            )}

            {/* Outer Pod Privacy Curved Shell */}
            <path
              d="M 0 10 Q 0 0 12 0 L 76 0 Q 88 0 88 10 L 88 120 L 0 120 Z"
              fill={isPortRecommended ? '#064e3b' : isSunOnPort && !portShadeDown ? '#451a03' : '#1e293b'}
              stroke={isPortRecommended ? '#10b981' : isSunOnPort ? '#f59e0b' : 'rgba(255,255,255,0.3)'}
              strokeWidth="2"
            />

            {/* Ergonomic Headrest */}
            <rect
              x="16"
              y="12"
              width="56"
              height="28"
              rx="8"
              fill={isPortRecommended ? '#047857' : isSunOnPort ? '#78350f' : '#334155'}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.2"
            />

            {/* Contoured Backrest with Stitching */}
            <rect
              x="14"
              y="46"
              width="60"
              height="50"
              rx="6"
              fill={isPortRecommended ? '#065f46' : '#293548'}
            />
            <line x1="20" y1="62" x2="68" y2="62" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <line x1="20" y1="78" x2="68" y2="78" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

            {/* Seat Base Cushion */}
            <rect
              x="8"
              y="100"
              width="72"
              height="22"
              rx="6"
              fill={isPortRecommended ? '#047857' : '#1e293b'}
              stroke={isPortRecommended ? '#10b981' : 'rgba(255,255,255,0.25)'}
              strokeWidth="1.5"
            />

            {/* Side Console & 24" IFE Screen */}
            <rect x="78" y="55" width="16" height="45" rx="3" fill="#334155" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <rect x="81" y="62" width="10" height="18" rx="2" fill="#0284c7" />

            {/* Pedestal Mount to Aircraft Seat Tracks */}
            <line x1="24" y1="122" x2="24" y2="145" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" />
            <line x1="64" y1="122" x2="64" y2="145" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" />

            {/* Floating Status Badge directly above Headrest */}
            {isPortRecommended && (
              <g transform="translate(44, -18)">
                <rect x="-56" y="-10" width="112" height="20" rx="10" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                <text x="0" y="4" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  {activePreference === 'shade' ? '[100% SHADE]' : '[SCENIC SUN]'}
                </text>
              </g>
            )}

            {isSunOnPort && !isPortRecommended && (
              <g transform="translate(44, -18)">
                <rect x="-54" y="-10" width="108" height="20" rx="10" fill="#451a03" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="0" y="4" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  [SOLAR GLARE]
                </text>
              </g>
            )}
          </g>

          {/* 9. LUXURY FIRST/BUSINESS SUITE 12K [STARBOARD] (Right Window Side) */}
          <g transform="translate(442, 150)">
            {/* Emerald Halo if Recommended */}
            {isStarboardRecommended && (
              <rect
                x="-8"
                y="-10"
                width="106"
                height="150"
                rx="14"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                filter="url(#suiteEmeraldGlow)"
              />
            )}

            {/* Outer Pod Privacy Curved Shell */}
            <path
              d="M 0 10 Q 0 0 12 0 L 76 0 Q 88 0 88 10 L 88 120 L 0 120 Z"
              fill={isStarboardRecommended ? '#064e3b' : isSunOnStarboard && !starboardShadeDown ? '#451a03' : '#1e293b'}
              stroke={isStarboardRecommended ? '#10b981' : isSunOnStarboard ? '#f59e0b' : 'rgba(255,255,255,0.3)'}
              strokeWidth="2"
            />

            {/* Ergonomic Headrest */}
            <rect
              x="16"
              y="12"
              width="56"
              height="28"
              rx="8"
              fill={isStarboardRecommended ? '#047857' : isSunOnStarboard ? '#78350f' : '#334155'}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.2"
            />

            {/* Contoured Backrest with Stitching */}
            <rect
              x="14"
              y="46"
              width="60"
              height="50"
              rx="6"
              fill={isStarboardRecommended ? '#065f46' : '#293548'}
            />
            <line x1="20" y1="62" x2="68" y2="62" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <line x1="20" y1="78" x2="68" y2="78" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

            {/* Seat Base Cushion */}
            <rect
              x="8"
              y="100"
              width="72"
              height="22"
              rx="6"
              fill={isStarboardRecommended ? '#047857' : '#1e293b'}
              stroke={isStarboardRecommended ? '#10b981' : 'rgba(255,255,255,0.25)'}
              strokeWidth="1.5"
            />

            {/* Side Console & 24" IFE Screen */}
            <rect x="-6" y="55" width="16" height="45" rx="3" fill="#334155" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <rect x="-3" y="62" width="10" height="18" rx="2" fill="#0284c7" />

            {/* Pedestal Mount to Aircraft Seat Tracks */}
            <line x1="24" y1="122" x2="24" y2="145" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" />
            <line x1="64" y1="122" x2="64" y2="145" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" />

            {/* Floating Status Badge directly above Headrest */}
            {isStarboardRecommended && (
              <g transform="translate(44, -18)">
                <rect x="-56" y="-10" width="112" height="20" rx="10" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                <text x="0" y="4" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  {activePreference === 'shade' ? '[100% SHADE]' : '[SCENIC SUN]'}
                </text>
              </g>
            )}

            {isSunOnStarboard && !isStarboardRecommended && (
              <g transform="translate(44, -18)">
                <rect x="-54" y="-10" width="108" height="20" rx="10" fill="#451a03" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="0" y="4" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  [SOLAR GLARE]
                </text>
              </g>
            )}
          </g>

          {/* 10. Center Aisle Readout */}
          <text
            x="320"
            y="283"
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.4)"
            fontSize="10"
            fontFamily="monospace"
            letterSpacing="3"
            fontWeight="bold"
          >
            MAIN CABIN AISLE
          </text>

          {/* Seat Identifiers */}
          <text
            x="154"
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
            x="486"
            y="330"
            textAnchor="middle"
            fill={isStarboardRecommended ? '#10b981' : '#ffffff'}
            fontSize="13"
            fontWeight="bold"
            fontFamily="monospace"
          >
            SUITE 12K [STARBOARD]
          </text>

          {/* Center Status Banner for Night Rest */}
          {isNight && (
            <g transform="translate(320, 350)">
              <rect x="-100" y="-10" width="200" height="20" rx="10" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.2" />
              <text x="0" y="4" textAnchor="middle" fill="#a5b4fc" fontSize="9" fontWeight="bold" fontFamily="monospace">
                [NIGHT REST: ZERO SOLAR GLARE]
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
            isPortRecommended
              ? 'border-[var(--alert-emerald)] bg-emerald-950/30'
              : isSunOnPort
              ? 'border-amber-700/60 bg-amber-950/20'
              : 'border-[var(--cockpit-border)] bg-zinc-900/60'
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
              className={`px-2 py-0.5 rounded text-[10px] font-mono-numbers font-bold border transition-colors ${
                portShadeDown
                  ? 'bg-zinc-800 text-[var(--cabin-cyan)] border-[var(--cabin-cyan)]'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
              }`}
            >
              {portShadeDown ? '[SHADE: DIMMED]' : '[SHADE: UP]'}
            </button>
          </div>

          <div className="text-[11px] font-mono-numbers">
            {isNight ? (
              <span className="text-indigo-400">Night rest lighting - optimal sleep condition</span>
            ) : isPortRecommended ? (
              <span className="text-[var(--alert-emerald)] font-bold">
                {activePreference === 'shade' ? 'Recommended: 100% glare protection' : 'Recommended: Prime daylight scenic view'}
              </span>
            ) : isSunOnPort ? (
              <span className="text-[var(--solar-amber)] font-bold">
                Direct solar glare on window ({Math.round(clampedElev)}° alt)
              </span>
            ) : (
              <span className="text-zinc-400">Ambient cabin shadow</span>
            )}
          </div>
        </div>

        {/* Starboard Status & Shade Toggle */}
        <div
          className={`p-3 rounded-lg border ${
            isStarboardRecommended
              ? 'border-[var(--alert-emerald)] bg-emerald-950/30'
              : isSunOnStarboard
              ? 'border-amber-700/60 bg-amber-950/20'
              : 'border-[var(--cockpit-border)] bg-zinc-900/60'
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
              className={`px-2 py-0.5 rounded text-[10px] font-mono-numbers font-bold border transition-colors ${
                starboardShadeDown
                  ? 'bg-zinc-800 text-[var(--cabin-cyan)] border-[var(--cabin-cyan)]'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
              }`}
            >
              {starboardShadeDown ? '[SHADE: DIMMED]' : '[SHADE: UP]'}
            </button>
          </div>

          <div className="text-[11px] font-mono-numbers">
            {isNight ? (
              <span className="text-indigo-400">Night rest lighting - optimal sleep condition</span>
            ) : isStarboardRecommended ? (
              <span className="text-[var(--alert-emerald)] font-bold">
                {activePreference === 'shade' ? 'Recommended: 100% glare protection' : 'Recommended: Prime daylight scenic view'}
              </span>
            ) : isSunOnStarboard ? (
              <span className="text-[var(--solar-amber)] font-bold">
                Direct solar glare on window ({Math.round(clampedElev)}° alt)
              </span>
            ) : (
              <span className="text-zinc-400">Ambient cabin shadow</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
