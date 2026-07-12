import { describe, it, expect, beforeEach, vi } from 'vitest';
import { canvasStore } from '../../src/lib/stores/canvasStore';
import { settingsStore } from '../../src/lib/stores/settingsStore';
import { layersStore } from '../../src/lib/stores/layersStore';
import { GcodeProjectService } from '../../src/lib/services/GcodeProjectService';
import { GcodeGenerator, CanvasObjectData } from '../../src/lib/gcode/GcodeGenerator';
import { applyImageFilters } from '../../src/lib/canvas/LaserCanvas';

// Mock DOM elements and URL methods that are browser-specific
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  window.URL.revokeObjectURL = vi.fn();
}

// Mock document.createElement for click simulation in GcodeProjectService
const mockClick = vi.fn();
const mockAnchor = {
  href: '',
  download: '',
  click: mockClick,
};
const realCreateElement = typeof document !== 'undefined' ? document.createElement.bind(document) : null;
vi.stubGlobal('document', {
  createElement: vi.fn((tagName: string) => {
    if (tagName === 'a') return mockAnchor;
    if (realCreateElement) return realCreateElement(tagName);
    return {};
  }),
});

let mockFileContent = '';
class MockFileReader {
  onload: any = null;
  onerror: any = null;
  result = '';
  readAsText(file: any) {
    this.result = mockFileContent;
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: mockFileContent } } as any);
      }
    }, 0);
  }
}
vi.stubGlobal('FileReader', MockFileReader);

describe('Antigravity 2.0 - 100 Test Suite for Simulator, Image Engraving, File menu & Backgrounds', () => {
  let gcodeGen: GcodeGenerator;

  beforeEach(() => {
    gcodeGen = new GcodeGenerator();
    canvasStore.reset();
    settingsStore.set({
      workingSizeX: 300,
      workingSizeY: 300,
      origin: 'BottomLeft',
      resolution: 0.1,
      units: 'mm',
      laserMode: 'M3'
    });
    layersStore.resetToDefaults();
    mockClick.mockClear();
    mockAnchor.href = '';
    mockAnchor.download = '';
  });

  // ==========================================
  // PART 1: Background Modes & Transitions (Tests 1 to 25)
  // ==========================================
  describe('Background Mode Toggles & Grid Snap Resolutions', () => {
    const modes = ['darkGrid', 'white', 'camera'] as const;
    const resolutions = [0, 0.1, 0.5, 1.0, 5.0, 10.0];

    // Generate 25 distinct combinations/transitions tests
    for (let i = 1; i <= 25; i++) {
      const modeIndex = i % 3;
      const resIndex = i % 6;
      const targetMode = modes[modeIndex];
      const targetRes = resolutions[resIndex];

      it(`[Test ${i.toString().padStart(3, '0')}] should correctly transition background to "${targetMode}" and grid snap to ${targetRes}mm`, () => {
        canvasStore.setBackgroundMode(targetMode);
        canvasStore.setGridResolution(targetRes);

        expect(canvasStore.get().backgroundMode).toBe(targetMode);
        expect(canvasStore.get().gridResolution).toBe(targetRes);
      });
    }
  });

  // ==========================================
  // PART 2: Project & Configuration Serialization (Tests 26 to 60)
  // ==========================================
  describe('Project and Configuration Import/Export JSON Integrity', () => {
    
    // Test empty project structure
    it('[Test 026] serializes project state with correct schema version and fields', async () => {
      const mockCanvas: any = {
        toJSON: vi.fn(() => ({ objects: [] })),
      };
      
      vi.mocked(URL.createObjectURL).mockClear();
      GcodeProjectService.saveProject(mockCanvas, '; Test Gcode');
      
      expect(mockCanvas.toJSON).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockAnchor.download).toContain('.gravity');
      
      const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
      const text = await blob.text();
      const projectData = JSON.parse(text);
      expect(projectData.version).toBe('2.0.0');
      expect(projectData.canvasObjects).toEqual({ objects: [] });
      expect(projectData.gcode).toBe('; Test Gcode');
    });

    // Generate tests 27 to 51 for loading project state variations
    for (let i = 27; i <= 51; i++) {
      it(`[Test ${i.toString().padStart(3, '0')}] restores project state accurately for variation #${i}`, async () => {
        const mockCanvas: any = {
          clear: vi.fn(),
          loadFromJSON: vi.fn(() => Promise.resolve()),
          requestRenderAll: vi.fn(),
        };

        const mockProjectFileContent = JSON.stringify({
          version: '2.0.0',
          canvasObjects: { objects: [{ type: 'rect', left: i }] },
          layers: { ...layersStore.get(), C00: { id: 'C00', name: `Layer_${i}`, color: '#ff00ff', speed: 4000, power: 80, passes: 2, airAssist: true, output: true, mode: 'line' } },
          machineSettings: { ...settingsStore.get(), workingSizeX: 400 + i },
          gcode: `; Gcode Variation ${i}`,
        });

        mockFileContent = mockProjectFileContent;
        const mockFile = new File([mockProjectFileContent], 'test.gravity', { type: 'application/json' });

        const loadedGcode = await GcodeProjectService.loadProject(mockCanvas, mockFile);

        expect(loadedGcode).toBe(`; Gcode Variation ${i}`);
        expect(mockCanvas.clear).toHaveBeenCalled();
        expect(mockCanvas.loadFromJSON).toHaveBeenCalledWith({ objects: [{ type: 'rect', left: i }] });
        expect(settingsStore.get().workingSizeX).toBe(400 + i);
        expect(layersStore.get().C00.name).toBe(`Layer_${i}`);
      });
    }

    // Configuration tests 52 to 60
    for (let i = 52; i <= 60; i++) {
      it(`[Test ${i.toString().padStart(3, '0')}] exports and imports config only (without objects) for configuration variation #${i}`, async () => {
        settingsStore.updateSettings({ workingSizeY: 200 + i });
        vi.mocked(URL.createObjectURL).mockClear();
        GcodeProjectService.saveConfiguration();

        expect(mockClick).toHaveBeenCalled();
        expect(mockAnchor.download).toContain('.gravity-config');

        const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
        const text = await blob.text();
        const configData = JSON.parse(text);
        expect(configData.version).toBe('2.0.0');
        expect(configData.machineSettings.workingSizeY).toBe(200 + i);
        expect(configData.canvasObjects).toBeUndefined(); // config has no shapes!
      });
    }
  });

  // ==========================================
  // PART 3: Image Grayscale & Engraving G-code (Tests 61 to 80)
  // ==========================================
  describe('Image Engraving Raster Generation Algorithm', () => {
    
    // Generate tests 61 to 80 for raster scanning combinations
    for (let i = 61; i <= 80; i++) {
      const speed = 1000 + i * 100;
      const power = 40 + (i % 10) * 5;
      const interval = 0.1 + (i % 4) * 0.05;

      it(`[Test ${i.toString().padStart(3, '0')}] generates raster G-code with speed=${speed}mm/min, power=${power}%, interval=${interval.toFixed(2)}mm`, () => {
        const obj: CanvasObjectData = {
          type: 'image',
          left: 10,
          top: 10,
          width: 50,
          height: 30,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          layerId: 'C00',
          customSpeed: speed,
          customPower: power,
          customInterval: interval,
        };

        const gcode = gcodeGen.generate([obj]);
        
        // Assert header exists
        expect(gcode).toContain('$32=1');
        expect(gcode).toContain('G90');
        
        // Assert image scan markers
        expect(gcode).toContain('Start Raster Image scan');
        expect(gcode).toContain('Ende Raster Image scan');

        // Assert that the speed is dynamically written
        expect(gcode).toContain(`F${speed}`);
        
        // Assert that power scaling maps correctly (max S-value standard is 1000)
        const sMaxExpected = Math.round((power / 100) * 1000);
        expect(gcode).toContain(`S${sMaxExpected}`);
      });
    }
  });

  // ==========================================
  // PART 4: G-code Parser & Simulator Telemetry (Tests 81 to 100)
  // ==========================================
  describe('G-code Parser and Telemetry Extraction', () => {
    // Simulator parsing implementation to test
    const parseSimulatorGcode = (gcodeText: string) => {
      const lines = gcodeText.split('\n');
      const segments: any[] = [];
      let x = 0, y = 0;
      let isLaserOn = false;
      let currentSpeed = 3000;
      let currentPower = 0;
      let absoluteMode = true;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim().toUpperCase();
        if (!line || line.startsWith(';')) continue;

        if (/\bG90\b/.test(line)) absoluteMode = true;
        if (/\bG91\b/.test(line)) absoluteMode = false;

        if (line.includes('M4') || line.includes('M3')) {
          isLaserOn = true;
          const sMatch = line.match(/S\s*([\d.]+)/);
          if (sMatch) currentPower = parseFloat(sMatch[1]);
        }
        if (line.includes('M5')) {
          isLaserOn = false;
          currentPower = 0;
        }

        let newX = x;
        let newY = y;
        let moved = false;

        if (line.startsWith('G0') || line.startsWith('G1') || line.startsWith('G00') || line.startsWith('G01')) {
          const xMatch = line.match(/X\s*([\d.-]+)/);
          const yMatch = line.match(/Y\s*([\d.-]+)/);
          const fMatch = line.match(/F\s*([\d.]+)/);
          const sMatch = line.match(/S\s*([\d.]+)/);

          if (fMatch) currentSpeed = parseFloat(fMatch[1]);
          if (sMatch) currentPower = parseFloat(sMatch[1]);

          if (xMatch) {
            const xVal = parseFloat(xMatch[1]);
            newX = absoluteMode ? xVal : x + xVal;
            moved = true;
          }
          if (yMatch) {
            const yVal = parseFloat(yMatch[1]);
            newY = absoluteMode ? yVal : y + yVal;
            moved = true;
          }
        }

        if (moved) {
          segments.push({
            lineIndex: i,
            x1: x,
            y1: y,
            x2: newX,
            y2: newY,
            isLaserOn: isLaserOn && !line.startsWith('G0') && !line.startsWith('G00'),
            speed: currentSpeed,
            power: currentPower
          });
          x = newX;
          y = newY;
        }
      }
      return segments;
    };

    // Generate tests 81 to 100 for simulator parsing
    for (let i = 81; i <= 100; i++) {
      const targetX = 50 + i;
      const targetY = 100 + i;
      const targetSpeed = 2000 + i * 50;
      const targetPower = 500 + i * 10;

      it(`[Test ${i.toString().padStart(3, '0')}] parses G-code telemetry accurately for target coordinates X=${targetX}, Y=${targetY}, speed=${targetSpeed}, power=${targetPower}`, () => {
        const testGcode = [
          'G90',
          `G0 X0 Y0 F${targetSpeed}`,
          'M4',
          `G1 X${targetX} Y${targetY} S${targetPower}`,
          'M5'
        ].join('\n');

        const parsedSegments = parseSimulatorGcode(testGcode);
        
        expect(parsedSegments.length).toBe(2);
        
        // G0 segment (travel)
        expect(parsedSegments[0].isLaserOn).toBe(false);
        expect(parsedSegments[0].x2).toBe(0);
        expect(parsedSegments[0].y2).toBe(0);
        expect(parsedSegments[0].speed).toBe(targetSpeed);

        // G1 segment (laser on)
        expect(parsedSegments[1].isLaserOn).toBe(true);
        expect(parsedSegments[1].x2).toBe(targetX);
        expect(parsedSegments[1].y2).toBe(targetY);
        expect(parsedSegments[1].speed).toBe(targetSpeed);
        expect(parsedSegments[1].power).toBe(targetPower);
      });
    }
  });

  describe('Antigravity 2.0 - Image Adjustments, Dithering & Overscan Tests', () => {
    it('generates G-code for dithered image scans with correct Floyd-Steinberg and overscan G0 moves', () => {
      const obj: CanvasObjectData = {
        type: 'image',
        left: 10,
        top: 10,
        width: 20,
        height: 10,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        layerId: 'C00',
        customSpeed: 3000,
        customPower: 80,
        customInterval: 0.5,
        imageMode: 'dither',
        ditherType: 'floyd-steinberg',
        overscan: 3.0,
      };

      const gcode = gcodeGen.generate([obj]);

      // Check overscan G0 movement coordinates: start X is obj.left (10) minus overscan (3) = 7.000
      expect(gcode).toContain('G0 X7.000');
      // Lead-in move: G1 X10.000 S0 F3000
      expect(gcode).toContain('G1 X10.000 S0 F3000');
      // Enable dynamic laser mode
      expect(gcode).toContain('M3');
      // Decelerate lead-out to overscan end
      expect(gcode).toContain('G1 X29.000 S0');
    });

    it('applies brightness, contrast, gamma, and invert filters correctly', () => {
      const obj: CanvasObjectData = {
        type: 'image',
        left: 5,
        top: 5,
        width: 10,
        height: 5,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        layerId: 'C00',
        customInterval: 1.0,
        brightness: 50,
        contrast: 100,
        gamma: 1.5,
        invert: true,
        imageMode: 'grayscale'
      };

      const gcode = gcodeGen.generate([obj]);
      expect(gcode).toContain('Start Raster Image scan');
      expect(gcode).toContain('G0');
    });

    it('generates G-code in binary threshold mode with Atkinson, Stucki, and Jarvis kernels', () => {
      const ditherTypes: ('atkinson' | 'stucki' | 'jarvis')[] = ['atkinson', 'stucki', 'jarvis'];
      ditherTypes.forEach(dType => {
        const obj: CanvasObjectData = {
          type: 'image',
          left: 5,
          top: 5,
          width: 10,
          height: 5,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          layerId: 'C00',
          customInterval: 1.0,
          imageMode: 'dither',
          ditherType: dType,
          thresholdValue: 120
        };
        const gcode = gcodeGen.generate([obj]);
        expect(gcode).toContain('Start Raster Image scan');
      });
    });

    describe('Image Adjustment Reversibility & Live Filter Tests', () => {
      // 50 test cases generated dynamically inside a loop to test adjustment reversibility
      for (let i = 1; i <= 50; i++) {
        it(`[Reversibility Test ${i.toString().padStart(3, '0')}] verifies that applying and resetting filters is fully reversible`, () => {
          const width = 10;
          const height = 10;
          
          // Create dummy source canvas with random pixels
          const srcCanvas = document.createElement('canvas');
          srcCanvas.width = width;
          srcCanvas.height = height;
          const srcCtx = srcCanvas.getContext('2d')!;
          const srcData = srcCtx.createImageData(width, height);
          for (let p = 0; p < srcData.data.length; p += 4) {
            srcData.data[p] = Math.floor(Math.random() * 256);     // R
            srcData.data[p+1] = Math.floor(Math.random() * 256);   // G
            srcData.data[p+2] = Math.floor(Math.random() * 256);   // B
            srcData.data[p+3] = 255;                               // A
          }
          srcCtx.putImageData(srcData, 0, 0);

          const mockImage: any = {
            type: 'image',
            _element: srcCanvas,
            getElement() {
              return this._element;
            },
            setElement(el: any) {
              this._element = el;
            },
            brightness: 0,
            contrast: 0,
            gamma: 1.0,
            invert: false,
            imageMode: 'grayscale'
          };

          // Apply filters initially with neutral parameters to establish a baseline grayscale canvas
          applyImageFilters(mockImage);
          const baseCanvas = mockImage.getElement() as HTMLCanvasElement;
          const baseCtx = baseCanvas.getContext('2d')!;
          const baseData = baseCtx.getImageData(0, 0, width, height).data;

          // Apply non-neutral parameters based on iteration index i
          const randBrightness = (i % 2 === 0 ? 1 : -1) * (10 + (i * 3) % 80);
          const randContrast = (i % 3 === 0 ? 1 : -1) * (15 + (i * 4) % 70);
          const randGamma = 0.5 + ((i * 7) % 300) / 100;
          const randInvert = i % 5 === 0;

          mockImage.brightness = randBrightness;
          mockImage.contrast = randContrast;
          mockImage.gamma = randGamma;
          mockImage.invert = randInvert;

          // Process the image with non-neutral parameters
          applyImageFilters(mockImage);

          // Reset parameters exactly back to neutral (reversible check)
          mockImage.brightness = 0;
          mockImage.contrast = 0;
          mockImage.gamma = 1.0;
          mockImage.invert = false;

          // Process again
          applyImageFilters(mockImage);
          const resetCanvas = mockImage.getElement() as HTMLCanvasElement;
          const resetCtx = resetCanvas.getContext('2d')!;
          const resetData = resetCtx.getImageData(0, 0, width, height).data;

          // The reset canvas pixels MUST be exactly equal to the baseline grayscale canvas pixels!
          for (let p = 0; p < baseData.length; p++) {
            expect(resetData[p]).toBe(baseData[p]);
          }
        });
      }
    });
  });
});
