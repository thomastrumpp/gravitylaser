import { type LayerSettings, layersStore } from '../stores/layersStore';
import { settingsStore } from '../stores/settingsStore';
import Offset from 'polygon-offset';
import { VariableTextService } from '../services/VariableTextService';
import { variableTextStore } from '../stores/variableTextStore';
import { BarcodeService } from '../services/BarcodeService';
import { PrintAndCutService } from '../services/PrintAndCutService';

export interface CanvasObjectData {
  type: string;
  left: number;       // x-Position (Mitte oder links) in mm
  top: number;        // y-Position (Mitte oder oben) in mm
  width: number;      // Breite in mm
  height: number;     // Höhe in mm
  scaleX: number;
  scaleY: number;
  angle: number;      // Drehwinkel
  radius?: number;    // Für Kreise
  layerId: string;    // z.B. 'C00'
  text?: string;      // Für Text-Objekte
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: string;
  charSpacing?: number;
  lineHeight?: number;
  textAlign?: string;
  path?: any[];       // Für SVG-Paths [command, x, y, ...]
  groupMatrix?: number[]; // Transformation Matrix falls in Gruppe
  objects?: CanvasObjectData[]; // Für Gruppen
  
  // Custom Overrides für Kalibrierungstests (In-Memory)
  customSpeed?: number;
  customPower?: number;
  customZ?: number;
  customPasses?: number;
  customInterval?: number;
  customHatchAngle?: number; // 0, 90, oder 45 für crosshatch
  customMode?: 'Line' | 'Fill';
  customPauseMessage?: string; // Für manuellen Z-Fokus Test (M0 Pause)
  imageSrc?: string;
  imageElement?: any;
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
  isRasterizedVector?: boolean;
  clipPath?: CanvasObjectData;
  barcode?: {
    bcid: string;
    template: string;
    scale?: number;
    height?: number;
  };
}

export class GcodeGenerator {
  
  public mapX(xCanv: number): number {
    const settings = settingsStore.get();
    if (settings.origin.includes('Right')) return settings.workingSizeX - xCanv;
    if (settings.origin === 'Center') return xCanv - (settings.workingSizeX / 2);
    return xCanv;
  }

  public mapY(yCanv: number): number {
    const settings = settingsStore.get();
    let y = yCanv;
    if (settings.origin.includes('Bottom')) y = settings.workingSizeY - yCanv;
    else if (settings.origin === 'Center') y = (settings.workingSizeY / 2) - yCanv;
    
    // Rotary Attachment Scaling
    if (settings.rotaryEnabled) {
      if (settings.rotaryMode === 'chuck') {
        const circumference = settings.rotaryObjectDiameter * Math.PI;
        y = y * (360.0 / Math.max(0.1, circumference));
      } else {
        // Roller mode scaling based on Object / Roller ratio (often used if Y-axis steps are uncalibrated for rotary)
        y = y * (settings.rotaryObjectDiameter / Math.max(0.1, settings.rotaryRollerDiameter));
      }
    }
    
    return y;
  }

  public mapXY(xCanv: number, yCanv: number): { x: number; y: number } {
    if (PrintAndCutService.isEnabled()) {
      return PrintAndCutService.transform(xCanv, yCanv);
    }
    return { x: this.mapX(xCanv), y: this.mapY(yCanv) };
  }


  /**
   * Generiert den kompletten G-Code aus einer Liste von Canvas-Objekten
   */
  public async generate(objects: CanvasObjectData[]): Promise<string> {
    const layers = layersStore.get();
    
    // Auflösung von Variablen-Templates (Date, Time, Serial, CSV)
    const varState = variableTextStore.get();
    const csvRow = varState.csvRows.length > 0 ? varState.csvRows[varState.currentIndex] : undefined;
    const serialValue = varState.serialCurrentValue;

    const resolvedObjects = JSON.parse(JSON.stringify(objects)) as CanvasObjectData[];
    const resolveTextVars = (objs: CanvasObjectData[]) => {
      for (const obj of objs) {
        const type = obj.type ? obj.type.toLowerCase() : '';
        
        // Dynamische Barcode-Auflösung
        if (obj.barcode) {
          try {
            const resolvedText = VariableTextService.resolve(obj.barcode.template, {
              serialValue,
              csvRow
            });
            const svgString = BarcodeService.generateSVG(obj.barcode.bcid, resolvedText, {
              scale: obj.barcode.scale,
              height: obj.barcode.height
            });
            
            const paths = this.parseSvgPaths(svgString);
            const combinedCommands: any[] = [];
            for (const d of paths) {
              const cmds = this.parseSvgPathToCommands(d);
              combinedCommands.push(...cmds);
            }
            
            obj.path = combinedCommands;
            obj.type = 'path';
          } catch (err: any) {
            console.error("Fehler beim Generieren des dynamischen Barcodes:", err);
          }
        }

        if ((type === 'text' || type === 'i-text') && obj.text) {
          obj.text = VariableTextService.resolve(obj.text, {
            serialValue,
            csvRow
          });
        }
        if (obj.objects) {
          resolveTextVars(obj.objects);
        }
      }
    };
    resolveTextVars(resolvedObjects);

    // 1. Gruppiere Objekte nach Ebenen (rekursiv auflösen)
    const objectsByLayer: Record<string, CanvasObjectData[]> = {};
    
    const flattenGroups = (objs: CanvasObjectData[]) => {
      for (const obj of objs) {
        if (obj.type === 'group' && obj.objects) {
          flattenGroups(obj.objects); // TODO: Echte Matrix-Math hier nötig für exakte Skalierung
        } else {
          const lId = obj.layerId || 'C00';
          if (!objectsByLayer[lId]) objectsByLayer[lId] = [];
          objectsByLayer[lId].push(obj);
        }
      }
    };
    
    flattenGroups(resolvedObjects);

    const gcodeLines: string[] = [];

    // G-Code Header
    gcodeLines.push("; --- GravityLaser G-Code Header ---");
    gcodeLines.push("$32=1 ; Laser-Modus aktivieren");
    gcodeLines.push("G10 L20 P1 X0 Y0 ; Kalibriere physikalischen Startpunkt als 0/0");
    gcodeLines.push("G90 ; Absolute Positionierung");
    gcodeLines.push("G21 ; Einheiten in mm");
    gcodeLines.push("G54 ; Werkstückkoordinatensystem G54");
    gcodeLines.push("M5 ; Laser ausschalten zur Sicherheit");
    gcodeLines.push("G0 F6000 ; Jog-Vorschub setzen");

    // 2. Sortiere Ebenen nach ihrer ID (C00, C01, etc.)
    const sortedLayerIds = Object.keys(objectsByLayer).sort();

    for (const layerId of sortedLayerIds) {
      const layerSettings = layers[layerId];
      // Überspringe Ebenen, die nicht ausgegeben werden sollen
      if (!layerSettings || !layerSettings.output) continue;

      let layerObjects = objectsByLayer[layerId];
      if (layerObjects.length === 0) continue;

      // --- Cut Optimization: Inner-First ---
      // Berechne vereinfachte BoundingBox für jedes Objekt
      const getBBox = (obj: CanvasObjectData) => {
        const w = obj.width * obj.scaleX;
        const h = obj.height * obj.scaleY;
        return {
          left: obj.left,
          right: obj.left + w,
          top: obj.top, // y ist inverted, aber für bbox containment ist es egal, solange wir konsistent bleiben
          bottom: obj.top + h
        };
      };

      // Prüft ob a komplett in b liegt
      const isInside = (a: ReturnType<typeof getBBox>, b: ReturnType<typeof getBBox>) => {
        return a.left >= b.left && a.right <= b.right &&
               a.top >= b.top && a.bottom <= b.bottom &&
               (a.left > b.left || a.right < b.right || a.top > b.top || a.bottom < b.bottom); // Strict inside
      };

      // Bestimme für jedes Objekt, wie viele Objekte es umschließen
      const depthMap = new Map<CanvasObjectData, number>();
      for (const objA of layerObjects) {
        let depth = 0;
        const boxA = getBBox(objA);
        for (const objB of layerObjects) {
          if (objA !== objB) {
            const boxB = getBBox(objB);
            if (isInside(boxA, boxB)) {
              depth++;
            }
          }
        }
        depthMap.set(objA, depth);
      }

      // Sortiere absteigend nach Tiefe (innerste zuerst)
      layerObjects.sort((a, b) => (depthMap.get(b) || 0) - (depthMap.get(a) || 0));

      // --- Cut Optimization: Depth Grouping + Nearest-Neighbor + 2-Opt (TSP) ---
      const optimizedLayerObjects: CanvasObjectData[] = [];
      let currentX = 0;
      let currentY = 0;

      // Group objects by depth (topological level)
      const depthGroups: Map<number, CanvasObjectData[]> = new Map();
      for (const obj of layerObjects) {
        const depth = depthMap.get(obj) || 0;
        if (!depthGroups.has(depth)) {
          depthGroups.set(depth, []);
        }
        depthGroups.get(depth)!.push(obj);
      }

      // Sort depths descending (deepest first, i.e., inner holes first)
      const sortedDepths = Array.from(depthGroups.keys()).sort((a, b) => b - a);

      for (const depth of sortedDepths) {
        const groupObjects = depthGroups.get(depth)!;
        const initialGroupTour: CanvasObjectData[] = [];

        // 1. Generate initial greedy Nearest-Neighbor tour for this depth group
        while (groupObjects.length > 0) {
          let nearestIndex = -1;
          let minDistance = Infinity;

          for (let i = 0; i < groupObjects.length; i++) {
            const obj = groupObjects[i];
            const dx = obj.left - currentX;
            const dy = obj.top - currentY;
            const dist = dx * dx + dy * dy;
            if (dist < minDistance) {
              minDistance = dist;
              nearestIndex = i;
            }
          }

          if (nearestIndex !== -1) {
            const nearestObj = groupObjects.splice(nearestIndex, 1)[0];
            initialGroupTour.push(nearestObj);
            currentX = nearestObj.left;
            currentY = nearestObj.top;
          } else {
            initialGroupTour.push(groupObjects.shift()!);
          }
        }

        // 2. Optimize this depth group's tour using 2-Opt local search
        const groupStartX = optimizedLayerObjects.length > 0
          ? optimizedLayerObjects[optimizedLayerObjects.length - 1].left
          : 0;
        const groupStartY = optimizedLayerObjects.length > 0
          ? optimizedLayerObjects[optimizedLayerObjects.length - 1].top
          : 0;

        const optimizedGroupTour = this.optimizeTour2Opt(initialGroupTour, groupStartX, groupStartY);

        // 3. Append to overall list
        optimizedLayerObjects.push(...optimizedGroupTour);

        // Update current position to the end of the optimized tour
        if (optimizedGroupTour.length > 0) {
          const lastObj = optimizedGroupTour[optimizedGroupTour.length - 1];
          currentX = lastObj.left;
          currentY = lastObj.top;
        }
      }

      const subLayers = layerSettings.subLayers && layerSettings.subLayers.length > 0
        ? layerSettings.subLayers
        : [{
            id: 'default',
            mode: layerSettings.mode,
            speed: layerSettings.speed,
            power: layerSettings.power,
            passes: layerSettings.passes,
            airAssist: layerSettings.airAssist
          }];

      for (const subLayer of subLayers) {
        gcodeLines.push(`\n; --- Ebene: ${layerSettings.name} (Sub-Layer Modus: ${subLayer.mode}) ---`);
        
        // Air Assist M-Befehl setzen (M8 = An, M9 = Aus)
        gcodeLines.push(subLayer.airAssist ? "M8 ; Air Assist AN" : "M9 ; Air Assist AUS");

        gcodeLines.push(`; --- Layer ${layerId} Sub-Layer Start ---`);
        // Basis-Settings anwenden
        gcodeLines.push(`M5`); // Laser aus beim Fahren
          
        let lastPower = -1;
        let lastSpeed = -1;
        let lastZ = -1;

        const activeLayerSettings: LayerSettings = {
          ...layerSettings,
          mode: subLayer.mode,
          speed: subLayer.speed,
          power: subLayer.power,
          passes: subLayer.passes,
          airAssist: subLayer.airAssist
        };

        for (const obj of optimizedLayerObjects) {
          // Überschreibe Layer-Settings mit Custom-Settings (aus Material/Focus Test)
          const targetSpeed = obj.customSpeed !== undefined ? obj.customSpeed : subLayer.speed;
          const targetPower = obj.customPower !== undefined ? obj.customPower : subLayer.power;
          const targetZ = obj.customZ; // optional
            
          const maxSValue = 1000; // GRBL Standard max S-Wert
          const sValue = Math.round((targetPower / 100) * maxSValue);
            
          // Schreibe State-Änderungen nur, wenn sie sich ändern
          if (targetSpeed !== lastSpeed || sValue !== lastPower) {
            gcodeLines.push(`G1 F${targetSpeed} S${sValue}`);
            lastSpeed = targetSpeed;
            lastPower = sValue;
          }
            
          if (targetZ !== undefined && targetZ !== lastZ) {
            gcodeLines.push(`G0 Z${targetZ.toFixed(2)}`);
            lastZ = targetZ;
          }

          if (obj.customPauseMessage) {
            gcodeLines.push(`; ${obj.customPauseMessage}`);
            gcodeLines.push(`M0`);
          }

          // Multipass-Logik (Passes Override aus dem Test oder von der Ebene)
          const targetPasses = obj.customPasses !== undefined ? obj.customPasses : subLayer.passes;

          // Führe den Brennvorgang für die eingestellte Anzahl an Durchgängen aus
          for (let pass = 1; pass <= targetPasses; pass++) {
            if (targetPasses > 1) {
              gcodeLines.push(`; Durchgang ${pass} von ${targetPasses}`);
            }

            const objType = obj.type ? obj.type.toLowerCase() : 'unknown';
            const mode = (obj.customMode ?? subLayer.mode).toLowerCase();

            if (mode === 'offset_fill') {
              this.generateOffsetFillGcode(obj, activeLayerSettings, gcodeLines);
            } else if (objType === 'rect') {
              this.generateRectGcode(obj, activeLayerSettings, gcodeLines);
            } else if (objType === 'circle') {
              this.generateCircleGcode(obj, activeLayerSettings, gcodeLines);
            } else if (objType === 'line') {
              this.generateLineGcode(obj, activeLayerSettings, gcodeLines);
            } else if (objType === 'triangle') {
              if (mode === 'fill') {
                this.generateImageGcode(obj, activeLayerSettings, gcodeLines);
              } else {
                this.generateTriangleGcode(obj, activeLayerSettings, gcodeLines);
              }
            } else if (objType === 'ellipse') {
              if (mode === 'fill') {
                this.generateImageGcode(obj, activeLayerSettings, gcodeLines);
              } else {
                this.generateEllipseGcode(obj, activeLayerSettings, gcodeLines);
              }
            } else if (objType === 'path') {
              if (mode === 'fill') {
                await this.generateImageGcode(obj, activeLayerSettings, gcodeLines);
              } else {
                this.generatePathGcode(obj, activeLayerSettings, gcodeLines);
              }
            } else if (objType === 'image' && obj.imageElement) {
              await this.generateImageGcode(obj, activeLayerSettings, gcodeLines);
            } else if (objType === 'text' || objType === 'i-text') {
              await this.generateImageGcode(obj, activeLayerSettings, gcodeLines);
            } else {
              gcodeLines.push(`; [WARNUNG] G-Code für Typ ${obj.type} nicht vollständig implementiert`);
            }
          }
        }
      }
    }

    // G-Code Footer
    gcodeLines.push("\n; --- GravityLaser G-Code Footer ---");
    gcodeLines.push("M5 ; Laser aus");
    gcodeLines.push("M9 ; Air Assist aus");
    gcodeLines.push("; Soft Landing: schnell bis 10mm vor Parkposition, dann langsam einfahren");
    gcodeLines.push("G0 X10 Y10 ; Schnell bis 10mm vor 0/0");
    gcodeLines.push("G1 X0 Y0 F500 ; Langsam in Parkposition einfahren");
    gcodeLines.push("M2 ; Programmende");

    return gcodeLines.join('\n');
  }

  /**
   * Generiert G-Code für ein Rechteck (Line oder Fill Modus)
   */
  private generateRectGcode(obj: CanvasObjectData, layer: LayerSettings, lines: string[]) {
    let w = obj.width * obj.scaleX;
    let h = obj.height * obj.scaleY;
    
    const kerf = obj.kerf !== undefined ? obj.kerf : (layer.kerf || 0);
    const kerfMode = obj.kerfMode !== undefined ? obj.kerfMode : (layer.kerfMode || 'none');
    
    let leftOffset = 0;
    let topOffset = 0;
    
    if (kerfMode === 'outer') {
      w += kerf;
      h += kerf;
      leftOffset = -kerf / 2;
      topOffset = -kerf / 2;
    } else if (kerfMode === 'inner') {
      w -= kerf;
      h -= kerf;
      leftOffset = kerf / 2;
      topOffset = kerf / 2;
    }

    const pStart = this.mapXY(obj.left + leftOffset, obj.top + topOffset);
    const pEnd = this.mapXY(obj.left + leftOffset + w, obj.top + topOffset + h);
    const xStart = pStart.x;
    const yStart = pStart.y;
    const xEnd = pEnd.x;
    const yEnd = pEnd.y;

    const sValue = Math.round(((obj.customPower ?? layer.power) / 100) * 1000);
    const speed = obj.customSpeed ?? layer.speed;
    const mode = (obj.customMode ?? layer.mode).toLowerCase();

    if (mode === 'fill') {
      const interval = obj.customInterval ?? 0.1; // Default 0.1mm
      const angle = obj.customHatchAngle ?? 0;
      
      lines.push(`; --- Fill Hatching (Angle: ${angle}) ---`);
      
      // X-Hatch (Horizontal)
      if (angle === 0 || angle === 45) {
        let goRight = true;
        for (let y = yEnd; y <= yStart; y += interval) {
          if (goRight) {
            lines.push(`G0 X${xStart.toFixed(3)} Y${y.toFixed(3)}`);
            lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
            lines.push(`G1 X${xEnd.toFixed(3)} Y${y.toFixed(3)} S${sValue} F${speed}`);
            lines.push("M5");
          } else {
            lines.push(`G0 X${xEnd.toFixed(3)} Y${y.toFixed(3)}`);
            lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
            lines.push(`G1 X${xStart.toFixed(3)} Y${y.toFixed(3)} S${sValue} F${speed}`);
            lines.push("M5");
          }
          goRight = !goRight;
        }
      }
      
      // Y-Hatch (Vertikal)
      if (angle === 90 || angle === 45) {
        let goUp = true;
        for (let x = xStart; x <= xEnd; x += interval) {
          if (goUp) {
            lines.push(`G0 X${x.toFixed(3)} Y${yEnd.toFixed(3)}`);
            lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
            lines.push(`G1 X${x.toFixed(3)} Y${yStart.toFixed(3)} S${sValue} F${speed}`);
            lines.push("M5");
          } else {
            lines.push(`G0 X${x.toFixed(3)} Y${yStart.toFixed(3)}`);
            lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
            lines.push(`G1 X${x.toFixed(3)} Y${yEnd.toFixed(3)} S${sValue} F${speed}`);
            lines.push("M5");
          }
          goUp = !goUp;
        }
      }
    } else {
      // Line Modus (Cut)
      this.addG0MoveWithBacklash(xStart, yStart, xEnd, yStart, lines, speed);
      lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
      lines.push(`G1 X${xEnd.toFixed(3)} Y${yStart.toFixed(3)} S${sValue} F${speed}`);
      lines.push(`G1 X${xEnd.toFixed(3)} Y${yEnd.toFixed(3)}`);
      lines.push(`G1 X${xStart.toFixed(3)} Y${yEnd.toFixed(3)}`);
      lines.push(`G1 X${xStart.toFixed(3)} Y${yStart.toFixed(3)}`);
      lines.push("M5");
    }
  }

  private generateCircleGcode(obj: CanvasObjectData, layer: LayerSettings, lines: string[]) {
    let r = (obj.radius || (obj.width / 2)) * obj.scaleX;
    
    const kerf = obj.kerf !== undefined ? obj.kerf : (layer.kerf || 0);
    const kerfMode = obj.kerfMode !== undefined ? obj.kerfMode : (layer.kerfMode || 'none');
    if (kerfMode === 'outer') {
      r += kerf / 2;
    } else if (kerfMode === 'inner') {
      r -= kerf / 2;
    }
    const sValue = Math.round(((obj.customPower ?? layer.power) / 100) * 1000);
    const speed = obj.customSpeed ?? layer.speed;
    const mode = (obj.customMode ?? layer.mode).toLowerCase();

    if (mode === 'fill') {
      const interval = obj.customInterval ?? 0.1; // Feine Schraffur für volle Ausfüllung
      lines.push(`; --- Circle Vector Hatching Fill ---`);
      let goRight = true;

      // Scanne von oben nach unten (relativ -r bis +r)
      for (let yOffset = -r; yOffset <= r; yOffset += interval) {
        const chordHalf = Math.sqrt(Math.max(0, r * r - yOffset * yOffset));
        if (chordHalf < 0.01) continue;

        // Start und Ende in absoluten Canvas-Millimetern
        const xStartCanv = obj.left + r - chordHalf;
        const xEndCanv = obj.left + r + chordHalf;
        const yCanv = obj.top + r + yOffset;

        // Mappe in physikalische Maschinenkoordinaten
        const pStart = this.mapXY(xStartCanv, yCanv);
        const pEnd = this.mapXY(xEndCanv, yCanv);
        const xStartMach = pStart.x;
        const xEndMach = pEnd.x;
        const yMach = pStart.y;

        if (goRight) {
          lines.push(`G0 X${xStartMach.toFixed(3)} Y${yMach.toFixed(3)}`);
          lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
          lines.push(`G1 X${xEndMach.toFixed(3)} Y${yMach.toFixed(3)} S${sValue} F${speed}`);
          lines.push("M5");
        } else {
          lines.push(`G0 X${xEndMach.toFixed(3)} Y${yMach.toFixed(3)}`);
          lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
          lines.push(`G1 X${xStartMach.toFixed(3)} Y${yMach.toFixed(3)} S${sValue} F${speed}`);
          lines.push("M5");
        }
        goRight = !goRight;
      }
    } else {
      // Outline/Line Modus (Zwei Halbbögen mit G2)
      const pStart = this.mapXY(obj.left, obj.top + r);
      const pMid = this.mapXY(obj.left + 2 * r, obj.top + r);
      const xStart = pStart.x;
      const yStart = pStart.y;
      const yCenter = pStart.y;
      const xMid = pMid.x;

      this.addG0MoveWithBacklash(xStart, yStart, xStart, yStart + 1.0, lines, speed);
      lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
      lines.push(`G2 X${xMid.toFixed(3)} Y${yCenter.toFixed(3)} I${r.toFixed(3)} J0 S${sValue} F${speed}`);
      lines.push(`G2 X${xStart.toFixed(3)} Y${yStart.toFixed(3)} I${(-r).toFixed(3)} J0`);
      lines.push("M5");
    }
  }

  /**
   * Generiert G-Code für eine einfache Linie
   */
  private generateLineGcode(obj: CanvasObjectData, layer: LayerSettings, lines: string[]) {
    const w = obj.width * obj.scaleX;
    const h = obj.height * obj.scaleY;

    const pStart = this.mapXY(obj.left, obj.top);
    const pEnd = this.mapXY(obj.left + w, obj.top + h);
    const xStart = pStart.x;
    const yStart = pStart.y;
    const xEnd = pEnd.x;
    const yEnd = pEnd.y;

    const sValue = Math.round(((obj.customPower ?? layer.power) / 100) * 1000);
    const speed = obj.customSpeed ?? layer.speed;
    this.addG0MoveWithBacklash(xStart, yStart, xEnd, yEnd, lines, speed);
    lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
    lines.push(`G1 X${xEnd.toFixed(3)} Y${yEnd.toFixed(3)} S${sValue} F${speed}`);
    lines.push("M5");
  }

  /**
   * Generiert G-Code für einen SVG Path durch Flattening der Kurven
   */
  private generatePathGcode(obj: CanvasObjectData, layer: LayerSettings, lines: string[]) {
    if (!obj.path) return;
    
    const sValue = Math.round(((obj.customPower ?? layer.power) / 100) * 1000);
    const speed = obj.customSpeed ?? layer.speed;

    // --- Kerf Offset für Pfade ---
    const kerf = obj.kerf !== undefined ? obj.kerf : (layer.kerf || 0);
    const kerfMode = obj.kerfMode !== undefined ? obj.kerfMode : (layer.kerfMode || 'none');

    if (kerfMode !== 'none' && kerf > 0) {
      const outlinePoints = this.getObjectOutlinePoints(obj);
      if (outlinePoints && outlinePoints.length >= 3) {
        try {
          const offsetInstance = new Offset();
          let offsetPolygons: [number, number][][];

          // Ensure closed polygon for offset
          const poly = [...outlinePoints];
          if (
            poly[0][0] !== poly[poly.length - 1][0] ||
            poly[0][1] !== poly[poly.length - 1][1]
          ) {
            poly.push([...poly[0]]);
          }

          if (kerfMode === 'outer') {
            offsetPolygons = offsetInstance.data(poly).margin(kerf / 2);
          } else {
            offsetPolygons = offsetInstance.data(poly).padding(kerf / 2);
          }

          if (offsetPolygons && offsetPolygons.length > 0) {
            lines.push(`; --- Path Kerf Offset (${kerfMode}, ${kerf}mm) ---`);
            for (const offsetPoly of offsetPolygons) {
              if (offsetPoly.length < 2) continue;
              // Move to first point
              this.addG0MoveWithBacklash(offsetPoly[0][0], offsetPoly[0][1], offsetPoly[1][0], offsetPoly[1][1], lines, speed);
              lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
              // Cut along offset polygon
              for (let i = 1; i < offsetPoly.length; i++) {
                lines.push(`G1 X${offsetPoly[i][0].toFixed(3)} Y${offsetPoly[i][1].toFixed(3)} S${sValue} F${speed}`);
              }
              // Close back to start
              lines.push(`G1 X${offsetPoly[0][0].toFixed(3)} Y${offsetPoly[0][1].toFixed(3)} S${sValue} F${speed}`);
              lines.push("M5");
            }
            return; // Kerf offset path emitted, skip raw path processing
          }
        } catch (err) {
          lines.push(`; [WARN] Kerf Offset fehlgeschlagen, verwende Original-Pfad`);
        }
      }
    }

    // --- Standard-Pfadverarbeitung (ohne Kerf) ---
    let isLaserOn = false;
    let currentX = 0;
    let currentY = 0;
    let startPathX = 0;
    let startPathY = 0;

    // Bezier-Kurven werden in gerade Segmente unterteilt
    const flattenBezier = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, segments: number) => {
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const mt = 1 - t;
        const x = mt*mt*mt*x0 + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3;
        const y = mt*mt*mt*y0 + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y3;
        lines.push(`G1 X${x.toFixed(3)} Y${y.toFixed(3)} S${sValue} F${speed}`);
        currentX = x;
        currentY = y;
      }
    };
    
    const flattenQuad = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, segments: number) => {
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const mt = 1 - t;
        const x = mt*mt*x0 + 2*mt*t*x1 + t*t*x2;
        const y = mt*mt*y0 + 2*mt*t*y1 + t*t*y2;
        lines.push(`G1 X${x.toFixed(3)} Y${y.toFixed(3)} S${sValue} F${speed}`);
        currentX = x;
        currentY = y;
      }
    };

    const cx = obj.left + (obj.width * (obj.scaleX || 1)) / 2;
    const cy = obj.top + (obj.height * (obj.scaleY || 1)) / 2;

    // Rotation der Pfadpunkte um das Zentrum
    const angleRad = (obj.angle || 0) * Math.PI / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    
    const rotateAndMap = (relX: number, relY: number): { mx: number, my: number } => {
      const rx = relX * cosA - relY * sinA;
      const ry = relX * sinA + relY * cosA;
      const mapped = this.mapXY(cx + rx, cy + ry);
      return { mx: mapped.x, my: mapped.y };
    };

    for (let i = 0; i < obj.path.length; i++) {
      const cmd = obj.path[i];
      const type = cmd.type;
      
      if (type === 'M') {
        const { mx: targetX, my: targetY } = rotateAndMap(cmd.x * obj.scaleX, cmd.y * obj.scaleY);
        if (isLaserOn) {
            lines.push("M5");
            isLaserOn = false;
        }
        let nextX = targetX;
        let nextY = targetY;
        if (i + 1 < obj.path.length) {
          const nextCmd = obj.path[i + 1];
          if (nextCmd.type === 'L' || nextCmd.type === 'C' || nextCmd.type === 'Q') {
            const nextMapped = rotateAndMap(nextCmd.x * obj.scaleX, nextCmd.y * obj.scaleY);
            nextX = nextMapped.mx;
            nextY = nextMapped.my;
          }
        }
        this.addG0MoveWithBacklash(targetX, targetY, nextX, nextY, lines, speed);
        currentX = targetX;
        currentY = targetY;
        startPathX = targetX;
        startPathY = targetY;
      } else if (type === 'L') {
        if (!isLaserOn) {
            lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
            isLaserOn = true;
        }
        const { mx: targetX, my: targetY } = rotateAndMap(cmd.x * obj.scaleX, cmd.y * obj.scaleY);
        lines.push(`G1 X${targetX.toFixed(3)} Y${targetY.toFixed(3)} S${sValue} F${speed}`);
        currentX = targetX;
        currentY = targetY;
      } else if (type === 'C') {
        if (!isLaserOn) {
            lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
            isLaserOn = true;
        }
        const { mx: x1, my: y1 } = rotateAndMap(cmd.x1 * obj.scaleX, cmd.y1 * obj.scaleY);
        const { mx: x2, my: y2 } = rotateAndMap(cmd.x2 * obj.scaleX, cmd.y2 * obj.scaleY);
        const { mx: x3, my: y3 } = rotateAndMap(cmd.x * obj.scaleX, cmd.y * obj.scaleY);
        
        flattenBezier(currentX, currentY, x1, y1, x2, y2, x3, y3, 10);
      } else if (type === 'Q') {
        if (!isLaserOn) {
            lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
            isLaserOn = true;
        }
        const { mx: x1, my: y1 } = rotateAndMap(cmd.x1 * obj.scaleX, cmd.y1 * obj.scaleY);
        const { mx: x2, my: y2 } = rotateAndMap(cmd.x * obj.scaleX, cmd.y * obj.scaleY);
        
        flattenQuad(currentX, currentY, x1, y1, x2, y2, 10);
      } else if (type === 'Z') {
         if (isLaserOn) {
            lines.push(`G1 X${startPathX.toFixed(3)} Y${startPathY.toFixed(3)} S${sValue} F${speed}`);
            lines.push("M5");
            isLaserOn = false;
         }
      }
    }
    
    if (isLaserOn) {
        lines.push("M5");
    }
  }

  /**
   * Generiert G-Code für Rasterbilder (Graustufen oder 1-Bit Dither/Threshold).
   */
  private async generateImageGcode(obj: CanvasObjectData, layer: LayerSettings, lines: string[]) {
    // Falls das Objekt noch nicht gerendert ist
    if (!obj.width || !obj.height) return;
    const interval = obj.customInterval ?? (obj.isRasterizedVector ? 0.08 : 0.2); // 0.08mm für dichte Vektor-Gravuren, 0.2mm für Standard-Bilder
    
    const wUnrotated = obj.width * obj.scaleX;
    const hUnrotated = obj.height * obj.scaleY;
    const angleRad = ((obj.angle || 0) * Math.PI) / 180;
    
    // Berechne die gedrehte Bounding-Box Größe für korrekte Pixel-Dimensionen
    const w = wUnrotated * Math.abs(Math.cos(angleRad)) + hUnrotated * Math.abs(Math.sin(angleRad));
    const h = wUnrotated * Math.abs(Math.sin(angleRad)) + hUnrotated * Math.abs(Math.cos(angleRad));

    const cols = Math.max(1, Math.round(w / interval));
    const rows = Math.max(1, Math.round(h / interval));

    // Berechne das Rotationszentrum und die obere linke Ecke der gedrehten Bounding Box
    const cx = obj.left + wUnrotated / 2;
    const cy = obj.top + hUnrotated / 2;
    const rLeft = cx - w / 2;
    const rTop = cy - h / 2;

    const sMax = Math.round(((obj.customPower ?? layer.power) / 100) * 1000);
    const speed = obj.customSpeed ?? layer.speed;
    const laserMode = settingsStore.get().laserMode || 'M4';

    const objType = obj.type ? obj.type.toLowerCase() : 'unknown';
    const isTextObj = objType === 'text' || objType === 'i-text';
    const isPathObj = objType === 'path';
    const isTriangleObj = objType === 'triangle';
    const isEllipseObj = objType === 'ellipse';
    const isCircleObj = objType === 'circle';
    const isVectorRaster = isTextObj || isPathObj || isTriangleObj || isEllipseObj || isCircleObj || !!obj.isRasterizedVector;
    const imageMode = isVectorRaster ? 'threshold' : (obj.imageMode || 'grayscale');
    const ditherType = obj.ditherType || 'floyd-steinberg';
    const brightness = obj.brightness !== undefined ? obj.brightness : 0;
    const contrast = obj.contrast !== undefined ? obj.contrast : 0;
    const gamma = obj.gamma !== undefined ? obj.gamma : 1.0;
    const invert = obj.invert !== undefined ? obj.invert : false;
    const thresholdValue = obj.thresholdValue !== undefined ? obj.thresholdValue : 128;
    const overscan = obj.overscan !== undefined ? obj.overscan : 2.5;

    let pixels: number[][] = [];

    // Pixelextraktion im Browser
    if (typeof document !== 'undefined' && (isVectorRaster || obj.imageElement)) {
      try {
        const offscreen = document.createElement('canvas');
        offscreen.width = cols;
        offscreen.height = rows;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          // Standardmäßig weißer Hintergrund
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cols, rows);

          ctx.fillStyle = '#000000';
          ctx.strokeStyle = '#000000';

          // Universelle Transformation auf den Kontext anwenden
          ctx.translate(cols / 2, rows / 2);
          ctx.rotate(angleRad);
          
          // Anstatt den gesamten Kontext zu skalieren (was zu Rundungs- und Rendering-Bugs führen kann),
          // berechnen wir die exakten Pixel-Dimensionen für das Zeichnen.
          const pixelW = (obj.width * (obj.scaleX || 1)) / interval;
          const pixelH = (obj.height * (obj.scaleY || 1)) / interval;

          if (isTextObj) {
            ctx.textBaseline = 'top';
            ctx.textAlign = (obj.textAlign as any) || 'left';

            const fontWeight = obj.fontWeight || 'normal';
            const fontStyle = obj.fontStyle || 'normal';
            const fontFamily = obj.fontFamily || 'Arial';
            const fontSize = obj.fontSize || 40;
            ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

            const isFill = layer.mode === 'fill';
            const linesText = (obj.text || '').split('\n');
            const lineHeight = obj.lineHeight || 1.16;

              linesText.forEach((lineText: string, lineIdx: number) => {
                const y = -pixelH / 2 + lineIdx * fontSize * lineHeight;
                let x = -pixelW / 2;
                if (ctx.textAlign === 'center') {
                  x = 0;
                } else if (ctx.textAlign === 'right') {
                  x = pixelW / 2;
                }
                
                if (isFill) {
                  ctx.fillText(lineText, x, y);
                } else {
                  ctx.lineWidth = 1;
                  ctx.strokeText(lineText, x, y);
                }
              });
            } else if (isPathObj && obj.path) {
              const scaleX_px = (obj.scaleX || 1) / interval;
              const scaleY_px = (obj.scaleY || 1) / interval;
              ctx.beginPath();
              obj.path.forEach((cmd: any) => {
                const type = cmd.type;
                if (type === 'M') {
                  ctx.moveTo(cmd.x * scaleX_px, cmd.y * scaleY_px);
                } else if (type === 'L') {
                  ctx.lineTo(cmd.x * scaleX_px, cmd.y * scaleY_px);
                } else if (type === 'C') {
                  ctx.bezierCurveTo(
                    cmd.x1 * scaleX_px, cmd.y1 * scaleY_px,
                    cmd.x2 * scaleX_px, cmd.y2 * scaleY_px,
                    cmd.x * scaleX_px, cmd.y * scaleY_px
                  );
                } else if (type === 'Q') {
                  ctx.quadraticCurveTo(
                    cmd.x1 * scaleX_px, cmd.y1 * scaleY_px,
                    cmd.x * scaleX_px, cmd.y * scaleY_px
                  );
                } else if (type === 'Z' || type === 'z') {
                  ctx.closePath();
                }
              });
              ctx.fill();
            } else if (isTriangleObj) {
              ctx.beginPath();
              ctx.moveTo(0, -pixelH / 2);
              ctx.lineTo(pixelW / 2, pixelH / 2);
              ctx.lineTo(-pixelW / 2, pixelH / 2);
              ctx.closePath();
              ctx.fill();
            } else if (isEllipseObj || isCircleObj) {
              ctx.beginPath();
              ctx.ellipse(0, 0, pixelW / 2, pixelH / 2, 0, 0, 2 * Math.PI);
              ctx.fill();
            } else if (obj.imageElement) {
              ctx.drawImage(obj.imageElement, -pixelW / 2, -pixelH / 2, pixelW, pixelH);
            }

          const imgData = ctx.getImageData(0, 0, cols, rows);
          const data = imgData.data;

          for (let r = 0; r < rows; r++) {
            const row: number[] = [];
            for (let c = 0; c < cols; c++) {
              const idx = (r * cols + c) * 4;
              const R = data[idx];
              const G = data[idx + 1];
              const B = data[idx + 2];
              const A = data[idx + 3];

              if (A === 0) {
                row.push(255);
              } else {
                row.push(0.299 * R + 0.587 * G + 0.114 * B);
              }
            }
            pixels.push(row);
          }
        }
      } catch (e) {
        console.error("Fehler beim Extrahieren der Bilddaten:", e);
      }
    }

    // Fallback-Mock-Pixel für Node-Umgebung (Tests)
    if (pixels.length === 0) {
      for (let r = 0; r < rows; r++) {
        const row: number[] = [];
        for (let c = 0; c < cols; c++) {
          row.push(Math.round((c / cols) * 255));
        }
        pixels.push(row);
      }
    }

    // Centered Image Masking Post-Processing
    if (obj.clipPath) {
      const maskOutline = this.getObjectOutlinePoints(obj.clipPath);
      if (maskOutline && maskOutline.length >= 3) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const xMachMapped = this.mapX(rLeft + c * interval);
            const yMachMapped = this.mapY(rTop + r * interval);
            if (!this.isPointInPolygon([xMachMapped, yMachMapped], maskOutline)) {
              pixels[r][c] = 255; // White = Laser Off
            }
          }
        }
      }
    }

    // 1. In-place Bildfilter anwenden (Invertieren, Helligkeit, Kontrast, Gamma)
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    const gammaCorrection = 1.0 / gamma;
    const clamp = (val: number) => Math.min(255, Math.max(0, val));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let gray = pixels[r][c];

        if (invert) {
          gray = 255 - gray;
        }

        if (brightness !== 0 || contrast !== 0) {
          gray = contrastFactor * (gray - 128) + 128 + brightness;
        }

        if (gamma !== 1.0) {
          gray = 255 * Math.pow(clamp(gray) / 255, gammaCorrection);
        }

        pixels[r][c] = clamp(gray);
      }
    }

    // 2. Modus anwenden (Dithering oder Binarisierung)
    if (imageMode === 'threshold') {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          pixels[r][c] = pixels[r][c] < thresholdValue ? 0 : 255;
        }
      }
    } else if (imageMode === 'dither') {
      try {
        const { ditheringService } = await import('../services/DitheringService');
        const flatImageData = new Uint8ClampedArray(cols * rows * 4);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = (r * cols + c) * 4;
            flatImageData[idx] = pixels[r][c];
            flatImageData[idx+1] = pixels[r][c];
            flatImageData[idx+2] = pixels[r][c];
            flatImageData[idx+3] = 255;
          }
        }
        
        const resultData = await ditheringService.processImage(flatImageData, cols, rows, {
          algorithm: ditherType as any,
          thresholdValue: thresholdValue,
          contrast: contrast,
          brightness: brightness,
          gamma: gamma
        });

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            pixels[r][c] = resultData[(r * cols + c) * 4];
          }
        }
      } catch (err) {
        console.error("Dithering Error", err);
      }
    }

    // 3. Optional: Invertierung am Ende, falls "Negative" Modus (z.B. für Stempel)

    lines.push(`; --- Start Raster Image scan (${cols}x${rows}) ---`);
    lines.push(`${laserMode} ; Laser-Modus aktivieren`);

    // 3. Rasterung (Zeile für Zeile, bi-direktional mit Overscan)
    for (let r = 0; r < rows; r++) {
      const rowValues = pixels[r];

      // Überspringe komplett weiße Zeilen
      let firstC = 0;
      while (firstC < cols && rowValues[firstC] >= 250) {
        firstC++;
      }
      let lastC = cols - 1;
      while (lastC >= 0 && rowValues[lastC] >= 250) {
        lastC--;
      }
      if (firstC > lastC) continue;

      const isLeftToRight = r % 2 === 0;
      const colIndices: number[] = [];
      if (isLeftToRight) {
        for (let c = firstC; c <= lastC; c++) colIndices.push(c);
      } else {
        for (let c = lastC; c >= firstC; c--) colIndices.push(c);
      }

      const cStart = colIndices[0];
      const cEnd = colIndices[colIndices.length - 1];

      const pStart = this.mapXY(rLeft + cStart * interval, rTop + r * interval);
      const pEnd = this.mapXY(rLeft + cEnd * interval, rTop + r * interval);
      const xStartMach = pStart.x;
      const xEndMach = pEnd.x;
      const yMach = pStart.y;

      // Overscan-Koordinaten berechnen
      const isXIncreasing = xEndMach > xStartMach;
      let xAccel = 0;
      let xDecel = 0;
      if (isXIncreasing) {
        xAccel = xStartMach - overscan;
        xDecel = xEndMach + overscan;
      } else {
        xAccel = xStartMach + overscan;
        xDecel = xEndMach - overscan;
      }

      // 1. Positioniere zum Start des Overscans mit G0 (Laser aus / S0)
      lines.push(`G0 X${xAccel.toFixed(3)} Y${yMach.toFixed(3)}`);

      // 2. Lead-In Bewegung um auf Geschwindigkeit zu kommen (Laser aus / S0)
      lines.push(`G1 X${xStartMach.toFixed(3)} S0 F${speed}`);

      // 4. Zeilen-Raster abfahren (Optimiert: Fasst gleiche Pixel zusammen)
      let currentPowerS = -1;

      for (let i = 0; i < colIndices.length; i++) {
        const c = colIndices[i];
        const gray = pixels[r][c];
        const isWhite = gray >= 250;
        
        let powerS = 0;
        if (!isWhite) {
          const powerFactor = 1.0 - (gray / 255.0);
          powerS = Math.max(1, Math.round(powerFactor * sMax));
        }

        // Wenn sich die Laser-Leistung ändert, fahre mit der ALTEN Leistung bis zum Beginn dieses neuen Pixels
        if (powerS !== currentPowerS) {
          if (currentPowerS !== -1) {
            const xPixel = this.mapX(rLeft + c * interval);
            lines.push(`G1 X${xPixel.toFixed(3)} S${currentPowerS}`);
          }
          currentPowerS = powerS;
        }
      }

      // Den letzten Block bis zum Ende der Zeile abfahren
      if (currentPowerS !== -1) {
        const lastC = colIndices[colIndices.length - 1];
        const nextC = isLeftToRight ? lastC + 1 : lastC - 1;
        const xPixelEnd = this.mapX(rLeft + nextC * interval);
        lines.push(`G1 X${xPixelEnd.toFixed(3)} S${currentPowerS}`);
      }

      // 5. Lead-Out Bewegung (Laser aus / S0) bis zum Ende des Overscans
      lines.push(`G1 X${xDecel.toFixed(3)} S0`);
    }
    lines.push(`M5 ; Laser ausschalten nach Raster`);
    lines.push(`; --- Ende Raster Image scan ---`);
  }

  /**
   * Generiert G-Code für die Umrisslinien eines Dreiecks (Triangle)
   */
  private generateTriangleGcode(obj: CanvasObjectData, layer: LayerSettings, lines: string[]) {
    const w = obj.width * obj.scaleX;
    const h = obj.height * obj.scaleY;
    const sValue = Math.round(((obj.customPower ?? layer.power) / 100) * 1000);
    const speed = obj.customSpeed ?? layer.speed;

    const p1X = obj.left + w / 2;
    const p1Y = obj.top;
    const p2X = obj.left + w;
    const p2Y = obj.top + h;
    const p3X = obj.left;
    const p3Y = obj.top + h;

    const p1 = this.mapXY(p1X, p1Y);
    const p2 = this.mapXY(p2X, p2Y);
    const p3 = this.mapXY(p3X, p3Y);
    const x1 = p1.x;
    const y1 = p1.y;
    const x2 = p2.x;
    const y2 = p2.y;
    const x3 = p3.x;
    const y3 = p3.y;

    this.addG0MoveWithBacklash(x1, y1, x2, y2, lines, speed);
    lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
    lines.push(`G1 X${x2.toFixed(3)} Y${y2.toFixed(3)} S${sValue} F${speed}`);
    lines.push(`G1 X${x3.toFixed(3)} Y${y3.toFixed(3)}`);
    lines.push(`G1 X${x1.toFixed(3)} Y${y1.toFixed(3)}`);
    lines.push("M5");
  }

  /**
   * Generiert G-Code für die Umrisslinien einer Ellipse (Ellipse)
   */
  private generateEllipseGcode(obj: CanvasObjectData, layer: LayerSettings, lines: string[]) {
    const rx = (obj.width / 2) * obj.scaleX;
    const ry = (obj.height / 2) * obj.scaleY;
    const xCenter = obj.left + rx;
    const yCenter = obj.top + ry;
    
    const sValue = Math.round(((obj.customPower ?? layer.power) / 100) * 1000);
    const speed = obj.customSpeed ?? layer.speed;

    const segments = 64;
    const theta0 = 0;
    const pMach0 = this.mapXY(xCenter + rx * Math.cos(theta0), yCenter + ry * Math.sin(theta0));
    const xMach0 = pMach0.x;
    const yMach0 = pMach0.y;

    const theta1 = (1 / segments) * 2 * Math.PI;
    const pMach1 = this.mapXY(xCenter + rx * Math.cos(theta1), yCenter + ry * Math.sin(theta1));
    const xMach1 = pMach1.x;
    const yMach1 = pMach1.y;

    this.addG0MoveWithBacklash(xMach0, yMach0, xMach1, yMach1, lines, speed);
    lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);

    for (let i = 1; i <= segments; i++) {
      const theta = (i / segments) * 2 * Math.PI;
      const xVal = xCenter + rx * Math.cos(theta);
      const yVal = yCenter + ry * Math.sin(theta);
      
      const pMach = this.mapXY(xVal, yVal);
      const xMach = pMach.x;
      const yMach = pMach.y;
      
      lines.push(`G1 X${xMach.toFixed(3)} Y${yMach.toFixed(3)} S${sValue} F${speed}`);
    }
    lines.push("M5");
  }

  /**
   * Berechnet die ungefähre Dauer des G-Codes in Sekunden
   */
  public estimateTime(gcode: string): number {
    let timeSeconds = 0;
    let currentX = 0;
    let currentY = 0;
    let currentSpeed = 3000; // mm/min
    let absoluteMode = true;

    const lines = gcode.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (!line || line.startsWith(';')) continue;

      if (/\bG90\b/.test(line)) absoluteMode = true;
      if (/\bG91\b/.test(line)) absoluteMode = false;

      const fMatch = line.match(/F\s*([\d.]+)/);
      if (fMatch) {
        currentSpeed = parseFloat(fMatch[1]);
      }

      if (line.startsWith('G0') || line.startsWith('G1') || line.startsWith('G00') || line.startsWith('G01')) {
        const xMatch = line.match(/X\s*([\d.-]+)/);
        const yMatch = line.match(/Y\s*([\d.-]+)/);

        let newX = currentX;
        let newY = currentY;

        if (xMatch) newX = absoluteMode ? parseFloat(xMatch[1]) : currentX + parseFloat(xMatch[1]);
        if (yMatch) newY = absoluteMode ? parseFloat(yMatch[1]) : currentY + parseFloat(yMatch[1]);

        const dx = newX - currentX;
        const dy = newY - currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0 && currentSpeed > 0) {
          // G0 moves fast (e.g. 6000 mm/min), G1 moves at currentSpeed
          const speed = (line.startsWith('G0') || line.startsWith('G00')) ? 6000 : currentSpeed;
          timeSeconds += distance / (speed / 60);
        }

        currentX = newX;
        currentY = newY;
      } else if (line.startsWith('G2') || line.startsWith('G3')) {
        const xMatch = line.match(/X\s*([\d.-]+)/);
        const yMatch = line.match(/Y\s*([\d.-]+)/);
        const iMatch = line.match(/I\s*([\d.-]+)/);
        const jMatch = line.match(/J\s*([\d.-]+)/);
        
        let newX = currentX;
        let newY = currentY;

        if (xMatch) newX = absoluteMode ? parseFloat(xMatch[1]) : currentX + parseFloat(xMatch[1]);
        if (yMatch) newY = absoluteMode ? parseFloat(yMatch[1]) : currentY + parseFloat(yMatch[1]);

        if (iMatch) {
          const iVal = parseFloat(iMatch[1]);
          const jVal = jMatch ? parseFloat(jMatch[1]) : 0;
          
          const r = Math.sqrt(iVal * iVal + jVal * jVal);
          const cx = currentX + iVal;
          const cy = currentY + jVal;
          
          let startAngle = Math.atan2(currentY - cy, currentX - cx);
          let endAngle = Math.atan2(newY - cy, newX - cx);
          
          const isClockwise = line.startsWith('G2');
          if (isClockwise && endAngle > startAngle) endAngle -= 2 * Math.PI;
          if (!isClockwise && endAngle < startAngle) endAngle += 2 * Math.PI;
          
          const arcLength = Math.abs(endAngle - startAngle) * r;
          if (arcLength > 0 && currentSpeed > 0) {
            timeSeconds += arcLength / (currentSpeed / 60);
          }
        }
        currentX = newX;
        currentY = newY;
      }
    }
    
    // Faktor 1.1 als Puffer für Beschleunigung/Abbremsen
    return timeSeconds * 1.1;
  }

  private getObjectOutlinePoints(obj: CanvasObjectData): [number, number][] {
    const points: [number, number][] = [];
    const objType = obj.type ? obj.type.toLowerCase() : 'unknown';

    if (objType === 'rect') {
      const w = obj.width * obj.scaleX;
      const h = obj.height * obj.scaleY;
      const cx = obj.left + w / 2;
      const cy = obj.top + h / 2;
      const angleRad = (obj.angle || 0) * Math.PI / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      const rotateAndMap = (relX: number, relY: number): [number, number] => {
        const rx = relX * cosA - relY * sinA;
        const ry = relX * sinA + relY * cosA;
        return [this.mapX(cx + rx), this.mapY(cy + ry)];
      };

      points.push(rotateAndMap(-w / 2, -h / 2));
      points.push(rotateAndMap(w / 2, -h / 2));
      points.push(rotateAndMap(w / 2, h / 2));
      points.push(rotateAndMap(-w / 2, h / 2));
      points.push(rotateAndMap(-w / 2, -h / 2));
    } else if (objType === 'circle') {
      const r = (obj.radius || (obj.width / 2)) * obj.scaleX;
      const cx = obj.left + r;
      const cy = obj.top + r;
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        points.push([
          this.mapX(cx + r * Math.cos(angle)),
          this.mapY(cy + r * Math.sin(angle))
        ]);
      }
    } else if (objType === 'ellipse') {
      const rx = (obj.width / 2) * obj.scaleX;
      const ry = (obj.height / 2) * obj.scaleY;
      const cx = obj.left + rx;
      const cy = obj.top + ry;
      const angleRad = (obj.angle || 0) * Math.PI / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      const rotateAndMap = (relX: number, relY: number): [number, number] => {
        const xRot = relX * cosA - relY * sinA;
        const yRot = relX * sinA + relY * cosA;
        return [this.mapX(cx + xRot), this.mapY(cy + yRot)];
      };
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        points.push(rotateAndMap(rx * Math.cos(angle), ry * Math.sin(angle)));
      }
    } else if (objType === 'triangle') {
      const w = obj.width * obj.scaleX;
      const h = obj.height * obj.scaleY;
      const cx = obj.left + w / 2;
      const cy = obj.top + h / 2;
      const angleRad = (obj.angle || 0) * Math.PI / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      const rotateAndMap = (relX: number, relY: number): [number, number] => {
        const rx = relX * cosA - relY * sinA;
        const ry = relX * sinA + relY * cosA;
        return [this.mapX(cx + rx), this.mapY(cy + ry)];
      };

      points.push(rotateAndMap(0, -h / 2));
      points.push(rotateAndMap(w / 2, h / 2));
      points.push(rotateAndMap(-w / 2, h / 2));
      points.push(rotateAndMap(0, -h / 2));
    } else if (objType === 'path' && obj.path) {
      const cx = obj.left + (obj.width * (obj.scaleX || 1)) / 2;
      const cy = obj.top + (obj.height * (obj.scaleY || 1)) / 2;
      const angleRad = (obj.angle || 0) * Math.PI / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      
      const rotateAndMap = (relX: number, relY: number): { mx: number, my: number } => {
        const rx = relX * cosA - relY * sinA;
        const ry = relX * sinA + relY * cosA;
        return { mx: this.mapX(cx + rx), my: this.mapY(cy + ry) };
      };

      let currentX = 0;
      let currentY = 0;

      const addBezierPoints = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, segments: number) => {
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const mt = 1 - t;
          const x = mt*mt*mt*x0 + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3;
          const y = mt*mt*mt*y0 + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y3;
          points.push([x, y]);
        }
      };

      const addQuadPoints = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, segments: number) => {
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const mt = 1 - t;
          const x = mt*mt*x0 + 2*mt*t*x1 + t*t*x2;
          const y = mt*mt*y0 + 2*mt*t*y1 + t*t*y2;
          points.push([x, y]);
        }
      };

      for (let i = 0; i < obj.path.length; i++) {
        const cmd = obj.path[i];
        const type = cmd.type;
        if (type === 'M') {
          const { mx: targetX, my: targetY } = rotateAndMap(cmd.x * obj.scaleX, cmd.y * obj.scaleY);
          points.push([targetX, targetY]);
          currentX = targetX;
          currentY = targetY;
        } else if (type === 'L') {
          const { mx: targetX, my: targetY } = rotateAndMap(cmd.x * obj.scaleX, cmd.y * obj.scaleY);
          points.push([targetX, targetY]);
          currentX = targetX;
          currentY = targetY;
        } else if (type === 'C') {
          const { mx: x1, my: y1 } = rotateAndMap(cmd.x1 * obj.scaleX, cmd.y1 * obj.scaleY);
          const { mx: x2, my: y2 } = rotateAndMap(cmd.x2 * obj.scaleX, cmd.y2 * obj.scaleY);
          const { mx: x3, my: y3 } = rotateAndMap(cmd.x * obj.scaleX, cmd.y * obj.scaleY);
          addBezierPoints(currentX, currentY, x1, y1, x2, y2, x3, y3, 10);
          currentX = x3;
          currentY = y3;
        } else if (type === 'Q') {
          const { mx: x1, my: y1 } = rotateAndMap(cmd.x1 * obj.scaleX, cmd.y1 * obj.scaleY);
          const { mx: x2, my: y2 } = rotateAndMap(cmd.x * obj.scaleX, cmd.y * obj.scaleY);
          addQuadPoints(currentX, currentY, x1, y1, x2, y2, 10);
          currentX = x2;
          currentY = y2;
        } else if (type === 'Z') {
          if (points.length > 0) {
            points.push([...points[0]]);
          }
        }
      }
    }

    return points;
  }

  private generateOffsetFillGcode(obj: CanvasObjectData, layer: LayerSettings, lines: string[]) {
    const points = this.getObjectOutlinePoints(obj);
    if (!points || points.length < 3) {
      lines.push(`; [INFO] Offset Fill übersprungen: nicht genügend Punkte`);
      return;
    }

    const interval = obj.customInterval ?? 0.2; // stepover distance in mm
    const sValue = Math.round(((obj.customPower ?? layer.power) / 100) * 1000);
    const speed = obj.customSpeed ?? layer.speed;

    try {
      lines.push(`; --- Offset Fill (Pocketing) Start ---`);
      
      const offsetInstance = new Offset();
      const toolpaths: [number, number][][] = [];

      // Ensure the initial polygon is closed
      const initialPoly = [...points];
      if (
        initialPoly[0][0] !== initialPoly[initialPoly.length - 1][0] ||
        initialPoly[0][1] !== initialPoly[initialPoly.length - 1][1]
      ) {
        initialPoly.push([...initialPoly[0]]);
      }

      toolpaths.push(initialPoly);

      let currentPolygons = [initialPoly];
      let safetyCounter = 0;
      const maxIterations = 500; // Prevent infinite loops

      while (currentPolygons.length > 0 && safetyCounter < maxIterations) {
        safetyCounter++;
        const nextPolygons: [number, number][][] = [];

        for (const poly of currentPolygons) {
          try {
            const results = offsetInstance.data(poly).padding(interval);
            if (results && results.length > 0) {
              for (const res of results) {
                if (res && res.length >= 3) {
                  // Ensure closed loop
                  const closed = [...res];
                  if (
                    closed[0][0] !== closed[closed.length - 1][0] ||
                    closed[0][1] !== closed[closed.length - 1][1]
                  ) {
                    closed.push([...closed[0]]);
                  }
                  toolpaths.push(closed);
                  nextPolygons.push(closed);
                }
              }
            }
          } catch (err) {
            // Ignore errors on collapsed paths
          }
        }

        currentPolygons = nextPolygons;
      }
      
      for (const path of toolpaths) {
        if (path.length < 2) continue;
        
        // Move to start point of loop
        const startPt = path[0];
        lines.push(`G0 X${startPt[0].toFixed(3)} Y${startPt[1].toFixed(3)}`);
        lines.push(`${settingsStore.get().laserMode || 'M4'} S${sValue}`);
        
        // Draw loop
        for (let i = 1; i < path.length; i++) {
          const pt = path[i];
          lines.push(`G1 X${pt[0].toFixed(3)} Y${pt[1].toFixed(3)} S${sValue} F${speed}`);
        }
        lines.push("M5");
      }
      lines.push(`; --- Offset Fill End ---`);
    } catch (err: any) {
      lines.push(`; [FEHLER] Offset Fill fehlgeschlagen: ${err.message}`);
    }
  }

  private addG0MoveWithBacklash(
    startX: number,
    startY: number,
    nextX: number,
    nextY: number,
    lines: string[],
    speed: number
  ) {
    const settings = settingsStore.get();
    const blX = settings.backlashX || 0;
    const blY = settings.backlashY || 0;

    if (blX <= 0 && blY <= 0) {
      lines.push(`G0 X${startX.toFixed(3)} Y${startY.toFixed(3)}`);
      return;
    }

    // Bestimme Startpunkt-Richtung
    const dx = nextX - startX;
    const dy = nextY - startY;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < 0.001) {
      lines.push(`G0 X${startX.toFixed(3)} Y${startY.toFixed(3)}`);
      return;
    }

    const ux = dx / len;
    const uy = dy / len;

    // Füge vor dem ersten Laserschuss einen "Lead-In"-Vektor ein
    const leadX = startX - ux * blX;
    const leadY = startY - uy * blY;

    lines.push(`; --- Backlash Compensation Lead-In ---`);
    lines.push(`G0 X${leadX.toFixed(3)} Y${leadY.toFixed(3)}`);
    lines.push(`G1 X${startX.toFixed(3)} Y${startY.toFixed(3)} S0 F${speed}`);
  }

  private isPointInPolygon(pt: [number, number], polygon: [number, number][]): boolean {
    const [x, y] = pt;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private parseSvgPaths(svgString: string): string[] {
    const paths: string[] = [];
    const regex = /<path[^>]*d="([^"]+)"/g;
    let match;
    while ((match = regex.exec(svgString)) !== null) {
      paths.push(match[1]);
    }
    return paths;
  }

  private parseSvgPathToCommands(d: string): any[] {
    const commands: any[] = [];
    const tokens = d.match(/[MLHVCSQTAZmlhvcsvqtagz]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || [];
    
    let i = 0;
    let currentCmd = '';
    while (i < tokens.length) {
      const token = tokens[i];
      if (/[MLHVCSQTAZmlhvcsvqtagz]/.test(token)) {
        currentCmd = token;
        i++;
      }
      
      const type = currentCmd.toUpperCase();
      if (type === 'Z') {
        commands.push({ type: 'Z' });
      } else if (type === 'M' || type === 'L') {
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        commands.push({ type, x, y });
      } else if (type === 'C') {
        const x1 = parseFloat(tokens[i++]);
        const y1 = parseFloat(tokens[i++]);
        const x2 = parseFloat(tokens[i++]);
        const y2 = parseFloat(tokens[i++]);
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        commands.push({ type, x1, y1, x2, y2, x, y });
      } else if (type === 'Q') {
        const x1 = parseFloat(tokens[i++]);
        const y1 = parseFloat(tokens[i++]);
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        commands.push({ type, x1, y1, x, y });
      } else {
        i++;
      }
    }
    return commands;
  }

  private optimizeTour2Opt(
    tour: CanvasObjectData[],
    startX: number,
    startY: number
  ): CanvasObjectData[] {
    const n = tour.length;
    if (n < 4 || n > 500) {
      // 2-Opt benötigt mindestens 4 Punkte für Kanten-Tausch und hat ein Limit bei 500
      return tour;
    }

    const startTime = Date.now();
    const maxDuration = 100; // Max 100ms Timeout

    const distSq = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return dx * dx + dy * dy;
    };

    const getTourDistance = (arr: CanvasObjectData[]): number => {
      let d = distSq(startX, startY, arr[0].left, arr[0].top);
      for (let i = 0; i < arr.length - 1; i++) {
        d += distSq(arr[i].left, arr[i].top, arr[i + 1].left, arr[i + 1].top);
      }
      return d;
    };

    let bestTour = [...tour];
    let bestDist = getTourDistance(bestTour);
    let improved = true;

    while (improved && (Date.now() - startTime < maxDuration)) {
      improved = false;

      for (let i = 1; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          const newTour = [
            ...bestTour.slice(0, i),
            ...bestTour.slice(i, j + 1).reverse(),
            ...bestTour.slice(j + 1)
          ];
          const newDist = getTourDistance(newTour);

          if (newDist < bestDist - 0.001) {
            bestTour = newTour;
            bestDist = newDist;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }

    return bestTour;
  }
}

export const gcodeGen = new GcodeGenerator();
