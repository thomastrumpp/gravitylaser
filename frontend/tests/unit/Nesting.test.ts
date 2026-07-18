import { describe, it, expect } from 'vitest';
import { NestingService, NestingOptions } from '../../src/lib/services/NestingService';

describe('Nesting / Verschachtelung (REQ-NST-01, REQ-NST-02, REQ-NST-03, REQ-NST-04)', () => {
  it('correctly nests simple independent shapes using MaxRects', () => {
    // 3 small rectangles to pack inside a 100x100 space
    const mockObjects = [
      {
        id: 'rect1',
        width: 30,
        height: 20,
        scaleX: 1,
        scaleY: 1,
        left: 0,
        top: 0,
        angle: 0,
        get: (key: string) => null
      },
      {
        id: 'rect2',
        width: 30,
        height: 20,
        scaleX: 1,
        scaleY: 1,
        left: 50,
        top: 50,
        angle: 0,
        get: (key: string) => null
      },
      {
        id: 'rect3',
        width: 10,
        height: 10,
        scaleX: 1,
        scaleY: 1,
        left: 90,
        top: 90,
        angle: 0,
        get: (key: string) => null
      }
    ];

    const options: NestingOptions = {
      padding: 2,
      edgeBuffer: 5,
      allowRotation: false,
      lockInnerObjects: false
    };

    const result = NestingService.nest(mockObjects, 100, 100, options);
    expect(result.packedCount).toBe(3);
    expect(result.moved.length).toBe(3);

    // Verify all packed items are placed inside the workspace bounds (edgeBuffer=5)
    result.moved.forEach(move => {
      const orig = mockObjects.find(o => o.id === move.id)!;
      expect(move.x).toBeGreaterThanOrEqual(5);
      expect(move.y).toBeGreaterThanOrEqual(5);
      expect(move.x + orig.width).toBeLessThanOrEqual(95);
      expect(move.y + orig.height).toBeLessThanOrEqual(95);
    });
  });

  it('verifies that items respect padding distance constraints (REQ-NST-02)', () => {
    const mockObjects = [
      {
        id: 'obj1',
        width: 20,
        height: 20,
        scaleX: 1,
        scaleY: 1,
        left: 0,
        top: 0,
        angle: 0,
        get: (key: string) => null
      },
      {
        id: 'obj2',
        width: 20,
        height: 20,
        scaleX: 1,
        scaleY: 1,
        left: 40,
        top: 40,
        angle: 0,
        get: (key: string) => null
      }
    ];

    const padding = 10; // High padding to test spacing
    const options: NestingOptions = {
      padding,
      edgeBuffer: 0,
      allowRotation: false,
      lockInnerObjects: false
    };

    const result = NestingService.nest(mockObjects, 100, 100, options);
    expect(result.packedCount).toBe(2);

    const m1 = result.moved.find(m => m.id === 'obj1')!;
    const m2 = result.moved.find(m => m.id === 'obj2')!;

    // Check distance in 2D
    const dx = Math.abs((m1.x + 10) - (m2.x + 10)); // Centers
    const dy = Math.abs((m1.y + 10) - (m2.y + 10));

    // Distance between shapes: if separated horizontally or vertically
    const horizontalGap = Math.abs(m1.x - m2.x) - 20;
    const verticalGap = Math.abs(m1.y - m2.y) - 20;

    const maxGap = Math.max(horizontalGap, verticalGap);
    expect(maxGap).toBeGreaterThanOrEqual(padding - 0.001);
  });

  it('groups overlapping shapes to preserve parent-child topology (REQ-NST-03)', () => {
    // Two overlapping shapes (e.g. circle inside square)
    const mockObjects = [
      {
        id: 'outer',
        width: 40,
        height: 40,
        scaleX: 1,
        scaleY: 1,
        left: 0,
        top: 0,
        angle: 0,
        get: (key: string) => null
      },
      {
        id: 'inner',
        width: 10,
        height: 10,
        scaleX: 1,
        scaleY: 1,
        left: 15, // centered inside outer
        top: 15,
        angle: 0,
        get: (key: string) => null
      }
    ];

    const options: NestingOptions = {
      padding: 2,
      edgeBuffer: 0,
      allowRotation: false,
      lockInnerObjects: true // topology locking active
    };

    const result = NestingService.nest(mockObjects, 100, 100, options);
    expect(result.packedCount).toBe(1); // packed together as 1 group
    expect(result.moved.length).toBe(2);

    const mOuter = result.moved.find(m => m.id === 'outer')!;
    const mInner = result.moved.find(m => m.id === 'inner')!;

    // Verify relative position is preserved
    const dx_orig = 15 - 0;
    const dy_orig = 15 - 0;

    const dx_new = (mInner.x - 10 / 2) - (mOuter.x - 40 / 2);
    const dy_new = (mInner.y - 10 / 2) - (mOuter.y - 40 / 2);

    expect(dx_new).toBeCloseTo(dx_orig, 2);
    expect(dy_new).toBeCloseTo(dy_orig, 2);
  });

  it('honors rotation constraints (REQ-NST-04)', () => {
    const mockObjects = [
      {
        id: 'non_rotatable',
        width: 50,
        height: 10,
        scaleX: 1,
        scaleY: 1,
        left: 0,
        top: 0,
        angle: 0,
        get: (key: string) => {
          if (key === 'data') return { lockRotation: true }; // Rotation explicitly locked on object
          return null;
        }
      }
    ];

    const options: NestingOptions = {
      padding: 0,
      edgeBuffer: 0,
      allowRotation: true, // global allowed, but local is locked!
      lockInnerObjects: false
    };

    const result = NestingService.nest(mockObjects, 100, 100, options);
    expect(result.moved[0].angle).toBe(0); // must remain 0!
  });
});
