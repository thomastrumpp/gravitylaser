import { describe, it, expect, vi } from 'vitest';
import { GcodeProjectService } from '../../src/lib/services/GcodeProjectService';
import { settingsStore } from '../../src/lib/stores/settingsStore';
import { layersStore } from '../../src/lib/stores/layersStore';
import { materialsStore } from '../../src/lib/stores/materialsStore'; // Wait! Let's verify the materialsStore import path
import { macroStore } from '../../src/lib/stores/macroStore';
import { dockingStore } from '../../src/lib/stores/dockingStore';
import JSZip from 'jszip';

// Wait, let's verify if materialsStore is from 'materialStore.ts' or 'materialsStore.ts'
// In GcodeProjectService.ts, it imports: import { materialsStore, type MaterialPreset } from '../stores/materialStore';
import { materialsStore as matStore } from '../../src/lib/stores/materialStore';

describe('Configuration & Bundles (REQ-UI-06)', () => {
  it('correctly parses and loads a .gravity-bundle zip file', async () => {
    // Create a mock zip file using JSZip
    const zip = new JSZip();
    
    const mockConfig = {
      version: '2.0.0',
      machineSettings: {
        workingSizeX: 420,
        workingSizeY: 400,
        origin: 'BottomLeft',
        resolution: 0.1,
        units: 'inch', // changed from default 'mm'
        laserMode: 'M4',
        selectedMaterialId: 'birch-3mm',
        materialThickness: 3.0,
        cameraType: 'usb',
        cameraIpUrl: 'http://192.168.1.100',
        cameraOpacity: 0.5,
        cameraK1: 0.05,
        cameraK2: -0.01,
        cameraHomography: [1, 0, 0, 0, 1, 0, 0, 0, 1]
      },
      layers: {
        'layer-1': { id: 'layer-1', name: 'Engraving', color: '#ff0000', mode: 'engrave', speed: 1200, power: 80, passes: 1 }
      },
      materials: {
        'birch-3mm': { id: 'birch-3mm', name: 'Birke 3mm', thickness: 3.0, speed: 800, power: 100, passes: 1 }
      }
    };

    const mockMacros = [
      { id: 'custom-macro-1', name: 'Test Macro', gcode: 'G0 X10 Y10', hotkey: 'Ctrl+Shift+T' }
    ];

    const mockDocking = {
      panels: {
        control: { id: 'control', title: 'Control Panel', isFloating: true, x: 250, y: 250, width: 340, height: 500, isOpen: true }
      }
    };

    zip.file('config.json', JSON.stringify(mockConfig));
    zip.file('macros.json', JSON.stringify(mockMacros));
    zip.file('docking.json', JSON.stringify(mockDocking));

    const contentBlob = await zip.generateAsync({ type: 'blob' });
    const mockFile = new File([contentBlob], 'bundle.gravity-bundle', { type: 'application/zip' });

    // Mock localStorage
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');

    // Run loadBundle
    await GcodeProjectService.loadBundle(mockFile);

    // Assert states are restored correctly
    expect(settingsStore.get().workingSizeX).toBe(420);
    expect(settingsStore.get().units).toBe('inch');
    expect(layersStore.get()['layer-1'].name).toBe('Engraving');
    expect(matStore.get()['birch-3mm'].name).toBe('Birke 3mm');
    expect(macroStore.get().macros[0].name).toBe('Test Macro');
    expect(dockingStore.get().panels.control.isFloating).toBe(true);

    storageSpy.mockRestore();
  });
});
