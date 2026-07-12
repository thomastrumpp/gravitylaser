import { describe, it, expect } from 'vitest';
import { gcodeGen } from '../../src/lib/gcode/GcodeGenerator';

describe('Image Masking (REQ-OPT-05)', () => {
  it('correctly clips raster G-code to mask boundaries when clipPath is specified', () => {
    const maskRect = {
      id: 'mask_rect',
      type: 'rect',
      left: 0,
      top: 0,
      width: 50,
      height: 100,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      layerId: 'C00'
    };

    const imgObj = {
      id: 'img1',
      type: 'image',
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      layerId: 'C00',
      imageSrc: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQImWNk+M/wH0jDgHEg4wAARwwD/1z752MAAAAASUVORK5CYII=', // tiny 2x2 png
      imageMode: 'grayscale' as const,
      clipPath: maskRect
    };

    const gcode = gcodeGen.generate([imgObj]);
    const lines = gcode.split('\n');
    let inRaster = false;
    const activeScanXValues: number[] = [];

    for (const line of lines) {
      if (line.includes('Start Raster Image scan')) {
        inRaster = true;
        continue;
      }
      if (line.includes('GravityLaser G-Code Footer')) {
        break;
      }
      if (inRaster && line.startsWith('G1')) {
        // Only check lines where the laser is actually firing (S > 0)
        // Overscan moves have S0 (laser off) and naturally extend past boundaries.
        const sMatch = line.match(/S(\d+)/);
        if (sMatch && parseInt(sMatch[1]) > 0) {
          const xMatch = line.match(/X([\d.]+)/);
          if (xMatch) {
            activeScanXValues.push(parseFloat(xMatch[1]));
          }
        }
      }
    }

    console.log("Engraving X values (laser active):", activeScanXValues);

    expect(activeScanXValues.length).toBeGreaterThan(0);
    for (const x of activeScanXValues) {
      // Engraving must be strictly within the mask (X: 0 to 50)
      expect(x).toBeLessThanOrEqual(50.05);
    }
  });
});
