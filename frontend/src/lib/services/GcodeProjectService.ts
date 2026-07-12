import { settingsStore, type MachineSettings } from '../stores/settingsStore';
import { layersStore, type LayersState } from '../stores/layersStore';
import { materialsStore, type MaterialPreset } from '../stores/materialStore';
import * as fabric from 'fabric';
import JSZip from 'jszip';
import { macroStore } from '../stores/macroStore';
import { dockingStore } from '../stores/dockingStore';

export interface GravityProject {
  version: string;
  canvasObjects: any;
  layers: LayersState;
  machineSettings: MachineSettings;
  materials: Record<string, MaterialPreset>;
  gcode: string;
}

export interface GravityConfig {
  version: string;
  layers: LayersState;
  machineSettings: MachineSettings;
  materials: Record<string, MaterialPreset>;
}

export class GcodeProjectService {
  private static version = '2.0.0';

  /**
   * Serializes the current workspace state and triggers a JSON file download.
   */
  public static saveProject(canvas: fabric.Canvas, gcode: string) {
    // We include custom properties so FabricJS serializes them correctly
    const canvasJson = (canvas as any).toJSON([
      'excludeFromExport',
      'data',
      'selectable',
      'evented',
      'strokeUniform',
      'radius',
      'rx',
      'ry',
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'charSpacing',
      'lineHeight',
      'textAlign'
    ]);

    // Grid, Lineale, Nullpunkt-Marker und Maschinenbereich-Hintergrund herausfiltern –
    // Diese werden bei createGridAndOrigin beim Laden automatisch neu erstellt.
    const liveObjects = typeof canvas.getObjects === 'function' ? canvas.getObjects() : [];
    const userObjects: any[] = [];
    const userLiveObjects: any[] = [];
    if (canvasJson && Array.isArray(canvasJson.objects)) {
      canvasJson.objects.forEach((serializedObj: any, index: number) => {
        if (!serializedObj.excludeFromExport) {
          userObjects.push(serializedObj);
          if (index < liveObjects.length) {
            userLiveObjects.push(liveObjects[index]);
          }
        }
      });
      canvasJson.objects = userObjects;
    }

    // Portabilität sichern: Lokale Blob- oder Datei-Bilder in Base64 konvertieren und einbetten
    if (typeof document !== 'undefined') {
      userObjects.forEach((serializedObj: any, idx: number) => {
        if (serializedObj.type === 'image') {
          const liveObj = userLiveObjects[idx] as any;
          if (liveObj && liveObj._element) {
            try {
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = liveObj._element.naturalWidth || liveObj.width;
              tempCanvas.height = liveObj._element.naturalHeight || liveObj.height;
              const ctx = tempCanvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(liveObj._element, 0, 0);
                const dataUrl = tempCanvas.toDataURL('image/png');
                serializedObj.src = dataUrl;
              }
            } catch (err) {
              console.warn("Konnte Bild nicht als Base64 einbetten:", err);
            }
          }
        }
      });
    }

    const project: GravityProject = {
      version: this.version,
      canvasObjects: canvasJson,
      layers: layersStore.get(),
      machineSettings: settingsStore.get(),
      materials: materialsStore.get(),
      gcode
    };

    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gravity_project_${new Date().toISOString().slice(0, 10)}.gravity`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Loads a project file, restoring canvas objects, settings, layers, and G-code.
   */
  public static async loadProject(canvas: fabric.Canvas, file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const project: GravityProject = JSON.parse(e.target?.result as string);
          if (!project.version) {
            throw new Error('Ungültiges Projektformat.');
          }

          // 1. Restore Settings, Layers & Materials
          settingsStore.updateSettings(project.machineSettings);
          layersStore.set(project.layers);
          
          if (project.materials) {
            materialsStore.set(project.materials);
            localStorage.setItem('gravitylaser_materials', JSON.stringify(project.materials));
          }

          // 2. Clear canvas
          canvas.clear();

          // 3. Load Canvas Objects
          await canvas.loadFromJSON(project.canvasObjects);
          
          // 4. Entferne ggf. alte Grid/Lineal/Nullpunkt-Objekte aus früheren Projektdateien
          //    (die ohne den excludeFromExport-Filter gespeichert wurden)
          if (typeof canvas.getObjects === 'function') {
            const staleObjects = canvas.getObjects().filter((obj: any) => obj.excludeFromExport);
            staleObjects.forEach((obj: any) => canvas.remove(obj));
          }
          
          window.dispatchEvent(new CustomEvent('projectLoaded'));
          
          // Re-render and resolve G-code
          canvas.requestRenderAll();
          resolve(project.gcode || '');
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei.'));
      reader.readAsText(file);
    });
  }

  /**
   * Exports the layers, machine configurations and materials database as a JSON file.
   */
  public static saveConfiguration() {
    const config: GravityConfig = {
      version: this.version,
      layers: layersStore.get(),
      machineSettings: settingsStore.get(),
      materials: materialsStore.get()
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gravity_config_${new Date().toISOString().slice(0, 10)}.gravity-config`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Loads a configuration file, updating settings, layers and materials database.
   */
  public static async loadConfiguration(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config: GravityConfig = JSON.parse(e.target?.result as string);
          if (!config.version) {
            throw new Error('Ungültiges Konfigurationsformat.');
          }

          settingsStore.updateSettings(config.machineSettings);
          layersStore.set(config.layers);
          
          if (config.materials) {
            materialsStore.set(config.materials);
            localStorage.setItem('gravitylaser_materials', JSON.stringify(config.materials));
          }
          
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei.'));
      reader.readAsText(file);
    });
  }

  /**
   * Exports the entire user configuration, material library, G-code macros and docking layout as a ZIP archive.
   */
  public static async saveBundle() {
    const config: GravityConfig = {
      version: this.version,
      layers: layersStore.get(),
      machineSettings: settingsStore.get(),
      materials: materialsStore.get()
    };

    const macros = macroStore.get().macros;
    const docking = dockingStore.get();

    const zip = new JSZip();
    zip.file('config.json', JSON.stringify(config, null, 2));
    zip.file('macros.json', JSON.stringify(macros, null, 2));
    zip.file('docking.json', JSON.stringify(docking, null, 2));

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gravity_bundle_${new Date().toISOString().slice(0, 10)}.gravity-bundle`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Imports a ZIP archive containing configs, materials, macros, and docking layout.
   */
  public static async loadBundle(file: File): Promise<void> {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);

    // 1. Parse config.json
    const configFile = loadedZip.file('config.json');
    if (configFile) {
      const configText = await configFile.async('text');
      const config: GravityConfig = JSON.parse(configText);
      
      settingsStore.updateSettings(config.machineSettings);
      layersStore.set(config.layers);
      
      if (config.materials) {
        materialsStore.set(config.materials);
        localStorage.setItem('gravitylaser_materials', JSON.stringify(config.materials));
      }
    }

    // 2. Parse macros.json
    const macrosFile = loadedZip.file('macros.json');
    if (macrosFile) {
      const macrosText = await macrosFile.async('text');
      const macros = JSON.parse(macrosText);
      macroStore.update(() => ({ macros, selectedMacroId: null }));
      localStorage.setItem('gravity_macros', JSON.stringify(macros));
    }

    // 3. Parse docking.json
    const dockingFile = loadedZip.file('docking.json');
    if (dockingFile) {
      const dockingText = await dockingFile.async('text');
      const docking = JSON.parse(dockingText);
      dockingStore.update(() => docking);
      localStorage.setItem('gravity_docking_layout', JSON.stringify(docking));
    }
  }
}
