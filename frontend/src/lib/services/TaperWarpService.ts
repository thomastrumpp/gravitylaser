/**
 * TaperWarpService — Conical Surface Mapping & Barrel Correction
 * 
 * Provides geometric transformations for laser engraving on non-flat surfaces:
 * 
 * 1. Taper Warp: Maps flat 2D coordinates onto a conical (tapered) surface.
 *    Used when engraving on a cylinder or cone mounted on a rotary axis.
 * 
 * 2. Barrel/Pincushion Correction: Corrects for lens distortion where the
 *    laser path curves away from straight lines at the edges of the work area.
 * 
 * All transformations operate on [x, y] point arrays and return new arrays.
 */

export interface TaperConfig {
  /** Top radius of the cone/cylinder (mm). Equal to bottomRadius for a cylinder. */
  topRadius: number;
  /** Bottom radius of the cone/cylinder (mm) */
  bottomRadius: number;
  /** Height of the cone/cylinder (mm) */
  height: number;
  /** Center X of the design in the flat workspace (mm) */
  centerX: number;
  /** Center Y of the design in the flat workspace (mm) */
  centerY: number;
}

export interface BarrelConfig {
  /** Distortion coefficient k1 (positive = barrel, negative = pincushion) */
  k1: number;
  /** Optional second-order distortion coefficient */
  k2?: number;
  /** Center X of distortion (typically workspace center) */
  centerX: number;
  /** Center Y of distortion (typically workspace center) */
  centerY: number;
  /** Maximum radius used for normalization (typically half the workspace diagonal) */
  maxRadius: number;
}

export class TaperWarpService {

  /**
   * Apply taper warp: maps flat X coordinates onto a conical surface.
   * 
   * The Y axis is the axis of the cone. At each Y position, the effective
   * circumference is 2π * radius(y). The X coordinate is mapped to an
   * angular position on this circumference.
   * 
   * For a cylinder (topRadius === bottomRadius), this simply wraps the
   * X coordinate around the circumference.
   * 
   * @param points Array of [x, y] coordinates in flat workspace
   * @param config Taper configuration
   * @returns Warped [x, y] coordinates
   */
  public static applyTaperWarp(
    points: [number, number][],
    config: TaperConfig
  ): [number, number][] {
    if (!points || points.length === 0) return [];

    const { topRadius, bottomRadius, height, centerX, centerY } = config;

    return points.map(([x, y]) => {
      // Normalize Y position along the cone height [0, 1]
      const relY = y - centerY;
      const t = Math.max(0, Math.min(1, (relY + height / 2) / height));

      // Interpolate radius at this Y position
      const radius = topRadius + (bottomRadius - topRadius) * t;

      if (radius <= 0) return [x, y]; // Degenerate case

      // Map X offset from center to arc length on the surface
      const relX = x - centerX;

      // The arc angle corresponding to the flat X offset
      const angle = relX / radius;

      // Convert back to flat X using the arc position
      // This "compresses" the X near the edges of the design
      const warpedX = centerX + radius * Math.sin(angle);

      // Y correction: the surface curves away from the focal plane
      // The actual Z height varies as radius * (1 - cos(angle))
      // This doesn't change Y, but we note it for Z-axis compensation
      const warpedY = y;

      return [warpedX, warpedY] as [number, number];
    });
  }

  /**
   * Apply barrel/pincushion distortion correction.
   * 
   * Uses the Brown-Conrady model:
   *   r_corrected = r * (1 + k1 * r^2 + k2 * r^4)
   * 
   * where r is the normalized radial distance from the distortion center.
   * 
   * @param points Array of [x, y] coordinates
   * @param config Barrel correction configuration
   * @returns Corrected [x, y] coordinates
   */
  public static applyBarrelCorrection(
    points: [number, number][],
    config: BarrelConfig
  ): [number, number][] {
    if (!points || points.length === 0) return [];

    const { k1, k2 = 0, centerX, centerY, maxRadius } = config;

    if (maxRadius <= 0) return points;

    return points.map(([x, y]) => {
      const dx = x - centerX;
      const dy = y - centerY;
      const r = Math.sqrt(dx * dx + dy * dy);

      if (r < 1e-10) return [x, y]; // At center, no correction

      // Normalize radius
      const rn = r / maxRadius;
      const rn2 = rn * rn;

      // Brown-Conrady distortion model
      const scale = 1 + k1 * rn2 + k2 * rn2 * rn2;

      const correctedX = centerX + dx * scale;
      const correctedY = centerY + dy * scale;

      return [correctedX, correctedY] as [number, number];
    });
  }

  /**
   * Compute the Z-axis compensation values for taper warp.
   * Returns the Z offset needed at each point to maintain focus
   * on a curved surface.
   * 
   * @param points Array of [x, y] coordinates (flat workspace)
   * @param config Taper configuration
   * @returns Array of Z offsets (in mm) for each point
   */
  public static computeZCompensation(
    points: [number, number][],
    config: TaperConfig
  ): number[] {
    const { topRadius, bottomRadius, height, centerX, centerY } = config;

    return points.map(([x, y]) => {
      const relY = y - centerY;
      const t = Math.max(0, Math.min(1, (relY + height / 2) / height));
      const radius = topRadius + (bottomRadius - topRadius) * t;

      if (radius <= 0) return 0;

      const relX = x - centerX;
      const angle = relX / radius;

      // Z displacement: how far the surface curves away from the focal plane
      return radius * (1 - Math.cos(angle));
    });
  }

  /**
   * Apply inverse taper warp: maps conical coordinates back to flat workspace.
   * Useful for previewing what a design will look like when unwrapped.
   */
  public static inverseTaperWarp(
    points: [number, number][],
    config: TaperConfig
  ): [number, number][] {
    if (!points || points.length === 0) return [];

    const { topRadius, bottomRadius, height, centerX, centerY } = config;

    return points.map(([x, y]) => {
      const relY = y - centerY;
      const t = Math.max(0, Math.min(1, (relY + height / 2) / height));
      const radius = topRadius + (bottomRadius - topRadius) * t;

      if (radius <= 0) return [x, y];

      const relX = x - centerX;
      // Inverse of sin: recover the angle from the warped X
      const sinVal = Math.max(-1, Math.min(1, relX / radius));
      const angle = Math.asin(sinVal);

      // Flat X = radius * angle (arc length)
      const flatX = centerX + radius * angle;

      return [flatX, y] as [number, number];
    });
  }
}
