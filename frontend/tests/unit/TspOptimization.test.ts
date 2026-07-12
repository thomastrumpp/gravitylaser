import { describe, it, expect } from 'vitest';
import { gcodeGen } from '../../src/lib/gcode/GcodeGenerator';

describe('2-Opt TSP Optimization (REQ-OPT-02 Extension)', () => {
  it('improves/shortens a sub-optimal crossed path tour', () => {
    // 4 points forming a square but ordered in a crossed path:
    // A(0,0) -> C(10,10) -> B(10,0) -> D(0,10)
    // The travel path crosses in the middle.
    // Uncrossed tour should be A(0,0) -> B(10,0) -> C(10,10) -> D(0,10) or similar.
    const objects = [
      { id: 'A', left: 0, top: 0, width: 2, height: 2, scaleX: 1, scaleY: 1, angle: 0, type: 'rect', layerId: 'C00' },
      { id: 'C', left: 10, top: 10, width: 2, height: 2, scaleX: 1, scaleY: 1, angle: 0, type: 'rect', layerId: 'C00' },
      { id: 'B', left: 10, top: 0, width: 2, height: 2, scaleX: 1, scaleY: 1, angle: 0, type: 'rect', layerId: 'C00' },
      { id: 'D', left: 0, top: 10, width: 2, height: 2, scaleX: 1, scaleY: 1, angle: 0, type: 'rect', layerId: 'C00' }
    ];

    // Helper to calculate total tour distance squared
    const getTourDistance = (arr: any[], startX: number, startY: number): number => {
      let d = (arr[0].left - startX) ** 2 + (arr[0].top - startY) ** 2;
      for (let i = 0; i < arr.length - 1; i++) {
        d += (arr[i + 1].left - arr[i].left) ** 2 + (arr[i + 1].top - arr[i].top) ** 2;
      }
      return d;
    };

    const initialDistance = getTourDistance(objects, 0, 0);

    // Call private optimizeTour2Opt via casting
    const optimized = (gcodeGen as any).optimizeTour2Opt(objects, 0, 0);

    const optimizedDistance = getTourDistance(optimized, 0, 0);

    // Optimized distance should be strictly smaller than the crossed initial distance
    expect(optimizedDistance).toBeLessThan(initialDistance);
    
    // Total nodes in tour must remain 4
    expect(optimized).toHaveLength(4);
    
    // Set of nodes must remain identical (A, B, C, D)
    const ids = optimized.map((o: any) => o.id);
    expect(ids).toContain('A');
    expect(ids).toContain('B');
    expect(ids).toContain('C');
    expect(ids).toContain('D');
  });

  it('bypasses optimization if tour length is less than 4', () => {
    const objects = [
      { id: 'A', left: 0, top: 0, width: 2, height: 2, scaleX: 1, scaleY: 1, angle: 0, type: 'rect', layerId: 'C00' },
      { id: 'B', left: 10, top: 0, width: 2, height: 2, scaleX: 1, scaleY: 1, angle: 0, type: 'rect', layerId: 'C00' }
    ];

    const optimized = (gcodeGen as any).optimizeTour2Opt(objects, 0, 0);
    expect(optimized).toEqual(objects);
  });

  it('bypasses optimization if tour length is greater than 500', () => {
    // Generate 501 objects
    const objects = [];
    for (let i = 0; i < 501; i++) {
      objects.push({
        id: `obj_${i}`,
        left: i,
        top: i,
        width: 1,
        height: 1,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        type: 'rect',
        layerId: 'C00'
      });
    }

    const optimized = (gcodeGen as any).optimizeTour2Opt(objects, 0, 0);
    expect(optimized).toEqual(objects);
  });
});
