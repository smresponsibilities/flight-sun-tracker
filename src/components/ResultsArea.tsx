'use client';

import styles from './ResultsArea.module.css';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  InteractiveCard, 
  GradientText
} from './ui/interactive';
import { cn } from '@/lib/utils';

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
          textColor: '#1565c0',
          glowColor: 'rgba(33, 150, 243, 0.3)'
        };
      case 'right':
        return {
          icon: '➡️',
          bgColor: '#f3e5f5',
          borderColor: '#9c27b0',
          textColor: '#7b1fa2',
          glowColor: 'rgba(156, 39, 176, 0.3)'
        };
      default:
        return {
          icon: '↔️',
          bgColor: '#f1f8e9',
          borderColor: '#4caf50',
          textColor: '#2e7d32',
          glowColor: 'rgba(76, 175, 80, 0.3)'
        };
    }
  };

  return (
    <section 
      className={cn(styles.resultsContainer, "relative")}
      role="region"
      aria-label="Flight seat recommendations"
      aria-live="polite"
    >
        <div className="mb-8">
          <GradientText 
            text="Seat Recommendations"
            className={cn(styles.heading, "text-2xl md:text-3xl")}
            gradient="from-blue-600 via-purple-600 to-indigo-600"
            interactive
            as="h2"
          />
        </div>
        
        <AnimatePresence mode="wait">
          {/* Loading State */}
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
                             <InteractiveCard
                 className={cn(styles.loadingState, "text-center")}
                 backgroundGradient="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
                 glowColor="rgba(59, 130, 246, 0.2)"
                 rotationIntensity={3}
               >
                <motion.div 
                  className={cn(styles.loadingSpinner, "text-4xl mb-4")} 
                  aria-hidden="true"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  ✈️
                </motion.div>
                <p className="text-lg font-medium">Analyzing sun position for your flight...</p>
              </InteractiveCard>
            </motion.div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
                             <InteractiveCard
                 className={cn(styles.errorState)}
                 backgroundGradient="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20"
                 glowColor="rgba(239, 68, 68, 0.2)"
                 rotationIntensity={4}
                 role="alert"
               >
                <div className={cn(styles.errorIcon, "text-2xl mb-3")} aria-hidden="true">❌</div>
                <h3 className="text-xl font-bold mb-2">Unable to Generate Recommendation</h3>
                <p className="text-gray-600 dark:text-gray-300">{error}</p>
              </InteractiveCard>
            </motion.div>
          )}
          
          {/* Results with Data */}
          {hasResults && data && !isLoading && !error && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, staggerChildren: 0.1 }}
              className={styles.resultsContent}
            >
              {/* Main Recommendation */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                                 <InteractiveCard 
                   className={cn(styles.recommendationCard, "mb-6")}
                   backgroundGradient={`bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800`}
                   glowColor={getRecommendationStyle(data.recommendation).glowColor}
                   rotationIntensity={6}
                   hoverScale={1.02}
                   style={{
                     borderColor: getRecommendationStyle(data.recommendation).borderColor,
                   }}
                 >
                  <div className={styles.recommendationHeader}>
                    <motion.span 
                      className={cn(styles.recommendationIcon, "text-3xl")} 
                      aria-hidden="true"
                      whileHover={{ scale: 1.2, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {getRecommendationStyle(data.recommendation).icon}
                    </motion.span>
                    <h3 className={styles.recommendationTitle}>
                      <GradientText 
                        text={`Recommended Side: ${data.recommendation.toUpperCase()}`}
                        className="text-xl font-bold"
                        gradient={
                          data.recommendation === 'left' ? 'from-blue-600 to-blue-800' :
                          data.recommendation === 'right' ? 'from-purple-600 to-purple-800' :
                          'from-green-600 to-green-800'
                        }
                      />
                    </h3>
                    <div className={styles.confidenceScore}>
                      <span className={styles.confidenceLabel}>Confidence:</span>
                      <motion.span 
                        className={cn(styles.confidenceValue, "font-bold text-lg")}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.5 }}
                      >
                        {data.confidence}%
                      </motion.span>
                    </div>
                  </div>
                  <motion.p 
                    className={styles.recommendationDescription}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {data.description}
                  </motion.p>
                </InteractiveCard>
              </motion.div>

              {/* Flight Details */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                                 <InteractiveCard 
                   className={cn(styles.flightDetails, "mb-6")}
                   backgroundGradient="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900"
                   glowColor="rgba(71, 85, 105, 0.2)"
                   rotationIntensity={4}
                 >
                  <h4 className={styles.sectionTitle}>
                    <GradientText 
                      text="Flight Information"
                      className="text-lg font-semibold mb-4"
                      gradient="from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100"
                    />
                  </h4>
                  <div className={styles.flightRoute}>
                    <motion.div 
                      className={styles.routePoint}
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <span className={cn(styles.airportCode, "font-bold text-blue-600")}>{data.globeData.departure.iata}</span>
                      <span className={styles.airportName}>{data.globeData.departure.name}</span>
                    </motion.div>
                    <motion.div 
                      className={cn(styles.routeArrow, "text-2xl mx-4")} 
                      aria-hidden="true"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      ✈️
                    </motion.div>
                    <motion.div 
                      className={styles.routePoint}
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <span className={cn(styles.airportCode, "font-bold text-purple-600")}>{data.globeData.arrival.iata}</span>
                      <span className={styles.airportName}>{data.globeData.arrival.name}</span>
                    </motion.div>
                  </div>
                  <div className={cn(styles.flightStats, "grid grid-cols-1 md:grid-cols-3 gap-4 mt-6")}>
                    {[
                      { label: "Distance", value: formatDistance(data.globeData.totalDistance), icon: "🌍" },
                      { label: "Duration", value: formatDuration(data.globeData.totalDuration), icon: "⏰" },
                      { label: "Sun Visibility", value: `${Math.round(data.globeData.summary.averageSunVisibility)}%`, icon: "☀️" }
                    ].map((stat, index) => (
                                             <motion.div 
                         key={stat.label}
                         className={cn(styles.statItem, "p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl")}
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.3 + index * 0.1 }}
                         whileHover={{ scale: 1.05 }}
                       >
                        <span className="text-xl mb-2 block">{stat.icon}</span>
                        <span className={cn(styles.statLabel, "block text-sm text-gray-600 dark:text-gray-400")}>{stat.label}:</span>
                        <span className={cn(styles.statValue, "block font-bold text-lg")}>{stat.value}</span>
                      </motion.div>
                    ))}
                  </div>
                </InteractiveCard>
              </motion.div>

              {/* 3D Flight View Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className={styles.globeViewSection}
              >
                                 <motion.button 
                   className={cn(styles.globeViewButton, "relative overflow-hidden p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg")}
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
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.8 }}
                  />
                  <span className="relative flex items-center justify-center gap-3">
                    <motion.span 
                      className={cn(styles.globeIcon, "text-2xl")} 
                      aria-hidden="true"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    >
                      🌍
                    </motion.span>
                    <span className={styles.globeText}>3D Flight View</span>
                    <motion.span 
                      className={cn(styles.globeArrow, "text-xl")} 
                      aria-hidden="true"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </span>
                </motion.button>
              </motion.div>

              {/* Sun Events */}
              {data.events && data.events.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                                     <InteractiveCard
                     className={cn(styles.sunEvents, "mb-6")}
                     backgroundGradient="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
                     glowColor="rgba(245, 158, 11, 0.2)"
                     rotationIntensity={3}
                   >
                    <h4 className={styles.sectionTitle}>
                      <GradientText 
                        text={`Sunrise & Sunset Events (${data.events.length})`}
                        className="text-lg font-semibold mb-4"
                        gradient="from-amber-600 to-orange-600"
                      />
                    </h4>
                    <div className={styles.eventsList}>
                      {data.events.map((event, index) => (
                                                 <motion.div 
                           key={index} 
                           className={cn(styles.eventItem, "p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl mb-4")}
                           initial={{ opacity: 0, x: -20 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: 0.5 + index * 0.1 }}
                           whileHover={{ scale: 1.02, x: 5 }}
                         >
                          <div className={cn(styles.eventIcon, "text-2xl")} aria-hidden="true">
                            {event.type === 'sunrise' ? '🌅' : '🌇'}
                          </div>
                          <div className={styles.eventDetails}>
                            <span className={cn(styles.eventType, "font-semibold")}>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</span>
                            <span className={styles.eventTime}>{formatTime(event.time)}</span>
                            <span className={styles.eventSide}>
                              Best view from <strong>{event.viewingSide}</strong> side
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </InteractiveCard>
                </motion.div>
              )}

              {/* Summary Statistics */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                                 <InteractiveCard
                   className={cn(styles.summaryStats)}
                   backgroundGradient="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20"
                   glowColor="rgba(99, 102, 241, 0.2)"
                   rotationIntensity={4}
                 >
                  <h4 className={styles.sectionTitle}>
                    <GradientText 
                      text="Flight Summary"
                      className="text-lg font-semibold mb-6"
                      gradient="from-indigo-600 to-purple-600"
                    />
                  </h4>
                  <div className={cn(styles.statsGrid, "grid grid-cols-1 md:grid-cols-3 gap-6")}>
                    {[
                      { icon: "🌅", number: data.globeData.summary.totalSunriseEvents, label: "Sunrise Events", color: "from-yellow-500 to-orange-500" },
                      { icon: "🌇", number: data.globeData.summary.totalSunsetEvents, label: "Sunset Events", color: "from-orange-500 to-red-500" },
                      { icon: "☀️", number: Math.round(data.globeData.summary.averageSunVisibility), label: "Sun Visibility %", color: "from-blue-500 to-cyan-500" }
                    ].map((stat, index) => (
                                             <motion.div
                         key={stat.label}
                         className={cn(styles.summaryCard, "text-center p-6 bg-white/60 dark:bg-gray-800/60 rounded-2xl")}
                         initial={{ opacity: 0, scale: 0.8 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ delay: 0.6 + index * 0.1, type: "spring" }}
                         whileHover={{ scale: 1.05, y: -5 }}
                       >
                        <motion.div 
                          className={cn(styles.summaryIcon, "text-3xl mb-3")} 
                          aria-hidden="true"
                          whileHover={{ scale: 1.2, rotate: 5 }}
                        >
                          {stat.icon}
                        </motion.div>
                        <motion.div 
                          className={cn(styles.summaryNumber, "text-3xl font-bold mb-2")}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.8 + index * 0.1, type: "spring", stiffness: 300 }}
                        >
                          <GradientText 
                            text={stat.number.toString()}
                            gradient={stat.color}
                            className="text-3xl font-bold"
                          />
                        </motion.div>
                        <div className={cn(styles.summaryLabel, "text-sm text-gray-600 dark:text-gray-400 font-medium")}>{stat.label}</div>
                      </motion.div>
                    ))}
                  </div>
                </InteractiveCard>
              </motion.div>
            </motion.div>
          )}

          {/* Empty State (no form submission yet) */}
          {!hasResults && !isLoading && !error && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
                             <InteractiveCard
                 className={cn(styles.emptyState, "text-center")}
                 backgroundGradient="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950/20"
                 glowColor="rgba(59, 130, 246, 0.15)"
                 rotationIntensity={2}
               >
                <motion.div 
                  className={cn(styles.emptyIcon, "text-6xl mb-6")} 
                  aria-hidden="true"
                  animate={{ rotate: [0, 5, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  ☀️
                </motion.div>
                <h3 className={styles.emptyHeading}>
                  <GradientText 
                    text="Ready to find your perfect seat"
                    className="text-2xl font-bold mb-4"
                    gradient="from-blue-600 to-purple-600"
                    interactive
                  />
                </h3>
                <motion.p 
                  className={cn(styles.emptyText, "text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto")}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Fill out the flight information above and click "Find Best Seat" to get personalized recommendations based on sun exposure patterns.
                </motion.p>
                <div className={styles.features}>
                  <ul className={cn(styles.featureList, "space-y-4")} role="list">
                    {[
                      { icon: "🌅", text: "Optimal sunlight exposure timing" },
                      { icon: "🪟", text: "Window vs aisle recommendations" },
                      { icon: "🧭", text: "Direction-based seat positioning" }
                    ].map((feature, index) => (
                      <motion.li 
                        key={feature.text}
                        className={cn(styles.featureItem, "flex items-center justify-center gap-3 text-lg")}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        whileHover={{ scale: 1.05, x: 5 }}
                      >
                        <motion.span 
                          className={cn(styles.featureIcon, "text-2xl")} 
                          aria-hidden="true"
                          whileHover={{ scale: 1.2, rotate: 5 }}
                        >
                          {feature.icon}
                        </motion.span>
                        {feature.text}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </InteractiveCard>
            </motion.div>
          )}
                 </AnimatePresence>
     </section>
   );
} 