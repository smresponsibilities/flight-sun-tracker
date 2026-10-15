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

  // Geometric volumetric ray projection inside SVG viewBox="0 0 640 400"
  // Port Window: cx=56, cy=160
  // Starboard Window: cx=584, cy=160
  // Cabin Floor: y=310
  const clampedElev = Math.max(10, Math.min(75, Math.abs(sunElevation)));
  const rayAngleRad = (clampedElev * Math.PI) / 180;

  const portWindowX = 64;
  const starboardWindowX = 576;

  const beamSpread = 150 / Math.tan(rayAngleRad);
  const portBeamTargetX = Math.min(420, portWindowX + Math.max(120, beamSpread));
  const starboardBeamTargetX = Math.max(220, starboardWindowX - Math.max(120, beamSpread));

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
      <div className="relative w-full aspect-[640/400] flex items-center justify-center bg-zinc-950/90 rounded-lg p-2 border border-white/10 shadow-inner">
        <svg
          viewBox="0 0 640 400"
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
              <stop offset="0%" stopColor={isNight ? '#0f172a' : '#1e293b'} />
              <stop offset="100%" stopColor={isNight ? '#070a13' : '#0f172a'} />
            </linearGradient>

            {/* Volumetric Sunbeam Port */}
            <linearGradient id="volBeamPort" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
              <stop offset="25%" stopColor="#fbbf24" stopOpacity="0.55" />
              <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            {/* Volumetric Sunbeam Starboard */}
            <linearGradient id="volBeamStarboard" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
              <stop offset="25%" stopColor="#fbbf24" stopOpacity="0.55" />
              <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            {/* Emerald Glow Filter */}
            <filter id="suiteEmeraldGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#10b981" floodOpacity="0.95" />
            </filter>

            {/* Amber Glare Flare Filter */}
            <filter id="windowSunFlare" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#fbbf24" floodOpacity="0.9" />
            </filter>
          </defs>

          {/* 1. Fuselage Hull Outer Ring */}
          <ellipse
            cx="320"
            cy="200"
            rx="305"
            ry="185"
            fill="url(#fuselageBevel)"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="4"
          />

          {/* Fuselage Stringers / Ribs */}
          <ellipse
            cx="320"
            cy="200"
            rx="295"
            ry="175"
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />

          {/* 2. Inner Carbon Composite Cabin Wall */}
          <ellipse
            cx="320"
            cy="200"
            rx="285"
            ry="165"
            fill="url(#cabinInnerGrad)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="2.5"
          />

          {/* 3. Arched Cathedral Ceiling & Overhead Luggage Bins */}
          <path
            d="M 110 105 Q 320 62 530 105 L 505 138 Q 320 106 135 138 Z"
            fill="#1e293b"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="2"
          />

          {/* Overhead Bins Division Hatches */}
          <path d="M 155 110 L 250 118 L 245 142 L 150 134 Z" fill="#293548" stroke="rgba(255,255,255,0.15)" />
          <path d="M 485 110 L 390 118 L 395 142 L 490 134 Z" fill="#293548" stroke="rgba(255,255,255,0.15)" />

          {/* Center Ceiling Ambient LED Cove Lighting Strip */}
          <line
            x1="260"
            y1="90"
            x2="380"
            y2="90"
            stroke={isNight ? '#818cf8' : '#fbbf24'}
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.95"
          />
          <ellipse
            cx="320"
            cy="92"
            rx="90"
            ry="14"
            fill={isNight ? 'rgba(129, 140, 248, 0.25)' : 'rgba(251, 191, 36, 0.3)'}
          />

          {/* 4. Heavy Aircraft Floor Structure */}
          <line x1="80" y1="310" x2="560" y2="310" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="4" />
          <line x1="100" y1="318" x2="540" y2="318" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />

          {/* Aisle Emergency LED Floor Path Lighting */}
          <line x1="260" y1="308" x2="380" y2="308" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="8 4" opacity="0.9" />

          {/* 5. Left (Port) Dreamliner Window Assembly */}
          <g transform="translate(44, 135)">
            <rect
              x="-4"
              y="-4"
              width="38"
              height="94"
              rx="18"
              fill="#334155"
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="2.5"
            />
            {/* Window Glass */}
            <rect
              x="0"
              y="0"
              width="30"
              height="86"
              rx="14"
              fill={isSunOnPort ? '#fbbf24' : isNight ? '#030712' : '#38bdf8'}
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="1.5"
              filter={isSunOnPort && !portShadeDown ? 'url(#windowSunFlare)' : undefined}
            />

            {/* Night Stars outside Port Window */}
            {isNight && (
              <>
                <circle cx="10" cy="24" r="1.5" fill="#ffffff" />
                <circle cx="20" cy="42" r="1.8" fill="#fef08a" />
                <circle cx="8" cy="64" r="1.2" fill="#67e8f9" />
              </>
            )}

            {/* Electrochromic Shade / Polarized Blind */}
            <rect
              x="2"
              y="2"
              width="26"
              height={portShadeDown ? 82 : 20}
              rx="8"
              fill="#0b1120"
              stroke="#64748b"
              strokeWidth="1.5"
              className="transition-all duration-500 ease-in-out"
            />
            {portShadeDown && (
              <>
                <line x1="4" y1="44" x2="26" y2="44" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
                <text x="15" y="70" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  DIM
                </text>
              </>
            )}
          </g>

          {/* 6. Right (Starboard) Dreamliner Window Assembly */}
          <g transform="translate(566, 135)">
            <rect
              x="-4"
              y="-4"
              width="38"
              height="94"
              rx="18"
              fill="#334155"
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="2.5"
            />
            {/* Window Glass */}
            <rect
              x="0"
              y="0"
              width="30"
              height="86"
              rx="14"
              fill={isSunOnStarboard ? '#fbbf24' : isNight ? '#030712' : '#38bdf8'}
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="1.5"
              filter={isSunOnStarboard && !starboardShadeDown ? 'url(#windowSunFlare)' : undefined}
            />

            {/* Night Stars outside Starboard Window */}
            {isNight && (
              <>
                <circle cx="20" cy="24" r="1.5" fill="#ffffff" />
                <circle cx="10" cy="46" r="1.8" fill="#fef08a" />
                <circle cx="18" cy="66" r="1.2" fill="#67e8f9" />
              </>
            )}

            {/* Electrochromic Shade */}
            <rect
              x="2"
              y="2"
              width="26"
              height={starboardShadeDown ? 82 : 20}
              rx="8"
              fill="#0b1120"
              stroke="#64748b"
              strokeWidth="1.5"
              className="transition-all duration-500 ease-in-out"
            />
            {starboardShadeDown && (
              <>
                <line x1="4" y1="44" x2="26" y2="44" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
                <text x="15" y="70" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  DIM
                </text>
              </>
            )}
          </g>

          {/* 7. DYNAMIC VOLUMETRIC LIGHT BEAMS */}
          {/* Port Sun Beam */}
          {isSunOnPort && !portShadeDown && (
            <polygon
              points={`${portWindowX},140 ${portWindowX},220 ${portBeamTargetX},310 ${Math.max(120, portBeamTargetX - 130)},310`}
              fill="url(#volBeamPort)"
            />
          )}

          {/* Starboard Sun Beam */}
          {isSunOnStarboard && !starboardShadeDown && (
            <polygon
              points={`${starboardWindowX},140 ${starboardWindowX},220 ${starboardBeamTargetX},310 ${Math.min(520, starboardBeamTargetX + 130)},310`}
              fill="url(#volBeamStarboard)"
            />
          )}

          {/* 8. LUXURY FIRST/BUSINESS SUITE 12A [PORT] (Left Window Side) */}
          <g transform="translate(105, 165)">
            {/* Emerald Halo if Recommended */}
            {isPortRecommended && (
              <rect
                x="-14"
                y="-20"
                width="118"
                height="160"
                rx="18"
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                filter="url(#suiteEmeraldGlow)"
              />
            )}

            {/* Outer Pod Privacy Shell */}
            <rect
              x="0"
              y="0"
              width="90"
              height="105"
              rx="14"
              fill={isPortRecommended ? '#064e3b' : isSunOnPort && !portShadeDown ? '#451a03' : '#1e293b'}
              stroke={isPortRecommended ? '#10b981' : isSunOnPort ? '#f59e0b' : 'rgba(255,255,255,0.35)'}
              strokeWidth="2.5"
            />

            {/* Quilted Leather Stitching Lines */}
            <line x1="14" y1="28" x2="76" y2="28" stroke={isPortRecommended ? '#34d399' : 'rgba(255,255,255,0.25)'} strokeWidth="1.5" strokeDasharray="5 3" />
            <line x1="14" y1="54" x2="76" y2="54" stroke={isPortRecommended ? '#34d399' : 'rgba(255,255,255,0.25)'} strokeWidth="1.5" strokeDasharray="5 3" />
            <line x1="14" y1="80" x2="76" y2="80" stroke={isPortRecommended ? '#34d399' : 'rgba(255,255,255,0.25)'} strokeWidth="1.5" strokeDasharray="5 3" />

            {/* Ergonomic Adjustable Headrest with Wings */}
            <rect
              x="16"
              y="-16"
              width="58"
              height="30"
              rx="8"
              fill={isPortRecommended ? '#047857' : isSunOnPort ? '#78350f' : '#334155'}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
            />
            <path d="M 18 -14 L 25 12 L 18 12 Z" fill="rgba(0,0,0,0.3)" />
            <path d="M 72 -14 L 65 12 L 72 12 Z" fill="rgba(0,0,0,0.3)" />

            {/* Seat Base Cushion */}
            <rect
              x="-4"
              y="100"
              width="98"
              height="26"
              rx="8"
              fill={isPortRecommended ? '#065f46' : isSunOnPort && !portShadeDown ? '#451a03' : '#1e293b'}
              stroke={isPortRecommended ? '#10b981' : 'rgba(255,255,255,0.35)'}
              strokeWidth="2"
            />

            {/* 24-inch IFE Screen & Cocktail Console */}
            <rect x="82" y="68" width="18" height="46" rx="4" fill="#334155" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
            <rect x="86" y="74" width="10" height="18" rx="2" fill="#0284c7" />

            {/* Structural Floor Mount Stems */}
            <line x1="20" y1="126" x2="20" y2="145" stroke="rgba(255,255,255,0.6)" strokeWidth="4" />
            <line x1="70" y1="126" x2="70" y2="145" stroke="rgba(255,255,255,0.6)" strokeWidth="4" />
          </g>

          {/* 9. LUXURY FIRST/BUSINESS SUITE 12K [STARBOARD] (Right Window Side) */}
          <g transform="translate(445, 165)">
            {/* Emerald Halo if Recommended */}
            {isStarboardRecommended && (
              <rect
                x="-14"
                y="-20"
                width="118"
                height="160"
                rx="18"
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                filter="url(#suiteEmeraldGlow)"
              />
            )}

            {/* Outer Pod Privacy Shell */}
            <rect
              x="0"
              y="0"
              width="90"
              height="105"
              rx="14"
              fill={isStarboardRecommended ? '#064e3b' : isSunOnStarboard && !starboardShadeDown ? '#451a03' : '#1e293b'}
              stroke={isStarboardRecommended ? '#10b981' : isSunOnStarboard ? '#f59e0b' : 'rgba(255,255,255,0.35)'}
              strokeWidth="2.5"
            />

            {/* Quilted Leather Stitching Lines */}
            <line x1="14" y1="28" x2="76" y2="28" stroke={isStarboardRecommended ? '#34d399' : 'rgba(255,255,255,0.25)'} strokeWidth="1.5" strokeDasharray="5 3" />
            <line x1="14" y1="54" x2="76" y2="54" stroke={isStarboardRecommended ? '#34d399' : 'rgba(255,255,255,0.25)'} strokeWidth="1.5" strokeDasharray="5 3" />
            <line x1="14" y1="80" x2="76" y2="80" stroke={isStarboardRecommended ? '#34d399' : 'rgba(255,255,255,0.25)'} strokeWidth="1.5" strokeDasharray="5 3" />

            {/* Ergonomic Adjustable Headrest with Wings */}
            <rect
              x="16"
              y="-16"
              width="58"
              height="30"
              rx="8"
              fill={isStarboardRecommended ? '#047857' : isSunOnStarboard ? '#78350f' : '#334155'}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
            />
            <path d="M 18 -14 L 25 12 L 18 12 Z" fill="rgba(0,0,0,0.3)" />
            <path d="M 72 -14 L 65 12 L 72 12 Z" fill="rgba(0,0,0,0.3)" />

            {/* Seat Base Cushion */}
            <rect
              x="-4"
              y="100"
              width="98"
              height="26"
              rx="8"
              fill={isStarboardRecommended ? '#065f46' : isSunOnStarboard && !starboardShadeDown ? '#451a03' : '#1e293b'}
              stroke={isStarboardRecommended ? '#10b981' : 'rgba(255,255,255,0.35)'}
              strokeWidth="2"
            />

            {/* 24-inch IFE Screen & Cocktail Console */}
            <rect x="-10" y="68" width="18" height="46" rx="4" fill="#334155" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
            <rect x="-6" y="74" width="10" height="18" rx="2" fill="#0284c7" />

            {/* Structural Floor Mount Stems */}
            <line x1="20" y1="126" x2="20" y2="145" stroke="rgba(255,255,255,0.6)" strokeWidth="4" />
            <line x1="70" y1="126" x2="70" y2="145" stroke="rgba(255,255,255,0.6)" strokeWidth="4" />
          </g>

          {/* 10. Center Aisle Floor Readout */}
          <text
            x="320"
            y="298"
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.45)"
            fontSize="11"
            fontFamily="monospace"
            letterSpacing="3"
            fontWeight="bold"
          >
            MAIN CABIN AISLE
          </text>

          {/* Seat Identifiers */}
          <text
            x="150"
            y="345"
            textAnchor="middle"
            fill={isPortRecommended ? '#10b981' : '#ffffff'}
            fontSize="14"
            fontWeight="bold"
            fontFamily="monospace"
          >
            SUITE 12A [PORT]
          </text>

          <text
            x="490"
            y="345"
            textAnchor="middle"
            fill={isStarboardRecommended ? '#10b981' : '#ffffff'}
            fontSize="14"
            fontWeight="bold"
            fontFamily="monospace"
          >
            SUITE 12K [STARBOARD]
          </text>

          {/* Floating Badges */}
          {isPortRecommended && (
            <g transform="translate(150, 370)">
              <rect x="-70" y="-12" width="140" height="24" rx="12" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
              <text x="0" y="5" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold" fontFamily="monospace">
                {activePreference === 'shade' ? '[RECOMMENDED: SHADE]' : '[RECOMMENDED: SUN]'}
              </text>
            </g>
          )}

          {isSunOnPort && !isPortRecommended && (
            <g transform="translate(150, 370)">
              <rect x="-65" y="-12" width="130" height="24" rx="12" fill="#451a03" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="0" y="5" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="monospace">
                [DIRECT SOLAR GLARE]
              </text>
            </g>
          )}

          {isStarboardRecommended && (
            <g transform="translate(490, 370)">
              <rect x="-70" y="-12" width="140" height="24" rx="12" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
              <text x="0" y="5" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold" fontFamily="monospace">
                {activePreference === 'shade' ? '[RECOMMENDED: SHADE]' : '[RECOMMENDED: SUN]'}
              </text>
            </g>
          )}

          {isSunOnStarboard && !isStarboardRecommended && (
            <g transform="translate(490, 370)">
              <rect x="-65" y="-12" width="130" height="24" rx="12" fill="#451a03" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="0" y="5" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="monospace">
                [DIRECT SOLAR GLARE]
              </text>
            </g>
          )}

          {isNight && (
            <g transform="translate(320, 370)">
              <rect x="-105" y="-12" width="210" height="24" rx="12" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.5" />
              <text x="0" y="5" textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="bold" fontFamily="monospace">
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
