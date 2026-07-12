import { describe, it, expect, beforeEach } from 'vitest';
import { GcodeGenerator, CanvasObjectData } from '../../src/lib/gcode/GcodeGenerator';
import { settingsStore } from '../../src/lib/stores/settingsStore';
import { layersStore } from '../../src/lib/stores/layersStore';

describe('GcodeGenerator Coordinate Mapping Accuracy', () => {
  let gcodeGen: GcodeGenerator;

  beforeEach(() => {
    gcodeGen = new GcodeGenerator();
    
    // Set a known layer state
    layersStore.update((state) => ({
      ...state,
      C00: { ...state.C00, output: true, power: 100, speed: 1000, passes: 1, mode: 'Line' }
    }));
  });

  const getExtractedCoords = (gcode: string) => {
    const coords: {x: number, y: number}[] = [];
    const lines = gcode.split('\n');
    for (const line of lines) {
      if (/^G[01]\b/.test(line)) {
        const xMatch = line.match(/X([\d.-]+)/);
        const yMatch = line.match(/Y([\d.-]+)/);
        if (xMatch && yMatch) {
          coords.push({ x: parseFloat(xMatch[1]), y: parseFloat(yMatch[1]) });
        }
      }
    }
    return coords;
  };

  it('correctly maps BottomLeft origin (Standard GRBL)', () => {
    settingsStore.updateSettings({ workingSizeX: 300, workingSizeY: 300, origin: 'BottomLeft' });
    
    const obj: CanvasObjectData = {
      type: 'rect',
      left: 10,  // Canvas X
      top: 20,   // Canvas Y
      width: 100,
      height: 50,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      layerId: 'C00'
    };

    const gcode = gcodeGen.generate([obj]);
    const coords = getExtractedCoords(gcode);
    
    // In BottomLeft, X matches. Y is inverted: 300 - Y.
    // Rect starts at (10, 20). Machine should go to (10, 300 - 20) = (10, 280)
    // Rect ends at (10+100, 20+50) = (110, 70). Machine should go to (110, 300 - 70) = (110, 230)
    
    expect(coords.length).toBeGreaterThan(0);
    // G0 to start
    expect(coords[0].x).toBe(10);
    expect(coords[0].y).toBe(280);
    
    // G1 to end X, start Y
    expect(coords[1].x).toBe(110);
    expect(coords[1].y).toBe(280);
    expect(coords[2].x).toBe(110);
    expect(coords[2].y).toBe(230);
  });

  it('correctly maps TopLeft origin', () => {
    settingsStore.updateSettings({ workingSizeX: 300, workingSizeY: 300, origin: 'TopLeft' });
    
    const obj: CanvasObjectData = {
      type: 'rect',
      left: 10,
      top: 20,
      width: 100,
      height: 50,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      layerId: 'C00'
    };

    const gcode = gcodeGen.generate([obj]);
    const coords = getExtractedCoords(gcode);
    
    // In TopLeft, X matches, Y matches Canvas.
    expect(coords[0].x).toBe(10);
    expect(coords[0].y).toBe(20);
    
    expect(coords[1].x).toBe(110);
    expect(coords[1].y).toBe(20);
    expect(coords[2].x).toBe(110);
    expect(coords[2].y).toBe(70);
  });

  it('correctly maps TopRight origin', () => {
    settingsStore.updateSettings({ workingSizeX: 300, workingSizeY: 300, origin: 'TopRight' });
    
    const obj: CanvasObjectData = {
      type: 'rect',
      left: 10,
      top: 20,
      width: 100,
      height: 50,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      layerId: 'C00'
    };

    const gcode = gcodeGen.generate([obj]);
    const coords = getExtractedCoords(gcode);
    
    // In TopRight, X is inverted: 300 - X. Y matches.
    // Start X = 300 - 10 = 290. Start Y = 20.
    expect(coords[0].x).toBe(290);
    expect(coords[0].y).toBe(20);
    
    // End X = 300 - 110 = 190. End Y = 70.
    expect(coords[1].x).toBe(190);
    expect(coords[1].y).toBe(20);
    expect(coords[2].x).toBe(190);
    expect(coords[2].y).toBe(70);
  });
});
