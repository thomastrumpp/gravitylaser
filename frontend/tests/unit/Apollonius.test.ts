import { describe, it, expect } from 'vitest';
import { ApolloniusSolver, type Circle } from '../../src/lib/services/ApolloniusSolver';

describe('ApolloniusSolver', () => {
  it('finds valid tangent circles for three non-overlapping circles', () => {
    const c1: Circle = { x: 0, y: 0, r: 1 };
    const c2: Circle = { x: 4, y: 0, r: 1 };
    const c3: Circle = { x: 2, y: 3, r: 1 };

    const solutions = ApolloniusSolver.solve(c1, c2, c3);

    // Should find at least one valid solution
    expect(solutions.length).toBeGreaterThan(0);

    // All solutions must have non-negative radius
    for (const sol of solutions) {
      expect(sol.r).toBeGreaterThanOrEqual(0);
    }

    // All returned solutions must be tangent to all three circles
    for (const sol of solutions) {
      for (const c of [c1, c2, c3]) {
        const dist = Math.sqrt((sol.x - c.x) ** 2 + (sol.y - c.y) ** 2);
        const externalTangent = Math.abs(dist - (sol.r + c.r));
        const internalTangent = Math.abs(dist - Math.abs(sol.r - c.r));
        const isTangent = externalTangent < 0.05 || internalTangent < 0.05;
        expect(isTangent).toBe(true);
      }
    }
  });

  it('finds circumscribed circle for three points (zero-radius circles)', () => {
    const p1: Circle = { x: 0, y: 0, r: 0 };
    const p2: Circle = { x: 4, y: 0, r: 0 };
    const p3: Circle = { x: 2, y: 3, r: 0 };

    const solutions = ApolloniusSolver.solve(p1, p2, p3);
    expect(solutions.length).toBeGreaterThan(0);

    // The solution should pass through all three points
    const sol = solutions[0];
    for (const p of [p1, p2, p3]) {
      const dist = Math.sqrt((sol.x - p.x) ** 2 + (sol.y - p.y) ** 2);
      expect(Math.abs(dist - sol.r)).toBeLessThan(0.05);
    }
  });

  it('generates valid SVG path for a circle', () => {
    const svgPath = ApolloniusSolver.toSvgPath({ x: 10, y: 20, r: 5 });
    expect(svgPath).toContain('M 5 20');
    expect(svgPath).toContain('A 5 5 0 1 0 15 20');
    expect(svgPath).toContain('A 5 5 0 1 0 5 20');
    expect(svgPath).toContain('Z');
  });

  it('handles collinear circle centers without crashing', () => {
    const c1: Circle = { x: 0, y: 0, r: 1 };
    const c2: Circle = { x: 2, y: 0, r: 1 };
    const c3: Circle = { x: 4, y: 0, r: 1 };

    const solutions = ApolloniusSolver.solve(c1, c2, c3);
    expect(solutions).toBeDefined();
  });
});
