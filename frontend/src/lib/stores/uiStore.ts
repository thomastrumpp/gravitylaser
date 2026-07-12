import { Store } from './store';

export interface UIState {
  activeSidebarTab: 'control' | 'layers' | 'properties' | 'macros';
  drawingMode: 'select' | 'rect' | 'circle' | 'polygon' | 'line';
  theme: 'dark' | 'light';
}

const savedTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('gravitylaser_theme') as 'dark' | 'light') || 'dark';

const initialUIState: UIState = {
  activeSidebarTab: 'control',
  drawingMode: 'select',
  theme: savedTheme
};

class UIStore extends Store<UIState> {
  constructor() {
    super(initialUIState);
    // Apply initial theme attribute to document root
    this.applyTheme(initialUIState.theme);
  }

  public setActiveTab(tab: 'control' | 'layers' | 'properties' | 'macros') {
    this.update((state) => ({
      ...state,
      activeSidebarTab: tab
    }));
  }

  public setDrawingMode(mode: UIState['drawingMode']) {
    this.update((state) => ({
      ...state,
      drawingMode: mode
    }));
  }

  public setTheme(theme: 'dark' | 'light') {
    this.update((state) => {
      localStorage.setItem('gravitylaser_theme', theme);
      this.applyTheme(theme);
      return {
        ...state,
        theme
      };
    });
  }

  private applyTheme(theme: 'dark' | 'light') {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      
      // Update grid/origin lines on canvas if it exists
      const canvas = (window as any).fabricCanvas;
      if (canvas && typeof (window as any).updateCanvasGridColor === 'function') {
        (window as any).updateCanvasGridColor();
      }
    }
  }
}

export const uiStore = new UIStore();
