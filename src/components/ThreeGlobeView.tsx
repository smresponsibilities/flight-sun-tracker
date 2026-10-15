'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Airport, FlightPathPoint } from '@/lib/flightCalculator';
import { CONTINENTS } from '@/lib/data/worldLand';
import { getSubsolarPoint } from '@/lib/solarTerminator';
import { IconPlane } from './AviationIcons';

interface ThreeGlobeViewProps {
  departure: Airport;
  arrival: Airport;
  flightPath: FlightPathPoint[];
  currentWaypoint: FlightPathPoint | null;
  currentTime: Date;
}

// Major global metropolitan centers for procedural NASA night city lights
const MAJOR_METROS = [
  { lat: 40.71, lon: -74.00, size: 6 }, // New York
  { lat: 51.50, lon: -0.12, size: 6 },  // London
  { lat: 35.67, lon: 139.65, size: 6 }, // Tokyo
  { lat: 48.85, lon: 2.35, size: 5 },   // Paris
  { lat: 25.20, lon: 55.27, size: 5 },  // Dubai
  { lat: 28.61, lon: 77.20, size: 6 },  // Delhi
  { lat: 19.07, lon: 72.87, size: 6 },  // Mumbai
  { lat: 31.23, lon: 121.47, size: 6 }, // Shanghai
  { lat: 39.90, lon: 116.40, size: 6 }, // Beijing
  { lat: 34.05, lon: -118.24, size: 5 },// Los Angeles
  { lat: 41.87, lon: -87.62, size: 5 }, // Chicago
  { lat: 55.75, lon: 37.61, size: 5 },  // Moscow
  { lat: 1.35, lon: 103.81, size: 5 },  // Singapore
  { lat: 22.31, lon: 114.16, size: 5 }, // Hong Kong
  { lat: -33.86, lon: 151.20, size: 5 },// Sydney
  { lat: -23.55, lon: -46.63, size: 5 },// Sao Paulo
  { lat: 37.77, lon: -122.41, size: 4 },// San Francisco
  { lat: 52.52, lon: 13.40, size: 4 },  // Berlin
  { lat: 37.56, lon: 126.97, size: 5 }, // Seoul
  { lat: 13.75, lon: 100.50, size: 5 }, // Bangkok
  { lat: 30.04, lon: 31.23, size: 5 },  // Cairo
  { lat: 50.11, lon: 8.68, size: 4 },   // Frankfurt
  { lat: 52.36, lon: 4.90, size: 4 },   // Amsterdam
  { lat: 25.03, lon: 121.56, size: 4 }, // Taipei
  { lat: 43.65, lon: -79.38, size: 4 }, // Toronto
];

const GLOBE_RADIUS = 100;

// Coordinate transformation: Spherical (lat, lon) to 3D Cartesian
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180;
  const theta = (lon * Math.PI) / 180;

  const y = radius * Math.sin(phi);
  const x = radius * Math.cos(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi) * Math.cos(theta);

  return new THREE.Vector3(x, y, z);
}

// Generate procedural 2048x1024 cartography canvas with dark slate ocean, continent landmasses, and NASA night city lights
function createGlobeTextures(): {
  dayTexture: THREE.CanvasTexture;
  nightTexture: THREE.CanvasTexture;
} {
  const width = 2048;
  const height = 1024;

  // Day Map Canvas
  const dayCanvas = document.createElement('canvas');
  dayCanvas.width = width;
  dayCanvas.height = height;
  const dayCtx = dayCanvas.getContext('2d')!;

  // 1. Dark Slate Deep Ocean (#050508)
  dayCtx.fillStyle = '#050508';
  dayCtx.fillRect(0, 0, width, height);

  // 2. Graticules (Latitude & Longitude Grid)
  dayCtx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  dayCtx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * width;
    dayCtx.beginPath();
    dayCtx.moveTo(x, 0);
    dayCtx.lineTo(x, height);
    dayCtx.stroke();
  }
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = ((90 - lat) / 180) * height;
    dayCtx.beginPath();
    dayCtx.moveTo(0, y);
    dayCtx.lineTo(width, y);
    dayCtx.stroke();
  }

  // 3. Continental Landmasses (#0f172a with subtle emerald bathymetry)
  dayCtx.fillStyle = '#0d1527';
  dayCtx.strokeStyle = '#1e293b';
  dayCtx.lineWidth = 2;

  CONTINENTS.forEach((poly) => {
    if (poly.length < 2) return;
    dayCtx.beginPath();
    const firstX = ((poly[0][0] + 180) / 360) * width;
    const firstY = ((90 - poly[0][1]) / 180) * height;
    dayCtx.moveTo(firstX, firstY);
    for (let i = 1; i < poly.length; i++) {
      const px = ((poly[i][0] + 180) / 360) * width;
      const py = ((90 - poly[i][1]) / 180) * height;
      dayCtx.lineTo(px, py);
    }
    dayCtx.closePath();
    dayCtx.fill();
    dayCtx.stroke();
  });

  // Night Lights Canvas (Emissive NASA night map)
  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = width;
  nightCanvas.height = height;
  const nightCtx = nightCanvas.getContext('2d')!;

  nightCtx.fillStyle = '#000000';
  nightCtx.fillRect(0, 0, width, height);

  // Paint glowing city light clusters
  MAJOR_METROS.forEach((metro) => {
    const x = ((metro.lon + 180) / 360) * width;
    const y = ((90 - metro.lat) / 180) * height;

    const grad = nightCtx.createRadialGradient(x, y, 0, x, y, metro.size * 3.5);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.3, '#f59e0b');
    grad.addColorStop(0.7, 'rgba(245, 158, 11, 0.25)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');

    nightCtx.fillStyle = grad;
    nightCtx.beginPath();
    nightCtx.arc(x, y, metro.size * 3.5, 0, Math.PI * 2);
    nightCtx.fill();

    // Secondary micro-sparkles
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * metro.size * 2.5;
      const sx = x + Math.cos(angle) * dist;
      const sy = y + Math.sin(angle) * dist;
      nightCtx.fillStyle = '#fbbf24';
      nightCtx.fillRect(sx, sy, 1.5, 1.5);
    }
  });

  const dayTexture = new THREE.CanvasTexture(dayCanvas);
  const nightTexture = new THREE.CanvasTexture(nightCanvas);

  dayTexture.colorSpace = THREE.SRGBColorSpace;
  nightTexture.colorSpace = THREE.SRGBColorSpace;

  return { dayTexture, nightTexture };
}

// Build procedural low-poly modern airliner mesh
function createAircraftMesh(): THREE.Group {
  const group = new THREE.Group();

  // Fuselage material: Brushed titanium
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.85,
    roughness: 0.2,
  });

  const cockpitMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
  });

  // Fuselage Body
  const bodyGeo = new THREE.CylinderGeometry(1.2, 1.0, 16, 16);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, metalMat);
  group.add(body);

  // Nose Cone
  const noseGeo = new THREE.ConeGeometry(1.2, 4, 16);
  noseGeo.rotateX(Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, metalMat);
  nose.position.z = 10;
  group.add(nose);

  // Cockpit Glass Windshield
  const cockpitGeo = new THREE.BoxGeometry(1.6, 0.8, 2);
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
  cockpit.position.set(0, 0.8, 7.5);
  group.add(cockpit);

  // Main Swept Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 2);
  wingShape.lineTo(14, -6);
  wingShape.lineTo(13, -7.5);
  wingShape.lineTo(0, -3);
  wingShape.lineTo(-13, -7.5);
  wingShape.lineTo(-14, -6);
  wingShape.closePath();

  const extrudeSettings = { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 };
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
  wingGeo.rotateX(Math.PI / 2);
  const wings = new THREE.Mesh(wingGeo, metalMat);
  wings.position.set(0, 0, 1);
  group.add(wings);

  // Vertical Tail Fin
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.lineTo(0, 5);
  tailShape.lineTo(2.5, 5);
  tailShape.lineTo(4, 0);
  tailShape.closePath();

  const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: 0.2, bevelEnabled: false });
  tailGeo.rotateY(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, metalMat);
  tail.position.set(0.1, 0.6, -7.5);
  group.add(tail);

  // Navigation Wingtip Beacons
  const portNav = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  portNav.position.set(-13.5, 0, -6.5);
  group.add(portNav);

  const starNav = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  starNav.position.set(13.5, 0, -6.5);
  group.add(starNav);

  // Scale down to fit globe scale
  group.scale.set(0.32, 0.32, 0.32);

  return group;
}

export default function ThreeGlobeView({
  departure,
  arrival,
  flightPath,
  currentWaypoint,
  currentTime,
}: ThreeGlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoTrack, setIsAutoTrack] = useState(false);

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const aircraftMeshRef = useRef<THREE.Group | null>(null);
  const sunRayLineRef = useRef<THREE.Line | null>(null);
  const pathTubeRef = useRef<THREE.Mesh | null>(null);
  const depBeaconRef = useRef<THREE.Mesh | null>(null);
  const arrBeaconRef = useRef<THREE.Mesh | null>(null);

  // Setup Three.js scene once on client mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    camera.position.set(0, 80, 260);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 120;
    controls.maxDistance = 600;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.0;
    controlsRef.current = controls;

    // 5. Deep Space Ambient Light
    const ambientLight = new THREE.AmbientLight(0x181825, 0.35);
    scene.add(ambientLight);

    // 6. Real-Time Directional Solar Light
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.5);
    sunLight.position.set(200, 50, 200);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // 7. Globe Sphere Geometry & Textures
    const { dayTexture, nightTexture } = createGlobeTextures();
    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const globeMat = new THREE.MeshStandardMaterial({
      map: dayTexture,
      roughness: 0.85,
      metalness: 0.1,
      emissiveMap: nightTexture,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.65,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globeMesh);

    // 8. Atmospheric Scattering Rim Glow (Fresnel Shader Shell)
    const atmosphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.06, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.0);
          gl_FragColor = vec4(0.22, 0.74, 0.97, fresnel * 0.75); // Cyan #38bdf8 glow
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);

    // 9. Airport Departure & Arrival Beacons
    const ringGeo = new THREE.RingGeometry(1.5, 3.0, 32);
    ringGeo.rotateX(-Math.PI / 2);

    const depMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const depBeacon = new THREE.Mesh(ringGeo, depMat);
    scene.add(depBeacon);
    depBeaconRef.current = depBeacon;

    const arrMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide });
    const arrBeacon = new THREE.Mesh(ringGeo, arrMat);
    scene.add(arrBeacon);
    arrBeaconRef.current = arrBeacon;

    // 10. 3D Aircraft Model
    const aircraft = createAircraftMesh();
    scene.add(aircraft);
    aircraftMeshRef.current = aircraft;

    // 11. Dynamic Sun Vector Ray
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 50, 0),
    ]);
    const rayMat = new THREE.LineDashedMaterial({
      color: 0xfbbf24,
      dashSize: 2,
      gapSize: 1,
      linewidth: 2,
    });
    const sunRay = new THREE.Line(rayGeo, rayMat);
    sunRay.computeLineDistances();
    scene.add(sunRay);
    sunRayLineRef.current = sunRay;

    // 12. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Pulse Beacons
      const scale = 1.0 + 0.3 * Math.sin(elapsedTime * 4);
      if (depBeaconRef.current) depBeaconRef.current.scale.set(scale, scale, scale);
      if (arrBeaconRef.current) arrBeaconRef.current.scale.set(scale, scale, scale);

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 13. Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      dayTexture.dispose();
      nightTexture.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Flight Path Geodesic 3D Ribbon when flight path data changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || flightPath.length < 2) return;

    if (pathTubeRef.current) {
      scene.remove(pathTubeRef.current);
      pathTubeRef.current.geometry.dispose();
    }

    // Build elevated 3D Catmull-Rom curve points
    const curvePoints: THREE.Vector3[] = [];
    const colors: number[] = [];

    flightPath.forEach((pt, idx) => {
      const progress = idx / (flightPath.length - 1);
      // Altitude bulge along great circle arc
      const altOffset = 1.0 + 0.045 * Math.sin(progress * Math.PI);
      const pos = latLonToVector3(pt.location.lat, pt.location.lon, GLOBE_RADIUS * altOffset);
      curvePoints.push(pos);

      // Color coding along trajectory
      const isNight = pt.sunPosition.elevation <= 0;
      if (isNight) {
        colors.push(0.2, 0.2, 0.5); // Deep Indigo
      } else {
        const relAz = ((pt.sunPosition.azimuth - pt.aircraftBearing + 360) % 360);
        const isGlare = relAz > 45 && relAz < 315;
        if (isGlare) {
          colors.push(0.98, 0.75, 0.14); // Solar Amber #fbbf24
        } else {
          colors.push(0.22, 0.74, 0.97); // Cool Cyan #38bdf8
        }
      }
    });

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, flightPath.length * 2, 0.8, 8, false);

    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: false,
    });

    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tubeMesh);
    pathTubeRef.current = tubeMesh;

    // Update Departure & Arrival Beacons
    if (depBeaconRef.current) {
      const depPos = latLonToVector3(departure.latitude, departure.longitude, GLOBE_RADIUS * 1.002);
      depBeaconRef.current.position.copy(depPos);
      depBeaconRef.current.lookAt(depPos.clone().multiplyScalar(2));
    }

    if (arrBeaconRef.current) {
      const arrPos = latLonToVector3(arrival.latitude, arrival.longitude, GLOBE_RADIUS * 1.002);
      arrBeaconRef.current.position.copy(arrPos);
      arrBeaconRef.current.lookAt(arrPos.clone().multiplyScalar(2));
    }
  }, [flightPath, departure, arrival]);

  // Update Directional Solar Lighting corresponding to subsolar point at currentTime
  useEffect(() => {
    if (!sunLightRef.current) return;

    const subsolar = getSubsolarPoint(currentTime);
    const sunDistance = 350;
    const sunPos = latLonToVector3(subsolar.lat, subsolar.lon, sunDistance);

    sunLightRef.current.position.copy(sunPos);
  }, [currentTime]);

  // Update Aircraft Position, Orientation, and Sun Vector Ray
  useEffect(() => {
    if (!aircraftMeshRef.current || !flightPath.length) return;

    const currentPt = currentWaypoint || flightPath[0];
    const currentIndex = flightPath.findIndex((p) => p === currentPt);
    const progress = Math.max(0, currentIndex / (flightPath.length - 1));
    const altOffset = 1.0 + 0.045 * Math.sin(progress * Math.PI);

    const currentPos = latLonToVector3(currentPt.location.lat, currentPt.location.lon, GLOBE_RADIUS * altOffset);
    aircraftMeshRef.current.position.copy(currentPos);

    // Calculate forward flight direction
    const nextPt = flightPath[Math.min(flightPath.length - 1, (currentIndex >= 0 ? currentIndex : 0) + 1)];
    const nextPos = latLonToVector3(nextPt.location.lat, nextPt.location.lon, GLOBE_RADIUS * altOffset);

    const forwardDir = nextPos.clone().sub(currentPos).normalize();
    const upDir = currentPos.clone().normalize(); // Normal from Earth center

    if (forwardDir.lengthSq() > 0.0001) {
      const matrix = new THREE.Matrix4();
      const rightDir = new THREE.Vector3().crossVectors(forwardDir, upDir).normalize();
      const trueUp = new THREE.Vector3().crossVectors(rightDir, forwardDir).normalize();
      matrix.makeBasis(rightDir, trueUp, forwardDir);
      aircraftMeshRef.current.quaternion.setFromRotationMatrix(matrix);
    }

    // Dynamic Sun Vector Ray
    if (sunRayLineRef.current && sunLightRef.current) {
      const sunTarget = currentPos.clone().add(
        sunLightRef.current.position.clone().sub(currentPos).normalize().multiplyScalar(40)
      );
      const positions = new Float32Array([
        currentPos.x, currentPos.y, currentPos.z,
        sunTarget.x, sunTarget.y, sunTarget.z,
      ]);
      sunRayLineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      sunRayLineRef.current.computeLineDistances();
    }

    // Auto-track camera smoothly follows aircraft
    if (isAutoTrack && cameraRef.current && controlsRef.current) {
      const camOffset = currentPos.clone().normalize().multiplyScalar(GLOBE_RADIUS * 1.8);
      cameraRef.current.position.lerp(camOffset, 0.05);
      controlsRef.current.target.lerp(currentPos, 0.08);
      controlsRef.current.update();
    }
  }, [currentWaypoint, flightPath, isAutoTrack]);

  // Frame full route view
  const handleResetRouteView = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current || !flightPath.length) return;
    const midIdx = Math.floor(flightPath.length / 2);
    const midPt = flightPath[midIdx];
    const midPos = latLonToVector3(midPt.location.lat, midPt.location.lon, GLOBE_RADIUS * 2.2);

    cameraRef.current.position.copy(midPos);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
    setIsAutoTrack(false);
  }, [flightPath]);

  return (
    <div className="cockpit-card rounded-xl border border-[var(--cockpit-border)] relative overflow-hidden flex flex-col">
      {/* 3D Viewport Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--cockpit-border)] bg-zinc-950/70 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--alert-emerald)] animate-pulse" />
          <span className="text-xs font-mono-numbers font-bold uppercase tracking-wider text-white">
            3D EARTH GLOBE HUD [THREE.JS]
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-[var(--cabin-cyan)] font-mono-numbers">
            HARDWARE ACCELERATED
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAutoTrack(!isAutoTrack)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono-numbers font-bold transition-all flex items-center gap-1.5 ${
              isAutoTrack
                ? 'bg-[var(--alert-emerald)] text-black shadow-lg shadow-emerald-500/20'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-[var(--cockpit-border)]'
            }`}
          >
            <IconPlane size={12} className={isAutoTrack ? 'text-black' : 'text-zinc-400'} />
            <span>{isAutoTrack ? '[TRACKING ON]' : '[AUTO-TRACK]'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetRouteView}
            className="px-2.5 py-1 rounded text-[11px] font-mono-numbers font-medium bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-[var(--cockpit-border)] transition-colors"
          >
            [FRAME ROUTE]
          </button>
        </div>
      </div>

      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-[360px] sm:h-[440px] lg:h-[480px] relative cursor-grab active:cursor-grabbing bg-[#050508]"
      />

      {/* Floating HUD Overlays */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none font-mono-numbers">
        <div className="px-2.5 py-1.5 rounded bg-zinc-950/85 backdrop-blur-md border border-[var(--cockpit-border)] text-[11px] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--solar-amber)]" />
          <span className="text-[var(--foreground-muted)]">[DEP] {departure.iata}:</span>
          <span className="text-white font-bold">{departure.name}</span>
        </div>
        <div className="px-2.5 py-1.5 rounded bg-zinc-950/85 backdrop-blur-md border border-[var(--cockpit-border)] text-[11px] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--alert-emerald)]" />
          <span className="text-[var(--foreground-muted)]">[ARR] {arrival.iata}:</span>
          <span className="text-white font-bold">{arrival.name}</span>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 z-10 pointer-events-none font-mono-numbers">
        <div className="px-2.5 py-1.5 rounded bg-zinc-950/85 backdrop-blur-md border border-[var(--cockpit-border)] text-[10px] text-[var(--foreground-muted)]">
          ORBIT: DRAG ROTATE | SCROLL ZOOM
        </div>
      </div>
    </div>
  );
}
