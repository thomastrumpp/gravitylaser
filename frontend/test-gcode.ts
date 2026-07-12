import { gcodeGen } from './src/lib/gcode/GcodeGenerator';
import { layersStore } from './src/lib/stores/layersStore';
import { settingsStore } from './src/lib/stores/settingsStore';

settingsStore.updateSettings({ workingSizeX: 300, workingSizeY: 300, origin: 'BottomLeft' });

layersStore.update((state) => {
  return { ...state, C00: { ...state.C00, output: true, power: 50, speed: 1000, passes: 1, mode: 'Line' } };
});

const gcode = gcodeGen.generate([
  { type: 'rect', left: 10, top: 10, width: 100, height: 50, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00' }
]);
console.log(gcode);
