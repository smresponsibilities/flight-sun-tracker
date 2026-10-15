'use client';

import React, { useState } from 'react';
import type { Airport, FlightPathPoint } from '@/lib/flightCalculator';
import ThreeGlobeView from './ThreeGlobeView';
import NativeWebGLGlobeView from './NativeWebGLGlobeView';
import LightweightCanvasMap from './LightweightCanvasMap';
import { IconCompass } from './AviationIcons';

export type ComparisonEngineChoice =
  | 'three-satellite'
  | 'three-animated'
  | 'webgl-satellite'
  | 'webgl-animated'
  | 'tactical-2d';

interface CameraSyncState {
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
}

interface LiveComparisonViewProps {
  departure: Airport;
  arrival: Airport;
  flightPath: FlightPathPoint[];
  currentWaypoint: FlightPathPoint | null;
  currentTime: Date;
}

export default function LiveComparisonView({
  departure,
  arrival,
  flightPath,
  currentWaypoint,
  currentTime,
}: LiveComparisonViewProps) {
  const [engineA, setEngineA] = useState<ComparisonEngineChoice>('three-satellite');
  const [engineB, setEngineB] = useState<ComparisonEngineChoice>('webgl-animated');
  const [isCameraSyncOn, setIsCameraSyncOn] = useState<boolean>(true);
  const [sharedCamera, setSharedCamera] = useState<CameraSyncState | null>(null);

  const handleCameraChange = (cam: CameraSyncState) => {
    if (isCameraSyncOn) {
      setSharedCamera(cam);
    }
  };

  const handleSwapEngines = () => {
    const temp = engineA;
    setEngineA(engineB);
    setEngineB(temp);
  };

  const renderEngineViewport = (
    choice: ComparisonEngineChoice,
    onCamChange?: (cam: CameraSyncState) => void
  ) => {
    switch (choice) {
      case 'three-satellite':
        return (
          <ThreeGlobeView
            departure={departure}
            arrival={arrival}
            flightPath={flightPath}
            currentWaypoint={currentWaypoint}
            currentTime={currentTime}
            visualMode="satellite"
            hideHeader={true}
            onCameraChange={onCamChange}
            syncCamera={isCameraSyncOn ? sharedCamera : null}
          />
        );
      case 'three-animated':
        return (
          <ThreeGlobeView
            departure={departure}
            arrival={arrival}
            flightPath={flightPath}
            currentWaypoint={currentWaypoint}
            currentTime={currentTime}
            visualMode="animated"
            hideHeader={true}
            onCameraChange={onCamChange}
            syncCamera={isCameraSyncOn ? sharedCamera : null}
          />
        );
      case 'webgl-satellite':
        return (
          <NativeWebGLGlobeView
            departure={departure}
            arrival={arrival}
            flightPath={flightPath}
            currentWaypoint={currentWaypoint}
            currentTime={currentTime}
            visualMode="satellite"
            hideHeader={true}
            onCameraChange={onCamChange}
            syncCamera={isCameraSyncOn ? sharedCamera : null}
          />
        );
      case 'webgl-animated':
        return (
          <NativeWebGLGlobeView
            departure={departure}
            arrival={arrival}
            flightPath={flightPath}
            currentWaypoint={currentWaypoint}
            currentTime={currentTime}
            visualMode="animated"
            hideHeader={true}
            onCameraChange={onCamChange}
            syncCamera={isCameraSyncOn ? sharedCamera : null}
          />
        );
      case 'tactical-2d':
        return (
          <LightweightCanvasMap
            departure={departure}
            arrival={arrival}
            flightPath={flightPath}
            currentWaypoint={currentWaypoint}
            currentTime={currentTime}
          />
        );
    }
  };

  const getEngineLabel = (choice: ComparisonEngineChoice): { title: string; subtitle: string; badge: string } => {
    switch (choice) {
      case 'three-satellite':
        return {
          title: 'THREE.JS ENGINE',
          subtitle: 'NASA SATELLITE BLUE/BLACK MARBLE',
          badge: '3JS SAT',
        };
      case 'three-animated':
        return {
          title: 'THREE.JS ENGINE',
          subtitle: 'CEL-SHADED SOLID CONTINENTS',
          badge: '3JS ANIM',
        };
      case 'webgl-satellite':
        return {
          title: 'PURE WEBGL ENGINE',
          subtitle: 'RAW GL SHADERS NASA SATELLITE',
          badge: 'GL SAT',
        };
      case 'webgl-animated':
        return {
          title: 'PURE WEBGL ENGINE',
          subtitle: 'CEL-SHADED HEMISPHERICAL ILLUMINATION',
          badge: 'GL ANIM',
        };
      case 'tactical-2d':
        return {
          title: '2D TACTICAL RADAR',
          subtitle: 'EQUIRECTANGULAR GEODESIC CANVAS',
          badge: '2D TACT',
        };
    }
  };

  const labelA = getEngineLabel(engineA);
  const labelB = getEngineLabel(engineB);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Dynamic Comparison Master Toolbar */}
      <div className="px-4 py-2.5 rounded-xl bg-zinc-950/90 border border-[var(--cockpit-border)] flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--alert-emerald)] animate-pulse" />
            <span className="text-xs font-mono-numbers font-black uppercase tracking-wider text-white">
              DYNAMIC LIVE COMPARISON HUD
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-[var(--cabin-cyan)] font-mono-numbers font-bold">
            60 FPS DUAL LOCKSTEP SYNC
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 font-mono-numbers">
          <button
            type="button"
            onClick={() => setIsCameraSyncOn(!isCameraSyncOn)}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              isCameraSyncOn
                ? 'bg-[var(--alert-emerald)] text-black shadow-md shadow-emerald-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-[var(--cockpit-border)]'
            }`}
          >
            <IconCompass size={13} className={isCameraSyncOn ? 'text-black' : 'text-zinc-400'} />
            <span>{isCameraSyncOn ? '[CAMERA LOCKSTEP: ON]' : '[CAMERA LOCKSTEP: OFF]'}</span>
          </button>

          <button
            type="button"
            onClick={handleSwapEngines}
            className="px-3 py-1 rounded text-xs font-bold bg-zinc-900 text-[var(--cabin-cyan)] hover:bg-zinc-800 border border-[var(--cockpit-border)] transition-colors"
          >
            [SWAP A &lt;&gt; B]
          </button>
        </div>
      </div>

      {/* Dual Side-by-Side Comparison Viewports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pane A Viewport */}
        <div className="flex flex-col rounded-xl overflow-hidden border border-[var(--cockpit-border)] bg-zinc-950">
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/90 border-b border-[var(--cockpit-border)]">
            <div className="flex items-center gap-2 font-mono-numbers">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-white font-bold">
                [PANE A]
              </span>
              <span className="text-xs font-bold text-white">{labelA.title}</span>
              <span className="text-[10px] text-[var(--cabin-cyan)] hidden sm:inline">
                ({labelA.subtitle})
              </span>
            </div>

            {/* Quick selector for Pane A */}
            <div className="flex items-center gap-1">
              {(
                [
                  ['three-satellite', '3JS SAT'],
                  ['three-animated', '3JS ANIM'],
                  ['webgl-satellite', 'GL SAT'],
                  ['webgl-animated', 'GL ANIM'],
                  ['tactical-2d', '2D TACT'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setEngineA(val)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono-numbers font-bold transition-all ${
                    engineA === val
                      ? 'bg-[var(--cabin-cyan)] text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            {renderEngineViewport(engineA, handleCameraChange)}
          </div>
        </div>

        {/* Pane B Viewport */}
        <div className="flex flex-col rounded-xl overflow-hidden border border-[var(--cockpit-border)] bg-zinc-950">
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/90 border-b border-[var(--cockpit-border)]">
            <div className="flex items-center gap-2 font-mono-numbers">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-white font-bold">
                [PANE B]
              </span>
              <span className="text-xs font-bold text-white">{labelB.title}</span>
              <span className="text-[10px] text-[var(--solar-amber)] hidden sm:inline">
                ({labelB.subtitle})
              </span>
            </div>

            {/* Quick selector for Pane B */}
            <div className="flex items-center gap-1">
              {(
                [
                  ['three-satellite', '3JS SAT'],
                  ['three-animated', '3JS ANIM'],
                  ['webgl-satellite', 'GL SAT'],
                  ['webgl-animated', 'GL ANIM'],
                  ['tactical-2d', '2D TACT'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setEngineB(val)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono-numbers font-bold transition-all ${
                    engineB === val
                      ? 'bg-[var(--solar-amber)] text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            {renderEngineViewport(engineB, handleCameraChange)}
          </div>
        </div>
      </div>
    </div>
  );
}
