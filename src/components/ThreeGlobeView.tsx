'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Airport, FlightPathPoint } from '@/lib/flightCalculator';
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

/**
 * Mathematically exact coordinate transformation matching Three.js standard
 * SphereGeometry equirectangular UV mapping (u: [-180, 180] -> [0, 1], v: [90, -90] -> [1, 0]).
 */
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phiRad = (90 - lat) * (Math.PI / 180);
  const thetaRad = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phiRad) * Math.cos(thetaRad);
  const y = radius * Math.cos(phiRad);
  const z = radius * Math.sin(phiRad) * Math.sin(thetaRad);

  return new THREE.Vector3(x, y, z);
}

// Sleek low-poly modern airliner mesh scaled to proportional aviation size
function createAircraftMesh(): THREE.Group {
  const group = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.92,
    roughness: 0.15,
  });

  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.85,
    roughness: 0.25,
  });

  const cockpitMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
  });

  // Fuselage Body (Length = 5.2, oriented along +Z)
  const bodyGeo = new THREE.CylinderGeometry(0.42, 0.32, 4.2, 16);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, metalMat);
  group.add(body);

  // Aerodynamic Nose Cone (Facing +Z)
  const noseGeo = new THREE.ConeGeometry(0.42, 1.4, 16);
  noseGeo.rotateX(Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, metalMat);
  nose.position.z = 2.8;
  group.add(nose);

  // Cockpit Glass Window Visor
  const cockpitGeo = new THREE.BoxGeometry(0.55, 0.25, 0.7);
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
  cockpit.position.set(0, 0.28, 2.0);
  group.add(cockpit);

  // Swept Wings (Wingspan = 5.6, swept back along -Z)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.6);
  wingShape.lineTo(2.8, -1.4);
  wingShape.lineTo(2.6, -1.8);
  wingShape.lineTo(0, -0.7);
  wingShape.lineTo(-2.6, -1.8);
  wingShape.lineTo(-2.8, -1.4);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: false });
  wingGeo.rotateX(Math.PI / 2);
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.set(0, 0, 0.2);
  group.add(wings);

  // Twin Turbofan Engines under wings
  const engineGeo = new THREE.CylinderGeometry(0.2, 0.17, 1.1, 10);
  engineGeo.rotateX(Math.PI / 2);
  const enginePort = new THREE.Mesh(engineGeo, metalMat);
  enginePort.position.set(-1.1, -0.28, 0.0);
  group.add(enginePort);

  const engineStar = new THREE.Mesh(engineGeo, metalMat);
  engineStar.position.set(1.1, -0.28, 0.0);
  group.add(engineStar);

  // Vertical Tail Stabilizer
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.lineTo(0, 1.3);
  tailShape.lineTo(0.65, 1.3);
  tailShape.lineTo(1.1, 0);
  tailShape.closePath();

  const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: 0.08, bevelEnabled: false });
  tailGeo.rotateY(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, metalMat);
  tail.position.set(0.04, 0.22, -2.0);
  group.add(tail);

  // Horizontal Tail Stabilizers
  const hTailShape = new THREE.Shape();
  hTailShape.moveTo(0, 0.2);
  hTailShape.lineTo(1.2, -0.5);
  hTailShape.lineTo(1.0, -0.7);
  hTailShape.lineTo(0, -0.3);
  hTailShape.lineTo(-1.0, -0.7);
  hTailShape.lineTo(-1.2, -0.5);
  hTailShape.closePath();

  const hTailGeo = new THREE.ExtrudeGeometry(hTailShape, { depth: 0.06, bevelEnabled: false });
  hTailGeo.rotateX(Math.PI / 2);
  const hTail = new THREE.Mesh(hTailGeo, metalMat);
  hTail.position.set(0, 0.3, -1.9);
  group.add(hTail);

  // Standard Aviation Navigation Wingtip Lights
  // Port = Red, Starboard = Green
  const portNav = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  portNav.position.set(-2.75, 0, -1.5);
  group.add(portNav);

  const starNav = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  starNav.position.set(2.75, 0, -1.5);
  group.add(starNav);

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
  const depBeaconRef = useRef<THREE.Group | null>(null);
  const arrBeaconRef = useRef<THREE.Group | null>(null);
  const subsolarOrbRef = useRef<THREE.Mesh | null>(null);

  // Earth shader uniforms reference
  const earthUniformsRef = useRef<{
    uDayTexture: { value: THREE.Texture | null };
    uNightTexture: { value: THREE.Texture | null };
    uSunDirection: { value: THREE.Vector3 };
  }>({
    uDayTexture: { value: null },
    uNightTexture: { value: null },
    uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
  });

  const atmosphereUniformsRef = useRef<{
    uSunDirection: { value: THREE.Vector3 };
    uViewMatrix: { value: THREE.Matrix4 };
  }>({
    uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
    uViewMatrix: { value: new THREE.Matrix4() },
  });

  // Helper: Create 3D Airport Beacon Pin + Concentric Pulsing Rings
  const createBeaconGroup = (colorHex: number): THREE.Group => {
    const group = new THREE.Group();

    // Inner ground ring
    const ringGeo1 = new THREE.RingGeometry(0.8, 1.4, 32);
    ringGeo1.rotateX(-Math.PI / 2);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    group.add(ring1);

    // Outer radar pulsing ring
    const ringGeo2 = new THREE.RingGeometry(1.8, 2.5, 32);
    ringGeo2.rotateX(-Math.PI / 2);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    group.add(ring2);

    // Vertical beacon pin
    const pinGeo = new THREE.CylinderGeometry(0.18, 0.08, 3.2, 8);
    pinGeo.translate(0, 1.6, 0);
    const pinMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    group.add(pin);

    // Beacon head glowing orb
    const headGeo = new THREE.SphereGeometry(0.7, 12, 12);
    headGeo.translate(0, 3.2, 0);
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
    scene.background = new THREE.Color(0x04060d);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    cameraRef.current = camera;

    // 3. Renderer with high dynamic range
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 110;
    controls.maxDistance = 500;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.0;
    controlsRef.current = controls;

    // 5. Orbital Starfield (1,200 stars for depth)
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 900 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const tint = Math.random();
      if (tint > 0.8) {
        starColors[i * 3] = 0.98; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 0.7;
      } else if (tint > 0.6) {
        starColors[i * 3] = 0.75; starColors[i * 3 + 1] = 0.88; starColors[i * 3 + 2] = 1.0;
      } else {
        starColors[i * 3] = 0.92; starColors[i * 3 + 1] = 0.92; starColors[i * 3 + 2] = 0.95;
      }
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starsMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
    });
    const starField = new THREE.Points(starsGeo, starsMat);
    scene.add(starField);

    // 6. NASA Photorealistic Earth with Custom Day/Night/Terminator Shader
    const textureLoader = new THREE.TextureLoader();
    const dayTexture = textureLoader.load('/earth-blue-marble.jpg');
    const nightTexture = textureLoader.load('/earth-night.jpg');

    dayTexture.colorSpace = THREE.SRGBColorSpace;
    nightTexture.colorSpace = THREE.SRGBColorSpace;

    earthUniformsRef.current.uDayTexture.value = dayTexture;
    earthUniformsRef.current.uNightTexture.value = nightTexture;

    // Earth Custom Shader Material
    const earthMat = new THREE.ShaderMaterial({
      uniforms: {
        uDayTexture: earthUniformsRef.current.uDayTexture,
        uNightTexture: earthUniformsRef.current.uNightTexture,
        uSunDirection: earthUniformsRef.current.uSunDirection,
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vWorldNormal = normalize((modelMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uDayTexture;
        uniform sampler2D uNightTexture;
        uniform vec3 uSunDirection;

        varying vec3 vWorldNormal;
        varying vec2 vUv;

        void main() {
          vec3 n = normalize(vWorldNormal);
          vec3 s = normalize(uSunDirection);
          float sunDot = dot(n, s);

          // Day factor: smooth twilight transition across terminator (-0.12 to +0.12)
          float dayFactor = smoothstep(-0.12, 0.12, sunDot);

          vec4 daySample = texture2D(uDayTexture, vUv);
          vec4 nightSample = texture2D(uNightTexture, vUv);

          // Sunlit day side: realistic solar lighting with ambient fill
          float diffuse = max(0.14, sunDot);
          vec3 dayColor = daySample.rgb * (diffuse * 1.25 + 0.12);

          // Golden hour / twilight penumbra amber rim along terminator
          float twilight = smoothstep(-0.15, 0.05, sunDot) * smoothstep(0.20, 0.05, sunDot);
          vec3 goldenRim = vec3(1.0, 0.58, 0.18) * twilight * 0.45;

          // Night side: luminous city lights against dark ocean
          vec3 nightColor = nightSample.rgb * 1.65;

          vec3 finalColor = mix(nightColor, dayColor + goldenRim, dayFactor);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });

    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const globeMesh = new THREE.Mesh(globeGeo, earthMat);
    scene.add(globeMesh);

    // 7. Atmospheric Scattering Rim Glow (Fresnel Shader)
    const atmosphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.016, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: atmosphereUniformsRef.current.uSunDirection,
        uViewMatrix: atmosphereUniformsRef.current.uViewMatrix,
      },
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
        uniform vec3 uSunDirection;
        uniform mat4 uViewMatrix;

        void main() {
          vec3 viewDir = normalize(-vPosition);
          float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 2.8);

          vec3 sunView = normalize((uViewMatrix * vec4(uSunDirection, 0.0)).xyz);
          float sunFacing = max(0.0, dot(vNormal, sunView));

          vec3 dayRim = vec3(0.22, 0.74, 0.97) * 0.85; // Cyan #38bdf8
          vec3 nightRim = vec3(0.12, 0.16, 0.38) * 0.35; // Deep indigo
          vec3 rimColor = mix(nightRim, dayRim, smoothstep(0.0, 0.45, sunFacing));

          gl_FragColor = vec4(rimColor, fresnel * 0.65);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);

    // 8. Airport Beacons (JFK: Amber, LHR: Emerald)
    const depBeacon = createBeaconGroup(0xf59e0b);
    scene.add(depBeacon);
    depBeaconRef.current = depBeacon;

    const arrBeacon = createBeaconGroup(0x10b981);
    scene.add(arrBeacon);
    arrBeaconRef.current = arrBeacon;

    // 9. Zenith Subsolar Indicator Orb on Earth surface
    const subsolarGeo = new THREE.SphereGeometry(1.6, 16, 16);
    const subsolarMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const subsolarOrb = new THREE.Mesh(subsolarGeo, subsolarMat);
    scene.add(subsolarOrb);
    subsolarOrbRef.current = subsolarOrb;

    // 10. 3D Modern Airliner Model
    const aircraft = createAircraftMesh();
    scene.add(aircraft);
    aircraftMeshRef.current = aircraft;

    // 11. Dynamic Sun Vector Ray
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 16, 0),
    ]);
    const rayMat = new THREE.LineDashedMaterial({
      color: 0xfbbf24,
      dashSize: 1.5,
      gapSize: 0.8,
      linewidth: 2,
    });
    const sunRay = new THREE.Line(rayGeo, rayMat);
    sunRay.computeLineDistances();
    scene.add(sunRay);
    sunRayLineRef.current = sunRay;

    // 12. Directional Solar Light (for aircraft shading)
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.5);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const ambientLight = new THREE.AmbientLight(0x334155, 0.7);
    scene.add(ambientLight);

    // 13. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Pulsing beacon radar rings
      const pulseScale = 1.0 + 0.22 * Math.sin(elapsedTime * 4.0);
      if (depBeaconRef.current) depBeaconRef.current.children[1].scale.set(pulseScale, pulseScale, pulseScale);
      if (arrBeaconRef.current) arrBeaconRef.current.children[1].scale.set(pulseScale, pulseScale, pulseScale);

      // Keep atmosphere viewMatrix in sync
      atmosphereUniformsRef.current.uViewMatrix.value.copy(camera.matrixWorldInverse);

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 14. Auto-frame full route on initial mount
    const depPos = latLonToVector3(departure.latitude, departure.longitude, GLOBE_RADIUS);
    const arrPos = latLonToVector3(arrival.latitude, arrival.longitude, GLOBE_RADIUS);
    const midPos = depPos.clone().add(arrPos).multiplyScalar(0.5);
    const camPos = midPos.clone().normalize().multiplyScalar(GLOBE_RADIUS * 2.15);

    camera.position.set(camPos.x, camPos.y + 35, camPos.z);
    controls.target.set(midPos.x * 0.2, midPos.y * 0.2, midPos.z * 0.2);
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
      dayTexture.dispose();
      nightTexture.dispose();
      earthMat.dispose();
      atmosphereMat.dispose();
      globeGeo.dispose();
      atmosphereGeo.dispose();
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

    // Build elevated 3D Catmull-Rom curve points along true Great Circle route
    const curvePoints: THREE.Vector3[] = [];

    flightPath.forEach((pt, idx) => {
      const progress = idx / (flightPath.length - 1);
      // Realistic flight altitude: subtle elevation hovering just above Earth surface
      const altOffset = 1.008 + 0.018 * Math.sin(progress * Math.PI);
      const pos = latLonToVector3(pt.location.lat, pt.location.lon, GLOBE_RADIUS * altOffset);
      curvePoints.push(pos);
    });

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, flightPath.length * 4, 0.45, 8, false);

    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: false,
    });

    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tubeMesh);
    pathTubeRef.current = tubeMesh;

    // Position Departure & Arrival Beacons exactly at airport coordinates
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

  // Update Solar Position, Sun Light, and Subsolar Zenith Point
  useEffect(() => {
    const subsolar = getSubsolarPoint(currentTime);
    const sunUnitPos = latLonToVector3(subsolar.lat, subsolar.lon, 1.0).normalize();

    // Update shaders
    earthUniformsRef.current.uSunDirection.value.copy(sunUnitPos);
    atmosphereUniformsRef.current.uSunDirection.value.copy(sunUnitPos);

    // Directional light position
    if (sunLightRef.current) {
      sunLightRef.current.position.copy(sunUnitPos.clone().multiplyScalar(300));
    }

    // Update Zenith Subsolar Orb position
    if (subsolarOrbRef.current) {
      const subsolarSurfacePos = latLonToVector3(subsolar.lat, subsolar.lon, GLOBE_RADIUS * 1.004);
      subsolarOrbRef.current.position.copy(subsolarSurfacePos);
    }
  }, [currentTime]);

  // Update Aircraft Position, Orientation, and Sun Vector Ray
  useEffect(() => {
    if (!aircraftMeshRef.current || !flightPath.length) return;

    const currentPt = currentWaypoint || flightPath[0];
    const currentIndex = flightPath.findIndex((p) => p === currentPt);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const progress = Math.max(0, safeIndex / (flightPath.length - 1));
    const altOffset = 1.008 + 0.018 * Math.sin(progress * Math.PI);

    const currentPos = latLonToVector3(currentPt.location.lat, currentPt.location.lon, GLOBE_RADIUS * altOffset);
    aircraftMeshRef.current.position.copy(currentPos);

    // Calculate forward flight direction along Great Circle arc
    const nextPt = flightPath[Math.min(flightPath.length - 1, safeIndex + 1)];
    const nextPos = latLonToVector3(nextPt.location.lat, nextPt.location.lon, GLOBE_RADIUS * altOffset);

    // Local Up: outward radial normal from Earth center
    const upDir = currentPos.clone().normalize();

    // Raw forward vector to next waypoint
    let forwardDir = nextPos.clone().sub(currentPos);
    if (forwardDir.lengthSq() < 0.0001 && safeIndex > 0) {
      const prevPt = flightPath[safeIndex - 1];
      const prevPos = latLonToVector3(prevPt.location.lat, prevPt.location.lon, GLOBE_RADIUS * altOffset);
      forwardDir = currentPos.clone().sub(prevPos);
    }

    // Project forwardDir onto tangent plane perpendicular to upDir
    forwardDir = forwardDir.sub(upDir.clone().multiplyScalar(forwardDir.dot(upDir))).normalize();

    if (forwardDir.lengthSq() > 0.0001) {
      // Orthonormal basis: rightDir = upDir x forwardDir (right hand rule)
      const rightDir = new THREE.Vector3().crossVectors(upDir, forwardDir).normalize();
      const trueUp = new THREE.Vector3().crossVectors(forwardDir, rightDir).normalize();

      // Aircraft mesh is built with +X = Starboard, +Y = Cockpit Roof, +Z = Nose Cone
      const rotMatrix = new THREE.Matrix4().makeBasis(rightDir, trueUp, forwardDir);
      aircraftMeshRef.current.quaternion.setFromRotationMatrix(rotMatrix);
    }

    // Dynamic Sun Vector Ray
    if (sunRayLineRef.current && sunLightRef.current) {
      const isDaylight = currentPt.sunPosition.elevation > 0;
      if (isDaylight) {
        sunRayLineRef.current.visible = true;
        const sunDir = sunLightRef.current.position.clone().sub(currentPos).normalize();
        const sunTarget = currentPos.clone().add(sunDir.multiplyScalar(15));
        const positions = new Float32Array([
          currentPos.x, currentPos.y, currentPos.z,
          sunTarget.x, sunTarget.y, sunTarget.z,
        ]);
        sunRayLineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        sunRayLineRef.current.computeLineDistances();
      } else {
        // Sun below horizon -> hide sun vector ray
        sunRayLineRef.current.visible = false;
      }
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
    const midPos = depPos.clone().add(arrPos).multiplyScalar(0.5);
    const camPos = midPos.clone().normalize().multiplyScalar(GLOBE_RADIUS * 2.15);

    cameraRef.current.position.set(camPos.x, camPos.y + 35, camPos.z);
    controlsRef.current.target.set(midPos.x * 0.2, midPos.y * 0.2, midPos.z * 0.2);
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
            NASA SATELLITE CARTOGRAPHY
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
        className="w-full h-[360px] sm:h-[440px] lg:h-[480px] relative cursor-grab active:cursor-grabbing bg-[#04060d]"
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
