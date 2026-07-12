import { Store } from './store';

export interface PanelState {
  id: string;
  title: string;
  isFloating: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen: boolean;
}

export interface DockingState {
  panels: Record<string, PanelState>;
}

const defaultPanels: Record<string, PanelState> = {
  control: { id: 'control', title: 'Steuerung', isFloating: false, x: 100, y: 100, width: 340, height: 500, isOpen: true },
  layers: { id: 'layers', title: 'Ebenen', isFloating: false, x: 150, y: 150, width: 340, height: 400, isOpen: true },
  properties: { id: 'properties', title: 'Eigenschaften', isFloating: false, x: 200, y: 200, width: 340, height: 450, isOpen: true },
  macros: { id: 'macros', title: 'Makros', isFloating: false, x: 250, y: 250, width: 340, height: 350, isOpen: true },
};

const STORAGE_KEY = 'gravity_docking_layout';

class DockingStore extends Store<DockingState> {
  constructor() {
    let initial = { panels: defaultPanels };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        initial = { panels: JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load docking layout', e);
    }
    super(initial);
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.get().panels));
    } catch (e) {
      console.error('Failed to save docking layout', e);
    }
  }

  public toggleFloating(panelId: string) {
    this.update(s => {
      const panel = s.panels[panelId];
      if (panel) {
        panel.isFloating = !panel.isFloating;
      }
      return { ...s };
    });
    this.save();
  }

  public updatePanelPosition(panelId: string, x: number, y: number) {
    this.update(s => {
      const panel = s.panels[panelId];
      if (panel) {
        panel.x = x;
        panel.y = y;
      }
      return { ...s };
    });
    this.save();
  }

  public updatePanelSize(panelId: string, w: number, h: number) {
    this.update(s => {
      const panel = s.panels[panelId];
      if (panel) {
        panel.width = w;
        panel.height = h;
      }
      return { ...s };
    });
    this.save();
  }

  public setOpen(panelId: string, isOpen: boolean) {
    this.update(s => {
      const panel = s.panels[panelId];
      if (panel) {
        panel.isOpen = isOpen;
      }
      return { ...s };
    });
    this.save();
  }
  
  public resetLayout() {
    this.update(() => ({ panels: defaultPanels }));
    this.save();
  }
}

export const dockingStore = new DockingStore();
