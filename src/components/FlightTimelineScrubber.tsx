'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import type { FlightPathPoint, SunEvent } from '@/lib/flightCalculator';
import { IconPlay, IconPause, IconSunrise, IconSunset } from './AviationIcons';

interface FlightTimelineScrubberProps {
  flightPath: FlightPathPoint[];
  currentIndex: number;
  onIndexChange: (action: number | ((prev: number) => number)) => void;
  events: SunEvent[];
  totalDurationMinutes: number;
  departureTime: Date;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
}

export default function FlightTimelineScrubber({
  flightPath,
  currentIndex,
  onIndexChange,
  events,
  totalDurationMinutes,
  departureTime,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
}: FlightTimelineScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const totalPoints = Math.max(1, flightPath.length);
  const currentPoint = flightPath[currentIndex] || flightPath[0];
  const progressPercent = totalPoints > 1 ? (currentIndex / (totalPoints - 1)) * 100 : 0;

  // Handle pointer down / drag on timeline
  const handleSeek = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const fraction = rect.width > 0 ? clickX / rect.width : 0;
      const nextIndex = Math.min(
        totalPoints - 1,
        Math.max(0, Math.round(fraction * (totalPoints - 1)))
      );
      onIndexChange(nextIndex);
    },
    [totalPoints, onIndexChange]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    handleSeek(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    handleSeek(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture already lost
    }
  };

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.max(20, Math.round(150 / playbackSpeed));
    const timer = setInterval(() => {
      onIndexChange((prev) => {
        if (prev >= totalPoints - 1) {
          return 0; // Loop or stop
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, totalPoints, onIndexChange]);

  // Compute current time string
  const currentElapsedMinutes = Math.round((progressPercent / 100) * totalDurationMinutes);
  const elapsedHours = Math.floor(currentElapsedMinutes / 60);
  const elapsedMins = currentElapsedMinutes % 60;
  const currentUtcDate = currentPoint?.time ? new Date(currentPoint.time) : departureTime;
  const utcHours = String(currentUtcDate.getUTCHours()).padStart(2, '0');
  const utcMinutes = String(currentUtcDate.getUTCMinutes()).padStart(2, '0');

  // Jump to specific event
  const handleJumpToEvent = (event: SunEvent) => {
    const eventTimeMs = event.time.getTime();
    let bestIdx = 0;
    let minDiff = Infinity;
    flightPath.forEach((pt, idx) => {
      const diff = Math.abs(new Date(pt.time).getTime() - eventTimeMs);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = idx;
      }
    });
    onIndexChange(bestIdx);
  };

  return (
    <div className="cockpit-card rounded-xl p-4 border border-[var(--cockpit-border)] w-full">
      {/* Top telemetry and playback controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-[var(--cockpit-border)] transition-colors"
            title={isPlaying ? 'Pause Scrubber' : 'Play Flight Timeline'}
            aria-label={isPlaying ? 'Pause Scrubber' : 'Play Flight Timeline'}
          >
            {isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
          </button>

          {/* Speed Selector */}
          <div className="flex items-center rounded-lg bg-zinc-900 border border-[var(--cockpit-border)] p-0.5">
            {[1, 5, 15].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => onChangeSpeed(speed)}
                className={`px-2 py-0.5 text-xs font-mono-numbers rounded ${
                  playbackSpeed === speed
                    ? 'bg-zinc-700 text-white font-bold'
                    : 'text-[var(--foreground-muted)] hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Current Flight Telemetry Readout */}
        <div className="flex items-center gap-4 text-xs font-mono-numbers">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--foreground-muted)]">ELAPSED:</span>
            <span className="text-white font-bold">
              T+{String(elapsedHours).padStart(2, '0')}:{String(elapsedMins).padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--foreground-muted)]">UTC:</span>
            <span className="text-[var(--cabin-cyan)] font-bold">
              {utcHours}:{utcMinutes}Z
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--foreground-muted)]">WAYPOINT:</span>
            <span className="text-[var(--solar-amber)] font-bold">
              {Math.round(progressPercent)}%
            </span>
          </div>
        </div>
      </div>

      {/* Scrubber Ribbon Container */}
      <div className="relative py-2 select-none">
        {/* Track Bar with Color-Coded Segments */}
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative h-6 w-full rounded-md overflow-hidden cursor-pointer bg-zinc-950 border border-[var(--cockpit-border)] flex"
        >
          {flightPath.map((point, idx) => {
            const isPointNight = point.sunPosition.elevation < -6;
            const hasDirectGlare = point.sunPosition.elevation >= 0 && (point.viewingSide === 'left' || point.viewingSide === 'right');
            
            let segmentColor = '#334155'; // Cabin shade default
            if (isPointNight) {
              segmentColor = '#1e1b4b'; // Night indigo
            } else if (hasDirectGlare) {
              segmentColor = '#f59e0b'; // Solar amber
            }

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: segmentColor,
                  width: `${100 / totalPoints}%`,
                }}
                className="h-full border-r border-black/20"
                title={`${Math.round((idx / totalPoints) * 100)}%: ${
                  isPointNight ? 'Night (< -6°)' : hasDirectGlare ? `Solar Glare (${point.viewingSide})` : 'Cabin Shade'
                }`}
              />
            );
          })}

          {/* Event Diamond Markers */}
          {events.map((evt, eIdx) => {
            const eventTimeMs = evt.time.getTime();
            let matchedIdx = 0;
            let minDiff = Infinity;
            flightPath.forEach((pt, pIdx) => {
              const diff = Math.abs(new Date(pt.time).getTime() - eventTimeMs);
              if (diff < minDiff) {
                minDiff = diff;
                matchedIdx = pIdx;
              }
            });
            const eventPosPercent = (matchedIdx / Math.max(1, totalPoints - 1)) * 100;

            return (
              <button
                key={eIdx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleJumpToEvent(evt);
                }}
                style={{ left: `${eventPosPercent}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-amber-400 rotate-45 border border-black shadow-md flex items-center justify-center z-10 hover:scale-125 transition-transform"
                title={`${evt.type.toUpperCase()} at ${evt.time.toISOString().slice(11, 16)} UTC (${evt.viewingSide} side)`}
              />
            );
          })}

          {/* Scrubber Cursor Head */}
          <div
            style={{ left: `${progressPercent}%` }}
            className="absolute top-0 bottom-0 w-1 bg-white -translate-x-1/2 shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none z-20"
          >
            {/* Top Cursor Triangle */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border border-black" />
            {/* Bottom Cursor Triangle */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border border-black" />
          </div>
        </div>

        {/* Legend Ribbon Key */}
        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono-numbers text-[var(--foreground-muted)] mt-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b] inline-block" />
              SOLAR EXPOSURE
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#334155] inline-block" />
              CABIN SHADE
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#1e1b4b] border border-indigo-900 inline-block" />
              NIGHT (&lt; -6°)
            </span>
          </div>

          {events.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[var(--solar-amber)] font-medium">
                {events.length} SOLAR EVENT{events.length > 1 ? 'S' : ''}:
              </span>
              {events.map((evt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleJumpToEvent(evt)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-mono-numbers"
                >
                  {evt.type === 'sunrise' ? <IconSunrise size={12} /> : <IconSunset size={12} />}
                  {evt.type.toUpperCase()} ({evt.time.toISOString().slice(11, 16)}Z)
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
