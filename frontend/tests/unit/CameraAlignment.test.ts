import { describe, it, expect } from 'vitest';
import { CameraAlignment } from '../../src/lib/vision/CameraAlignment';

describe('Kamera-Ausrichtung / Homographie (REQ-CAM-03)', () => {
  it('correctly calculates homography matrix for simple translation', () => {
    // 4 source points (e.g. pixels)
    const src = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ];

    // 4 dest points (e.g. machine mm) shifted by +10, +10
    const dest = [
      { x: 10, y: 10 },
      { x: 110, y: 10 },
      { x: 110, y: 110 },
      { x: 10, y: 110 }
    ];

    const H = CameraAlignment.computeHomography(src, dest);
    expect(H).toBeDefined();
    expect(H.length).toBe(9);

    // Verify projection of point (50, 50) -> should be (60, 60)
    const pMapped = CameraAlignment.transformPoint(50, 50, H);
    expect(pMapped.x).toBeCloseTo(60, 2);
    expect(pMapped.y).toBeCloseTo(60, 2);
  });

  it('correctly calculates perspective warp projection', () => {
    // Distorted trapezoid in camera space
    const src = [
      { x: 20, y: 20 },
      { x: 80, y: 15 },
      { x: 90, y: 85 },
      { x: 10, y: 80 }
    ];

    // Target perfect orthographic square on machine bed
    const dest = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ];

    const H = CameraAlignment.computeHomography(src, dest);

    // Corner mapping verification
    for (let i = 0; i < 4; i++) {
      const pMapped = CameraAlignment.transformPoint(src[i].x, src[i].y, H);
      expect(pMapped.x).toBeCloseTo(dest[i].x, 2);
      expect(pMapped.y).toBeCloseTo(dest[i].y, 2);
    }
  });
});
