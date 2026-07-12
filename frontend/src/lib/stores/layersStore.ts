import { Store } from './store';
import { settingsStore } from './settingsStore';
import { MATERIALS, calculatePasses, materialsStore, calculateCutPower } from './materialStore';
import { v4 as uuidv4 } from 'uuid';

export interface SubLayer {
  id: string;
  mode: 'line' | 'fill' | 'offset_fill';
  speed: number;       // in mm/min
  power: number;       // 0-100%
  passes: number;      // Anzahl Durchgänge
  airAssist: boolean;
}

export interface LayerSettings {
  id: string;
  name: string;
  color: string;
  mode: 'line' | 'fill' | 'offset_fill';
  speed: number;       // in mm/min
  power: number;       // 0-100%
  passes: number;      // Anzahl Durchgänge
  airAssist: boolean;
  output: boolean;     // Laser ausgeben
  visible: boolean;    // Canvas anzeigen
  presetMode?: 'engrave' | 'cut' | 'manual'; // Materialvoreinstellungs-Modus
  kerf?: number;       // Schnittbreitenkorrektur in mm (z. B. 0.3mm)
  kerfMode?: 'none' | 'outer' | 'inner'; // Richtung der Korrektur
  subLayers?: SubLayer[];  // Wenn vorhanden, werden diese sequentiell ausgeführt
}

export type LayersState = Record<string, LayerSettings>;

// LightBurn Standard-Farbpalette für die ersten 8 Ebenen
const defaultLayers: LayersState = {
  C00: { id: 'C00', name: 'Schwarz (C00)', color: '#000000', mode: 'line', speed: 6000, power: 80, passes: 1, airAssist: false, output: true, visible: true, presetMode: 'engrave', kerf: 0.15, kerfMode: 'none' },
  C01: { id: 'C01', name: 'Blau (C01)', color: '#0000ff', mode: 'fill', speed: 8000, power: 40, passes: 1, airAssist: false, output: true, visible: true, presetMode: 'manual', kerf: 0.15, kerfMode: 'none' },
  C02: { id: 'C02', name: 'Rot (C02)', color: '#ff0000', mode: 'line', speed: 1200, power: 90, passes: 2, airAssist: true, output: true, visible: true, presetMode: 'manual', kerf: 0.15, kerfMode: 'none' },
  C03: { id: 'C03', name: 'Grün (C03)', color: '#00ff00', mode: 'line', speed: 4000, power: 60, passes: 1, airAssist: true, output: true, visible: true, presetMode: 'manual', kerf: 0.15, kerfMode: 'none' },
  C04: { id: 'C04', name: 'Gelb (C04)', color: '#ffff00', mode: 'fill', speed: 10000, power: 30, passes: 1, airAssist: false, output: true, visible: true, presetMode: 'manual', kerf: 0.15, kerfMode: 'none' },
  C05: { id: 'C05', name: 'Cyan (C05)', color: '#00ffff', mode: 'line', speed: 5000, power: 50, passes: 1, airAssist: true, output: true, visible: true, presetMode: 'manual', kerf: 0.15, kerfMode: 'none' },
  C06: { id: 'C06', name: 'Magenta (C06)', color: '#ff00ff', mode: 'line', speed: 3000, power: 70, passes: 1, airAssist: true, output: true, visible: true, presetMode: 'manual', kerf: 0.15, kerfMode: 'none' },
  C07: { id: 'C07', name: 'Orange (C07)', color: '#ff7f00', mode: 'fill', speed: 7000, power: 45, passes: 1, airAssist: false, output: true, visible: true, presetMode: 'manual', kerf: 0.15, kerfMode: 'none' }
};

class LayersStore extends Store<LayersState> {
  constructor() {
    super(defaultLayers);

    // Automatisch auf Änderungen im SettingsStore reagieren (z. B. Materialwechsel oder Dickenänderung)
    settingsStore.subscribe((settings) => {
      this.recalculateAllPresets(settings.selectedMaterialId, settings.materialThickness);
    });

    // Automatisch auf Änderungen im MaterialsStore reagieren
    materialsStore.subscribe(() => {
      const settings = settingsStore.get();
      this.recalculateAllPresets(settings.selectedMaterialId, settings.materialThickness);
    });
  }

  /**
   * Aktualisiert die Einstellungen einer bestimmten Ebene
   */
  public updateLayer(id: string, updates: Partial<LayerSettings>) {
    this.update((state) => {
      if (!state[id]) return state;
      return {
        ...state,
        [id]: {
          ...state[id],
          ...updates,
        },
      };
    });
  }

  /**
   * Setzt den Preset-Modus einer Ebene und berechnet die Werte neu
   */
  public setLayerPresetMode(id: string, presetMode: 'engrave' | 'cut' | 'manual') {
    this.update((state) => {
      if (!state[id]) return state;
      
      const layer = state[id];
      const settings = settingsStore.get();
      const mat = MATERIALS[settings.selectedMaterialId];
      
      let speed = layer.speed;
      let power = layer.power;
      let passes = layer.passes;
      let airAssist = layer.airAssist;

      if (presetMode === 'engrave' && mat) {
        speed = mat.engraveSpeed;
        power = mat.engravePower;
        passes = 1;
        airAssist = false;
      } else if (presetMode === 'cut' && mat) {
        speed = mat.cutSpeed;
        power = calculateCutPower(mat, settings.materialThickness);
        passes = calculatePasses(settings.selectedMaterialId, settings.materialThickness);
        airAssist = true;
      }

      return {
        ...state,
        [id]: {
          ...layer,
          presetMode,
          speed,
          power,
          passes,
          airAssist
        }
      };
    });
  }

  /**
   * Berechnet alle Ebenen neu, die Materialvoreinstellungen nutzen
   */
  public recalculateAllPresets(materialId: string, thickness: number) {
    const mat = MATERIALS[materialId];
    if (!mat) return;

    this.update((state) => {
      let changed = false;
      const newState = { ...state };

      Object.keys(newState).forEach((id) => {
        const layer = newState[id];
        const currentPresetMode = layer.presetMode || 'manual';

        if (currentPresetMode === 'engrave') {
          const targetSpeed = mat.engraveSpeed;
          const targetPower = mat.engravePower;
          const targetPasses = 1;
          const targetAir = false;

          if (layer.speed !== targetSpeed || layer.power !== targetPower || layer.passes !== targetPasses || layer.airAssist !== targetAir) {
            newState[id] = {
              ...layer,
              speed: targetSpeed,
              power: targetPower,
              passes: targetPasses,
              airAssist: targetAir
            };
            changed = true;
          }
        } else if (currentPresetMode === 'cut') {
          const targetSpeed = mat.cutSpeed;
          const targetPower = calculateCutPower(mat, thickness);
          const targetPasses = calculatePasses(materialId, thickness);
          const targetAir = true;

          if (layer.speed !== targetSpeed || layer.power !== targetPower || layer.passes !== targetPasses || !layer.airAssist) {
            newState[id] = {
              ...layer,
              speed: targetSpeed,
              power: targetPower,
              passes: targetPasses,
              airAssist: targetAir
            };
            changed = true;
          }
        }
      });

      return changed ? newState : state;
    });
  }

  /**
   * Fügt einer Ebene einen neuen Sub-Layer hinzu
   */
  public addSubLayer(layerId: string, subLayer: Omit<SubLayer, 'id'>) {
    this.update((state) => {
      if (!state[layerId]) return state;
      const currentSubLayers = state[layerId].subLayers || [];
      const newSubLayer: SubLayer = {
        ...subLayer,
        id: uuidv4(),
      };
      return {
        ...state,
        [layerId]: {
          ...state[layerId],
          subLayers: [...currentSubLayers, newSubLayer],
        },
      };
    });
  }

  /**
   * Aktualisiert einen bestimmten Sub-Layer einer Ebene
   */
  public updateSubLayer(layerId: string, subLayerId: string, updates: Partial<Omit<SubLayer, 'id'>>) {
    this.update((state) => {
      if (!state[layerId] || !state[layerId].subLayers) return state;
      const updatedSubLayers = state[layerId].subLayers!.map((sl) => {
        if (sl.id === subLayerId) {
          return { ...sl, ...updates };
        }
        return sl;
      });
      return {
        ...state,
        [layerId]: {
          ...state[layerId],
          subLayers: updatedSubLayers,
        },
      };
    });
  }

  /**
   * Löscht einen Sub-Layer einer Ebene
   */
  public deleteSubLayer(layerId: string, subLayerId: string) {
    this.update((state) => {
      if (!state[layerId] || !state[layerId].subLayers) return state;
      const filtered = state[layerId].subLayers!.filter((sl) => sl.id !== subLayerId);
      return {
        ...state,
        [layerId]: {
          ...state[layerId],
          subLayers: filtered.length > 0 ? filtered : undefined,
        },
      };
    });
  }

  /**
   * Setzt alle Ebenen auf Standardeinstellungen zurück
   */
  public resetToDefaults() {
    this.set(defaultLayers);
  }
}

export const layersStore = new LayersStore();
