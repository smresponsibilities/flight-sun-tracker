'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Airport, FlightPathPoint } from '@/lib/flightCalculator';
import { getSubsolarPoint } from '@/lib/solarTerminator';
import { generateAnimatedEarthCanvas } from '@/lib/data/animatedEarthTexture';
import { IconPlane } from './AviationIcons';

interface CameraSyncState {
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
}

interface NativeWebGLGlobeViewProps {
  departure: Airport;
  arrival: Airport;
  flightPath: FlightPathPoint[];
  currentWaypoint: FlightPathPoint | null;
  currentTime: Date;
  visualMode?: 'animated' | 'satellite';
  hideHeader?: boolean;
  onCameraChange?: (pos: CameraSyncState) => void;
  syncCamera?: CameraSyncState | null;
}

const GLOBE_RADIUS = 100;

// Coordinate transformation: Lat/Lon -> 3D Vector matching standard sphere equirectangular UV mapping
function latLonToVec3(lat: number, lon: number, radius: number): [number, number, number] {
  const phiRad = (90 - lat) * (Math.PI / 180);
  const thetaRad = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phiRad) * Math.cos(thetaRad);
  const y = radius * Math.cos(phiRad);
  const z = radius * Math.sin(phiRad) * Math.sin(thetaRad);
  return [x, y, z];
}

// Minimal matrix math library for WebGL without external runtime overhead
type Mat4 = Float32Array;

function mat4_create(): Mat4 {
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

function mat4_perspective(out: Mat4, fovyRad: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1.0 / Math.tan(fovyRad / 2);
  const nf = 1 / (near - far);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = 2 * far * near * nf;
  out[15] = 0;
  return out;
}

function mat4_lookAt(out: Mat4, eye: [number, number, number], center: [number, number, number], up: [number, number, number]): Mat4 {
  let z0 = eye[0] - center[0];
  let z1 = eye[1] - center[1];
  let z2 = eye[2] - center[2];
  let len = Math.hypot(z0, z1, z2);
  if (len === 0) {
    z0 = 0; z1 = 0; z2 = 1;
  } else {
    z0 /= len; z1 /= len; z2 /= len;
  }

  let x0 = up[1] * z2 - up[2] * z1;
  let x1 = up[2] * z0 - up[0] * z2;
  let x2 = up[0] * z1 - up[1] * z0;
  len = Math.hypot(x0, x1, x2);
  if (len === 0) {
    x0 = 1; x1 = 0; x2 = 0;
  } else {
    x0 /= len; x1 /= len; x2 /= len;
  }

  const y0 = z1 * x2 - z2 * x1;
  const y1 = z2 * x0 - z0 * x2;
  const y2 = z0 * x1 - z1 * x0;

  out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
  out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
  out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
  out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
  out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
  out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
  out[15] = 1;
  return out;
}

function mat4_multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}

// Generate UV Sphere Geometry
function createSphereGeometry(radius: number, latBands: number, lonBands: number) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let lat = 0; lat <= latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= lonBands; lon++) {
      const phi = (lon * 2 * Math.PI) / lonBands;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = -sinTheta * cosPhi;
      const y = cosTheta;
      const z = sinTheta * sinPhi;
      const u = 1 - lon / lonBands;
      const v = 1 - lat / latBands;

      normals.push(x, y, z);
      uvs.push(u, v);
      positions.push(radius * x, radius * y, radius * z);
    }
  }

  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const first = lat * (lonBands + 1) + lon;
      const second = first + lonBands + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

// Compile Shader Helper
function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// Create Program Helper
function createProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram | null {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

export default function NativeWebGLGlobeView({
  departure,
  arrival,
  flightPath,
  currentWaypoint,
  currentTime,
  visualMode = 'animated',
  hideHeader = false,
  onCameraChange,
  syncCamera,
}: NativeWebGLGlobeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAutoTrack, setIsAutoTrack] = useState(false);

  // Camera Orbit State
  const cameraState = useRef({
    yaw: 0.8,
    pitch: 0.35,
    distance: 220,
    target: [0, 0, 0] as [number, number, number],
  });

  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // WebGL Context References
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const animFrameRef = useRef<number>(0);

  // Initialize WebGL Scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      console.error('Native WebGL not supported');
      return;
    }
    glRef.current = gl;

    // Enable depth test
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // 1. Earth Sphere Shaders: Animated Cel-Shaded vs Satellite
    const earthVS = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec2 aUv;

      uniform mat4 uMVP;
      uniform mat4 uModel;

      varying vec3 vNormal;
      varying vec2 vUv;

      void main() {
        vUv = aUv;
        vNormal = normalize((uModel * vec4(aNormal, 0.0)).xyz);
        gl_Position = uMVP * vec4(aPosition, 1.0);
      }
    `;

    // Satellite Fragment Shader
    const satFS = `
      precision mediump float;
      uniform sampler2D uDayTexture;
      uniform sampler2D uNightTexture;
      uniform vec3 uSunDirection;

      varying vec3 vNormal;
      varying vec2 vUv;

      void main() {
        vec3 n = normalize(vNormal);
        vec3 s = normalize(uSunDirection);
        float sunDot = dot(n, s);

        float dayFactor = smoothstep(-0.05, 0.05, sunDot);

        vec4 daySample = texture2D(uDayTexture, vUv);
        vec4 nightSample = texture2D(uNightTexture, vUv);

        float diffuse = clamp(sunDot, 0.0, 1.0);
        vec3 dayColor = daySample.rgb * (0.18 + 0.88 * diffuse);

        float rimZone = 1.0 - smoothstep(0.0, 0.05, abs(sunDot));
        vec3 sunsetRim = vec3(1.0, 0.55, 0.15) * (rimZone * 0.22);

        vec3 nightColor = nightSample.rgb * 1.5;
        vec3 finalColor = mix(nightColor, dayColor, dayFactor) + sunsetRim;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // Animated Cel-Shaded Fragment Shader: Solid vibrant continents & deep slate oceans (NO wireframe)
    const animFS = `
      precision mediump float;
      uniform sampler2D uDayTexture;
      uniform vec3 uSunDirection;

      varying vec3 vNormal;
      varying vec2 vUv;

      void main() {
        vec3 n = normalize(vNormal);
        vec3 s = normalize(uSunDirection);
        float sunDot = dot(n, s);

        // Realistic hemispherical solar illumination: exactly half daylight, half deep night shadow
        float dayFactor = smoothstep(-0.02, 0.02, sunDot);

        vec4 mapSample = texture2D(uDayTexture, vUv);

        // Solid vibrant emerald continents & deep slate oceans
        vec3 dayColor = mapSample.rgb * (0.35 + 0.65 * max(0.0, sunDot));
        vec3 nightColor = mapSample.rgb * 0.07 + vec3(0.01, 0.02, 0.04);

        // Cel-shaded solar terminator rim
        float rimZone = 1.0 - smoothstep(0.0, 0.03, abs(sunDot));
        vec3 sunsetRim = vec3(1.0, 0.6, 0.2) * (rimZone * 0.18);

        vec3 finalColor = mix(nightColor, dayColor, dayFactor) + sunsetRim;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const earthProg = createProgram(gl, earthVS, visualMode === 'animated' ? animFS : satFS);
    if (!earthProg) return;

    // Line / Solid Color Program for Flight Path Arc & Airliner
    const colorVS = `
      attribute vec3 aPosition;
      uniform mat4 uMVP;
      void main() {
        gl_Position = uMVP * vec4(aPosition, 1.0);
        gl_PointSize = 6.0;
      }
    `;
    const colorFS = `
      precision mediump float;
      uniform vec4 uColor;
      void main() {
        gl_FragColor = uColor;
      }
    `;
    const colorProg = createProgram(gl, colorVS, colorFS);
    if (!colorProg) return;

    // Create Sphere Mesh Buffers
    const sphereGeo = createSphereGeometry(GLOBE_RADIUS, 48, 48);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphereGeo.positions, gl.STATIC_DRAW);

    const normBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphereGeo.normals, gl.STATIC_DRAW);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphereGeo.uvs, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphereGeo.indices, gl.STATIC_DRAW);

    // Load Textures
    const dayTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, dayTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let nightTex: WebGLTexture | null = null;

    if (visualMode === 'animated') {
      const animCanvas = generateAnimatedEarthCanvas();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, animCanvas);
    } else {
      // Default placeholder pixel
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([10, 20, 40, 255]));

      const dayImg = new Image();
      dayImg.src = '/earth-blue-marble.jpg';
      dayImg.onload = () => {
        if (!glRef.current) return;
        gl.bindTexture(gl.TEXTURE_2D, dayTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, dayImg);
      };

      nightTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, nightTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

      const nightImg = new Image();
      nightImg.src = '/earth-night.jpg';
      nightImg.onload = () => {
        if (!glRef.current || !nightTex) return;
        gl.bindTexture(gl.TEXTURE_2D, nightTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nightImg);
      };
    }

    // Geodesic Flight Arc Buffer
    const arcBuffer = gl.createBuffer();
    const arcPoints: number[] = [];
    flightPath.forEach((pt, idx) => {
      const progress = idx / Math.max(1, flightPath.length - 1);
      const altOffset = 1.010 + 0.020 * Math.sin(progress * Math.PI);
      const [x, y, z] = latLonToVec3(pt.location.lat, pt.location.lon, GLOBE_RADIUS * altOffset);
      arcPoints.push(x, y, z);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, arcBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arcPoints), gl.STATIC_DRAW);

    // Initial camera framing
    const depPos = latLonToVec3(departure.latitude, departure.longitude, GLOBE_RADIUS);
    const arrPos = latLonToVec3(arrival.latitude, arrival.longitude, GLOBE_RADIUS);
    const midX = (depPos[0] + arrPos[0]) * 0.5;
    const midY = (depPos[1] + arrPos[1]) * 0.5;
    const midZ = (depPos[2] + arrPos[2]) * 0.5;
    cameraState.current.target = [midX * 0.2, midY * 0.2, midZ * 0.2];

    // Main 60 FPS Render Loop
    const projMat = mat4_create();
    const viewMat = mat4_create();
    const mvpMat = mat4_create();
    const modelMat = mat4_create();

    const render = () => {
      if (!canvas || !gl) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.015, 0.023, 0.05, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // Camera coordinates from spherical orbit
      const yaw = cameraState.current.yaw;
      const pitch = Math.max(-1.45, Math.min(1.45, cameraState.current.pitch));
      const dist = cameraState.current.distance;

      const eyeX = dist * Math.cos(pitch) * Math.sin(yaw);
      const eyeY = dist * Math.sin(pitch);
      const eyeZ = dist * Math.cos(pitch) * Math.cos(yaw);
      const eye: [number, number, number] = [eyeX, eyeY, eyeZ];

      mat4_perspective(projMat, (45 * Math.PI) / 180, gl.canvas.width / gl.canvas.height, 1, 3000);
      mat4_lookAt(viewMat, eye, cameraState.current.target, [0, 1, 0]);
      mat4_multiply(mvpMat, projMat, viewMat);

      // 1. Draw Earth Sphere
      gl.useProgram(earthProg);

      const aPosLoc = gl.getAttribLocation(earthProg, 'aPosition');
      const aNormLoc = gl.getAttribLocation(earthProg, 'aNormal');
      const aUvLoc = gl.getAttribLocation(earthProg, 'aUv');
      const uMVPLoc = gl.getUniformLocation(earthProg, 'uMVP');
      const uModelLoc = gl.getUniformLocation(earthProg, 'uModel');
      const uSunDirLoc = gl.getUniformLocation(earthProg, 'uSunDirection');
      const uDayTexLoc = gl.getUniformLocation(earthProg, 'uDayTexture');
      const uNightTexLoc = gl.getUniformLocation(earthProg, 'uNightTexture');

      // Bind Sphere Attributes
      gl.enableVertexAttribArray(aPosLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.vertexAttribPointer(aPosLoc, 3, gl.FLOAT, false, 0, 0);

      gl.enableVertexAttribArray(aNormLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
      gl.vertexAttribPointer(aNormLoc, 3, gl.FLOAT, false, 0, 0);

      gl.enableVertexAttribArray(aUvLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.vertexAttribPointer(aUvLoc, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

      // Calculate Astronomical Sun Vector
      const subsolar = getSubsolarPoint(currentTime);
      const [sunX, sunY, sunZ] = latLonToVec3(subsolar.lat, subsolar.lon, 1.0);
      const sunLen = Math.hypot(sunX, sunY, sunZ) || 1;

      gl.uniformMatrix4fv(uMVPLoc, false, mvpMat);
      gl.uniformMatrix4fv(uModelLoc, false, modelMat);
      gl.uniform3f(uSunDirLoc, sunX / sunLen, sunY / sunLen, sunZ / sunLen);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dayTex);
      gl.uniform1i(uDayTexLoc, 0);

      if (visualMode === 'satellite' && nightTex) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, nightTex);
        gl.uniform1i(uNightTexLoc, 1);
      }

      gl.drawElements(gl.TRIANGLES, sphereGeo.indices.length, gl.UNSIGNED_SHORT, 0);

      // 2. Draw 3D Geodesic Flight Path Great Circle Arc
      if (arcPoints.length >= 6) {
        gl.useProgram(colorProg);
        const cPosLoc = gl.getAttribLocation(colorProg, 'aPosition');
        const cMVPLoc = gl.getUniformLocation(colorProg, 'uMVP');
        const cColorLoc = gl.getUniformLocation(colorProg, 'uColor');

        gl.uniformMatrix4fv(cMVPLoc, false, mvpMat);
        gl.uniform4f(cColorLoc, 0.22, 0.74, 0.97, 0.9); // Cabin Cyan #38bdf8

        gl.enableVertexAttribArray(cPosLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, arcBuffer);
        gl.vertexAttribPointer(cPosLoc, 3, gl.FLOAT, false, 0, 0);
        gl.lineWidth(3.0);
        gl.drawArrays(gl.LINE_STRIP, 0, arcPoints.length / 3);

        // 3. Draw Subsolar Zenith Marker Orb (Solar Amber)
        const [subX, subY, subZ] = latLonToVec3(subsolar.lat, subsolar.lon, GLOBE_RADIUS * 1.006);
        const sunMarkerBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, sunMarkerBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([subX, subY, subZ]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(cPosLoc, 3, gl.FLOAT, false, 0, 0);
        gl.uniform4f(cColorLoc, 0.98, 0.75, 0.14, 1.0); // #fbbf24
        gl.drawArrays(gl.POINTS, 0, 1);
        gl.deleteBuffer(sunMarkerBuffer);

        // 4. Draw Departure (Amber) and Arrival (Emerald) Airport Markers
        const depMarker = latLonToVec3(departure.latitude, departure.longitude, GLOBE_RADIUS * 1.004);
        const arrMarker = latLonToVec3(arrival.latitude, arrival.longitude, GLOBE_RADIUS * 1.004);
        const beaconsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, beaconsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...depMarker, ...arrMarker]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(cPosLoc, 3, gl.FLOAT, false, 0, 0);

        gl.uniform4f(cColorLoc, 0.96, 0.62, 0.04, 1.0); // Departure Amber #f59e0b
        gl.drawArrays(gl.POINTS, 0, 1);

        gl.uniform4f(cColorLoc, 0.06, 0.72, 0.51, 1.0); // Arrival Emerald #10b981
        gl.drawArrays(gl.POINTS, 1, 1);
        gl.deleteBuffer(beaconsBuffer);

        // 5. Draw Low-Poly Supersonic Airliner Marker at Current Waypoint
        const currentPt = currentWaypoint || flightPath[0];
        if (currentPt) {
          const progress = flightPath.findIndex((p) => p === currentPt) / Math.max(1, flightPath.length - 1);
          const altOffset = 1.010 + 0.020 * Math.sin(Math.max(0, progress) * Math.PI);
          const [acX, acY, acZ] = latLonToVec3(currentPt.location.lat, currentPt.location.lon, GLOBE_RADIUS * altOffset);

          // Build low-poly delta supersonic airliner vertices
          const planeBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, planeBuffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
              acX, acY, acZ,
              acX + 1.2, acY + 0.8, acZ,
              acX - 1.2, acY - 0.8, acZ,
            ]),
            gl.STATIC_DRAW
          );
          gl.vertexAttribPointer(cPosLoc, 3, gl.FLOAT, false, 0, 0);
          gl.uniform4f(cColorLoc, 1.0, 1.0, 1.0, 1.0);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          gl.deleteBuffer(planeBuffer);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    // Mouse / Touch Orbit Controls
    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      cameraState.current.yaw += dx * 0.007;
      cameraState.current.pitch += dy * 0.007;

      if (onCameraChange) {
        const yaw = cameraState.current.yaw;
        const pitch = cameraState.current.pitch;
        const dist = cameraState.current.distance;
        onCameraChange({
          x: dist * Math.cos(pitch) * Math.sin(yaw),
          y: dist * Math.sin(pitch),
          z: dist * Math.cos(pitch) * Math.cos(yaw),
          targetX: cameraState.current.target[0],
          targetY: cameraState.current.target[1],
          targetZ: cameraState.current.target[2],
        });
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraState.current.distance = Math.max(110, Math.min(450, cameraState.current.distance + e.deltaY * 0.15));

      if (onCameraChange) {
        const yaw = cameraState.current.yaw;
        const pitch = cameraState.current.pitch;
        const dist = cameraState.current.distance;
        onCameraChange({
          x: dist * Math.cos(pitch) * Math.sin(yaw),
          y: dist * Math.sin(pitch),
          z: dist * Math.cos(pitch) * Math.cos(yaw),
          targetX: cameraState.current.target[0],
          targetY: cameraState.current.target[1],
          targetZ: cameraState.current.target[2],
        });
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);

      gl.deleteBuffer(posBuffer);
      gl.deleteBuffer(normBuffer);
      gl.deleteBuffer(uvBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteBuffer(arcBuffer);
      gl.deleteTexture(dayTex);
      if (nightTex) gl.deleteTexture(nightTex);
      gl.deleteProgram(earthProg);
      gl.deleteProgram(colorProg);
    };
  }, [departure, arrival, flightPath, currentWaypoint, currentTime, visualMode, onCameraChange]);

  // Synchronize camera from external master state (for Live Comparison mode)
  useEffect(() => {
    if (!syncCamera) return;
    const dist = Math.hypot(syncCamera.x, syncCamera.y, syncCamera.z);
    if (dist > 10) {
      cameraState.current.distance = dist;
      cameraState.current.pitch = Math.asin(Math.max(-1, Math.min(1, syncCamera.y / dist)));
      cameraState.current.yaw = Math.atan2(syncCamera.x, syncCamera.z);
      cameraState.current.target = [syncCamera.targetX, syncCamera.targetY, syncCamera.targetZ];
    }
  }, [syncCamera]);

  // Frame route handler
  const handleResetRoute = useCallback(() => {
    const depPos = latLonToVec3(departure.latitude, departure.longitude, GLOBE_RADIUS);
    const arrPos = latLonToVec3(arrival.latitude, arrival.longitude, GLOBE_RADIUS);
    const midX = (depPos[0] + arrPos[0]) * 0.5;
    const midY = (depPos[1] + arrPos[1]) * 0.5;
    const midZ = (depPos[2] + arrPos[2]) * 0.5;

    cameraState.current.target = [midX * 0.2, midY * 0.2, midZ * 0.2];
    cameraState.current.distance = GLOBE_RADIUS * 2.1;
    cameraState.current.yaw = Math.atan2(midX, midZ);
    cameraState.current.pitch = 0.35;
    setIsAutoTrack(false);
  }, [departure, arrival]);

  return (
    <div className="cockpit-card rounded-xl border border-[var(--cockpit-border)] relative overflow-hidden flex flex-col shadow-2xl">
      {/* WebGL Viewport Header Bar */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--cockpit-border)] bg-zinc-950/85 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--cabin-cyan)] animate-pulse" />
            <span className="text-xs font-mono-numbers font-bold uppercase tracking-wider text-white">
              3D EARTH GLOBE HUD [PURE WEBGL]
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-[var(--cabin-cyan)] font-mono-numbers font-medium">
              {visualMode === 'animated' ? 'CEL-SHADED SOLID CONTINENTS' : 'NASA SATELLITE CARTOGRAPHY'}
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
              onClick={handleResetRoute}
              className="px-2.5 py-1 rounded text-[11px] font-mono-numbers font-medium bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-[var(--cockpit-border)] transition-colors"
            >
              [FRAME ROUTE]
            </button>
          </div>
        </div>
      )}

      {/* WebGL Canvas Container */}
      <canvas
        ref={canvasRef}
        className="w-full h-[360px] sm:h-[440px] lg:h-[480px] block cursor-grab active:cursor-grabbing bg-[#04060d]"
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
          GL PIPELINE: DIRECT SHADERS | ORBIT: DRAG TO ROTATE
        </div>
      </div>
    </div>
  );
}
