import { Store } from './store';
import { historyStore } from './historyStore';
import { v4 as uuidv4 } from 'uuid';

export type OriginPosition = 'BottomLeft' | 'TopLeft' | 'TopRight' | 'BottomRight' | 'Center';

export interface MachineSettings {
  workingSizeX: number;
  workingSizeY: number;
  origin: OriginPosition;
  resolution: number;
  units: 'mm' | 'cm' | 'inch';
  laserMode: 'M3' | 'M4';
  selectedMaterialId: string;
  materialThickness: number;
  optimalFocusZ: number;
  backlashX: number;
  backlashY: number;
  cameraType: 'usb' | 'ip';
  cameraIpUrl: string;
  cameraOpacity: number;
  cameraK1: number;
  cameraK2: number;
  cameraHomography: number[] | null;
  rotaryEnabled: boolean;
  rotaryMode: 'roller' | 'chuck';
  rotaryObjectDiameter: number;
  rotaryRollerDiameter: number;
}

const defaultSettings: MachineSettings = {
  workingSizeX: 300,
  workingSizeY: 300,
  origin: 'BottomLeft', // GRBL typically operates in positive workspace or requires offset, TTS-10 PRO homes to Front-Left (Bottom-Left)
  resolution: 0.1,
  units: 'mm',
  laserMode: 'M3',
  selectedMaterialId: 'pappel_sperrholz',
  materialThickness: 3.0,
  optimalFocusZ: 0,
  backlashX: 0,
  backlashY: 0,
  cameraType: 'usb',
  cameraIpUrl: 'http://192.168.1.100:8080/shot.jpg',
  cameraOpacity: 0.5,
  cameraK1: 0.0,
  cameraK2: 0.0,
  cameraHomography: null,
  rotaryEnabled: false,
  rotaryMode: 'roller',
  rotaryObjectDiameter: 50.0,
  rotaryRollerDiameter: 16.0
};

class SettingsStore extends Store<MachineSettings> {
  constructor() {
    // Try to load from localStorage
    const saved = localStorage.getItem('gravitylaser_settings');
    let initial = defaultSettings;
    if (saved) {
      try {
        initial = { ...defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        console.warn('Failed to parse saved settings', e);
      }
    }
    super(initial);

    // Replay Listener
    if (typeof window !== 'undefined') {
      window.addEventListener('historyReplaySettings', (e: any) => {
        const { field, newValue } = e.detail;
        this.update((state) => {
          const newState = { ...state, [field]: newValue };
          localStorage.setItem('gravitylaser_settings', JSON.stringify(newState));
          return newState;
        });
      });
    }
  }

  public updateSettings(updates: Partial<MachineSettings>) {
    if (typeof window !== 'undefined' && !historyStore.isRebuilding) {
      const oldState = this.get();
      Object.keys(updates).forEach((k) => {
        const key = k as keyof MachineSettings;
        if (oldState[key] !== updates[key]) {
          historyStore.registerCommand({
            id: uuidv4(),
            type: 'settingsChange',
            description: `Option ${key}: ${updates[key]}`,
            params: {
              field: key,
              oldValue: oldState[key],
              newValue: updates[key]
            }
          });
        }
      });
    }

    this.update((state) => {
      const newState = { ...state, ...updates };
      localStorage.setItem('gravitylaser_settings', JSON.stringify(newState));
      return newState;
    });
  }
}

export const settingsStore = new SettingsStore();
