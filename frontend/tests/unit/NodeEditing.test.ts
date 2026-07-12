import { describe, it, expect, beforeEach } from 'vitest';
import { GcodeGenerator, CanvasObjectData } from '../../src/lib/gcode/GcodeGenerator';
import { settingsStore } from '../../src/lib/stores/settingsStore';
import { layersStore } from '../../src/lib/stores/layersStore';

describe('Node Editing and Path Modification Tests', () => {
  let gcodeGen: GcodeGenerator;

  beforeEach(() => {
    gcodeGen = new GcodeGenerator();
    layersStore.update((state) => ({
      ...state,
      C00: { ...state.C00, output: true, power: 100, speed: 1000, passes: 1, mode: 'Line' }
    }));
  });

  const getExtractedCoords = (gcode: string) => {
    const coords: {x: number, y: number}[] = [];
    const parts = gcode.split('; --- GravityLaser G-Code Footer ---');
    const pathPart = parts[0];
    const lines = pathPart.split('\n');
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

  it('correctly updates G-code when path points are added or modified (Node Edit simulation)', () => {
    settingsStore.updateSettings({ workingSizeX: 300, workingSizeY: 300, origin: 'TopLeft' });

    // Path coordinates are stored relative to center (30, 30) for width/height = 40
    const obj: CanvasObjectData = {
      type: 'path',
      left: 10,
      top: 10,
      width: 40,
      height: 40,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      layerId: 'C00',
      path: [
        { type: 'M', x: -20, y: -20 },
        { type: 'L', x: 20, y: 20 }
      ]
    };

    let gcode = gcodeGen.generate([obj]);
    let coords = getExtractedCoords(gcode);
    expect(coords.length).toBe(2);
    expect(coords[0].x).toBe(10);
    expect(coords[0].y).toBe(10);
    expect(coords[1].x).toBe(50);
    expect(coords[1].y).toBe(50);

    // Simulate Node Editing: Modification of a point coordinate (make it absolute 100, 100 -> relative 70, 70)
    obj.path![1] = { type: 'L', x: 70, y: 70 };
    
    gcode = gcodeGen.generate([obj]);
    coords = getExtractedCoords(gcode);
    expect(coords.length).toBe(2);
    expect(coords[0].x).toBe(10);
    expect(coords[0].y).toBe(10);
    expect(coords[1].x).toBe(100);
    expect(coords[1].y).toBe(100);

    // Simulate Node Editing: Insertion of a new node (make it absolute 75, 25 -> relative 45, -5)
    obj.path!.splice(1, 0, { type: 'L', x: 45, y: -5 });
    
    gcode = gcodeGen.generate([obj]);
    coords = getExtractedCoords(gcode);
    expect(coords.length).toBe(3);
    expect(coords[0].x).toBe(10);
    expect(coords[0].y).toBe(10);
    expect(coords[1].x).toBe(75);
    expect(coords[1].y).toBe(25);
    expect(coords[2].x).toBe(100);
    expect(coords[2].y).toBe(100);

    // Simulate Node Editing: Deletion of a node
    obj.path!.splice(1, 1); // Delete the middle node we just inserted
    
    gcode = gcodeGen.generate([obj]);
    coords = getExtractedCoords(gcode);
    expect(coords.length).toBe(2);
    expect(coords[0].x).toBe(10);
    expect(coords[0].y).toBe(10);
    expect(coords[1].x).toBe(100);
    expect(coords[1].y).toBe(100);
  });
});
