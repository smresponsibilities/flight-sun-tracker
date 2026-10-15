/**
 * Animated Cel-Shaded Earth Texture Generator
 * Generates a high-contrast equirectangular texture for stylized 3D Earth rendering:
 * - Solid vibrant emerald continents (#10b981)
 * - Deep slate oceans (#0f172a)
 * - Zero wireframe vector lines
 * - Equirectangular UV mapping (2048x1024)
 */

import { CONTINENTS } from './worldLand';

// Additional islands and detailed landmasses to enrich the stylized animated earth
export const EXPANDED_LANDMASSES: [number, number][][] = [
  ...CONTINENTS,
  // Antarctica
  [
    [-180, -78], [-140, -75], [-100, -72], [-80, -74], [-60, -64], [-55, -64],
    [-60, -75], [-20, -72], [20, -69], [60, -67], [90, -66], [120, -66],
    [140, -68], [160, -71], [180, -78], [180, -90], [-180, -90], [-180, -78]
  ],
  // New Zealand North Island
  [
    [173, -35], [175, -37], [178, -38], [177, -40], [175, -41], [173, -40], [174, -36], [173, -35]
  ],
  // New Zealand South Island
  [
    [167, -45], [170, -43], [174, -41], [173, -43], [170, -46], [167, -46], [167, -45]
  ],
  // Iceland
  [
    [-24, 64], [-22, 66], [-14, 66], [-14, 64], [-18, 63], [-24, 64]
  ],
  // Indonesia / Sumatra / Java / Borneo
  [
    [95, 5], [100, 0], [105, -5], [103, -5], [98, -1], [95, 5]
  ],
  [
    [106, -6], [114, -8], [114, -7], [106, -6]
  ],
  [
    [109, 1], [117, 4], [118, -3], [111, -3], [109, 1]
  ],
  // Philippines
  [
    [120, 18], [122, 14], [126, 8], [122, 7], [120, 13], [120, 18]
  ],
  // Caribbean - Cuba / Hispaniola
  [
    [-84, 22], [-76, 21], [-74, 20], [-80, 22], [-84, 22]
  ],
  [
    [-74, 19], [-69, 19], [-69, 18], [-74, 18], [-74, 19]
  ]
];

let cachedCanvas: HTMLCanvasElement | null = null;
let cachedDataUrl: string | null = null;

export function generateAnimatedEarthCanvas(): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    // Return dummy canvas for SSR safety
    return {} as HTMLCanvasElement;
  }

  if (cachedCanvas) {
    return cachedCanvas;
  }

  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return canvas;

  // 1. Deep Slate Ocean background (#0f172a)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // Subtle ocean bathymetry shelf tint around continents
  ctx.fillStyle = '#1e293b';
  EXPANDED_LANDMASSES.forEach((poly) => {
    if (poly.length < 2) return;
    ctx.beginPath();
    const firstX = ((poly[0][0] + 180) / 360) * width;
    const firstY = ((90 - poly[0][1]) / 180) * height;
    ctx.moveTo(firstX, firstY);
    for (let i = 1; i < poly.length; i++) {
      const x = ((poly[i][0] + 180) / 360) * width;
      const y = ((90 - poly[i][1]) / 180) * height;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();
  });

  // 2. Solid Vibrant Emerald Continents (#10b981)
  ctx.fillStyle = '#10b981';
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2.5;

  EXPANDED_LANDMASSES.forEach((poly) => {
    if (poly.length < 2) return;
    ctx.beginPath();
    const firstX = ((poly[0][0] + 180) / 360) * width;
    const firstY = ((90 - poly[0][1]) / 180) * height;
    ctx.moveTo(firstX, firstY);
    for (let i = 1; i < poly.length; i++) {
      const x = ((poly[i][0] + 180) / 360) * width;
      const y = ((90 - poly[i][1]) / 180) * height;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // 3. Stylized Topography & Biome Accent (Cel-shaded continental core)
  ctx.fillStyle = '#059669';
  EXPANDED_LANDMASSES.forEach((poly) => {
    if (poly.length < 5) return;
    ctx.save();
    ctx.beginPath();
    // Inset polygon slightly toward center
    let avgLon = 0;
    let avgLat = 0;
    poly.forEach(([lon, lat]) => {
      avgLon += lon;
      avgLat += lat;
    });
    avgLon /= poly.length;
    avgLat /= poly.length;

    const scale = 0.75;
    const p0Lon = avgLon + (poly[0][0] - avgLon) * scale;
    const p0Lat = avgLat + (poly[0][1] - avgLat) * scale;
    const firstX = ((p0Lon + 180) / 360) * width;
    const firstY = ((90 - p0Lat) / 180) * height;
    ctx.moveTo(firstX, firstY);

    for (let i = 1; i < poly.length; i++) {
      const pLon = avgLon + (poly[i][0] - avgLon) * scale;
      const pLat = avgLat + (poly[i][1] - avgLat) * scale;
      const x = ((pLon + 180) / 360) * width;
      const y = ((90 - pLat) / 180) * height;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  cachedCanvas = canvas;
  return canvas;
}

export function getAnimatedEarthDataUrl(): string {
  if (cachedDataUrl) return cachedDataUrl;
  const canvas = generateAnimatedEarthCanvas();
  if (canvas && typeof canvas.toDataURL === 'function') {
    cachedDataUrl = canvas.toDataURL('image/png');
    return cachedDataUrl;
  }
  return '';
}
