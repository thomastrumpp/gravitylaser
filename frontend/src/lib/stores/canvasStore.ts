import { Store } from './store';

export type ToolType = 'select' | 'node-edit' | 'rect' | 'circle' | 'ellipse' | 'line' | 'triangle' | 'polygon' | 'star' | 'heart' | 'arrow' | 'hexagon' | 'text' | 'pan';
export type BackgroundMode = 'darkGrid' | 'white' | 'camera';

export interface CanvasState {
  activeTool: ToolType;
  activeLayer: string;      // Standardebene für neue Objekte
  selectedObject: {
    type: string;
    width: number;
    height: number;
    x: number;
    y: number;
    angle: number;
    text?: string;
    // Image Options
    imageMode?: 'grayscale' | 'dither' | 'threshold';
    ditherType?: 'floyd-steinberg' | 'atkinson' | 'stucki' | 'jarvis';
    brightness?: number;
    contrast?: number;
    gamma?: number;
    invert?: boolean;
    thresholdValue?: number;
    overscan?: number;
    kerf?: number;
    kerfMode?: 'none' | 'outer' | 'inner';
    layerId?: string;
    data?: any;
  } | null;
  zoomLevel: number;
  gridResolution: number; // in mm
  backgroundMode: BackgroundMode;
  cameraImage: string | null;
}

const initialCanvasState: CanvasState = {
  activeTool: 'select',
  activeLayer: 'C00',
  selectedObject: null,
  zoomLevel: 1.0,
  gridResolution: 0.1, // Default 0.1mm
  backgroundMode: 'darkGrid',
  cameraImage: null,
};

class CanvasStore extends Store<CanvasState> {
  constructor() {
    super(initialCanvasState);
  }

  /**
   * Setzt das aktive Zeichen- oder Auswahlwerkzeug
   */
  public setActiveTool(tool: ToolType) {
    this.update((state) => ({
      ...state,
      activeTool: tool,
    }));
  }

  /**
   * Setzt die aktive Zeichenebene
   */
  public setActiveLayer(layerId: string) {
    this.update((state) => ({
      ...state,
      activeLayer: layerId,
    }));
  }

  /**
   * Aktualisiert die Eigenschaften des selektierten Objekts
   */
  public setSelectedObject(obj: CanvasState['selectedObject']) {
    this.update((state) => ({
      ...state,
      selectedObject: obj,
    }));
  }

  /**
   * Aktualisiert den Zoomlevel
   */
  public setZoomLevel(zoom: number) {
    this.update((state) => ({
      ...state,
      zoomLevel: zoom,
    }));
  }

  /**
   * Setzt die Raster-Auflösung
   */
  public setGridResolution(resMm: number) {
    this.update((state) => ({
      ...state,
      gridResolution: resMm,
    }));
  }

  /**
   * Setzt den Hintergrund-Modus
   */
  public setBackgroundMode(mode: BackgroundMode) {
    this.update((state) => ({
      ...state,
      backgroundMode: mode,
    }));
  }

  /**
   * Setzt das Kamera-Hintergrundbild
   */
  public setCameraImage(img: string | null) {
    this.update((state) => ({
      ...state,
      cameraImage: img,
    }));
  }

  /**
   * Setzt den Editorzustand auf Standard zurück
   */
  public reset() {
    this.set(initialCanvasState);
  }
}

export const canvasStore = new CanvasStore();
