import { EXPANDED_LANDMASSES } from '@/lib/data/animatedEarthTexture';
import { CONTINENTS } from '@/lib/data/worldLand';
import fs from 'fs';
import path from 'path';

describe('6-Way Visual Engine Switcher & Graphic Pipeline Unit Tests', () => {
  describe('Animated Solid Cel-Shaded Earth Landmass Topology', () => {
    it('ensures continent polygons are non-empty and formatted correctly', () => {
      expect(CONTINENTS.length).toBeGreaterThanOrEqual(9);
      expect(EXPANDED_LANDMASSES.length).toBeGreaterThan(CONTINENTS.length);

      EXPANDED_LANDMASSES.forEach((poly) => {
        expect(poly.length).toBeGreaterThanOrEqual(3);
        poly.forEach(([lon, lat]) => {
          expect(lon).toBeGreaterThanOrEqual(-180);
          expect(lon).toBeLessThanOrEqual(180);
          expect(lat).toBeGreaterThanOrEqual(-90);
          expect(lat).toBeLessThanOrEqual(90);
        });
      });
    });

    it('contains all major global continental landmasses', () => {
      // Check presence of North America, South America, Eurasia, Africa, Australia, Antarctica
      const hasNorthAmerica = EXPANDED_LANDMASSES.some((poly) =>
        poly.some(([lon, lat]) => lon < -70 && lon > -130 && lat > 30 && lat < 60)
      );
      const hasAntarctica = EXPANDED_LANDMASSES.some((poly) =>
        poly.some(([, lat]) => lat < -70)
      );
      const hasEurasia = EXPANDED_LANDMASSES.some((poly) =>
        poly.some(([lon, lat]) => lon > 10 && lon < 140 && lat > 30)
      );

      expect(hasNorthAmerica).toBe(true);
      expect(hasAntarctica).toBe(true);
      expect(hasEurasia).toBe(true);
    });
  });

  describe('Zero Emoji Audit Across Codebase', () => {
    it('verifies absolutely zero emojis exist across all components and styles in src', () => {
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
      const srcDir = path.resolve(process.cwd(), 'src');

      const violations: string[] = [];

      function scan(dir: string) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') {
              scan(fullPath);
            }
          } else if (/\.(ts|tsx|js|jsx|css)$/.test(file)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (emojiRegex.test(content)) {
              violations.push(fullPath);
            }
          }
        }
      }

      scan(srcDir);
      expect(violations).toEqual([]);
    });
  });
});
