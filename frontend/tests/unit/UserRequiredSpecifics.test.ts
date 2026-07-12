import { describe, it, expect, beforeEach } from 'vitest';
import { GcodeGenerator, type CanvasObjectData } from '../../src/lib/gcode/GcodeGenerator';
import { GcodeValidator } from '../../src/lib/gcode/GcodeValidator';
import { settingsStore } from '../../src/lib/stores/settingsStore';
import { layersStore } from '../../src/lib/stores/layersStore';

describe('User Required Specifics Tests (180 Total Cases)', () => {
  let generator: GcodeGenerator;

  beforeEach(() => {
    generator = new GcodeGenerator();
    settingsStore.updateSettings({
      workingSizeX: 300,
      workingSizeY: 300,
      origin: 'BottomLeft',
      laserMode: 'M3'
    });
    // Ensure layers C00, C01, C02 are configured and output is true
    layersStore.update((state) => ({
      ...state,
      C00: { ...state.C00, output: true, power: 80, speed: 3000, passes: 1, mode: 'Line' },
      C01: { ...state.C01, output: true, power: 100, speed: 1000, passes: 1, mode: 'Line' },
      C02: { ...state.C02, output: true, power: 40, speed: 4000, passes: 1, mode: 'Fill' }
    }));
  });

  // Perfectly centered path presets spanning exactly [-width/2, width/2]
  const heartPath = [
    { type: 'M', x: 0, y: 50 },
    { type: 'C', x1: 0, y1: 50, x2: -50, y2: 12.5, x: -50, y: -25 },
    { type: 'C', x1: -50, y1: -50, x2: -28, y2: -50, x: 0, y: -25 },
    { type: 'C', x1: 28, y1: -50, x2: 50, y2: -50, x: 50, y: -25 },
    { type: 'C', x1: 50, y1: 12.5, x2: 0, y2: 50, x: 0, y: 50 },
    { type: 'Z' }
  ];

  const starPath = [
    { type: 'M', x: 0, y: -50 },
    { type: 'L', x: 15, y: -15 },
    { type: 'L', x: 50, y: -15 },
    { type: 'L', x: 22, y: 10 },
    { type: 'L', x: 33, y: 50 },
    { type: 'L', x: 0, y: 25 },
    { type: 'L', x: -33, y: 50 },
    { type: 'L', x: -22, y: 10 },
    { type: 'L', x: -50, y: -15 },
    { type: 'L', x: -15, y: -15 },
    { type: 'Z' }
  ];

  const arrowPath = [
    { type: 'M', x: -50, y: -20 },
    { type: 'L', x: 10, y: -20 },
    { type: 'L', x: 10, y: -50 },
    { type: 'L', x: 50, y: 0 },
    { type: 'L', x: 10, y: 50 },
    { type: 'L', x: 10, y: 20 },
    { type: 'L', x: -50, y: 20 },
    { type: 'Z' }
  ];

  // Helper to extract bounds from generated G-code (Brenngang)
  function getGcodeBounds(gcode: string): { minX: number; maxX: number; minY: number; maxY: number } | null {
    const lines = gcode.split('\n');
    const pts: { x: number; y: number }[] = [];
    
    let prevX = 0;
    let prevY = 0;
    let currentX = 0;
    let currentY = 0;
    let currentPower = 0;
    
    for (const line of lines) {
      if (line.includes("Footer") || line.includes("Parkposition") || line.includes("M2")) {
        break;
      }
      const sMatch = line.match(/S([\d.-]+)/);
      if (sMatch) currentPower = parseFloat(sMatch[1]);
      if (line.includes("M5")) currentPower = 0;
      
      const xMatch = line.match(/X([\d.-]+)/);
      const yMatch = line.match(/Y([\d.-]+)/);
      
      prevX = currentX;
      prevY = currentY;
      
      if (xMatch) currentX = parseFloat(xMatch[1]);
      if (yMatch) currentY = parseFloat(yMatch[1]);
      
      if (line.startsWith('G1') || line.startsWith('G2') || line.startsWith('G3')) {
        if (currentPower > 0 && (xMatch || yMatch)) {
          pts.push({ x: prevX, y: prevY });
          pts.push({ x: currentX, y: currentY });
        }
      }
    }
    
    if (pts.length === 0) return null;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, maxX, minY, maxY };
  }

  // --- TYPE 1: CIRCLE (10 Tests) ---
  describe('Circle Generation & Simulation (10 Cases)', () => {
    const cases = Array.from({ length: 10 }, (_, idx) => {
      const size = 10 + idx * 5; // diameter 10mm to 55mm
      const left = 20 + idx * 15; // left offset
      const top = 20 + idx * 10;
      return { id: idx + 1, left, top, radius: size / 2, size };
    });

    cases.forEach((c) => {
      it(`Circle Case #${c.id}: diameter=${c.size}mm at X=${c.left}, Y=${c.top}`, () => {
        const obj: CanvasObjectData = {
          type: 'circle',
          left: c.left,
          top: c.top,
          width: c.size,
          height: c.size,
          radius: c.radius,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          layerId: 'C00'
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for Circle Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);

        const bounds = getGcodeBounds(gcode);
        expect(bounds).not.toBeNull();
        
        // Horizontal range check: left to left + size
        expect(bounds!.minX).toBeCloseTo(c.left, 0.5);
        expect(bounds!.maxX).toBeCloseTo(c.left + c.size, 0.5);
      });
    });
  });

  // --- TYPE 2: RECTANGLE (10 Tests) ---
  describe('Rectangle Generation & Simulation (10 Cases)', () => {
    const cases = Array.from({ length: 10 }, (_, idx) => {
      const w = 15 + idx * 6;
      const h = 10 + idx * 4;
      const left = 10 + idx * 15;
      const top = 10 + idx * 12;
      return { id: idx + 1, left, top, w, h };
    });

    cases.forEach((c) => {
      it(`Rectangle Case #${c.id}: size=${c.w}x${c.h}mm at X=${c.left}, Y=${c.top}`, () => {
        const obj: CanvasObjectData = {
          type: 'rect',
          left: c.left,
          top: c.top,
          width: c.w,
          height: c.h,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          layerId: 'C00'
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for Rect Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);

        const bounds = getGcodeBounds(gcode);
        expect(bounds).not.toBeNull();
        expect(bounds!.minX).toBeCloseTo(c.left, 0.5);
        expect(bounds!.maxX).toBeCloseTo(c.left + c.w, 0.5);
      });
    });
  });

  // --- TYPE 3: ELLIPSE (10 Tests) ---
  describe('Ellipse Generation & Simulation (10 Cases)', () => {
    const cases = Array.from({ length: 10 }, (_, idx) => {
      const rx = 10 + idx * 4;
      const ry = 6 + idx * 3;
      const left = 30 + idx * 10;
      const top = 20 + idx * 10;
      return { id: idx + 1, left, top, rx, ry };
    });

    cases.forEach((c) => {
      it(`Ellipse Case #${c.id}: rx=${c.rx}, ry=${c.ry} at X=${c.left}, Y=${c.top}`, () => {
        const obj: CanvasObjectData = {
          type: 'ellipse',
          left: c.left,
          top: c.top,
          width: c.rx * 2,
          height: c.ry * 2,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          layerId: 'C00'
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for Ellipse Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);

        const bounds = getGcodeBounds(gcode);
        expect(bounds).not.toBeNull();
        expect(bounds!.minX).toBeCloseTo(c.left, 0.5);
        expect(bounds!.maxX).toBeCloseTo(c.left + c.rx * 2, 0.5);
      });
    });
  });

  // --- TYPE 4: TRIANGLE (10 Tests) ---
  describe('Triangle Generation & Simulation (10 Cases)', () => {
    const cases = Array.from({ length: 10 }, (_, idx) => {
      const w = 12 + idx * 5;
      const h = 8 + idx * 6;
      const left = 15 + idx * 12;
      const top = 20 + idx * 11;
      return { id: idx + 1, left, top, w, h };
    });

    cases.forEach((c) => {
      it(`Triangle Case #${c.id}: base=${c.w}, height=${c.h} at X=${c.left}, Y=${c.top}`, () => {
        const obj: CanvasObjectData = {
          type: 'triangle',
          left: c.left,
          top: c.top,
          width: c.w,
          height: c.h,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          layerId: 'C00'
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for Triangle Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);

        const bounds = getGcodeBounds(gcode);
        expect(bounds).not.toBeNull();
        expect(bounds!.minX).toBeCloseTo(c.left, 0.5);
        expect(bounds!.maxX).toBeCloseTo(c.left + c.w, 0.5);
      });
    });
  });

  // --- TYPE 5: STAR (10 Tests) ---
  describe('Star Shape Generation & Simulation (10 Cases)', () => {
    const cases = Array.from({ length: 10 }, (_, idx) => {
      const size = 15 + idx * 5;
      const left = 20 + idx * 14;
      const top = 20 + idx * 12;
      return { id: idx + 1, left, top, size };
    });

    cases.forEach((c) => {
      it(`Star Case #${c.id}: size=${c.size} at X=${c.left}, Y=${c.top}`, () => {
        const obj: CanvasObjectData = {
          type: 'path',
          left: c.left,
          top: c.top,
          width: 100,
          height: 100,
          scaleX: c.size / 100,
          scaleY: c.size / 100,
          angle: 0,
          path: starPath,
          layerId: 'C00'
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for Star Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);

        const bounds = getGcodeBounds(gcode);
        expect(bounds).not.toBeNull();
        expect(bounds!.minX).toBeCloseTo(c.left, 0.5);
        expect(bounds!.maxX).toBeCloseTo(c.left + c.size, 0.5);
      });
    });
  });

  // --- TYPE 6: HEART (10 Tests) ---
  describe('Heart Shape Generation & Simulation (10 Cases)', () => {
    const cases = Array.from({ length: 10 }, (_, idx) => {
      const size = 20 + idx * 4;
      const left = 30 + idx * 12;
      const top = 30 + idx * 10;
      return { id: idx + 1, left, top, size };
    });

    cases.forEach((c) => {
      it(`Heart Case #${c.id}: size=${c.size} at X=${c.left}, Y=${c.top}`, () => {
        const obj: CanvasObjectData = {
          type: 'path',
          left: c.left,
          top: c.top,
          width: 100,
          height: 100,
          scaleX: c.size / 100,
          scaleY: c.size / 100,
          angle: 0,
          path: heartPath,
          layerId: 'C00'
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for Heart Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);

        const bounds = getGcodeBounds(gcode);
        expect(bounds).not.toBeNull();
        expect(bounds!.minX).toBeCloseTo(c.left, 0.5);
        expect(bounds!.maxX).toBeCloseTo(c.left + c.size, 0.5);
      });
    });
  });

  // --- TYPE 7: ARROW (10 Tests) ---
  describe('Arrow Shape Generation & Simulation (10 Cases)', () => {
    const cases = Array.from({ length: 10 }, (_, idx) => {
      const size = 15 + idx * 6;
      const left = 15 + idx * 15;
      const top = 15 + idx * 10;
      return { id: idx + 1, left, top, size };
    });

    cases.forEach((c) => {
      it(`Arrow Case #${c.id}: size=${c.size} at X=${c.left}, Y=${c.top}`, () => {
        const obj: CanvasObjectData = {
          type: 'path',
          left: c.left,
          top: c.top,
          width: 100,
          height: 100,
          scaleX: c.size / 100,
          scaleY: c.size / 100,
          angle: 0,
          path: arrowPath,
          layerId: 'C00'
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for Arrow Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);

        const bounds = getGcodeBounds(gcode);
        expect(bounds).not.toBeNull();
        expect(bounds!.minX).toBeCloseTo(c.left, 0.5);
        expect(bounds!.maxX).toBeCloseTo(c.left + c.size, 0.5);
      });
    });
  });

  // --- TYPE 8: POLYGON (10 Tests) ---
  describe('Polygon Generation & Simulation (10 Cases)', () => {
    const cases = Array.from({ length: 10 }, (_, idx) => {
      const size = 18 + idx * 5;
      const left = 20 + idx * 13;
      const top = 20 + idx * 12;
      return { id: idx + 1, left, top, size };
    });

    cases.forEach((c) => {
      it(`Polygon Case #${c.id}: size=${c.size} at X=${c.left}, Y=${c.top}`, () => {
        const pentagonCommands = [
          { type: 'M', x: 0, y: -50 },
          { type: 'L', x: 50, y: -15 },
          { type: 'L', x: 31, y: 50 },
          { type: 'L', x: -31, y: 50 },
          { type: 'L', x: -50, y: -15 },
          { type: 'Z' }
        ];

        const obj: CanvasObjectData = {
          type: 'path',
          left: c.left,
          top: c.top,
          width: 100,
          height: 100,
          scaleX: c.size / 100,
          scaleY: c.size / 100,
          angle: 0,
          path: pentagonCommands,
          layerId: 'C00'
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for Polygon Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);

        const bounds = getGcodeBounds(gcode);
        expect(bounds).not.toBeNull();
        expect(bounds!.minX).toBeCloseTo(c.left, 0.5);
        expect(bounds!.maxX).toBeCloseTo(c.left + c.size, 0.5);
      });
    });
  });

  // --- TYPE 9: LINE (10 Tests) ---
  describe('Line Generation & Simulation (10 Cases)', () => {
    const cases = Array.from({ length: 10 }, (_, idx) => {
      const length = 20 + idx * 10;
      const left = 10 + idx * 12;
      const top = 40 + idx * 8;
      return { id: idx + 1, left, top, length };
    });

    cases.forEach((c) => {
      it(`Line Case #${c.id}: length=${c.length} at X=${c.left}, Y=${c.top}`, () => {
        const obj: CanvasObjectData = {
          type: 'line',
          left: c.left,
          top: c.top,
          width: c.length,
          height: 0,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          layerId: 'C00'
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for Line Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);

        const bounds = getGcodeBounds(gcode);
        expect(bounds).not.toBeNull();
        expect(bounds!.minX).toBeCloseTo(c.left, 0.5);
        expect(bounds!.maxX).toBeCloseTo(c.left + c.length, 0.5);
      });
    });
  });

  // --- TYPE 10: TEXT (10 Tests) ---
  describe('Text Generation & Simulation (10 Cases)', () => {
    const cases = [
      { id: 1, text: 'Hello Laser', template: false, left: 10, top: 10 },
      { id: 2, text: 'Date: {date}', template: true, left: 30, top: 20 },
      { id: 3, text: 'Time: {time}', template: true, left: 50, top: 30 },
      { id: 4, text: 'Serial: {serial:0001}', template: true, left: 70, top: 40 },
      { id: 5, text: 'Laser Engrave', template: false, left: 90, top: 50 },
      { id: 6, text: 'TwoTrees TTS10', template: false, left: 110, top: 60 },
      { id: 7, text: 'Custom 2026', template: false, left: 130, top: 70 },
      { id: 8, text: 'Speed vs Power', template: false, left: 150, top: 80 },
      { id: 9, text: 'Calibration Suit', template: false, left: 170, top: 90 },
      { id: 10, text: 'Final Run', template: false, left: 190, top: 100 }
    ];

    cases.forEach((c) => {
      it(`Text Case #${c.id}: "${c.text}" at X=${c.left}, Y=${c.top}`, () => {
        const obj: CanvasObjectData = {
          type: 'text',
          left: c.left,
          top: c.top,
          width: 50,
          height: 10,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          text: c.text,
          layerId: 'C00'
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for Text Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);
        expect(gcode).toBeDefined();
      });
    });
  });

  // --- TYPE 11: IMAGE (10 Tests) ---
  describe('Image Raster Generation & Simulation (10 Cases)', () => {
    const cases = Array.from({ length: 10 }, (_, idx) => {
      const mode = idx % 2 === 0 ? 'dither' as const : 'threshold' as const;
      const dither = idx % 2 === 0 ? 'floyd-steinberg' as const : 'atkinson' as const;
      const w = 20 + idx * 5;
      const h = 20 + idx * 5;
      const left = 20 + idx * 10;
      const top = 20 + idx * 10;
      return { id: idx + 1, left, top, w, h, mode, dither };
    });

    cases.forEach((c) => {
      it(`Image Case #${c.id}: size=${c.w}x${c.h}mm at X=${c.left}, Y=${c.top} using ${c.mode}`, () => {
        const obj: CanvasObjectData = {
          type: 'image',
          left: c.left,
          top: c.top,
          width: c.w,
          height: c.h,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          layerId: 'C02',
          imageMode: c.mode,
          ditherType: c.dither,
          brightness: 10,
          contrast: -5,
          gamma: 1.2,
          invert: false,
          thresholdValue: 120,
          overscan: 2.5
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for Image Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);
        expect(gcode).toContain('Start Raster Image scan');
      });
    });
  });

  // --- TYPE 12: BARCODE (10 Tests) ---
  describe('Barcode Generation & Simulation (10 Cases)', () => {
    const types = [
      'qrcode', 'datamatrix', 'pdf417', 'code128', 'ean13', 'code39', 'aruco', 'apriltag36h11', 'qrcode', 'code128'
    ];

    // Barcode dimensions must be large enough to not clip boundaries
    const cases = Array.from({ length: 10 }, (_, idx) => {
      const bcid = types[idx];
      const template = bcid.includes('ean') ? '1234567890128' : `SN-${idx}`;
      const left = 10 + idx * 10;
      const top = 10 + idx * 10;
      return { id: idx + 1, bcid, template, left, top };
    });

    cases.forEach((c) => {
      it(`Barcode Case #${c.id}: bcid=${c.bcid} template="${c.template}" at X=${c.left}, Y=${c.top}`, () => {
        const obj: CanvasObjectData = {
          type: 'rect',
          left: c.left,
          top: c.top,
          width: 30,
          height: 15,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          layerId: 'C00',
          barcode: {
            bcid: c.bcid,
            template: c.template,
            scale: 1, // smaller scale so barcode fits bed limits
            height: 5
          }
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for Barcode Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);

        const bounds = getGcodeBounds(gcode);
        expect(bounds).not.toBeNull();
        expect(bounds!.minX).toBeGreaterThanOrEqual(c.left - 5);
      });
    });
  });

  // --- TYPE 13: SVG PATH (10 Tests) ---
  describe('SVG Path Generation & Simulation (10 Cases)', () => {
    const cases = Array.from({ length: 10 }, (_, idx) => {
      const size = 15 + idx * 6;
      const left = 10 + idx * 14;
      const top = 20 + idx * 10;
      return { id: idx + 1, left, top, size };
    });

    cases.forEach((c) => {
      it(`SVG Path Case #${c.id}: size=${c.size} at X=${c.left}, Y=${c.top}`, () => {
        const keyholePath = [
          { type: 'M', x: -25, y: -15 },
          { type: 'L', x: -10, y: -15 },
          { type: 'C', x1: -5, y1: -25, x2: 5, y2: -25, x: 10, y: -15 },
          { type: 'L', x: 25, y: -15 },
          { type: 'L', x: 25, y: 15 },
          { type: 'L', x: -25, y: 15 },
          { type: 'Z' }
        ];

        const obj: CanvasObjectData = {
          type: 'path',
          left: c.left,
          top: c.top,
          width: 50,
          height: 30,
          scaleX: c.size / 50,
          scaleY: c.size / 30,
          angle: 0,
          path: keyholePath,
          layerId: 'C00'
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for SVG Path Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);

        const bounds = getGcodeBounds(gcode);
        expect(bounds).not.toBeNull();
        expect(bounds!.minX).toBeCloseTo(c.left, 0.5);
        expect(bounds!.maxX).toBeCloseTo(c.left + c.size, 0.5);
      });
    });
  });

  // --- TYPE 14: DXF PATH (10 Tests) ---
  describe('DXF Import Path Generation & Simulation (10 Cases)', () => {
    const cases = Array.from({ length: 10 }, (_, idx) => {
      const size = 20 + idx * 5;
      const left = 20 + idx * 11;
      const top = 10 + idx * 12;
      return { id: idx + 1, left, top, size };
    });

    cases.forEach((c) => {
      it(`DXF Path Case #${c.id}: size=${c.size} at X=${c.left}, Y=${c.top}`, () => {
        const dxfPolyline = [
          { type: 'M', x: -15, y: -15 },
          { type: 'L', x: 15, y: -15 },
          { type: 'L', x: 15, y: 15 },
          { type: 'L', x: -15, y: 15 },
          { type: 'Z' }
        ];

        const obj: CanvasObjectData = {
          type: 'path',
          left: c.left,
          top: c.top,
          width: 30,
          height: 30,
          scaleX: c.size / 30,
          scaleY: c.size / 30,
          angle: 0,
          path: dxfPolyline,
          layerId: 'C00'
        };

        const gcode = generator.generate([obj]);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for DXF Path Case #${c.id}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);

        const bounds = getGcodeBounds(gcode);
        expect(bounds).not.toBeNull();
        try {
          expect(bounds!.minX).toBeCloseTo(c.left, 0.5);
          expect(bounds!.maxX).toBeCloseTo(c.left + c.size, 0.5);
        } catch (err) {
          const fs = require('fs');
          fs.writeFileSync('/home/thomas/Antigravity_Projects/TTS10/frontend/scratch/dxf_gcode.txt', `GCODE:\n${gcode}\nBOUNDS:\n${JSON.stringify(bounds)}`);
          throw err;
        }
      });
    });
  });

  // --- MIXED LAYOUTS (30 Tests) ---
  describe('Mixed Layouts with Multiple Objects & Layers (30 Cases)', () => {
    for (let testIdx = 1; testIdx <= 30; testIdx++) {
      it(`Mixed Layout Case #${testIdx}: up to 20 objects on multiple layers`, () => {
        const objectsCount = 5 + (testIdx % 16);
        const objects: CanvasObjectData[] = [];

        for (let i = 0; i < objectsCount; i++) {
          const typeVal = (i + testIdx) % 7;
          const left = 10 + (i * 12 + testIdx * 3) % 200;
          const top = 10 + (i * 10 + testIdx * 4) % 200;
          const size = 8 + (i * 2 + testIdx) % 15;
          const layerId = i % 3 === 0 ? 'C00' : (i % 3 === 1 ? 'C01' : 'C02');

          if (typeVal === 0) {
            objects.push({
              type: 'circle',
              left, top,
              width: size, height: size, radius: size / 2,
              scaleX: 1, scaleY: 1, angle: 0, layerId
            });
          } else if (typeVal === 1) {
            objects.push({
              type: 'rect',
              left, top,
              width: size * 1.5, height: size,
              scaleX: 1, scaleY: 1, angle: 0, layerId
            });
          } else if (typeVal === 2) {
            objects.push({
              type: 'ellipse',
              left, top,
              width: size * 1.2, height: size * 0.8,
              scaleX: 1, scaleY: 1, angle: 0, layerId
            });
          } else if (typeVal === 3) {
            objects.push({
              type: 'triangle',
              left, top,
              width: size, height: size * 1.3,
              scaleX: 1, scaleY: 1, angle: 0, layerId
            });
          } else if (typeVal === 4) {
            objects.push({
              type: 'path',
              left, top,
              width: 100, height: 100,
              scaleX: size / 100, scaleY: size / 100,
              angle: 0,
              path: heartPath,
              layerId
            });
          } else if (typeVal === 5) {
            objects.push({
              type: 'line',
              left, top,
              width: size * 2, height: 0,
              scaleX: 1, scaleY: 1, angle: 0, layerId
            });
          } else {
            objects.push({
              type: 'text',
              left, top,
              width: size * 3, height: 8,
              scaleX: 1, scaleY: 1, angle: 0,
              text: `Item-${i}`,
              layerId
            });
          }
        }

        const gcode = generator.generate(objects);
        const validation = GcodeValidator.validate(gcode);
        if (!validation.valid) {
          console.error(`Validation failed for Mixed Layout Case #${testIdx}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);
        expect(gcode).toBeDefined();
      });
    }
  });
});
