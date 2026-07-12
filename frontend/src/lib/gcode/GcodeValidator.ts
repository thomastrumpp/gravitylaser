import { settingsStore } from '../stores/settingsStore';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  maxReachedX: number;
  minReachedX: number;
  maxReachedY: number;
  minReachedY: number;
}

export class GcodeValidator {
  /**
   * Helper to parse numbers associated with a specific character/command in a G-code line.
   * e.g., parseWord('G0 X100.5 Y-20', 'X') -> 100.5
   */
  private static parseWord(line: string, char: string): number | null {
    // Regex matches the character, optional spaces, and a float (positive or negative)
    const regex = new RegExp(`${char}\\s*(-?\\d*\\.?\\d+)`, 'i');
    const match = line.match(regex);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Validates G-code string against workspace limits.
   * Simulates the path starting at (0,0).
   */
  public static validate(gcode: string): ValidationResult {
    const settings = settingsStore.get();
    const workingSizeX = settings.workingSizeX;
    const workingSizeY = settings.workingSizeY;
    const origin = settings.origin;

    // Define coordinate bounds
    let minX = 0;
    let maxX = workingSizeX;
    let minY = 0;
    let maxY = workingSizeY;

    if (origin === 'Center') {
      minX = -workingSizeX / 2;
      maxX = workingSizeX / 2;
      minY = -workingSizeY / 2;
      maxY = workingSizeY / 2;
    }

    const lines = gcode.split('\n');

    let currentX = 0;
    let currentY = 0;
    let absoluteMode = true; // G90 is default
    let unitScale = 1.0;     // G21 (mm) is default

    let maxReachedX = 0;
    let minReachedX = 0;
    let maxReachedY = 0;
    let minReachedY = 0;

    let currentMotionMode: 'G0' | 'G1' | 'G2' | 'G3' | null = null;

    // Check if initial point (0,0) is in bounds
    if (0 < minX || 0 > maxX || 0 < minY || 0 > maxY) {
      return {
        valid: false,
        error: `Startposition (0.000, 0.000) liegt außerhalb der Arbeitsfläche: X [${minX}, ${maxX}], Y [${minY}, ${maxY}]`,
        maxReachedX,
        minReachedX,
        maxReachedY,
        minReachedY
      };
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const rawLine = lines[lineIndex];
      // Strip comments and leading/trailing whitespace
      const line = rawLine.split(';')[0].trim().toUpperCase();
      if (!line) continue;

      // Handle G90 (absolute) / G91 (relative)
      if (/\bG90\b/.test(line)) {
        absoluteMode = true;
      } else if (/\bG91\b/.test(line)) {
        absoluteMode = false;
      }

      // Handle G20 (inches) / G21 (mm)
      if (/\bG20\b/.test(line)) {
        unitScale = 25.4;
      } else if (/\bG21\b/.test(line)) {
        unitScale = 1.0;
      }

      // Update motion mode if G0/G1/G2/G3 is specified
      if (/\bG00?\b/.test(line)) {
        currentMotionMode = 'G0';
      } else if (/\bG0?1\b/.test(line)) {
        currentMotionMode = 'G1';
      } else if (/\bG0?2\b/.test(line)) {
        currentMotionMode = 'G2';
      } else if (/\bG0?3\b/.test(line)) {
        currentMotionMode = 'G3';
      }

      // If a motion command is active, parse coordinate parameters
      const hasX = /X\s*(-?\d)/.test(line);
      const hasY = /Y\s*(-?\d)/.test(line);

      if (currentMotionMode && (hasX || hasY)) {
        const xVal = GcodeValidator.parseWord(line, 'X');
        const yVal = GcodeValidator.parseWord(line, 'Y');

        let targetX = currentX;
        let targetY = currentY;

        if (xVal !== null) {
          targetX = absoluteMode ? xVal * unitScale : currentX + xVal * unitScale;
        }
        if (yVal !== null) {
          targetY = absoluteMode ? yVal * unitScale : currentY + yVal * unitScale;
        }

        // Validate the path from (currentX, currentY) to (targetX, targetY)
        if (currentMotionMode === 'G0' || currentMotionMode === 'G1') {
          // Linear paths: just check both endpoints since a straight line between two valid points is always valid.
          if (targetX < minX || targetX > maxX || targetY < minY || targetY > maxY) {
            return {
              valid: false,
              error: `Kollision bei linearer Bewegung zu (X: ${targetX.toFixed(3)}, Y: ${targetY.toFixed(3)}) in Zeile ${lineIndex + 1}: "${rawLine.trim()}". Limits: X [${minX}, ${maxX}], Y [${minY}, ${maxY}]`,
              maxReachedX: Math.max(maxReachedX, targetX),
              minReachedX: Math.min(minReachedX, targetX),
              maxReachedY: Math.max(maxReachedY, targetY),
              minReachedY: Math.min(minReachedY, targetY)
            };
          }

          // Update reached boundaries
          maxReachedX = Math.max(maxReachedX, targetX);
          minReachedX = Math.min(minReachedX, targetX);
          maxReachedY = Math.max(maxReachedY, targetY);
          minReachedY = Math.min(minReachedY, targetY);
        } else if (currentMotionMode === 'G2' || currentMotionMode === 'G3') {
          // Circular paths: sample the arc to ensure no point goes out of bounds.
          const iVal = GcodeValidator.parseWord(line, 'I') ?? 0;
          const jVal = GcodeValidator.parseWord(line, 'J') ?? 0;

          const centerX = currentX + iVal * unitScale;
          const centerY = currentY + jVal * unitScale;
          const radius = Math.sqrt(iVal * iVal + jVal * jVal) * unitScale;

          const startAngle = Math.atan2(currentY - centerY, currentX - centerX);
          let endAngle = Math.atan2(targetY - centerY, targetX - centerX);

          const isClockwise = currentMotionMode === 'G2';

          if (isClockwise) {
            if (endAngle >= startAngle) {
              endAngle -= 2 * Math.PI;
            }
          } else {
            if (endAngle <= startAngle) {
              endAngle += 2 * Math.PI;
            }
          }

          // Check intermediate points on the arc (30 samples)
          const steps = 30;
          for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            const angle = startAngle + t * (endAngle - startAngle);
            const px = centerX + radius * Math.cos(angle);
            const py = centerY + radius * Math.sin(angle);

            // Using a tolerance of 1e-5 to avoid float precision false positives
            if (px < minX - 1e-5 || px > maxX + 1e-5 || py < minY - 1e-5 || py > maxY + 1e-5) {
              return {
                valid: false,
                error: `Kollision bei Kreisbogen-Bewegung an Position (X: ${px.toFixed(3)}, Y: ${py.toFixed(3)}) in Zeile ${lineIndex + 1}: "${rawLine.trim()}". Limits: X [${minX}, ${maxX}], Y [${minY}, ${maxY}]`,
                maxReachedX: Math.max(maxReachedX, px),
                minReachedX: Math.min(minReachedX, px),
                maxReachedY: Math.max(maxReachedY, py),
                minReachedY: Math.min(minReachedY, py)
              };
            }

            maxReachedX = Math.max(maxReachedX, px);
            minReachedX = Math.min(minReachedX, px);
            maxReachedY = Math.max(maxReachedY, py);
            minReachedY = Math.min(minReachedY, py);
          }
        }

        currentX = targetX;
        currentY = targetY;
      }
    }

    return {
      valid: true,
      maxReachedX,
      minReachedX,
      maxReachedY,
      minReachedY
    };
  }
}
