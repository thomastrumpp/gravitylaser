import { describe, it, expect } from 'vitest';
import { TaperWarpService, type TaperConfig, type BarrelConfig } from '../../src/lib/services/TaperWarpService';

describe('TaperWarpService', () => {
  describe('Taper Warp (Conical Surface Mapping)', () => {
    it('does not move the center point', () => {
      const config: TaperConfig = {
        topRadius: 25,
        bottomRadius: 25,
        height: 100,
        centerX: 50,
        centerY: 50,
      };

      const result = TaperWarpService.applyTaperWarp([[50, 50]], config);
      expect(result[0][0]).toBeCloseTo(50, 3);
      expect(result[0][1]).toBeCloseTo(50, 3);
    });

    it('compresses X coordinates toward the edges for a cylinder', () => {
      const config: TaperConfig = {
        topRadius: 20,
        bottomRadius: 20,
        height: 100,
        centerX: 50,
        centerY: 50,
      };

      const points: [number, number][] = [
        [30, 50],  // 20mm left of center
        [50, 50],  // center
        [70, 50],  // 20mm right of center
      ];

      const result = TaperWarpService.applyTaperWarp(points, config);

      // Center should be unchanged
      expect(result[1][0]).toBeCloseTo(50, 3);

      // Left point: sin(angle) < angle, so warped X should be closer to center
      const leftOffset = Math.abs(result[0][0] - 50);
      expect(leftOffset).toBeLessThan(20); // Should be compressed

      // Symmetric: left and right offsets should be equal magnitude
      const rightOffset = Math.abs(result[2][0] - 50);
      expect(leftOffset).toBeCloseTo(rightOffset, 3);
    });

    it('produces identity warp for a very large radius (flat surface)', () => {
      const config: TaperConfig = {
        topRadius: 100000,
        bottomRadius: 100000,
        height: 100,
        centerX: 50,
        centerY: 50,
      };

      const points: [number, number][] = [[30, 50], [50, 50], [70, 50]];
      const result = TaperWarpService.applyTaperWarp(points, config);

      // For very large radius, sin(angle) ≈ angle, so coordinates should be nearly unchanged
      expect(result[0][0]).toBeCloseTo(30, 1);
      expect(result[2][0]).toBeCloseTo(70, 1);
    });
  });

  describe('Barrel/Pincushion Correction', () => {
    it('does not move the center point', () => {
      const config: BarrelConfig = {
        k1: 0.3,
        centerX: 50,
        centerY: 50,
        maxRadius: 70,
      };

      const result = TaperWarpService.applyBarrelCorrection([[50, 50]], config);
      expect(result[0][0]).toBeCloseTo(50, 5);
      expect(result[0][1]).toBeCloseTo(50, 5);
    });

    it('expands coordinates for positive k1 (barrel)', () => {
      const config: BarrelConfig = {
        k1: 0.5,
        centerX: 50,
        centerY: 50,
        maxRadius: 50,
      };

      const result = TaperWarpService.applyBarrelCorrection([[70, 50]], config);
      // k1 > 0: points move further from center
      expect(result[0][0]).toBeGreaterThan(70);
    });

    it('contracts coordinates for negative k1 (pincushion)', () => {
      const config: BarrelConfig = {
        k1: -0.5,
        centerX: 50,
        centerY: 50,
        maxRadius: 50,
      };

      const result = TaperWarpService.applyBarrelCorrection([[70, 50]], config);
      // k1 < 0: points move closer to center
      expect(result[0][0]).toBeLessThan(70);
    });
  });

  describe('Z Compensation', () => {
    it('returns zero Z at the center', () => {
      const config: TaperConfig = {
        topRadius: 25,
        bottomRadius: 25,
        height: 100,
        centerX: 50,
        centerY: 50,
      };

      const zValues = TaperWarpService.computeZCompensation([[50, 50]], config);
      expect(zValues[0]).toBeCloseTo(0, 5);
    });

    it('returns positive Z offset away from center', () => {
      const config: TaperConfig = {
        topRadius: 25,
        bottomRadius: 25,
        height: 100,
        centerX: 50,
        centerY: 50,
      };

      const zValues = TaperWarpService.computeZCompensation([[60, 50]], config);
      expect(zValues[0]).toBeGreaterThan(0);
    });
  });

  describe('Inverse Taper Warp', () => {
    it('round-trips center point through forward and inverse warp', () => {
      const config: TaperConfig = {
        topRadius: 30,
        bottomRadius: 30,
        height: 80,
        centerX: 50,
        centerY: 50,
      };

      const warped = TaperWarpService.applyTaperWarp([[50, 50]], config);
      const recovered = TaperWarpService.inverseTaperWarp(warped, config);

      expect(recovered[0][0]).toBeCloseTo(50, 3);
      expect(recovered[0][1]).toBeCloseTo(50, 3);
    });

    it('approximately round-trips off-center points', () => {
      const config: TaperConfig = {
        topRadius: 30,
        bottomRadius: 30,
        height: 80,
        centerX: 50,
        centerY: 50,
      };

      const original: [number, number][] = [[40, 50], [55, 50], [60, 50]];
      const warped = TaperWarpService.applyTaperWarp(original, config);
      const recovered = TaperWarpService.inverseTaperWarp(warped, config);

      for (let i = 0; i < original.length; i++) {
        expect(recovered[i][0]).toBeCloseTo(original[i][0], 1);
        expect(recovered[i][1]).toBeCloseTo(original[i][1], 1);
      }
    });
  });
});
