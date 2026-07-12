import { GcodeGenerator, type CanvasObjectData } from '../src/lib/gcode/GcodeGenerator';
import { GcodeValidator } from '../src/lib/gcode/GcodeValidator';
import { settingsStore } from '../src/lib/stores/settingsStore';

const generator = new GcodeGenerator();
settingsStore.updateSettings({
  workingSizeX: 300,
  workingSizeY: 300,
  origin: 'BottomLeft',
  laserMode: 'M3'
});

const dxfPolyline = [
  { type: 'M', x: -15, y: -15 },
  { type: 'L', x: 15, y: -15 },
  { type: 'L', x: 15, y: 15 },
  { type: 'L', x: -15, y: 15 },
  { type: 'Z' }
];

const obj: CanvasObjectData = {
  type: 'path',
  left: 31,
  top: 22,
  width: 30,
  height: 30,
  scaleX: 25 / 30,
  scaleY: 25 / 30,
  angle: 0,
  path: dxfPolyline,
  layerId: 'C00'
};

const gcode = generator.generate([obj]);
console.log("=== GENERATED G-CODE ===");
console.log(gcode);
console.log("=========================");
