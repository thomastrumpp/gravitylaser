import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrintAndCutService } from '../../src/lib/services/PrintAndCutService';
import { gcodeGen } from '../../src/lib/gcode/GcodeGenerator';

describe('Print & Cut / Affine Registrierung (REQ-DYN-05)', () => {
  beforeEach(() => {
    PrintAndCutService.reset();
  });

  afterEach(() => {
    PrintAndCutService.reset();
  });

  it('correctly calculates translation mapping', () => {
    // Design points
    const p1_d = { x: 10, y: 10 };
    const p2_d = { x: 50, y: 10 };

    // Machine points shifted by +100 on X and Y
    const p1_m = { x: 110, y: 110 };
    const p2_m = { x: 150, y: 110 };

    PrintAndCutService.setDesignPoints(p1_d, p2_d);
    PrintAndCutService.setMachinePoints(p1_m, p2_m);
    PrintAndCutService.setEnabled(true);

    expect(PrintAndCutService.isEnabled()).toBe(true);

    // Transform a design point at (20, 20) -> should map to (120, 120)
    const result = PrintAndCutService.transform(20, 20);
    expect(result.x).toBeCloseTo(120, 2);
    expect(result.y).toBeCloseTo(120, 2);
  });

  it('correctly calculates rotation (90 degrees CCW)', () => {
    // Design points: horizontal vector along X
    const p1_d = { x: 0, y: 0 };
    const p2_d = { x: 10, y: 0 };

    // Machine points: vertical vector along Y, starting at (100, 100)
    const p1_m = { x: 100, y: 100 };
    const p2_m = { x: 100, y: 110 };

    PrintAndCutService.setDesignPoints(p1_d, p2_d);
    PrintAndCutService.setMachinePoints(p1_m, p2_m);
    PrintAndCutService.setEnabled(true);

    // Transform design point (10, 10).
    // In design: relative to p1_d is dx=10, dy=10.
    // Rotated 90 degrees CCW (cos(90)=0, sin(90)=1):
    // rx' = 10*0 - 10*1 = -10
    // ry' = 10*1 + 10*0 = 10
    // Machine coordinate: (100 - 10, 100 + 10) = (90, 110)
    const result = PrintAndCutService.transform(10, 10);
    expect(result.x).toBeCloseTo(90, 2);
    expect(result.y).toBeCloseTo(110, 2);
  });

  it('correctly calculates scaling', () => {
    // Design points: dist = 10
    const p1_d = { x: 0, y: 0 };
    const p2_d = { x: 10, y: 0 };

    // Machine points: dist = 20, translated to (100, 100)
    const p1_m = { x: 100, y: 100 };
    const p2_m = { x: 120, y: 100 };

    PrintAndCutService.setDesignPoints(p1_d, p2_d);
    PrintAndCutService.setMachinePoints(p1_m, p2_m);
    PrintAndCutService.setUseScale(true);
    PrintAndCutService.setEnabled(true);

    // Transform design point (5, 0) -> should scale up to (110, 100)
    const result = PrintAndCutService.transform(5, 0);
    expect(result.x).toBeCloseTo(110, 2);
    expect(result.y).toBeCloseTo(100, 2);
  });

  it('transforms G-code coordinates inside GcodeGenerator', () => {
    // Enable translation shift of +100 in GcodeGenerator
    PrintAndCutService.setDesignPoints({ x: 0, y: 0 }, { x: 50, y: 0 });
    PrintAndCutService.setMachinePoints({ x: 100, y: 100 }, { x: 150, y: 100 });
    PrintAndCutService.setEnabled(true);

    const lineObj = {
      id: 'line1',
      type: 'line',
      left: 10,
      top: 10,
      width: 20,
      height: 0, // horizontal line
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      layerId: 'C00'
    };

    const gcode = gcodeGen.generate([lineObj]);
    
    // Default left=10, top=10 maps to machine X=10, Y=10
    // With Print & Cut shift +100, it should map to X=110, Y=110
    // Let's assert that the generated G-code contains X110 and Y110
    expect(gcode).toContain('X110.000 Y110.000');
    expect(gcode).toContain('X130.000 Y110.000');
  });
});
