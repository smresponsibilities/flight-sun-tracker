'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Globe from 'react-globe.gl';
import styles from './GlobeDisplay.module.css';

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

interface GlobeDisplayProps {
  flightData: FlightData;
}

interface FlightArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  strokeWidth: number;
}



export default function GlobeDisplay({ flightData }: GlobeDisplayProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [globeReady, setGlobeReady] = useState(false);
  const [planePosition, setPlanePosition] = useState<{lat: number, lng: number, progress: number, bearing: number} | null>(null);
  
  // Create a new state for the animated arc
  const [animatedArc, setAnimatedArc] = useState<FlightArc | null>(null);

  const animationRef = useRef<number>(0);

  // Great circle calculation to match the curved arc path - moved before early return
  const calculateGreatCirclePoint = useCallback((lat1: number, lng1: number, lat2: number, lng2: number, fraction: number) => {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const toDeg = (rad: number) => rad * 180 / Math.PI;
    
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);
    const lng1Rad = toRad(lng1);
    const lng2Rad = toRad(lng2);
    
    // Great circle distance
    const dLat = lat2Rad - lat1Rad;
    const dLng = lng2Rad - lng1Rad;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const distance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    // Interpolate along great circle
    const A = Math.sin((1-fraction) * distance) / Math.sin(distance);
    const B = Math.sin(fraction * distance) / Math.sin(distance);
    
    const x = A * Math.cos(lat1Rad) * Math.cos(lng1Rad) + B * Math.cos(lat2Rad) * Math.cos(lng2Rad);
    const y = A * Math.cos(lat1Rad) * Math.sin(lng1Rad) + B * Math.cos(lat2Rad) * Math.sin(lng2Rad);
    const z = A * Math.sin(lat1Rad) + B * Math.sin(lat2Rad);
    
    const lat = toDeg(Math.atan2(z, Math.sqrt(x*x + y*y)));
    const lng = toDeg(Math.atan2(y, x));
    
    // Calculate bearing from current position to destination (simple and effective)
    const bearing = toDeg(Math.atan2(
      Math.sin(toRad(lng2 - lng)) * Math.cos(toRad(lat2)),
      Math.cos(toRad(lat)) * Math.sin(toRad(lat2)) - 
      Math.sin(toRad(lat)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng))
    ));
    
    return { lat, lng, bearing: (bearing + 360) % 360 };
  }, []);

  // Create plane HTML element - moved before early return
  const createPlaneElement = useCallback(() => {
    const bearing = planePosition?.bearing || 0;
    // Convert navigation bearing to SVG rotation for proper pointing
    // The plane SVG is designed with nose pointing up (north), so we need to adjust
    const svgRotation = bearing;
    
    const planeDiv = document.createElement('div');
    planeDiv.innerHTML = `
      <svg width="50" height="50" viewBox="0 0 50 50" style="position: absolute; top: 0; left: 0;">
        <defs>
          <filter id="planeShadow">
            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.5)"/>
          </filter>
        </defs>
        <!-- Airplane with white styling -->
        <g transform="rotate(${svgRotation} 25 25)">
          <!-- Fuselage - white -->
          <ellipse cx="25" cy="25" rx="3" ry="16" fill="#ffffff" stroke="#cccccc" stroke-width="1.5"/>
          <!-- Main wings - white -->
          <ellipse cx="25" cy="30" rx="14" ry="3" fill="#ffffff" stroke="#cccccc" stroke-width="1.5"/>
          <!-- Tail wings - light gray -->
          <ellipse cx="25" cy="38" rx="6" ry="2" fill="#f5f5f5" stroke="#cccccc" stroke-width="1"/>
          <!-- Nose cone - white -->
          <ellipse cx="25" cy="12" rx="2" ry="3" fill="#ffffff" stroke="#cccccc" stroke-width="1"/>
          <!-- Cockpit - light gray -->
          <ellipse cx="25" cy="18" rx="2.2" ry="5" fill="#e5e5e5" stroke="#cccccc" stroke-width="0.8"/>
          <!-- Wing details - very light gray -->
          <ellipse cx="25" cy="30" rx="10" ry="1.5" fill="#f9f9f9" opacity="0.7"/>
          <!-- Navigation lights - keep red/green for realism -->
          <circle cx="14" cy="30" r="1.2" fill="#ef4444" opacity="0.9"/>
          <circle cx="36" cy="30" r="1.2" fill="#22c55e" opacity="0.9"/>
          <!-- Engine details - light gray -->
          <ellipse cx="20" cy="30" rx="1.5" ry="2" fill="#e5e5e5" opacity="0.8"/>
          <ellipse cx="30" cy="30" rx="1.5" ry="2" fill="#e5e5e5" opacity="0.8"/>
        </g>
      </svg>
    `;
    planeDiv.style.pointerEvents = 'none';
    planeDiv.style.transform = 'translate(-25px, -25px)'; // Center the larger plane
    planeDiv.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))';
    planeDiv.style.width = '50px';
    planeDiv.style.height = '50px';
    return planeDiv;
  }, [planePosition]);

  // Airport points data only
  const airportsData = useMemo(() => [
    {
      lat: flightData.fromLat,
      lng: flightData.fromLng,
      alt: 0.01,
      color: '#f59e0b', // Orange for departure/source
      size: 1.5,
      label: `🛫 ${flightData.from}\n${flightData.fromName}`
    },
    {
      lat: flightData.toLat,
      lng: flightData.toLng,
      alt: 0.01,
      color: '#10b981', // Green for arrival/destination
      size: 1.5,
      label: `🛬 ${flightData.to}\n${flightData.toName}`
    }
  ], [flightData]);

  // Plane data for HTML element
  const planeData = useMemo(() => {
    if (!planePosition) return [];
    
    return [{
      lat: planePosition.lat,
      lng: planePosition.lng,
      alt: 0.02,
      bearing: planePosition.bearing
    }];
  }, [planePosition]);

  // Plane animation with animated arc - moved before early return
  useEffect(() => {
    if (!globeReady) return;
    
    const duration = 8000; // 8 seconds for full flight
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 1) {
        const position = calculateGreatCirclePoint(
          flightData.fromLat, 
          flightData.fromLng, 
          flightData.toLat, 
          flightData.toLng, 
          progress
        );
        
        // Update the plane's position
        setPlanePosition({ ...position, progress });
        
        // ALSO, update the arc's endpoint - the arc now ends at the plane's current position
        setAnimatedArc({
          startLat: flightData.fromLat,
          startLng: flightData.fromLng,
          endLat: position.lat,
          endLng: position.lng,
          color: '#3b82f6',
          strokeWidth: 4,
        });
        
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Reset animation after a pause
        setTimeout(() => {
          setPlanePosition(null);
          setAnimatedArc(null);
          setTimeout(() => {
            const newStartTime = Date.now();
            const newAnimate = () => {
              const newElapsed = Date.now() - newStartTime;
              const newProgress = Math.min(newElapsed / duration, 1);
              
              if (newProgress < 1) {
                const position = calculateGreatCirclePoint(
                  flightData.fromLat, 
                  flightData.fromLng, 
                  flightData.toLat, 
                  flightData.toLng, 
                  newProgress
                );
                
                // Update the plane's position
                setPlanePosition({ ...position, progress: newProgress });
                
                // Update the arc's endpoint
                setAnimatedArc({
                  startLat: flightData.fromLat,
                  startLng: flightData.fromLng,
                  endLat: position.lat,
                  endLng: position.lng,
                  color: '#3b82f6',
                  strokeWidth: 4,
                });
                
                animationRef.current = requestAnimationFrame(newAnimate);
              } else {
                // Continue the loop
                setTimeout(() => {
                  setPlanePosition(null);
                  setAnimatedArc(null);
                  setTimeout(() => animationRef.current = requestAnimationFrame(animate), 1000);
                }, 2000);
              }
            };
            animationRef.current = requestAnimationFrame(newAnimate);
          }, 1000);
        }, 2000);
      }
    };
    
    // Start animation after a short delay
    setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 2000);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [globeReady, flightData, calculateGreatCirclePoint]);

  // Initialize globe camera position - moved before early return
  useEffect(() => {
    if (globeReady && globeRef.current) {
      // Calculate midpoint for camera positioning
      const midLat = (flightData.fromLat + flightData.toLat) / 2;
      const midLng = (flightData.fromLng + flightData.toLng) / 2;
      
      // Position camera to show full flight path
      globeRef.current.pointOfView({
        lat: midLat,
        lng: midLng,
        altitude: 2
      }, 2000);
    }
  }, [globeReady, flightData]);

  // Validate flight data
  if (!flightData || !flightData.fromLat || !flightData.fromLng || !flightData.toLat || !flightData.toLng) {
    return (
      <div className={styles.globeWrapper}>
        <div className={styles.initializingMessage}>
          <div className={styles.initSpinner}>❌</div>
          <div className={styles.initText}>Invalid Flight Data</div>
          <div className={styles.initSubtext}>Unable to display flight path</div>
        </div>
      </div>
    );
  }



  return (
    <div className={styles.globeWrapper}>
      {/* Globe Component */}
      <Globe
        ref={globeRef}
        width={typeof window !== 'undefined' ? window.innerWidth : 800}
        height={typeof window !== 'undefined' ? window.innerHeight : 600}
        onGlobeReady={() => setGlobeReady(true)}
        
        // Beautiful Earth texture with blue oceans and realistic land
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
        
        // Enhanced globe settings
        showAtmosphere={true}
        atmosphereColor="#60a5fa"
        atmosphereAltitude={0.2}
        enablePointerInteraction={true}
        showGraticules={false}
        
        // Animated flight arc - grows as the plane moves
        arcsData={animatedArc ? [animatedArc] : []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arcStartLat={(d: any) => d.startLat}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arcStartLng={(d: any) => d.startLng}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arcEndLat={(d: any) => d.endLat}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arcEndLng={(d: any) => d.endLng}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arcColor={(d: any) => d.color}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arcStroke={(d: any) => d.strokeWidth}
        arcAltitudeAutoScale={0.4}
        arcDashLength={1.0}
        arcDashGap={0.0}
        arcDashAnimateTime={0}
        
        arcsTransitionDuration={0}
        
        // Airport points
        pointsData={airportsData}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pointLat={(d: any) => d.lat}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pointLng={(d: any) => d.lng}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pointAltitude={(d: any) => d.alt}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pointColor={(d: any) => d.color}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pointRadius={(d: any) => d.size}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pointLabel={(d: any) => d.label}
        pointResolution={12}
        pointsMerge={false}
        
        // Animated plane
        htmlElementsData={planeData}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        htmlLat={(d: any) => d.lat}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        htmlLng={(d: any) => d.lng}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        htmlAltitude={(d: any) => d.alt}
        htmlElement={createPlaneElement}
      />

    </div>
  );
} 