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

const GLOBE_RADIUS = 100;

// High-density world cities for realistic NASA night lights
const GLOBAL_CITIES = [
  // North America
  { lat: 40.71, lon: -74.00, size: 5 }, // NYC
  { lat: 34.05, lon: -118.24, size: 5 },// LA
  { lat: 41.87, lon: -87.62, size: 4 }, // Chicago
  { lat: 29.76, lon: -95.36, size: 4 }, // Houston
  { lat: 33.74, lon: -84.38, size: 4 }, // Atlanta
  { lat: 25.76, lon: -80.19, size: 4 }, // Miami
  { lat: 37.77, lon: -122.41, size: 4 },// San Francisco
  { lat: 47.60, lon: -122.33, size: 4 },// Seattle
  { lat: 38.90, lon: -77.03, size: 4 }, // Washington DC
  { lat: 42.36, lon: -71.05, size: 4 }, // Boston
  { lat: 43.65, lon: -79.38, size: 4 }, // Toronto
  { lat: 45.50, lon: -73.56, size: 4 }, // Montreal
  { lat: 49.28, lon: -123.12, size: 3 },// Vancouver
  { lat: 19.43, lon: -99.13, size: 5 }, // Mexico City
  // Europe
  { lat: 51.50, lon: -0.12, size: 5 },  // London
  { lat: 48.85, lon: 2.35, size: 5 },   // Paris
  { lat: 50.11, lon: 8.68, size: 4 },   // Frankfurt
  { lat: 52.52, lon: 13.40, size: 4 },  // Berlin
  { lat: 52.36, lon: 4.90, size: 4 },   // Amsterdam
  { lat: 50.85, lon: 4.35, size: 4 },   // Brussels
  { lat: 41.90, lon: 12.49, size: 4 },  // Rome
  { lat: 45.46, lon: 9.19, size: 4 },   // Milan
  { lat: 40.41, lon: -3.70, size: 4 },  // Madrid
  { lat: 41.38, lon: 2.17, size: 4 },   // Barcelona
  { lat: 55.75, lon: 37.61, size: 5 },  // Moscow
  { lat: 59.93, lon: 30.33, size: 4 },  // St Petersburg
  { lat: 59.32, lon: 18.06, size: 3 },  // Stockholm
  { lat: 55.67, lon: 12.56, size: 3 },  // Copenhagen
  { lat: 48.20, lon: 16.37, size: 3 },  // Vienna
  { lat: 47.37, lon: 8.54, size: 3 },   // Zurich
  { lat: 53.34, lon: -6.26, size: 3 },  // Dublin
  { lat: 37.98, lon: 23.72, size: 4 },  // Athens
  { lat: 41.00, lon: 28.97, size: 5 },  // Istanbul
  // Middle East & Africa
  { lat: 25.20, lon: 55.27, size: 5 },  // Dubai
  { lat: 24.45, lon: 54.37, size: 4 },  // Abu Dhabi
  { lat: 24.71, lon: 46.67, size: 4 },  // Riyadh
  { lat: 32.08, lon: 34.78, size: 4 },  // Tel Aviv
  { lat: 30.04, lon: 31.23, size: 5 },  // Cairo
  { lat: 33.57, lon: -7.58, size: 3 },  // Casablanca
  { lat: 6.52, lon: 3.37, size: 4 },    // Lagos
  { lat: -1.29, lon: 36.82, size: 3 },  // Nairobi
  { lat: -26.20, lon: 28.04, size: 4 }, // Johannesburg
  { lat: -33.92, lon: 18.42, size: 3 }, // Cape Town
  // Asia
  { lat: 28.61, lon: 77.20, size: 5 },  // Delhi
  { lat: 19.07, lon: 72.87, size: 5 },  // Mumbai
  { lat: 12.97, lon: 77.59, size: 4 },  // Bangalore
  { lat: 13.08, lon: 80.27, size: 4 },  // Chennai
  { lat: 22.57, lon: 88.36, size: 4 },  // Kolkata
  { lat: 31.23, lon: 121.47, size: 5 }, // Shanghai
  { lat: 39.90, lon: 116.40, size: 5 }, // Beijing
  { lat: 23.12, lon: 113.26, size: 5 }, // Guangzhou
  { lat: 22.54, lon: 114.05, size: 5 }, // Shenzhen
  { lat: 22.31, lon: 114.16, size: 5 }, // Hong Kong
  { lat: 25.03, lon: 121.56, size: 4 }, // Taipei
  { lat: 35.67, lon: 139.65, size: 5 }, // Tokyo
  { lat: 34.69, lon: 135.50, size: 5 }, // Osaka
  { lat: 37.56, lon: 126.97, size: 5 }, // Seoul
  { lat: 1.35, lon: 103.81, size: 5 },  // Singapore
  { lat: 13.75, lon: 100.50, size: 4 }, // Bangkok
  { lat: 3.13, lon: 101.68, size: 4 },  // Kuala Lumpur
  { lat: -6.20, lon: 106.84, size: 5 }, // Jakarta
  { lat: 14.59, lon: 120.98, size: 4 }, // Manila
  // Oceania & South America
  { lat: -33.86, lon: 151.20, size: 4 },// Sydney
  { lat: -37.81, lon: 144.96, size: 4 },// Melbourne
  { lat: -36.84, lon: 174.76, size: 3 },// Auckland
  { lat: -23.55, lon: -46.63, size: 5 },// Sao Paulo
  { lat: -22.90, lon: -43.17, size: 4 },// Rio de Janeiro
  { lat: -34.60, lon: -58.38, size: 4 },// Buenos Aires
  { lat: -33.44, lon: -70.66, size: 4 },// Santiago
  { lat: -12.04, lon: -77.04, size: 4 },// Lima
  { lat: 4.71, lon: -74.07, size: 4 },  // Bogota
];

// Coordinate transformation: Spherical (lat, lon) to 3D Cartesian
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180;
  const theta = (lon * Math.PI) / 180;

  const y = radius * Math.sin(phi);
  const x = radius * Math.cos(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi) * Math.cos(theta);

  return new THREE.Vector3(x, y, z);
}

// Generate high-visibility dark-mode cartography canvas texture
function createHighContrastGlobeTexture(): {
  colorMap: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
} {
  const width = 2048;
  const height = 1024;

  // 1. Color Map Canvas
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  // Deep Navy/Slate Ocean (#090e1a) with subtle bathymetric gradients
  ctx.fillStyle = '#090e1a';
  ctx.fillRect(0, 0, width, height);

  // Subtle ocean grid lines (Graticules)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Continents: Visible slate-cyan fill with luminous cyan/emerald coastlines
  ctx.fillStyle = '#141e33';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;

  CONTINENTS.forEach((poly) => {
    if (poly.length < 2) return;
    ctx.beginPath();
    const firstX = ((poly[0][0] + 180) / 360) * width;
    const firstY = ((90 - poly[0][1]) / 180) * height;
    ctx.moveTo(firstX, firstY);
    for (let i = 1; i < poly.length; i++) {
      const px = ((poly[i][0] + 180) / 360) * width;
      const py = ((90 - poly[i][1]) / 180) * height;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // Secondary inner land shading for depth
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 1.2;
  CONTINENTS.forEach((poly) => {
    if (poly.length < 2) return;
    ctx.beginPath();
    const firstX = ((poly[0][0] + 180) / 360) * width;
    const firstY = ((90 - poly[0][1]) / 180) * height;
    ctx.moveTo(firstX, firstY);
    for (let i = 1; i < poly.length; i++) {
      const px = ((poly[i][0] + 180) / 360) * width;
      const py = ((90 - poly[i][1]) / 180) * height;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  });

  // 2. Emissive Night Lights Map Canvas
  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = width;
  emissiveCanvas.height = height;
  const eCtx = emissiveCanvas.getContext('2d')!;

  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, width, height);

  // Paint realistic pin-point star-like NASA city night clusters
  GLOBAL_CITIES.forEach((city) => {
    const cx = ((city.lon + 180) / 360) * width;
    const cy = ((90 - city.lat) / 180) * height;

    // Soft city glow aura
    const rad = city.size * 2.2;
    const grad = eCtx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.3, '#f59e0b');
    grad.addColorStop(0.7, 'rgba(245, 158, 11, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    eCtx.fillStyle = grad;
    eCtx.beginPath();
    eCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    eCtx.fill();

    // Central bright pinpoint core
    eCtx.fillStyle = '#ffffff';
    eCtx.beginPath();
    eCtx.arc(cx, cy, 1.2, 0, Math.PI * 2);
    eCtx.fill();

    // Dense suburban micro-nodes around major metro centers
    const microCount = city.size >= 5 ? 12 : 6;
    for (let i = 0; i < microCount; i++) {
      const angle = (i / microCount) * Math.PI * 2 + Math.sin(i);
      const dist = (0.5 + 0.5 * Math.sin(i * 3)) * rad * 0.9;
      const mx = cx + Math.cos(angle) * dist;
      const my = cy + Math.sin(angle) * dist;
      eCtx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#fef08a';
      eCtx.beginPath();
      eCtx.arc(mx, my, 0.9, 0, Math.PI * 2);
      eCtx.fill();
    }
  });

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);

  colorMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.colorSpace = THREE.SRGBColorSpace;

  return { colorMap, emissiveMap };
}

// Sleek low-poly modern airliner mesh
function createAircraftMesh(): THREE.Group {
  const group = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.9,
    roughness: 0.15,
  });

  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.8,
    roughness: 0.25,
  });

  const glassMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
  });

  // Fuselage Body
  const bodyGeo = new THREE.CylinderGeometry(1.4, 1.1, 18, 16);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, metalMat);
  group.add(body);

  // Aerodynamic Nose
  const noseGeo = new THREE.ConeGeometry(1.4, 5, 16);
  noseGeo.rotateX(Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, metalMat);
  nose.position.z = 11.5;
  group.add(nose);

  // Cockpit Glass
  const cockpitGeo = new THREE.BoxGeometry(1.8, 0.9, 2.5);
  const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
  cockpit.position.set(0, 0.9, 8.5);
  group.add(cockpit);

  // Swept Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 2);
  wingShape.lineTo(16, -7);
  wingShape.lineTo(15, -9);
  wingShape.lineTo(0, -4);
  wingShape.lineTo(-15, -9);
  wingShape.lineTo(-16, -7);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 });
  wingGeo.rotateX(Math.PI / 2);
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.set(0, 0, 1);
  group.add(wings);

  // Twin Turbofan Engines
  const engineGeo = new THREE.CylinderGeometry(0.7, 0.6, 4, 12);
  engineGeo.rotateX(Math.PI / 2);
  const enginePort = new THREE.Mesh(engineGeo, metalMat);
  enginePort.position.set(-6, -1, 0);
  group.add(enginePort);

  const engineStar = new THREE.Mesh(engineGeo, metalMat);
  engineStar.position.set(6, -1, 0);
  group.add(engineStar);

  // Tail Vertical Stabilizer
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.lineTo(0, 6);
  tailShape.lineTo(3, 6);
  tailShape.lineTo(5, 0);
  tailShape.closePath();

  const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: 0.25, bevelEnabled: false });
  tailGeo.rotateY(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, metalMat);
  tail.position.set(0.12, 0.8, -8.5);
  group.add(tail);

  // Red & Green Navigation Wingtip Lights
  const portNav = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  portNav.position.set(-15.5, 0, -8);
  group.add(portNav);

  const starNav = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  starNav.position.set(15.5, 0, -8);
  group.add(starNav);

  group.scale.set(0.35, 0.35, 0.35);
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
  const sunMarkerRef = useRef<THREE.Mesh | null>(null);
  const aircraftMeshRef = useRef<THREE.Group | null>(null);
  const sunRayLineRef = useRef<THREE.Line | null>(null);
  const pathTubeRef = useRef<THREE.Mesh | null>(null);
  const depBeaconRef = useRef<THREE.Group | null>(null);
  const arrBeaconRef = useRef<THREE.Group | null>(null);

  // Helper: Create 3D Airport Beacon Pin + Pulsing Rings
  const createBeaconGroup = (colorHex: number): THREE.Group => {
    const group = new THREE.Group();

    // Concentric pulsing rings
    const ringGeo1 = new THREE.RingGeometry(1.8, 3.2, 32);
    ringGeo1.rotateX(-Math.PI / 2);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    group.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(4.0, 5.2, 32);
    ringGeo2.rotateX(-Math.PI / 2);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    group.add(ring2);

    // Vertical beacon pin
    const pinGeo = new THREE.CylinderGeometry(0.4, 0.2, 8, 8);
    pinGeo.translate(0, 4, 0);
    const pinMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    group.add(pin);

    // Glowing head sphere
    const headGeo = new THREE.SphereGeometry(1.2, 12, 12);
    headGeo.translate(0, 8, 0);
    const head = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    group.add(head);

    return group;
  };

  // Setup Three.js scene once on client mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913); // Deep space background
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    cameraRef.current = camera;

    // 3. Renderer with high dynamic range
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 115;
    controls.maxDistance = 550;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.0;
    controlsRef.current = controls;

    // 5. Hemisphere & Ambient Lighting for 100% Legibility
    // Sky light provides gentle azure illumination so night side continents are clearly visible!
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.4);
    scene.add(ambientLight);

    // 6. Real-Time Directional Solar Light (Daylight side)
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.8);
    sunLight.position.set(200, 50, 200);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Subsolar 3D Sun Orb Marker
    const sunMarkerGeo = new THREE.SphereGeometry(3.5, 16, 16);
    const sunMarkerMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const sunMarker = new THREE.Mesh(sunMarkerGeo, sunMarkerMat);
    scene.add(sunMarker);
    sunMarkerRef.current = sunMarker;

    // 7. Globe Sphere Geometry & High-Contrast Textures
    const { colorMap, emissiveMap } = createHighContrastGlobeTexture();
    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const globeMat = new THREE.MeshStandardMaterial({
      map: colorMap,
      roughness: 0.65,
      metalness: 0.15,
      emissiveMap: emissiveMap,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.85,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globeMesh);

    // Subtle Horizon Atmosphere Rim Fresnel (Inside globe layer)
    const atmosphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.015, 64, 64);
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
          float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 2.8);
          gl_FragColor = vec4(0.22, 0.74, 0.97, fresnel * 0.45); // Subtle cyan #38bdf8 haze
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);

    // 8. Departure (JFK: Amber) & Arrival (LHR: Emerald) Beacons
    const depBeacon = createBeaconGroup(0xf59e0b);
    scene.add(depBeacon);
    depBeaconRef.current = depBeacon;

    const arrBeacon = createBeaconGroup(0x10b981);
    scene.add(arrBeacon);
    arrBeaconRef.current = arrBeacon;

    // 9. 3D Aircraft Model
    const aircraft = createAircraftMesh();
    scene.add(aircraft);
    aircraftMeshRef.current = aircraft;

    // 10. Dynamic Sun Vector Ray
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 50, 0),
    ]);
    const rayMat = new THREE.LineDashedMaterial({
      color: 0xfbbf24,
      dashSize: 2.5,
      gapSize: 1.5,
      linewidth: 2,
    });
    const sunRay = new THREE.Line(rayGeo, rayMat);
    sunRay.computeLineDistances();
    scene.add(sunRay);
    sunRayLineRef.current = sunRay;

    // 11. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Beacon ring pulses
      const scale = 1.0 + 0.25 * Math.sin(elapsedTime * 4.5);
      if (depBeaconRef.current) depBeaconRef.current.children[1].scale.set(scale, scale, scale);
      if (arrBeaconRef.current) arrBeaconRef.current.children[1].scale.set(scale, scale, scale);

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 12. Auto-frame full route on initial mount
    const depPos = latLonToVector3(departure.latitude, departure.longitude, GLOBE_RADIUS);
    const arrPos = latLonToVector3(arrival.latitude, arrival.longitude, GLOBE_RADIUS);
    const midPos = depPos.clone().add(arrPos).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS * 2.2);

    camera.position.set(midPos.x, midPos.y + 40, midPos.z);
    controls.target.set(0, 0, 0);
    controls.update();

    // Window Resize Handler
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
      colorMap.dispose();
      emissiveMap.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [departure, arrival]);

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

    flightPath.forEach((pt, idx) => {
      const progress = idx / (flightPath.length - 1);
      // Clear visible altitude arch above globe surface (peaks at 1.08 radius)
      const altOffset = 1.0 + 0.065 * Math.sin(progress * Math.PI);
      const pos = latLonToVector3(pt.location.lat, pt.location.lon, GLOBE_RADIUS * altOffset);
      curvePoints.push(pos);
    });

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, flightPath.length * 3, 1.2, 12, false);

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
    const sunDistance = 320;
    const sunPos = latLonToVector3(subsolar.lat, subsolar.lon, sunDistance);

    sunLightRef.current.position.copy(sunPos);

    if (sunMarkerRef.current) {
      const orbPos = latLonToVector3(subsolar.lat, subsolar.lon, GLOBE_RADIUS * 1.04);
      sunMarkerRef.current.position.copy(orbPos);
    }
  }, [currentTime]);

  // Update Aircraft Position, Orientation, and Sun Vector Ray
  useEffect(() => {
    if (!aircraftMeshRef.current || !flightPath.length) return;

    const currentPt = currentWaypoint || flightPath[0];
    const currentIndex = flightPath.findIndex((p) => p === currentPt);
    const progress = Math.max(0, currentIndex / (flightPath.length - 1));
    const altOffset = 1.0 + 0.065 * Math.sin(progress * Math.PI);

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
      const sunDir = sunLightRef.current.position.clone().sub(currentPos).normalize();
      const sunTarget = currentPos.clone().add(sunDir.multiplyScalar(45));
      const positions = new Float32Array([
        currentPos.x, currentPos.y, currentPos.z,
        sunTarget.x, sunTarget.y, sunTarget.z,
      ]);
      sunRayLineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      sunRayLineRef.current.computeLineDistances();
    }

    // Auto-track camera smoothly follows aircraft
    if (isAutoTrack && cameraRef.current && controlsRef.current) {
      const camOffset = currentPos.clone().normalize().multiplyScalar(GLOBE_RADIUS * 1.95);
      cameraRef.current.position.lerp(camOffset, 0.06);
      controlsRef.current.target.lerp(currentPos, 0.08);
      controlsRef.current.update();
    }
  }, [currentWaypoint, flightPath, isAutoTrack]);

  // Frame full route view
  const handleResetRouteView = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current || !flightPath.length) return;
    const depPos = latLonToVector3(departure.latitude, departure.longitude, GLOBE_RADIUS);
    const arrPos = latLonToVector3(arrival.latitude, arrival.longitude, GLOBE_RADIUS);
    const midPos = depPos.clone().add(arrPos).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS * 2.2);

    cameraRef.current.position.set(midPos.x, midPos.y + 40, midPos.z);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
    setIsAutoTrack(false);
  }, [flightPath, departure, arrival]);

  return (
    <div className="cockpit-card rounded-xl border border-[var(--cockpit-border)] relative overflow-hidden flex flex-col shadow-2xl">
      {/* 3D Viewport Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--cockpit-border)] bg-zinc-950/85 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--alert-emerald)] animate-pulse" />
          <span className="text-xs font-mono-numbers font-bold uppercase tracking-wider text-white">
            3D EARTH GLOBE HUD [THREE.JS]
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-[var(--cabin-cyan)] font-mono-numbers font-medium">
            HIGH CONTRAST CARTOGRAPHY
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
        className="w-full h-[360px] sm:h-[440px] lg:h-[480px] relative cursor-grab active:cursor-grabbing bg-[#060913]"
      />

      {/* Floating HUD Overlays */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none font-mono-numbers">
        <div className="px-2.5 py-1.5 rounded-lg bg-zinc-950/90 backdrop-blur-md border border-[var(--cockpit-border)] text-[11px] flex items-center gap-2 shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--solar-amber)] shadow-sm shadow-amber-500/50" />
          <span className="text-[var(--foreground-muted)]">[DEP] {departure.iata}:</span>
          <span className="text-white font-bold">{departure.name}</span>
        </div>
        <div className="px-2.5 py-1.5 rounded-lg bg-zinc-950/90 backdrop-blur-md border border-[var(--cockpit-border)] text-[11px] flex items-center gap-2 shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--alert-emerald)] shadow-sm shadow-emerald-500/50" />
          <span className="text-[var(--foreground-muted)]">[ARR] {arrival.iata}:</span>
          <span className="text-white font-bold">{arrival.name}</span>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 z-10 pointer-events-none font-mono-numbers">
        <div className="px-2.5 py-1.5 rounded-lg bg-zinc-950/90 backdrop-blur-md border border-[var(--cockpit-border)] text-[10px] text-[var(--foreground-muted)] shadow-lg">
          ORBIT: DRAG TO ROTATE | SCROLL TO ZOOM
        </div>
      </div>
    </div>
  );
}
