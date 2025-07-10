'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import styles from './page.module.css';

// Dynamic import for the GlobeDisplay component with SSR disabled
const GlobeDisplay = dynamic(() => import('@/components/GlobeDisplay'), {
  ssr: false,
  loading: () => (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}>🌍</div>
      <div className={styles.loadingText}>Loading 3D Globe...</div>
      <div className={styles.loadingSubtext}>Preparing your flight visualization</div>
    </div>
  ),
});

interface FlightData {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  duration: number;
  distance: number;
}

function FlightGlobeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const data: FlightData = {
        from: searchParams.get('from') || '',
        to: searchParams.get('to') || '',
        fromName: searchParams.get('fromName') || '',
        toName: searchParams.get('toName') || '',
        fromLat: parseFloat(searchParams.get('fromLat') || '0'),
        fromLng: parseFloat(searchParams.get('fromLng') || '0'),
        toLat: parseFloat(searchParams.get('toLat') || '0'),
        toLng: parseFloat(searchParams.get('toLng') || '0'),
        duration: parseFloat(searchParams.get('duration') || '0'),
        distance: parseFloat(searchParams.get('distance') || '0'),
      };

      if (!data.from || !data.to) {
        router.push('/');
        return;
      }

      setFlightData(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error parsing flight data:', error);
      router.push('/');
    }
  }, [searchParams, router]);

  const handleGoBack = () => {
    router.back();
  };

  if (isLoading || !flightData) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>🌍</div>
        <div className={styles.loadingText}>Loading flight data...</div>
      </div>
    );
  }

  return (
    <div className={styles.globePage}>
      {/* Header with back navigation */}
      <header className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={handleGoBack}
          aria-label="Go back to flight results"
        >
          <span className={styles.backArrow}>←</span>
          <span className={styles.backText}>Back</span>
        </button>
        
        <div className={styles.flightInfo}>
          <h1 className={styles.title}>3D Flight Path</h1>
          <div className={styles.routeDisplay}>
            <span className={styles.airportCode}>{flightData.from}</span>
            <span className={styles.routeArrow}>✈️</span>
            <span className={styles.airportCode}>{flightData.to}</span>
          </div>
        </div>
      </header>

      {/* Globe container */}
      <main className={styles.globeContainer}>
        <GlobeDisplay flightData={flightData} />
      </main>

      {/* Flight details overlay */}
      <div className={styles.infoPanel}>
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>Flight Details</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>From:</span>
              <span className={styles.infoValue}>
                <strong>{flightData.from}</strong><br/>
                <small>{flightData.fromName}</small>
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>To:</span>
              <span className={styles.infoValue}>
                <strong>{flightData.to}</strong><br/>
                <small>{flightData.toName}</small>
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Duration:</span>
              <span className={styles.infoValue}>
                {Math.floor(flightData.duration / 60)}h {flightData.duration % 60}m
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Distance:</span>
              <span className={styles.infoValue}>
                {Math.round(flightData.distance / 1000).toLocaleString()} km
              </span>
            </div>
          </div>
          
          {/* Airport Markers Legend */}
          <div className={styles.markerLegend}>
            <h4 className={styles.legendTitle}>Airport Markers</h4>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: '#f59e0b' }}></div>
                <span className={styles.legendText}>Source (Departure)</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: '#10b981' }}></div>
                <span className={styles.legendText}>Destination (Arrival)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className={styles.controlsHint}>
        <div className={styles.hintText}>
          🖱️ Click and drag to rotate • 🔍 Scroll to zoom • ✈️ Watch the flight path animation
        </div>
      </div>
    </div>
  );
}

export default function FlightGlobePage() {
  return (
    <Suspense fallback={
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>🌍</div>
        <div className={styles.loadingText}>Loading...</div>
      </div>
    }>
      <FlightGlobeContent />
    </Suspense>
  );
} 