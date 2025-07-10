'use client';

import styles from './ResultsArea.module.css';
import { useRouter } from 'next/navigation';

// Type definitions for the flight recommendation data
interface SunEvent {
  type: 'sunrise' | 'sunset';
  time: Date;
  location: { lat: number; lon: number };
  sunAzimuth: number;
  aircraftBearing: number;
  viewingSide: 'left' | 'right';
  elevation: number;
}

interface Airport {
  iata: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface FlightRecommendationData {
  recommendation: 'left' | 'right' | 'either';
  confidence: number;
  description: string;
  events: SunEvent[];
  globeData: {
    departure: Airport;
    arrival: Airport;
    flightPath: unknown[];
    totalDistance: number;
    totalDuration: number;
    summary: {
      totalSunriseEvents: number;
      totalSunsetEvents: number;
      averageSunVisibility: number;
      bestViewingSide: 'left' | 'right' | 'either';
    };
  };
}

interface ResultsAreaProps {
  hasResults: boolean;
  isLoading?: boolean;
  data?: FlightRecommendationData;
  error?: string;
}

export default function ResultsArea({ hasResults, isLoading, data, error }: ResultsAreaProps) {
  const router = useRouter();

  // Helper function to format distance
  const formatDistance = (meters: number): string => {
    const km = Math.round(meters / 1000);
    const miles = Math.round(meters * 0.000621371);
    return `${km.toLocaleString()} km (${miles.toLocaleString()} miles)`;
  };

  // Helper function to format duration
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Helper function to format time
  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    }).format(new Date(date));
  };

  // Helper function to get recommendation icon and colors
  const getRecommendationStyle = (recommendation: string) => {
    switch (recommendation) {
      case 'left':
        return {
          icon: '⬅️',
          bgColor: '#e3f2fd',
          borderColor: '#2196f3',
          textColor: '#1565c0'
        };
      case 'right':
        return {
          icon: '➡️',
          bgColor: '#f3e5f5',
          borderColor: '#9c27b0',
          textColor: '#7b1fa2'
        };
      default:
        return {
          icon: '↔️',
          bgColor: '#f1f8e9',
          borderColor: '#4caf50',
          textColor: '#2e7d32'
        };
    }
  };

  return (
    <section 
      className={styles.resultsContainer}
      role="region"
      aria-label="Flight seat recommendations"
      aria-live="polite"
    >
      <h2 className={styles.heading}>Seat Recommendations</h2>
      
      {/* Loading State */}
      {isLoading && (
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} aria-hidden="true">✈️</div>
          <p>Analyzing sun position for your flight...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className={styles.errorState} role="alert">
          <div className={styles.errorIcon} aria-hidden="true">❌</div>
          <h3>Unable to Generate Recommendation</h3>
          <p>{error}</p>
        </div>
      )}
      
      {/* Results with Data */}
      {hasResults && data && !isLoading && !error && (
        <div className={styles.resultsContent}>
          {/* Main Recommendation */}
          <div 
            className={styles.recommendationCard}
            style={{
              background: getRecommendationStyle(data.recommendation).bgColor,
              borderColor: getRecommendationStyle(data.recommendation).borderColor,
              color: getRecommendationStyle(data.recommendation).textColor
            }}
          >
            <div className={styles.recommendationHeader}>
              <span className={styles.recommendationIcon} aria-hidden="true">
                {getRecommendationStyle(data.recommendation).icon}
              </span>
              <h3 className={styles.recommendationTitle}>
                Recommended Side: {data.recommendation.toUpperCase()}
              </h3>
              <div className={styles.confidenceScore}>
                <span className={styles.confidenceLabel}>Confidence:</span>
                <span className={styles.confidenceValue}>{data.confidence}%</span>
              </div>
            </div>
            <p className={styles.recommendationDescription}>{data.description}</p>
          </div>

          {/* Flight Details */}
          <div className={styles.flightDetails}>
            <h4 className={styles.sectionTitle}>Flight Information</h4>
            <div className={styles.flightRoute}>
              <div className={styles.routePoint}>
                <span className={styles.airportCode}>{data.globeData.departure.iata}</span>
                <span className={styles.airportName}>{data.globeData.departure.name}</span>
              </div>
              <div className={styles.routeArrow} aria-hidden="true">✈️</div>
              <div className={styles.routePoint}>
                <span className={styles.airportCode}>{data.globeData.arrival.iata}</span>
                <span className={styles.airportName}>{data.globeData.arrival.name}</span>
              </div>
            </div>
            <div className={styles.flightStats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Distance:</span>
                <span className={styles.statValue}>{formatDistance(data.globeData.totalDistance)}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Duration:</span>
                <span className={styles.statValue}>{formatDuration(data.globeData.totalDuration)}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Sun Visibility:</span>
                <span className={styles.statValue}>{Math.round(data.globeData.summary.averageSunVisibility)}%</span>
              </div>
            </div>
          </div>

          {/* 3D Flight View Button */}
          <div className={styles.globeViewSection}>
            <button 
              className={styles.globeViewButton}
              onClick={() => {
                const params = new URLSearchParams({
                  from: data.globeData.departure.iata,
                  to: data.globeData.arrival.iata,
                  fromName: data.globeData.departure.name,
                  toName: data.globeData.arrival.name,
                  fromLat: data.globeData.departure.latitude.toString(),
                  fromLng: data.globeData.departure.longitude.toString(),
                  toLat: data.globeData.arrival.latitude.toString(),
                  toLng: data.globeData.arrival.longitude.toString(),
                  duration: data.globeData.totalDuration.toString(),
                  distance: data.globeData.totalDistance.toString()
                });
                router.push(`/flight-globe?${params.toString()}`);
              }}
              aria-label="View flight path in 3D globe"
            >
              <span className={styles.globeIcon} aria-hidden="true">🌍</span>
              <span className={styles.globeText}>3D Flight View</span>
              <span className={styles.globeArrow} aria-hidden="true">→</span>
            </button>
          </div>

          {/* Sun Events */}
          {data.events && data.events.length > 0 && (
            <div className={styles.sunEvents}>
              <h4 className={styles.sectionTitle}>
                Sunrise & Sunset Events ({data.events.length})
              </h4>
              <div className={styles.eventsList}>
                {data.events.map((event, index) => (
                  <div key={index} className={styles.eventItem}>
                    <div className={styles.eventIcon} aria-hidden="true">
                      {event.type === 'sunrise' ? '🌅' : '🌅'}
                    </div>
                    <div className={styles.eventDetails}>
                      <span className={styles.eventType}>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</span>
                      <span className={styles.eventTime}>{formatTime(event.time)}</span>
                      <span className={styles.eventSide}>
                        Best view from {event.viewingSide} side
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Statistics */}
          <div className={styles.summaryStats}>
            <h4 className={styles.sectionTitle}>Flight Summary</h4>
            <div className={styles.statsGrid}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryIcon} aria-hidden="true">🌅</div>
                <div className={styles.summaryNumber}>{data.globeData.summary.totalSunriseEvents}</div>
                <div className={styles.summaryLabel}>Sunrise Events</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryIcon} aria-hidden="true">🌇</div>
                <div className={styles.summaryNumber}>{data.globeData.summary.totalSunsetEvents}</div>
                <div className={styles.summaryLabel}>Sunset Events</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryIcon} aria-hidden="true">☀️</div>
                <div className={styles.summaryNumber}>{Math.round(data.globeData.summary.averageSunVisibility)}%</div>
                <div className={styles.summaryLabel}>Sun Visibility</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State (no form submission yet) */}
      {!hasResults && !isLoading && !error && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">☀️</div>
          <h3 className={styles.emptyHeading}>Ready to find your perfect seat</h3>
          <p className={styles.emptyText}>
            Fill out the flight information above and click &quot;Find Best Seat&quot; to get personalized recommendations based on sun exposure patterns.
          </p>
          <div className={styles.features}>
            <ul className={styles.featureList} role="list">
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">🌅</span>
                Optimal sunlight exposure timing
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">🪟</span>
                Window vs aisle recommendations
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">🧭</span>
                Direction-based seat positioning
              </li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
} 