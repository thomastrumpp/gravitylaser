/**
 * ApolloniusSolver — Tangent Circle Generator
 * 
 * Solves the Problem of Apollonius: given three circles (or points as
 * zero-radius circles), find all circles tangent to all three.
 * 
 * Each input circle is defined by center (x, y) and radius r.
 * A point is a circle with r = 0.
 * 
 * Returns up to 8 solutions (one for each combination of
 * external/internal tangency).
 */

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface ApolloniusSolution {
  x: number;
  y: number;
  r: number;
  tangencyType: string; // e.g. "EEE", "EEI", etc.
}

export class ApolloniusSolver {

  /**
   * Find all tangent circles to three given circles.
   * Each sign combination (+/-) represents external (+) or internal (-) tangency.
   * 
   * @param c1 First circle
   * @param c2 Second circle
   * @param c3 Third circle
   * @returns Array of solution circles
   */
  public static solve(c1: Circle, c2: Circle, c3: Circle): ApolloniusSolution[] {
    const solutions: ApolloniusSolution[] = [];
    const signs: [number, number, number][] = [
      [1, 1, 1],    // EEE
      [1, 1, -1],   // EEI
      [1, -1, 1],   // EIE
      [1, -1, -1],  // EII
      [-1, 1, 1],   // IEE
      [-1, 1, -1],  // IEI
      [-1, -1, 1],  // IIE
      [-1, -1, -1], // III
    ];

    const labels = ['EEE', 'EEI', 'EIE', 'EII', 'IEE', 'IEI', 'IIE', 'III'];

    for (let i = 0; i < signs.length; i++) {
      const [s1, s2, s3] = signs[i];
      const result = ApolloniusSolver.solveForSigns(c1, c2, c3, s1, s2, s3);
      if (result) {
        solutions.push({
          ...result,
          tangencyType: labels[i],
        });
      }
    }

    // Deduplicate solutions that are essentially the same circle
    return ApolloniusSolver.deduplicateSolutions(solutions);
  }

  /**
   * Solve for a specific sign combination using the algebraic method.
   * 
   * The tangent circle (x, y, r) must satisfy:
   *   (x - x_i)^2 + (y - y_i)^2 = (r + s_i * r_i)^2
   * for i = 1, 2, 3.
   * 
   * Subtracting pairs of equations eliminates the quadratic terms in r,
   * yielding two linear equations in x, y (parameterized by r).
   * Substituting back yields a quadratic in r.
   */
  private static solveForSigns(
    c1: Circle, c2: Circle, c3: Circle,
    s1: number, s2: number, s3: number
  ): { x: number; y: number; r: number } | null {
    // Eq_i: (x - xi)^2 + (y - yi)^2 = (r + si*ri)^2
    // Expand: x^2 - 2*xi*x + xi^2 + y^2 - 2*yi*y + yi^2 = r^2 + 2*si*ri*r + si^2*ri^2
    // 
    // Subtract Eq1 from Eq2 and Eq1 from Eq3 to get linear equations:
    // Eq2 - Eq1:
    //   -2*(x2-x1)*x - 2*(y2-y1)*y = 2*(s2*r2 - s1*r1)*r + (s2^2*r2^2 - s1^2*r1^2) - (x2^2+y2^2 - x1^2-y1^2)
    // But s_i^2 = 1, so s_i^2*r_i^2 = r_i^2
    
    const x1 = c1.x, y1 = c1.y, r1 = c1.r;
    const x2 = c2.x, y2 = c2.y, r2 = c2.r;
    const x3 = c3.x, y3 = c3.y, r3 = c3.r;

    // Eq2 - Eq1:
    // 2*(x1-x2)*x + 2*(y1-y2)*y + 2*(s2*r2 - s1*r1)*r = (x1^2+y1^2-r1^2) - (x2^2+y2^2-r2^2)
    const a1 = 2 * (x1 - x2);
    const b1 = 2 * (y1 - y2);
    const c1_coeff = 2 * (s2 * r2 - s1 * r1);
    const d1 = (x1 * x1 + y1 * y1 - r1 * r1) - (x2 * x2 + y2 * y2 - r2 * r2);

    // Eq3 - Eq1:
    const a2 = 2 * (x1 - x3);
    const b2 = 2 * (y1 - y3);
    const c2_coeff = 2 * (s3 * r3 - s1 * r1);
    const d2 = (x1 * x1 + y1 * y1 - r1 * r1) - (x3 * x3 + y3 * y3 - r3 * r3);

    // System: a1*x + b1*y + c1*r = d1
    //         a2*x + b2*y + c2*r = d2
    // Solve for x and y in terms of r using Cramer's rule

    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 1e-12) {
      return null; // Degenerate (collinear centers)
    }

    // x = (ex + fx * r)
    // y = (ey + fy * r)
    const ex = (d1 * b2 - d2 * b1) / det;
    const fx = (-(c1_coeff) * b2 + (c2_coeff) * b1) / det;
    const ey = (a1 * d2 - a2 * d1) / det;
    const fy = (a1 * (-(c2_coeff)) - a2 * (-(c1_coeff))) / det;
    // Simplify fy:
    // fy = (-a1*c2_coeff + a2*c1_coeff) / det

    // Substitute back into Eq1: (x - x1)^2 + (y - y1)^2 = (r + s1*r1)^2
    // ((ex + fx*r) - x1)^2 + ((ey + fy*r) - y1)^2 = (r + s1*r1)^2
    const px = ex - x1;
    const py = ey - y1;

    // (px + fx*r)^2 + (py + fy*r)^2 = (r + s1*r1)^2
    // px^2 + 2*px*fx*r + fx^2*r^2 + py^2 + 2*py*fy*r + fy^2*r^2 = r^2 + 2*s1*r1*r + s1^2*r1^2
    // (fx^2 + fy^2 - 1)*r^2 + (2*px*fx + 2*py*fy - 2*s1*r1)*r + (px^2 + py^2 - r1^2) = 0

    const A = fx * fx + fy * fy - 1;
    const B = 2 * px * fx + 2 * py * fy - 2 * s1 * r1;
    const C = px * px + py * py - r1 * r1;

    if (Math.abs(A) < 1e-12) {
      // Linear in r
      if (Math.abs(B) < 1e-12) return null;
      const r = -C / B;
      if (r < 0) return null;
      return { x: ex + fx * r, y: ey + fy * r, r };
    }

    const discriminant = B * B - 4 * A * C;
    if (discriminant < -1e-10) return null;

    const sqrtD = Math.sqrt(Math.max(0, discriminant));
    const r_a = (-B + sqrtD) / (2 * A);
    const r_b = (-B - sqrtD) / (2 * A);

    // Build candidates and validate each against all three circles
    const circles = [
      { c: c1, s: s1 },
      { c: c2, s: s2 },
      { c: c3, s: s3 },
    ];

    const validateCandidate = (rVal: number): { x: number; y: number; r: number } | null => {
      if (rVal < -1e-6) return null;
      const r = Math.max(0, rVal);
      const solX = ex + fx * r;
      const solY = ey + fy * r;

      // Check tangency condition for all three circles
      const tolerance = 0.01;
      for (const { c, s } of circles) {
        const dist = Math.sqrt((solX - c.x) ** 2 + (solY - c.y) ** 2);
        const expected = r + s * c.r; // Can be negative for internal tangency with s=-1
        if (Math.abs(dist - Math.abs(expected)) > tolerance) {
          return null; // Not tangent to this circle
        }
      }

      return { x: solX, y: solY, r };
    };

    // Try both roots; return the first valid one (prefer smaller radius)
    const candA = validateCandidate(r_a);
    const candB = validateCandidate(r_b);

    if (candA && candB) {
      return candA.r <= candB.r ? candA : candB;
    }
    return candA || candB;
  }

  /**
   * Remove duplicate solutions (same circle within tolerance).
   */
  private static deduplicateSolutions(
    solutions: ApolloniusSolution[],
    tolerance: number = 0.01
  ): ApolloniusSolution[] {
    const unique: ApolloniusSolution[] = [];
    for (const sol of solutions) {
      const isDuplicate = unique.some(
        u =>
          Math.abs(u.x - sol.x) < tolerance &&
          Math.abs(u.y - sol.y) < tolerance &&
          Math.abs(u.r - sol.r) < tolerance
      );
      if (!isDuplicate) {
        unique.push(sol);
      }
    }
    return unique;
  }

  /**
   * Convert a solution circle to an SVG path string (for rendering on canvas).
   */
  public static toSvgPath(circle: Circle): string {
    const { x, y, r } = circle;
    return [
      `M ${x - r} ${y}`,
      `A ${r} ${r} 0 1 0 ${x + r} ${y}`,
      `A ${r} ${r} 0 1 0 ${x - r} ${y}`,
      'Z'
    ].join(' ');
  }
}
