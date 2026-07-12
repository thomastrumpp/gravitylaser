import { gcodeGen } from './src/lib/gcode/GcodeGenerator';
import { layersStore } from './src/lib/stores/layersStore';

const testObjects = [
  {
    type: 'rect',
    left: 10,
    top: 10,
    width: 20,
    height: 20,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    layerId: 'C00',
    customMode: 'Fill',
    customSpeed: 1000,
    customPower: 50,
    customInterval: 1,
    customHatchAngle: 0
  }
];

// Mock stores for testing
layersStore.get = () => ({
  'C00': { name: 'Cut', color: '#ff0000', power: 100, speed: 1000, passes: 1, output: true, airAssist: true, mode: 'Cut' }
});

const gcode = gcodeGen.generate(testObjects as any);
console.log(gcode);
