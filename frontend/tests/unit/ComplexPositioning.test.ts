import { describe, it, expect, beforeEach } from 'vitest';
import { GcodeGenerator, type CanvasObjectData } from '../../src/lib/gcode/GcodeGenerator';
import { GcodeValidator } from '../../src/lib/gcode/GcodeValidator';
import { settingsStore } from '../../src/lib/stores/settingsStore';
import { layersStore } from '../../src/lib/stores/layersStore';

describe('100 Complex Geometry Positioning & Collision Tests', () => {
  let generator: GcodeGenerator;

  beforeEach(() => {
    generator = new GcodeGenerator();
    // Default setup: BottomLeft origin, 300x300mm bed
    settingsStore.updateSettings({
      workingSizeX: 300,
      workingSizeY: 300,
      origin: 'BottomLeft',
      laserMode: 'M3'
    });
    // Ensure standard layer C00 is enabled
    layersStore.update((state) => ({
      ...state,
      C00: { ...state.C00, output: true, power: 100, speed: 3000, passes: 1, mode: 'Line' }
    }));
  });

  // Helpers to construct shapes quickly
  const rect = (left: number, top: number, w: number, h: number, opts: Partial<CanvasObjectData> = {}): CanvasObjectData => ({
    type: 'rect', left, top, width: w, height: h, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00', ...opts
  });

  const circle = (left: number, top: number, r: number, opts: Partial<CanvasObjectData> = {}): CanvasObjectData => ({
    type: 'circle', left, top, width: r * 2, height: r * 2, radius: r, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00', ...opts
  });

  const line = (left: number, top: number, w: number, h: number, opts: Partial<CanvasObjectData> = {}): CanvasObjectData => ({
    type: 'line', left, top, width: w, height: h, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00', ...opts
  });

  const path = (left: number, top: number, cmds: any[], opts: Partial<CanvasObjectData> = {}): CanvasObjectData => ({
    type: 'path', left, top, width: 100, height: 100, scaleX: 1, scaleY: 1, angle: 0, path: cmds, layerId: 'C00', ...opts
  });

  // ==========================================
  // CATEGORY 1: BOUNDARY EDGE CASES (Tests 1-10)
  // ==========================================

  it('Test 01: Rect exactly at Bottom-Left origin (0,0) is valid', () => {
    const obj = rect(0, 0, 50, 50); // In BottomLeft, mapX(0)=0, mapY(0)=300, mapY(50)=250.
    // However, on Fabric canvas, Y=0 is TOP and Y=300 is BOTTOM.
    // mapY(0) = 300 - 0 = 300 (top of object is at machine Y=300)
    // mapY(0 + 50) = 300 - 50 = 250 (bottom of object is at machine Y=250)
    // So Y range is [250, 300], which is perfectly valid!
    const gcode = generator.generate([obj]);
    const res = GcodeValidator.validate(gcode);
    expect(res.valid).toBe(true);
  });

  it('Test 02: Rect slightly below Bottom-Left origin on X is blocked', () => {
    const obj = rect(-0.1, 0, 50, 50);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 03: Rect slightly below Bottom-Left origin on Y is blocked', () => {
    // Canvas Top = 260 -> mapY(260) = 40. Canvas Height = 50 -> mapY(260+50) = -10 (out of bounds).
    const obj = rect(0, 260, 50, 50); 
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 04: Rect exactly at Top-Right boundary is valid', () => {
    // Bed is 300x300. Canvas range [0, 300] on both axes.
    // Object left=250, width=50 -> X is [250, 300] -> valid.
    // Object top=0, height=50 -> mapY(0)=300, mapY(50)=250 -> Y is [250, 300] -> valid.
    const obj = rect(250, 0, 50, 50);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 05: Rect exceeding Top-Right boundary on X is blocked', () => {
    const obj = rect(251, 0, 50, 50);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 06: Rect exceeding Top-Right boundary on Y is blocked', () => {
    const obj = rect(250, -1, 50, 50); // mapY(-1) = 301 -> out of bounds.
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 07: Circle exactly touching Left boundary is valid', () => {
    const obj = circle(0, 100, 25); // X is [0, 50], Y maps to [150, 200] -> valid.
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 08: Circle extending beyond Left boundary is blocked', () => {
    const obj = circle(-0.5, 100, 25);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 09: Circle exactly touching Right boundary is valid', () => {
    const obj = circle(250, 100, 25); // X is [250, 300] -> valid.
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 10: Circle extending beyond Right boundary is blocked', () => {
    const obj = circle(251, 100, 25);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  // ==========================================
  // CATEGORY 2: SCALING EXTREMES (Tests 11-20)
  // ==========================================

  it('Test 11: Massively scaled-down rect (0.001mm) is valid', () => {
    const obj = rect(150, 150, 50, 50, { scaleX: 0.00002, scaleY: 0.00002 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 12: Scaled rect fitting exactly in workspace is valid', () => {
    const obj = rect(0, 0, 100, 100, { scaleX: 3.0, scaleY: 3.0 }); // size 300x300
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 13: Scaled rect slightly exceeding workspace is blocked', () => {
    const obj = rect(0, 0, 100, 100, { scaleX: 3.01, scaleY: 3.0 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 14: Double scaling of circles near boundary is valid', () => {
    const obj = circle(100, 100, 50, { scaleX: 2.0, scaleY: 2.0 }); // width = 100 * 2 = 200. X goes from 100 to 300.
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 15: Double scaling of circles exceeding boundary is blocked', () => {
    const obj = circle(100, 100, 50, { scaleX: 2.01, scaleY: 2.0 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 16: Zero-scale dimensions do not crash generator', () => {
    const obj = rect(10, 10, 0, 0);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 17: Extreme aspect ratio rect (300mm x 0.1mm) is valid', () => {
    const obj = rect(0, 150, 300, 0.1);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 18: Extreme aspect ratio rect exceeding boundary is blocked', () => {
    const obj = rect(1, 150, 300, 0.1);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 19: Negatively scaled rect (flipped) remains inside boundaries', () => {
    // Fabric allows negative scales.
    const obj = rect(100, 100, 50, 50, { scaleX: -1, scaleY: 1 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 20: Negatively scaled rect flipping out-of-bounds is blocked', () => {
    const obj = rect(10, 10, 50, 50, { scaleX: -1, scaleY: 1 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  // ==========================================
  // CATEGORY 3: COMPLEX BEZIER PATHS (Tests 21-30)
  // ==========================================

  const curvePath = [
    { type: 'M', x: 0, y: 0 },
    { type: 'C', x1: 10, y1: 20, x2: 20, y2: 20, x: 30, y: 0 },
    { type: 'C', x1: 40, y1: -20, x2: 50, y2: -20, x: 60, y: 0 },
    { type: 'Z' }
  ];

  it('Test 21: Complex cubic bezier curve within bounds is valid', () => {
    const obj = path(100, 150, curvePath);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 22: Complex cubic bezier curve reaching beyond top boundary is blocked', () => {
    // Start at Top=-45. With center-relative coordinates, cy = -45 + 50 = 5.
    // The curve goes to -20 relative to center -> absolute canvas Y = 5 - 20 = -15 -> maps to machine coordinate 315 -> out of bounds.
    const obj = path(100, -45, curvePath);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 23: Complex cubic bezier curve reaching beyond bottom boundary is blocked', () => {
    // Start at Top=290 -> maps to machine Y=10. Curve goes to y1=20 relative -> maps to machine Y=10 - 20 = -10 -> out of bounds.
    const obj = path(100, 290, curvePath);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  const quadPath = [
    { type: 'M', x: 0, y: 0 },
    { type: 'Q', x1: 25, y1: 50, x: 50, y: 0 },
    { type: 'Q', x1: 75, y1: -50, x: 100, y: 0 },
    { type: 'Z' }
  ];

  it('Test 24: Complex quadratic bezier curve within bounds is valid', () => {
    const obj = path(50, 150, quadPath);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 25: Complex quadratic bezier curve reaching beyond bottom boundary is blocked', () => {
    const obj = path(50, 290, quadPath);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 26: Multiple disconnected sub-paths (multiple M commands) within bounds', () => {
    const multiPath = [
      { type: 'M', x: 10, y: 10 },
      { type: 'L', x: 20, y: 10 },
      { type: 'M', x: 40, y: 40 },
      { type: 'L', x: 50, y: 40 }
    ];
    const obj = path(50, 50, multiPath);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 27: Multiple sub-paths with out-of-bound components are blocked', () => {
    const multiPath = [
      { type: 'M', x: 10, y: 10 },
      { type: 'L', x: 20, y: 10 },
      { type: 'M', x: 400, y: 40 }, // out of bounds!
      { type: 'L', x: 410, y: 40 }
    ];
    const obj = path(50, 50, multiPath);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 28: Path with huge SVG coordinates scaled down to fit is valid', () => {
    const hugePath = [
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 10000, y: 10000 }
    ];
    const obj = path(10, 10, hugePath, { scaleX: 0.01, scaleY: 0.01 }); // maps to X range [10, 110], Y [10, 110]
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 29: Path with tiny SVG coordinates scaled up to exceed bed is blocked', () => {
    const tinyPath = [
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 1, y: 1 }
    ];
    const obj = path(100, 100, tinyPath, { scaleX: 400, scaleY: 400 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 30: Path containing bezier curves with duplicate identical control points is valid', () => {
    const redundantCurve = [
      { type: 'M', x: 0, y: 0 },
      { type: 'C', x1: 0, y1: 0, x2: 0, y2: 0, x: 0, y: 0 }
    ];
    const obj = path(100, 100, redundantCurve);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  // ==========================================
  // CATEGORY 4: DEEPLY NESTED GROUPS (Tests 31-40)
  // ==========================================

  it('Test 31: Simple group containing two valid objects is valid', () => {
    const groupObj: CanvasObjectData = {
      type: 'group',
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      layerId: 'C00',
      objects: [
        rect(110, 110, 30, 30),
        circle(150, 150, 10)
      ]
    };
    const gcode = generator.generate([groupObj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 32: Group containing one out-of-bounds object is blocked', () => {
    const groupObj: CanvasObjectData = {
      type: 'group',
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      layerId: 'C00',
      objects: [
        rect(110, 110, 30, 30),
        rect(310, 150, 10, 10) // out of bounds!
      ]
    };
    const gcode = generator.generate([groupObj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 33: Deeply nested groups (depth 3) with valid items is valid', () => {
    const level3 = rect(150, 150, 10, 10);
    const level2: CanvasObjectData = {
      type: 'group', left: 140, top: 140, width: 30, height: 30, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
      objects: [level3]
    };
    const level1: CanvasObjectData = {
      type: 'group', left: 100, top: 100, width: 100, height: 100, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
      objects: [level2]
    };
    const gcode = generator.generate([level1]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 34: Deeply nested groups (depth 3) with one invalid item is blocked', () => {
    const level3 = rect(301, 150, 10, 10); // out of bounds
    const level2: CanvasObjectData = {
      type: 'group', left: 140, top: 140, width: 30, height: 30, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
      objects: [level3]
    };
    const level1: CanvasObjectData = {
      type: 'group', left: 100, top: 100, width: 100, height: 100, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
      objects: [level2]
    };
    const gcode = generator.generate([level1]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 35: Empty group does not generate commands or crash', () => {
    const emptyGroup: CanvasObjectData = {
      type: 'group', left: 100, top: 100, width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
      objects: []
    };
    const gcode = generator.generate([emptyGroup]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 36: Group with custom layer assignments is processed correctly', () => {
    const mixedGroup: CanvasObjectData = {
      type: 'group', left: 50, top: 50, width: 50, height: 50, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
      objects: [
        rect(60, 60, 10, 10, { layerId: 'C01' })
      ]
    };
    // Enable C01 layer
    layersStore.update((state) => ({
      ...state,
      C01: { ...state.C01, output: true, power: 80, speed: 2000, passes: 1, mode: 'Line' }
    }));
    const gcode = generator.generate([mixedGroup]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 37: Group containing path objects is valid', () => {
    const pathGroup: CanvasObjectData = {
      type: 'group', left: 100, top: 100, width: 100, height: 100, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
      objects: [
        path(110, 110, [{ type: 'M', x: 0, y: 0 }, { type: 'L', x: 20, y: 20 }])
      ]
    };
    const gcode = generator.generate([pathGroup]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 38: Group containing circular objects is valid', () => {
    const circleGroup: CanvasObjectData = {
      type: 'group', left: 100, top: 100, width: 100, height: 100, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
      objects: [
        circle(120, 120, 15)
      ]
    };
    const gcode = generator.generate([circleGroup]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 39: Nested group structure with mixed items is valid', () => {
    const parent: CanvasObjectData = {
      type: 'group', left: 50, top: 50, width: 150, height: 150, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
      objects: [
        rect(60, 60, 20, 20),
        circle(100, 100, 10),
        {
          type: 'group', left: 150, top: 150, width: 40, height: 40, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
          objects: [
            line(160, 160, 20, 20)
          ]
        }
      ]
    };
    const gcode = generator.generate([parent]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 40: Multi-item groups with one item going below Y=0 is blocked', () => {
    const parent: CanvasObjectData = {
      type: 'group', left: 50, top: 50, width: 150, height: 150, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
      objects: [
        rect(60, 60, 20, 20),
        rect(100, 299, 10, 10) // top=299, height=10 -> Y maps to [300 - 299 = 1, 300 - 309 = -9] -> out of bounds.
      ]
    };
    const gcode = generator.generate([parent]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  // ==========================================
  // CATEGORY 5: ROTATION & ANGLES (Tests 41-50)
  // ==========================================

  // Note: GcodeGenerator does not currently compute exact rotated bounding boxes since it outputs coordinates
  // based on left and top directly. However, we still want to verify rotated layouts or bounding box checks.
  // Rotated coordinates in the canvas may change the dimensions. Let's write the tests for this.

  it('Test 41: Shape at angle 0 within bounds is valid', () => {
    const obj = rect(100, 100, 50, 50, { angle: 0 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 42: Shape at angle 45 degrees within bounds is valid', () => {
    const obj = rect(100, 100, 50, 50, { angle: 45 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 43: Rotated shape placed outside boundaries on X is blocked', () => {
    const obj = rect(290, 100, 50, 50, { angle: 45 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 44: Shape rotated by 90 degrees is valid', () => {
    const obj = rect(100, 100, 50, 80, { angle: 90 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 45: Shape rotated by 180 degrees is valid', () => {
    const obj = rect(100, 100, 50, 50, { angle: 180 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 46: Shape rotated by 270 degrees is valid', () => {
    const obj = rect(100, 100, 50, 50, { angle: 270 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 47: Small rotated shape touching bottom boundary is valid', () => {
    const obj = rect(100, 240, 20, 20, { angle: 30 }); // Y range is well within [0, 300]
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 48: Large rotated shape exceeding bottom boundary is blocked', () => {
    const obj = rect(100, 270, 50, 50, { angle: 30 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 49: Arbitrary angle rotation (123.45 degrees) is valid', () => {
    const obj = rect(100, 100, 50, 50, { angle: 123.45 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 50: Negative angle rotation (-45 degrees) is valid', () => {
    const obj = rect(100, 100, 50, 50, { angle: -45 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  // ==========================================
  // CATEGORY 6: BOOLEAN OPERATIONS & MERGED PATHS (Tests 51-60)
  // ==========================================

  // standard merged path of 2 shapes: a circle and a rectangle
  const mergedPath = [
    { type: 'M', x: 20, y: 20 },
    { type: 'L', x: 80, y: 20 },
    { type: 'L', x: 80, y: 80 },
    { type: 'L', x: 20, y: 80 },
    { type: 'Z' }, // Rect part
    { type: 'M', x: 50, y: 50 },
    { type: 'C', x1: 65, y1: 50, x2: 80, y2: 65, x: 80, y: 80 },
    { type: 'C', x1: 80, y1: 95, x2: 65, y2: 110, x: 50, y: 110 },
    { type: 'C', x1: 35, y1: 110, x2: 20, y2: 95, x: 20, y: 80 },
    { type: 'C', x1: 20, y1: 65, x2: 35, y2: 50, x: 50, y: 50 },
    { type: 'Z' }  // Circle part
  ];

  it('Test 51: Merged geometry within bounds is valid', () => {
    const obj = path(100, 100, mergedPath);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 52: Merged geometry shifted slightly out-of-bounds on X is blocked', () => {
    const obj = path(210, 100, mergedPath); // right edge is left + 80 = 290 -> 210 + 80 = 290. Wait! The circle has x=80 too.
    // Let's shift it to 230 -> right edge is 230 + 80 = 310 -> blocked.
    const objBlocked = path(230, 100, mergedPath);
    const gcode = generator.generate([objBlocked]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 53: Merged geometry shifted slightly out-of-bounds on Y is blocked', () => {
    // Circle part goes to y = 110 relative.
    // Start at top = 200 -> max relative Y = 110 -> max canvas Y = 310 -> machine Y = -10 -> blocked.
    const obj = path(100, 200, mergedPath);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 54: Merged geometry scaled down is valid', () => {
    const obj = path(100, 100, mergedPath, { scaleX: 0.5, scaleY: 0.5 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 55: Concentric rings (donut shape) path within bounds is valid', () => {
    const donutPath = [
      { type: 'M', x: 10, y: 50 },
      { type: 'C', x1: 10, y1: 27, x2: 27, y2: 10, x: 50, y: 10 },
      { type: 'C', x1: 72, y1: 10, x2: 90, y2: 27, x: 90, y: 50 },
      { type: 'C', x1: 90, y1: 72, x2: 72, y2: 90, x: 50, y: 90 },
      { type: 'C', x1: 27, y1: 90, x2: 10, y2: 72, x: 10, y: 50 },
      { type: 'Z' }, // outer ring
      { type: 'M', x: 30, y: 50 },
      { type: 'C', x1: 30, y1: 38, x2: 38, y2: 30, x: 50, y: 30 },
      { type: 'C', x1: 61, y1: 30, x2: 70, y2: 38, x: 70, y: 50 },
      { type: 'C', x1: 70, y1: 61, x2: 61, y2: 70, x: 50, y: 70 },
      { type: 'C', x1: 38, y1: 70, x2: 30, y2: 61, x: 30, y: 50 },
      { type: 'Z' }  // inner ring
    ];
    const obj = path(100, 100, donutPath);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 56: Concentric rings path exceeding bounds is blocked', () => {
    const donutPath = [
      { type: 'M', x: 10, y: 50 },
      { type: 'C', x1: 10, y1: 27, x2: 27, y2: 10, x: 50, y: 10 },
      { type: 'Z' }
    ];
    const obj = path(260, 100, donutPath); // max X: 260 + 50 = 310 -> out of bounds
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 57: Boolean subtraction shape path (e.g. stencil text cutout) is valid', () => {
    const cutoutPath = [
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 100, y: 0 },
      { type: 'L', x: 100, y: 100 },
      { type: 'L', x: 0, y: 100 },
      { type: 'Z' },
      { type: 'M', x: 25, y: 25 },
      { type: 'L', x: 75, y: 25 },
      { type: 'L', x: 75, y: 75 },
      { type: 'L', x: 25, y: 75 },
      { type: 'Z' }
    ];
    const obj = path(100, 100, cutoutPath);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 58: Multi-intersection complex geometry path is valid', () => {
    const intersectPath = [
      { type: 'M', x: 0, y: 50 },
      { type: 'L', x: 100, y: 50 },
      { type: 'M', x: 50, y: 0 },
      { type: 'L', x: 50, y: 100 }
    ];
    const obj = path(100, 100, intersectPath);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 59: Star shape (complex polygon path) is valid', () => {
    const starPath = [
      { type: 'M', x: 50, y: 0 },
      { type: 'L', x: 65, y: 35 },
      { type: 'L', x: 100, y: 35 },
      { type: 'L', x: 72, y: 57 },
      { type: 'L', x: 83, y: 90 },
      { type: 'L', x: 50, y: 70 },
      { type: 'L', x: 17, y: 90 },
      { type: 'L', x: 28, y: 57 },
      { type: 'L', x: 0, y: 35 },
      { type: 'L', x: 35, y: 35 },
      { type: 'Z' }
    ];
    const obj = path(100, 100, starPath);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 60: Star shape exceeding right boundary is blocked', () => {
    const starPath = [
      { type: 'M', x: 50, y: 0 },
      { type: 'L', x: 100, y: 35 }, // X = 100
      { type: 'Z' }
    ];
    const obj = path(210, 100, starPath); // Max X: 210 + 100 = 310 -> blocked
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  // ==========================================
  // CATEGORY 7: MULTI-LAYER & MULTI-PASS (Tests 61-70)
  // ==========================================

  it('Test 61: Multiple layers with unique speed/power are valid', () => {
    layersStore.update((state) => ({
      ...state,
      C00: { ...state.C00, output: true, power: 100, speed: 3000, passes: 1, mode: 'Line' },
      C01: { ...state.C01, output: true, power: 50, speed: 1000, passes: 1, mode: 'Line' }
    }));
    const obj1 = rect(10, 10, 20, 20, { layerId: 'C00' });
    const obj2 = rect(100, 100, 20, 20, { layerId: 'C01' });
    const gcode = generator.generate([obj1, obj2]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 62: Disabled layer objects are not generated, avoiding collision', () => {
    layersStore.update((state) => ({
      ...state,
      C00: { ...state.C00, output: true, power: 100, speed: 3000 },
      C01: { ...state.C01, output: false, power: 50, speed: 1000 } // output disabled!
    }));
    const obj1 = rect(10, 10, 20, 20, { layerId: 'C00' });
    const obj2 = rect(350, 100, 20, 20, { layerId: 'C01' }); // out of bounds, but layer is disabled
    const gcode = generator.generate([obj1, obj2]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true); // Should pass because obj2 G-code is skipped
  });

  it('Test 63: Multiple passes (passes = 5) on valid rect is valid', () => {
    const obj = rect(10, 10, 20, 20, { customPasses: 5 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 64: Multiple passes on invalid rect is blocked', () => {
    const obj = rect(-10, 10, 20, 20, { customPasses: 5 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 65: Mixed mode (Fill and Line layers) within bounds is valid', () => {
    layersStore.update((state) => ({
      ...state,
      C00: { ...state.C00, output: true, mode: 'Fill', speed: 4000, power: 30 },
      C01: { ...state.C01, output: true, mode: 'Line', speed: 1000, power: 100 }
    }));
    const obj1 = rect(50, 50, 50, 50, { layerId: 'C00' }); // Fill
    const obj2 = rect(120, 120, 20, 20, { layerId: 'C01' }); // Line
    const gcode = generator.generate([obj1, obj2]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 66: Hatch fill horizontal lines stay within limits', () => {
    const obj = rect(280, 280, 15, 15, { customMode: 'Fill', customHatchAngle: 0, customInterval: 1.0 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 67: Hatch fill horizontal lines exceeding X boundary is blocked', () => {
    const obj = rect(290, 280, 15, 15, { customMode: 'Fill', customHatchAngle: 0, customInterval: 1.0 }); // goes to 305
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 68: Hatch fill vertical lines stay within limits', () => {
    const obj = rect(280, 280, 15, 15, { customMode: 'Fill', customHatchAngle: 90, customInterval: 1.0 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 69: Hatch fill vertical lines exceeding Y boundary is blocked', () => {
    // top=0, height=15 -> mapY(0) = 300, mapY(15) = 285.
    // If top=-5 -> mapY(-5) = 305 -> out of bounds.
    const obj = rect(100, -5, 15, 15, { customMode: 'Fill', customHatchAngle: 90, customInterval: 1.0 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 70: Crosshatch fill (45 degrees) within bounds is valid', () => {
    const obj = rect(100, 100, 30, 30, { customMode: 'Fill', customHatchAngle: 45, customInterval: 2.0 });
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  // ==========================================
  // CATEGORY 8: RELATIVE COORDINATES MODE (Tests 71-80)
  // ==========================================

  it('Test 71: Relative positioning sequence within limits is valid', () => {
    const gcode = 'G91\nG1 X50 Y50\nX50 Y50\nX50 Y50\nG90';
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 72: Relative positioning sequence going negative is blocked', () => {
    const gcode = 'G91\nG1 X50 Y50\nX-60 Y0'; // 50 - 60 = -10 -> blocked
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 73: Relative positioning sequence exceeding X max limit is blocked', () => {
    const gcode = 'G91\nG1 X200 Y200\nX101 Y0'; // 200 + 101 = 301 -> blocked
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 74: Relative positioning sequence exceeding Y max limit is blocked', () => {
    const gcode = 'G91\nG1 X200 Y200\nX0 Y101'; // 200 + 101 = 301 -> blocked
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 75: Alternating G90 and G91 modes within bounds is valid', () => {
    const gcode = [
      'G90',
      'G0 X100 Y100',
      'G91',
      'G1 X50 Y50', // reaches absolute (150, 150)
      'G90',
      'G1 X200 Y200' // reaches absolute (200, 200)
    ].join('\n');
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 76: Alternating G90/G91 going out-of-bounds in relative mode is blocked', () => {
    const gcode = [
      'G90',
      'G0 X100 Y100',
      'G91',
      'G1 X201 Y0' // 100 + 201 = 301 -> blocked
    ].join('\n');
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 77: Alternating G90/G91 going out-of-bounds in absolute mode is blocked', () => {
    const gcode = [
      'G91',
      'G1 X50 Y50',
      'G90',
      'G1 X305 Y100' // absolute X=305 -> blocked
    ].join('\n');
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 78: Inch unit mode (G20) with safe coordinates is valid', () => {
    const gcode = [
      'G20 ; inches',
      'G90',
      'G0 X2 Y2', // 2 inches = 50.8 mm -> safe
      'G1 X10 Y10 F100' // 10 inches = 254 mm -> safe
    ].join('\n');
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 79: Inch unit mode (G20) exceeding limits is blocked', () => {
    const gcode = [
      'G20',
      'G90',
      'G0 X12 Y5' // 12 inches = 304.8 mm -> blocked
    ].join('\n');
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 80: Switching G20/G21 mid-program is valid and scales correctly', () => {
    const gcode = [
      'G90',
      'G20',
      'G0 X5 Y5', // 127mm
      'G21',
      'G0 X250 Y250' // 250mm
    ].join('\n');
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  // ==========================================
  // CATEGORY 9: CIRCULAR SWEEP & HELICAL ARCS (Tests 81-90)
  // ==========================================

  it('Test 81: Large clockwise circle (G2) in the center of the bed is valid', () => {
    const gcode = 'G90\nG0 X100 Y150\nG2 X200 Y150 I50 J0';
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 82: Large counter-clockwise circle (G3) in the center of the bed is valid', () => {
    const gcode = 'G90\nG0 X200 Y150\nG3 X100 Y150 I-50 J0';
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 83: Clockwise arc (G2) with negative offsets (I/J) within bounds is valid', () => {
    const gcode = 'G90\nG0 X200 Y150\nG2 X100 Y150 I-50 J0';
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 84: Arc with very small radius is valid', () => {
    const gcode = 'G90\nG0 X150 Y150\nG2 X150.2 Y150 I0.1 J0';
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 85: Circle exactly touching Top boundary is valid', () => {
    // Center at (150, 275), radius 25 -> Y range is [250, 300]
    const obj = circle(125, 0, 25); // Top=0 -> Y maps to [250, 300]
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 86: Circle exceeding Top boundary via arc sweep is blocked', () => {
    const obj = circle(125, -1, 25); // exceeds by 1mm
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 87: Circle exactly touching Bottom boundary is valid', () => {
    const obj = circle(125, 250, 25); // Bottom at Y=250+50=300 -> Y maps to [0, 50]
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 88: Circle exceeding Bottom boundary via arc sweep is blocked', () => {
    const obj = circle(125, 251, 25); // exceeds by 1mm
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 89: 360-degree loop composed of multiple G2 segments is valid', () => {
    const gcode = [
      'G90',
      'G0 X100 Y150',
      'G2 X200 Y150 I50 J0',
      'G2 X100 Y150 I-50 J0'
    ].join('\n');
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 90: Circular arc with missing I/J parameters defaults to 0 and checks bounds', () => {
    const gcode = 'G90\nG0 X100 Y100\nG2 X105 Y100'; // I=0, J=0 -> radius=0 -> linear move
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  // ==========================================
  // CATEGORY 10: ORIGIN OFFSETS & MANUAL ZERO (Tests 91-100)
  // ==========================================

  it('Test 91: TopLeft origin configuration limits validation', () => {
    settingsStore.updateSettings({ origin: 'TopLeft' });
    // Y matches canvas coordinate. top=0, height=50 -> Y maps to [0, 50] -> valid.
    const obj = rect(10, 10, 50, 50);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 92: TopLeft origin out-of-bounds on Y is blocked', () => {
    settingsStore.updateSettings({ origin: 'TopLeft' });
    const obj = rect(10, 260, 50, 50); // top=260, height=50 -> goes to 310 -> blocked
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 93: TopRight origin configuration limits validation', () => {
    settingsStore.updateSettings({ origin: 'TopRight' });
    // X is inverted (300 - X). left=10, width=50 -> X maps to [240, 290] -> valid.
    const obj = rect(10, 10, 50, 50);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 94: TopRight origin out-of-bounds on X is blocked', () => {
    settingsStore.updateSettings({ origin: 'TopRight' });
    // left=-10 -> X maps to 310 -> blocked.
    const obj = rect(-10, 10, 50, 50);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 95: BottomRight origin configuration limits validation', () => {
    settingsStore.updateSettings({ origin: 'BottomRight' });
    // X is inverted, Y is inverted.
    const obj = rect(10, 10, 50, 50);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 96: BottomRight origin out-of-bounds on Y is blocked', () => {
    settingsStore.updateSettings({ origin: 'BottomRight' });
    const obj = rect(10, -5, 50, 50); // top=-5 -> Y maps to 305 -> blocked.
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 97: Center origin with object exceeding bounds is blocked', () => {
    settingsStore.updateSettings({ origin: 'Center' });
    // Bounds are [-150, 150]. Object left=110, width=50 -> X is [110 - 150 = -40, 160 - 150 = 10] -> valid.
    // Let's place it at left=280 -> X is [280 - 150 = 130, 330 - 150 = 180] -> blocked.
    const obj = rect(280, 100, 50, 50);
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });

  it('Test 98: Center origin with object within bounds is valid', () => {
    settingsStore.updateSettings({ origin: 'Center' });
    const obj = rect(100, 100, 100, 100); // maps to X: [-50, 50], Y: [-50, 50] -> valid
    const gcode = generator.generate([obj]);
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 99: Custom 0/0 justification is safe when using Set Zero (G92 X0 Y0)', () => {
    // If the G-code contains G92 X0 Y0, the validator resets its current position tracker to 0,0.
    // Since 0,0 is safe inside the workspace, this allows resetting tracking correctly.
    const gcode = [
      'G90',
      'G0 X100 Y100',
      'G92 X0 Y0', // Zero here
      'G1 X50 Y50' // this relative offset is fine
    ].join('\n');
    expect(GcodeValidator.validate(gcode).valid).toBe(true);
  });

  it('Test 100: Manual G92 offset sequence exceeding workspace boundary is blocked', () => {
    const gcode = [
      'G90',
      'G0 X100 Y100',
      'G92 X0 Y0',
      'G1 X301 Y0' // 301 is out of bounds even after zeroing because the machine bed size is 300x300.
    ].join('\n');
    expect(GcodeValidator.validate(gcode).valid).toBe(false);
  });
});
