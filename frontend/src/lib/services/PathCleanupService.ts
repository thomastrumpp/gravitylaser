/**
 * PathCleanupService — Topologische Integrität für Pfade
 * 
 * Provides utilities for:
 * - Tiny line removal: removes segments shorter than a threshold
 * - Auto-close paths: closes nearly-closed paths automatically
 * - Duplicate point removal: eliminates consecutive identical points
 */

export interface PathCommand {
  type: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export class PathCleanupService {

  /**
   * Cleans up a path by removing tiny segments, duplicate points,
   * and auto-closing nearly-closed subpaths.
   * 
   * @param path Array of path commands (M, L, C, Q, Z)
   * @param tinyThreshold Minimum segment length in path units (default 0.1)
   * @param closeThreshold Max distance between start/end to auto-close (default 0.5)
   * @returns Cleaned path commands array
   */
  public static cleanPath(
    path: PathCommand[],
    tinyThreshold: number = 0.1,
    closeThreshold: number = 0.5
  ): PathCommand[] {
    if (!path || path.length === 0) return [];

    const cleaned: PathCommand[] = [];
    let subpathStartX = 0;
    let subpathStartY = 0;
    let currentX = 0;
    let currentY = 0;
    let subpathStartIndex = -1;

    for (let i = 0; i < path.length; i++) {
      const cmd = path[i];

      if (cmd.type === 'M') {
        // Before starting a new subpath, check if the previous one should be auto-closed
        if (subpathStartIndex >= 0) {
          PathCleanupService.maybeAutoClose(
            cleaned, currentX, currentY, subpathStartX, subpathStartY, closeThreshold
          );
        }
        cleaned.push({ ...cmd });
        subpathStartX = cmd.x ?? 0;
        subpathStartY = cmd.y ?? 0;
        currentX = subpathStartX;
        currentY = subpathStartY;
        subpathStartIndex = cleaned.length - 1;

      } else if (cmd.type === 'L') {
        const dx = (cmd.x ?? 0) - currentX;
        const dy = (cmd.y ?? 0) - currentY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Skip tiny line segments
        if (dist < tinyThreshold) {
          continue;
        }

        cleaned.push({ ...cmd });
        currentX = cmd.x ?? 0;
        currentY = cmd.y ?? 0;

      } else if (cmd.type === 'C') {
        // For cubic bezier, check chord length (start to end)
        const dx = (cmd.x ?? 0) - currentX;
        const dy = (cmd.y ?? 0) - currentY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < tinyThreshold) {
          // Also check control point distances for truly degenerate curves
          const dx1 = (cmd.x1 ?? 0) - currentX;
          const dy1 = (cmd.y1 ?? 0) - currentY;
          const dx2 = (cmd.x2 ?? 0) - (cmd.x ?? 0);
          const dy2 = (cmd.y2 ?? 0) - (cmd.y ?? 0);
          const ctrlDist = Math.sqrt(dx1 * dx1 + dy1 * dy1) + Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (ctrlDist < tinyThreshold * 2) {
            continue; // Skip degenerate bezier
          }
        }

        cleaned.push({ ...cmd });
        currentX = cmd.x ?? 0;
        currentY = cmd.y ?? 0;

      } else if (cmd.type === 'Q') {
        const dx = (cmd.x ?? 0) - currentX;
        const dy = (cmd.y ?? 0) - currentY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < tinyThreshold) {
          const dx1 = (cmd.x1 ?? 0) - currentX;
          const dy1 = (cmd.y1 ?? 0) - currentY;
          if (Math.sqrt(dx1 * dx1 + dy1 * dy1) < tinyThreshold) {
            continue;
          }
        }

        cleaned.push({ ...cmd });
        currentX = cmd.x ?? 0;
        currentY = cmd.y ?? 0;

      } else if (cmd.type === 'Z') {
        cleaned.push({ ...cmd });
        currentX = subpathStartX;
        currentY = subpathStartY;
        subpathStartIndex = -1;
      } else {
        // Pass through unknown commands
        cleaned.push({ ...cmd });
      }
    }

    // Check the final subpath for auto-close
    if (subpathStartIndex >= 0) {
      PathCleanupService.maybeAutoClose(
        cleaned, currentX, currentY, subpathStartX, subpathStartY, closeThreshold
      );
    }

    // Remove orphaned M commands (M followed directly by M or end)
    return PathCleanupService.removeOrphanedMoves(cleaned);
  }

  /**
   * If the current position is close enough to the subpath start, 
   * insert a Z command to auto-close the path.
   */
  private static maybeAutoClose(
    commands: PathCommand[],
    currentX: number,
    currentY: number,
    startX: number,
    startY: number,
    threshold: number
  ): void {
    const dx = currentX - startX;
    const dy = currentY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Already at start or last command is already Z
    if (dist === 0 || (commands.length > 0 && commands[commands.length - 1].type === 'Z')) {
      return;
    }

    if (dist <= threshold && dist > 0) {
      commands.push({ type: 'Z' });
    }
  }

  /**
   * Remove M commands that are not followed by any drawing command
   * (i.e., orphaned moves at the end or before another M).
   */
  private static removeOrphanedMoves(commands: PathCommand[]): PathCommand[] {
    const result: PathCommand[] = [];
    for (let i = 0; i < commands.length; i++) {
      if (commands[i].type === 'M') {
        // Look ahead: is there a drawing command before the next M or end?
        let hasDrawing = false;
        for (let j = i + 1; j < commands.length; j++) {
          if (commands[j].type === 'M') break;
          if (['L', 'C', 'Q', 'Z'].includes(commands[j].type)) {
            hasDrawing = true;
            break;
          }
        }
        if (!hasDrawing) continue; // Skip orphaned M
      }
      result.push(commands[i]);
    }
    return result;
  }

  /**
   * Remove consecutive duplicate points from a point array.
   * Useful for cleaning up polygon outlines before offset operations.
   * 
   * @param points Array of [x, y] coordinate tuples
   * @param threshold Distance below which points are considered duplicate
   * @returns Deduplicated point array
   */
  public static deduplicatePoints(
    points: [number, number][],
    threshold: number = 0.001
  ): [number, number][] {
    if (!points || points.length < 2) return points;

    const result: [number, number][] = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const dx = points[i][0] - result[result.length - 1][0];
      const dy = points[i][1] - result[result.length - 1][1];
      if (Math.sqrt(dx * dx + dy * dy) >= threshold) {
        result.push(points[i]);
      }
    }
    return result;
  }
}
