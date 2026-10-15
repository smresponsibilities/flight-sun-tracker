'use client';

import React, { useState } from 'react';
import AutocompleteInput from './AutocompleteInput';
import { POPULAR_ROUTES } from './FlightHeaderBar';

interface FlightRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRoute: (source: string, dest: string, departureTime: string, durationStr: string) => void;
  currentSource: string;
  currentDest: string;
  currentDepartureTime: string;
  currentDurationStr: string;
}

export default function FlightRouteModal({
  isOpen,
  onClose,
  onApplyRoute,
  currentSource,
  currentDest,
  currentDepartureTime,
  currentDurationStr,
}: FlightRouteModalProps) {
  const [source, setSource] = useState(currentSource);
  const [dest, setDest] = useState(currentDest);
  const [depTime, setDepTime] = useState(currentDepartureTime);
  const [duration, setDuration] = useState(currentDurationStr);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source.trim()) {
      setError('Please specify departure airport');
      return;
    }
    if (!dest.trim()) {
      setError('Please specify arrival airport');
      return;
    }
    if (source.trim().toUpperCase() === dest.trim().toUpperCase()) {
      setError('Departure and destination must be different airports');
      return;
    }
    if (!depTime) {
      setError('Please select departure date and time');
      return;
    }
    if (!duration.trim()) {
      setError('Please enter flight duration');
      return;
    }

    setError(null);
    onApplyRoute(source.trim(), dest.trim(), depTime, duration.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="cockpit-panel rounded-2xl p-6 border border-[var(--cockpit-border)] max-w-lg w-full shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--cockpit-border)] mb-5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--alert-emerald)]" />
            <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono-numbers">
              CONFIGURE FLIGHT ROUTE
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center font-mono-numbers text-sm border border-[var(--cockpit-border)]"
          >
            [X]
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs font-mono-numbers">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono-numbers text-[var(--foreground-muted)] uppercase mb-1">
              DEPARTURE AIRPORT (IATA OR CITY)
            </label>
            <AutocompleteInput
              id="sourceCityModal"
              name="sourceCity"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              onBlur={() => {}}
              placeholder="e.g. JFK, New York, LHR, London"
              required
              excludeValue={dest}
              className="w-full bg-zinc-900 border border-[var(--cockpit-border)] rounded-xl px-4 py-2.5 text-white font-mono-numbers text-sm focus:border-[var(--cabin-cyan)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono-numbers text-[var(--foreground-muted)] uppercase mb-1">
              ARRIVAL AIRPORT (IATA OR CITY)
            </label>
            <AutocompleteInput
              id="destCityModal"
              name="destinationCity"
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              onBlur={() => {}}
              placeholder="e.g. LHR, London, NRT, Tokyo"
              required
              excludeValue={source}
              className="w-full bg-zinc-900 border border-[var(--cockpit-border)] rounded-xl px-4 py-2.5 text-white font-mono-numbers text-sm focus:border-[var(--cabin-cyan)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono-numbers text-[var(--foreground-muted)] uppercase mb-1">
                DEPARTURE DATE & TIME
              </label>
              <input
                type="datetime-local"
                value={depTime}
                onChange={(e) => setDepTime(e.target.value)}
                className="w-full bg-zinc-900 border border-[var(--cockpit-border)] rounded-xl px-4 py-2.5 text-white font-mono-numbers text-sm focus:border-[var(--cabin-cyan)] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono-numbers text-[var(--foreground-muted)] uppercase mb-1">
                ESTIMATED AIR DURATION
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 7h 00m, 420 mins"
                className="w-full bg-zinc-900 border border-[var(--cockpit-border)] rounded-xl px-4 py-2.5 text-white font-mono-numbers text-sm focus:border-[var(--cabin-cyan)] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Popular quick-select buttons */}
          <div className="pt-2">
            <span className="block text-xs font-mono-numbers text-[var(--foreground-muted)] uppercase mb-2">
              QUICK SELECT POPULAR ROUTE:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_ROUTES.map((route) => (
                <button
                  key={route.dep + route.arr}
                  type="button"
                  onClick={() => {
                    setSource(route.dep);
                    setDest(route.arr);
                    const hours = Math.floor(route.durationMinutes / 60);
                    const mins = route.durationMinutes % 60;
                    setDuration(`${hours}h ${mins}m`);
                  }}
                  className="px-3 py-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-xs font-mono-numbers text-zinc-300 border border-[var(--cockpit-border)] text-left hover:border-zinc-500"
                >
                  <span className="font-bold text-white block">
                    {route.dep} → {route.arr}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    {route.depName} to {route.arrName}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--cockpit-border)] mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono-numbers font-medium"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[var(--alert-emerald)] hover:bg-emerald-600 text-black font-extrabold text-xs font-mono-numbers shadow-lg shadow-emerald-950/50"
            >
              COMPUTE FLIGHT SOLAR EPHEMERIS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
