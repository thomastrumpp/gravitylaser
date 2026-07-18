import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as fabric from 'fabric';
import { useStore } from '../stores/store';
import { canvasStore, type ToolType } from '../stores/canvasStore';
import { layersStore } from '../stores/layersStore';
import { settingsStore } from '../stores/settingsStore';
import { consoleStore } from '../stores/consoleStore';
import { BooleanOperationService } from '../services/BooleanOperationService';
import { uiStore } from '../stores/uiStore';
import { type CanvasObjectData } from '../gcode/GcodeGenerator';
import { DxfImportService } from '../services/DxfImportService';
import { CanvasControls } from './CanvasControls';
import opentype from 'opentype.js';
import { v4 as uuidv4 } from 'uuid';
import { historyStore } from '../stores/historyStore';
import { BarcodeService } from '../services/BarcodeService';

const fontUrl = '/Roboto-Regular.ttf';

let cachedFont: any = null;
let canvasClipboard: any = null;

async function loadFont() {
  if (cachedFont) return cachedFont;
  try {
    const resp = await fetch(fontUrl);
    const buffer = await resp.arrayBuffer();
    cachedFont = opentype.parse(buffer);
    return cachedFont;
  } catch (e) {
    console.error("Fehler beim Laden der Schriftart Roboto-Regular.ttf:", e);
    return null;
  }
}

export const LaserCanvas: React.FC = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const activeObjectRef = useRef<fabric.FabricObject | null>(null);
  const lastMouseScenePointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const layers = useStore(layersStore);
  const settings = useStore(settingsStore);
  const canvasState = useStore(canvasStore);
  const uiState = useStore(uiStore);

  const scalePxPerMm = 2; // Maßstab: 2 Pixel pro mm
  const machineWidthPx = settings.workingSizeX * scalePxPerMm;
  const machineHeightPx = settings.workingSizeY * scalePxPerMm;

  // Hilfsfunktion: Ermittelt das unrotierte Links (left edge) des Objekts in mm
  const getObjectLeftMm = (obj: any): number => {
    let l = obj.left;
    if (obj.originX === 'center') {
      l -= (obj.width * obj.scaleX) / 2;
    } else if (obj.originX === 'right') {
      l -= (obj.width * obj.scaleX);
    }
    return l / scalePxPerMm;
  };

  // Hilfsfunktion: Ermittelt das unrotierte Unten (bottom edge) des Objekts in mm (vom unteren Rand)
  const getObjectBottomMm = (obj: any): number => {
    let t = obj.top;
    if (obj.originY === 'center') {
      t -= (obj.height * obj.scaleY) / 2;
    } else if (obj.originY === 'bottom') {
      t -= (obj.height * obj.scaleY);
    }
    const bottomPx = t + (obj.height * obj.scaleY);
    return (machineHeightPx - bottomPx) / scalePxPerMm;
  };

  // Hilfsfunktion: Setzt die absolute Position des Objekts basierend auf links (mm) und unten (mm)
  const setObjectPosition = (obj: any, xMm: number | undefined, yMm: number | undefined) => {
    if (xMm !== undefined) {
      let leftPx = xMm * scalePxPerMm;
      if (obj.originX === 'center') {
        leftPx += (obj.width * obj.scaleX) / 2;
      } else if (obj.originX === 'right') {
        leftPx += (obj.width * obj.scaleX);
      }
      obj.set({ left: leftPx });
    }
    if (yMm !== undefined) {
      const bottomPx = machineHeightPx - (yMm * scalePxPerMm);
      let topPx = bottomPx - (obj.height * obj.scaleY);
      
      if (obj.originY === 'center') {
        topPx += (obj.height * obj.scaleY) / 2;
      } else if (obj.originY === 'bottom') {
        topPx += (obj.height * obj.scaleY);
      }
      obj.set({ top: topPx });
    }
  };

  useEffect(() => {
    loadFont();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const initialWidth = containerRef.current.clientWidth;
    const initialHeight = containerRef.current.clientHeight;

    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
      delete (window as any).fabricCanvas;
    }

    // 1. Initialisiere Fabric.js Canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: initialWidth,
      height: initialHeight,
      backgroundColor: '#05070a', // Dunklerer Hintergrund für Bereich außerhalb der Maschine
      selectionColor: 'rgba(0, 240, 255, 0.15)',
      selectionBorderColor: '#00f0ff',
      selectionLineWidth: 1.5,
      fireRightClick: true, // Ermöglicht Pan mit Rechtsklick
      stopContextMenu: true,
    });

    fabricCanvasRef.current = canvas;
    historyStore.setCanvas(canvas);
    (window as any).fabricCanvas = canvas;
    (window as any).fabric = fabric;
    (window as any).layersStore = layersStore;

    // 2. Zeichne das Rasteroverlay für den Maschinenbereich
    createGridAndOrigin(canvas, machineWidthPx, machineHeightPx, scalePxPerMm);

    // Initial Viewport Center (Maschine zentrieren & Zoomen)
    if (containerRef.current) {
      const initWidth = containerRef.current.clientWidth;
      const initHeight = containerRef.current.clientHeight;
      
      // Zoom berechnen, so dass Maschine zu 90% reinpasst
      const padding = 0.9;
      const scaleX = initWidth / machineWidthPx;
      const scaleY = initHeight / machineHeightPx;
      const initialZoom = Math.min(scaleX, scaleY) * padding;
      
      canvas.setZoom(initialZoom);

      // Zentrieren
      const vpt = canvas.viewportTransform;
      if (vpt) {
        vpt[4] = initWidth / 2 - ((machineWidthPx - 40) / 2) * initialZoom;
        vpt[5] = initHeight / 2 - ((machineHeightPx + 40) / 2) * initialZoom;
        canvas.setViewportTransform(vpt);
      }
    }
    canvas.requestRenderAll();

    // Responsive Resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        canvas.setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    // Initialisiere GcodeSimulator für Canvas (Dot-Simulation)
    import('../gcode/GcodeSimulator').then(({ GcodeSimulator }) => {
      (window as any).canvasSimulator = new GcodeSimulator(canvas);
    });

    // 3. Event-Listener für Selektionen
    const handleSelection = () => {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        // Hole Positions- und Größen-Daten umgerechnet in mm
        canvasStore.setSelectedObject({
          type: activeObj.type || 'unknown',
          x: Number(getObjectLeftMm(activeObj).toFixed(1)),
          y: Number(getObjectBottomMm(activeObj).toFixed(1)),
          width: Number((activeObj.width * activeObj.scaleX / scalePxPerMm).toFixed(1)),
          height: Number((activeObj.height * activeObj.scaleY / scalePxPerMm).toFixed(1)),
          angle: Number((activeObj.angle || 0).toFixed(0)),
          text: (activeObj as any).text,
          imageMode: (activeObj as any).imageMode || 'grayscale',
          ditherType: (activeObj as any).ditherType || 'floyd-steinberg',
          brightness: (activeObj as any).brightness !== undefined ? (activeObj as any).brightness : 0,
          contrast: (activeObj as any).contrast !== undefined ? (activeObj as any).contrast : 0,
          gamma: (activeObj as any).gamma !== undefined ? (activeObj as any).gamma : 1.0,
          invert: (activeObj as any).invert !== undefined ? (activeObj as any).invert : false,
          thresholdValue: (activeObj as any).thresholdValue !== undefined ? (activeObj as any).thresholdValue : 128,
          overscan: (activeObj as any).overscan !== undefined ? (activeObj as any).overscan : 2.5,
          kerf: (activeObj as any).kerf !== undefined ? (activeObj as any).kerf : 0.0,
          kerfMode: (activeObj as any).kerfMode || 'none',
          layerId: activeObj.get('data')?.layerId || 'C00',
          data: activeObj.get('data') || {},
        });
      } else {
        canvasStore.setSelectedObject(null);
      }
    };

    // Helper to enable/disable custom node-editing controls for path objects
    const enableNodeEditing = (obj: fabric.FabricObject, canvas: fabric.Canvas) => {
      if (!(obj instanceof fabric.Path)) return;
      const pathObj = obj as fabric.Path;
      
      // Save original controls and borders if not already saved
      if (!(pathObj as any)._originalControls) {
        (pathObj as any)._originalControls = { ...pathObj.controls };
        (pathObj as any)._originalHasBorders = pathObj.hasBorders;
      }

      const newControls: Record<string, fabric.Control> = {};
      pathObj.path.forEach((cmd: any, cmdIdx: number) => {
        const type = cmd[0];
        let xIdx = -1;
        let yIdx = -1;
        
        if (type === 'M' || type === 'L') {
          xIdx = 1;
          yIdx = 2;
        } else if (type === 'C') {
          xIdx = 5;
          yIdx = 6;
        } else if (type === 'Q') {
          xIdx = 3;
          yIdx = 4;
        }
        
        if (xIdx !== -1 && yIdx !== -1) {
          const controlKey = `n_${cmdIdx}`;
          newControls[controlKey] = new fabric.Control({
            x: 0,
            y: 0,
            cursorStyle: 'pointer',
            actionName: 'modifyPathPoint',
            // @ts-expect-error - Point index property
            pointIndex: cmdIdx,
            render: function(ctx, left, top, _styleOverride, _fabricObject) {
              ctx.save();
              ctx.fillStyle = '#00f0ff';
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(left, top, 5, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            },
            positionHandler: function(_dim, _finalMatrix, fabricObject) {
              const pathObj = fabricObject as fabric.Path;
              const cmd = pathObj.path[cmdIdx];
              const x = (cmd[xIdx] as number) - pathObj.pathOffset.x;
              const y = (cmd[yIdx] as number) - pathObj.pathOffset.y;
              return fabric.util.transformPoint({ x, y }, pathObj.calcTransformMatrix());
            },
            actionHandler: function(_eventData, transform, x, y) {
              const obj = transform.target as any;
              const mouseLocal = obj.toLocalPoint(new fabric.Point(x, y), 'center', 'center');
              obj.path[cmdIdx][xIdx] = mouseLocal.x + obj.pathOffset.x;
              obj.path[cmdIdx][yIdx] = mouseLocal.y + obj.pathOffset.y;
              obj._initDimensions();
              obj.setCoords();
              return true;
            }
          });
        }
      });

      pathObj.controls = newControls;
      pathObj.hasBorders = false;
      canvas.requestRenderAll();
    };

    const disableNodeEditing = (obj: fabric.FabricObject, canvas: fabric.Canvas) => {
      if (!(obj instanceof fabric.Path)) return;
      const pathObj = obj as fabric.Path;
      if ((pathObj as any)._originalControls) {
        pathObj.controls = (pathObj as any)._originalControls;
        pathObj.hasBorders = (pathObj as any)._originalHasBorders;
        delete (pathObj as any)._originalControls;
        delete (pathObj as any)._originalHasBorders;
        canvas.requestRenderAll();
      }
    };

    canvas.on('selection:created', (e) => {
      handleSelection();
      uiStore.setActiveTab('properties');
      const tool = canvasStore.get().activeTool;
      if (tool === 'node-edit' && e.selected && e.selected.length === 1) {
        enableNodeEditing(e.selected[0], canvas);
      }
    });
    canvas.on('selection:updated', (e) => {
      handleSelection();
      const tool = canvasStore.get().activeTool;
      canvas.getObjects().forEach(o => disableNodeEditing(o, canvas));
      if (tool === 'node-edit' && e.selected && e.selected.length === 1) {
        enableNodeEditing(e.selected[0], canvas);
      }
    });
    canvas.on('selection:cleared', () => {
      handleSelection();
      canvas.getObjects().forEach(o => disableNodeEditing(o, canvas));
    });
    canvas.on('object:modified', handleSelection);
    canvas.on('object:scaling', handleSelection);
    canvas.on('object:rotating', handleSelection);

    // Objekt Snapping (Einrasten ans Grid)
    canvas.on('object:moving', (e) => {
      const obj = e.target;
      if (!obj) return;
      const resMm = canvasStore.get().gridResolution;
      if (resMm <= 0) return; // Snapping disabled when <= 0
      
      const snapPx = resMm * scalePxPerMm;
      obj.set({
        left: Math.round(obj.left / snapPx) * snapPx,
        top: Math.round(obj.top / snapPx) * snapPx
      });
      // Auswahl-Objekt direkt aktualisieren für flüssiges Live-Feedback
      handleSelection();
    });

    // Helper to serialize Fabric objects for history commands
    const serializeFabricObject = (obj: fabric.FabricObject) => {
      const data = obj.get('data') as any || {};
      const props: any = {
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.height,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle,
        fill: obj.fill,
        stroke: obj.stroke,
        strokeWidth: obj.strokeWidth,
        strokeUniform: obj.strokeUniform,
        layerId: data.layerId || 'C00',
        imageMode: data.imageMode,
        ditherType: data.ditherType,
        brightness: data.brightness,
        contrast: data.contrast,
        gamma: data.gamma,
        invert: data.invert,
        thresholdValue: data.thresholdValue,
        overscan: data.overscan,
        kerf: data.kerf,
        kerfMode: data.kerfMode,
        isRasterizedVector: data.isRasterizedVector,
      };

      if (obj.type === 'circle') {
        props.radius = (obj as fabric.Circle).radius;
      } else if (obj.type === 'ellipse') {
        props.rx = (obj as fabric.Ellipse).rx;
        props.ry = (obj as fabric.Ellipse).ry;
      } else if (obj.type === 'line') {
        props.x1 = (obj as fabric.Line).x1;
        props.y1 = (obj as fabric.Line).y1;
        props.x2 = (obj as fabric.Line).x2;
        props.y2 = (obj as fabric.Line).y2;
      } else if (obj instanceof fabric.Path) {
        props.pathData = obj.path;
      } else if (obj.type === 'text' || obj.type === 'i-text') {
        props.text = (obj as fabric.IText).text;
        props.fontFamily = (obj as fabric.IText).fontFamily;
        props.fontSize = (obj as fabric.IText).fontSize;
        props.fontWeight = (obj as fabric.IText).fontWeight;
        props.fontStyle = (obj as fabric.IText).fontStyle;
      } else if (obj.type === 'image') {
        props.imageSrc = ((obj as fabric.FabricImage).getElement() as any).src;
      }

      return props;
    };

    // --- History Store event listeners ---
    
    // Listen for object creation
    canvas.on('object:added', (e) => {
      const obj = e.target;
      if (!obj || (obj as any).excludeFromExport || !obj.selectable) return;

      // Assign unique ID if it doesn't exist
      let data = obj.get('data') as any || {};
      if (!data.gravityId) {
        const gravityId = uuidv4();
        data = { ...data, gravityId };
        obj.set('data', data);
      }

      if (historyStore.isRebuilding) return;

      historyStore.registerCommand({
        id: uuidv4(),
        type: 'create',
        params: {
          gravityId: data.gravityId,
          shapeType: obj.type,
          ...serializeFabricObject(obj)
        }
      });
    });

    // Listen for object modifications
    canvas.on('object:modified', (e) => {
      if (historyStore.isRebuilding) return;
      const target = e.target;
      if (!target) return;

      const updateObj = (obj: fabric.FabricObject) => {
        const data = obj.get('data') as any;
        if (!data || !data.gravityId) return;

        historyStore.registerCommand({
          id: uuidv4(),
          type: 'update',
          params: {
            targetId: data.gravityId,
            properties: {
              left: obj.left,
              top: obj.top,
              width: obj.width,
              height: obj.height,
              scaleX: obj.scaleX,
              scaleY: obj.scaleY,
              angle: obj.angle,
            }
          }
        });
      };

      if (target.type === 'activeselection') {
        (target as fabric.ActiveSelection).forEachObject(updateObj);
      } else {
        updateObj(target);
      }
    });

    // NOTE: Delete-Commands werden NICHT über object:removed registriert,
    // sondern explizit beim Delete-Tastendruck und bei canvasAction-Events,
    // um doppelte Einträge bei Group/Ungroup/Boolean-Operationen zu vermeiden.

    // 4. Mouse Events für Zeichnen & Pan
    canvas.on('mouse:down', (e) => handleMouseDown(e, canvas));
    canvas.on('mouse:move', (e) => {
      const pointer = canvas.getScenePoint(e.e);
      lastMouseScenePointRef.current = { x: pointer.x, y: pointer.y };
      handleMouseMove(e, canvas);
    });
    canvas.on('mouse:up', (e) => handleMouseUp(e, canvas));

    // MouseWheel for Zoom
    canvas.on('mouse:wheel', (opt) => {
      opt.e.preventDefault();
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;
      
      const pointer = canvas.getScenePoint(opt.e);
      canvas.zoomToPoint(pointer, zoom);
      opt.e.stopPropagation();
      canvasStore.setZoomLevel(zoom);
    });

    let toolBeforeSpacePan: ToolType | null = null;
    let isSpaceKeyDown = false;

    // 5. Tastenkürzel (z.B. Entf-Taste zum Löschen selektierter Objekte, ESC und Werkzeuge)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Wenn der Fokus in einem Eingabefeld liegt, ignorieren wir alle Shortcuts
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Spacebar-Hold zum Verschieben der Arbeitsfläche
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!isSpaceKeyDown) {
          isSpaceKeyDown = true;
          const currentTool = canvasStore.get().activeTool;
          if (currentTool !== 'pan') {
            toolBeforeSpacePan = currentTool;
            canvasStore.setActiveTool('pan');
          }
        }
        return;
      }

      // Prüfen, ob gerade ein Text-Objekt editiert wird
      const activeObj = canvas.getActiveObject();
      const isEditingText = activeObj && 
        (activeObj.type === 'text' || activeObj.type === 'i-text') && 
        (activeObj as any).isEditing;

      if (isEditingText) {
        return;
      }

      // Undo/Redo & Copy & Paste via Ctrl+Key
      if (e.ctrlKey || e.metaKey) {
        const lowerKey = e.key.toLowerCase();
        if (lowerKey === 'z') {
          e.preventDefault();
          historyStore.undo();
          return;
        } else if (lowerKey === 'y') {
          e.preventDefault();
          historyStore.redo();
          return;
        } else if (lowerKey === 'c') {
          if (activeObj) {
            activeObj.clone().then((cloned) => {
              canvasClipboard = cloned;
              consoleStore.logLine(t('canvas.copied', 'Objekt kopiert'), 'info');
            });
          }
          return;
        } else if (lowerKey === 'v') {
          if (canvasClipboard) {
            canvasClipboard.clone().then((clonedObj: any) => {
              canvas.discardActiveObject();
              
              clonedObj.set({
                left: clonedObj.left + 10,
                top: clonedObj.top + 10,
                evented: true,
              });
              
              if (clonedObj.type === 'activeSelection') {
                clonedObj.canvas = canvas;
                clonedObj.forEachObject((obj: any) => {
                  let data = obj.get('data') || {};
                  data = { ...data, gravityId: uuidv4() };
                  obj.set('data', data);
                  canvas.add(obj);
                });
                clonedObj.setCoords();
              } else {
                let data = clonedObj.get('data') || {};
                data = { ...data, gravityId: uuidv4() };
                clonedObj.set('data', data);
                canvas.add(clonedObj);
              }
              
              canvasClipboard.top += 10;
              canvasClipboard.left += 10;
              
              canvas.setActiveObject(clonedObj);
              canvas.requestRenderAll();
              consoleStore.logLine(t('canvas.pasted', 'Objekt eingefügt'), 'info');
            });
          }
          return;
        }
      }

      // Knotenbearbeitung (Node editing) Tastenkürzel für Löschen ('d') und Einfügen ('i')
      const tool = canvasStore.get().activeTool;
      if (tool === 'node-edit' && activeObj && activeObj instanceof fabric.Path) {
        const pathObj = activeObj as fabric.Path;
        const lowerKey = e.key.toLowerCase();
        
        if (lowerKey === 'd' || lowerKey === 'i') {
          const cx = pathObj.left + (pathObj.width * pathObj.scaleX) / 2;
          const cy = pathObj.top + (pathObj.height * pathObj.scaleY) / 2;
          const angleRad = (pathObj.angle || 0) * Math.PI / 180;
          const cosA = Math.cos(angleRad);
          const sinA = Math.sin(angleRad);

          let closestNodeIdx = -1;
          let minDistance = Infinity;

          pathObj.path.forEach((cmd: any, idx: number) => {
            const type = cmd[0];
            let px = 0;
            let py = 0;
            if (type === 'M' || type === 'L') {
              px = cmd[1] * pathObj.scaleX;
              py = cmd[2] * pathObj.scaleY;
            } else if (type === 'C') {
              px = cmd[5] * pathObj.scaleX;
              py = cmd[6] * pathObj.scaleY;
            } else if (type === 'Q') {
              px = cmd[3] * pathObj.scaleX;
              py = cmd[4] * pathObj.scaleY;
            } else {
              return;
            }

            const rx = (px - (pathObj.width * pathObj.scaleX) / 2) * cosA - (py - (pathObj.height * pathObj.scaleY) / 2) * sinA;
            const ry = (px - (pathObj.width * pathObj.scaleX) / 2) * sinA + (py - (pathObj.height * pathObj.scaleY) / 2) * cosA;
            const absX = cx + rx;
            const absY = cy + ry;

            const dx = absX - lastMouseScenePointRef.current.x;
            const dy = absY - lastMouseScenePointRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDistance) {
              minDistance = dist;
              closestNodeIdx = idx;
            }
          });

          if (closestNodeIdx !== -1 && minDistance < 25) {
            if (lowerKey === 'd') {
              if (closestNodeIdx === 0 && pathObj.path.length > 1) {
                pathObj.path.splice(0, 1);
                pathObj.path[0][0] = 'M';
              } else {
                pathObj.path.splice(closestNodeIdx, 1);
              }
              (pathObj as any)._initDimensions();
              pathObj.setCoords();
              enableNodeEditing(pathObj, canvas);
              canvas.requestRenderAll();
              
              historyStore.registerCommand({
                id: uuidv4(),
                type: 'update',
                params: {
                  targetId: (pathObj.get('data') as any)?.gravityId,
                  properties: { pathData: pathObj.path }
                }
              });
            } else if (lowerKey === 'i') {
              const mouseLocal = (pathObj as any).toLocalPoint(new fabric.Point(lastMouseScenePointRef.current.x, lastMouseScenePointRef.current.y), 'center', 'center');
              const newX = mouseLocal.x + pathObj.pathOffset.x;
              const newY = mouseLocal.y + pathObj.pathOffset.y;

              pathObj.path.splice(closestNodeIdx + 1, 0, ['L', newX, newY]);
              (pathObj as any)._initDimensions();
              pathObj.setCoords();
              enableNodeEditing(pathObj, canvas);
              canvas.requestRenderAll();

              historyStore.registerCommand({
                id: uuidv4(),
                type: 'update',
                params: {
                  targetId: (pathObj.get('data') as any)?.gravityId,
                  properties: { pathData: pathObj.path }
                }
              });
            }
            return;
          }
        }
      }

      if (e.key === 'Escape') {
        if (canvasStore.get().activeTool !== 'select') {
          canvasStore.setActiveTool('select');
        }
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeObj) {
          // Sammle alle gravityIds VOR dem Entfernen
          const deleteIds: string[] = [];
          if (activeObj.type.toLowerCase() === 'activeselection') {
            (activeObj as any).forEachObject((obj: fabric.FabricObject) => {
              const gid = (obj.get('data') as any)?.gravityId;
              if (gid) deleteIds.push(gid);
            });
          } else {
            const gid = (activeObj.get('data') as any)?.gravityId;
            if (gid) deleteIds.push(gid);
          }

          // History-Eintrag registrieren
          if (deleteIds.length > 0) {
            historyStore.registerCommand({
              id: uuidv4(),
              type: 'delete',
              params: { targetIds: deleteIds }
            });
          }

          // Objekte entfernen
          if (activeObj.type.toLowerCase() === 'activeselection') {
            (activeObj as any).forEachObject((obj: fabric.FabricObject) => {
              canvas.remove(obj);
            });
            canvas.discardActiveObject();
          } else {
            canvas.remove(activeObj);
          }
          canvas.requestRenderAll();
          canvasStore.setSelectedObject(null);
        }
      } else if (e.key === '+' || e.key === '=') {
        let zoom = canvas.getZoom() * 1.2;
        if (zoom > 20) zoom = 20;
        canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 } as fabric.Point, zoom);
      } else if (e.key === '-') {
        let zoom = canvas.getZoom() * 0.8;
        if (zoom < 0.1) zoom = 0.1;
        canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 } as fabric.Point, zoom);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault(); // Verhindere Scrollen der Seite
        const panStep = 20; // 20px pro Tastendruck
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = panStep;
        if (e.key === 'ArrowDown') dy = -panStep;
        if (e.key === 'ArrowLeft') dx = panStep;
        if (e.key === 'ArrowRight') dx = -panStep;
        
        canvas.relativePan(new fabric.Point(dx, dy));
      } else {
        // Tastenkürzel für Werkzeuge
        const lowerKey = e.key.toLowerCase();
        if (lowerKey === 's') {
          canvasStore.setActiveTool('select');
        } else if (lowerKey === 'p' || lowerKey === 'h') {
          canvasStore.setActiveTool('pan');
        } else if (lowerKey === 't') {
          canvasStore.setActiveTool('text');
        } else if (lowerKey === 'r') {
          canvasStore.setActiveTool('rect');
        } else if (lowerKey === 'c') {
          canvasStore.setActiveTool('circle');
        } else if (lowerKey === 'n') {
          canvasStore.setActiveTool('node-edit');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        if (isSpaceKeyDown) {
          isSpaceKeyDown = false;
          if (toolBeforeSpacePan) {
            canvasStore.setActiveTool(toolBeforeSpacePan);
            toolBeforeSpacePan = null;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Multi-Selection auch mit STRG-Taste erlauben
    // Nutzen 'mouse:down:before' in Fabric 6, damit wir die vorherige Selektion kennen, BEVOR Fabric sie löscht
    let previousSelection: fabric.FabricObject[] = [];
    canvas.on('mouse:down:before', function() {
      const active = canvas.getActiveObjects();
      previousSelection = [...active];
    });

    canvas.on('mouse:down', function(opt) {
      if (opt.e && (opt.e.ctrlKey || opt.e.metaKey) && opt.target) {
        
        // Da Fabric das Klick-Event schon verarbeitet hat, ist das Zielobjekt nun oft das EINZIGE aktive Objekt.
        // Wir stellen die alte Selektion wieder her und fügen das neue Target hinzu (oder entfernen es).
        const wasAlreadySelected = previousSelection.includes(opt.target);
        
        let newSelection = [...previousSelection];
        if (wasAlreadySelected) {
           newSelection = newSelection.filter(obj => obj !== opt.target);
        } else {
           newSelection.push(opt.target);
        }

        canvas.discardActiveObject();
        if (newSelection.length === 1) {
           canvas.setActiveObject(newSelection[0]);
        } else if (newSelection.length > 1) {
           const sel = new fabric.ActiveSelection(newSelection, { canvas });
           canvas.setActiveObject(sel);
        }
        
        canvas.requestRenderAll();
        handleSelection();
      }
    });

    // 6. SVG Import Listener (Fabric v7 async)
    
    const applyLayerColor = (obj: fabric.FabricObject, layerColor: string, layerMode: string, layerId: string) => {
      obj.set('data', { layerId });

      if (obj.type .toLowerCase() === 'group' || obj.type .toLowerCase() === 'activeselection') {
        (obj as any).forEachObject((child: fabric.FabricObject) => {
          applyLayerColor(child, layerColor, layerMode, layerId);
        });
      } else {
        // Erlaube Füllung auch für 'path', da Boolean-Ergebnisse Paths sind
        const isLine = obj.type === 'line';
        obj.set({ stroke: layerColor });
        
        if (layerMode === 'fill' && !isLine) {
          obj.set({ fill: layerColor });
        } else {
          if (obj.type === 'i-text') {
            obj.set({ fill: layerColor }); // Text standardmäßig gefüllt, da Umriss oft schlecht lesbar ist
          } else {
            obj.set({ fill: 'transparent' });
          }
        }
      }
    };

    const handleLoadSVG = async (e: Event) => {
      const customEvent = e as CustomEvent;
      let svgString = '';
      let barcodeMeta: any = undefined;

      if (typeof customEvent.detail === 'string') {
        svgString = customEvent.detail;
      } else if (customEvent.detail && typeof customEvent.detail === 'object') {
        svgString = customEvent.detail.svg;
        barcodeMeta = customEvent.detail.barcode;
      }
      
      try {
        const { objects, options } = await fabric.loadSVGFromString(svgString);
        
        // Filter out null objects
        const validObjects = objects.filter(obj => obj !== null) as fabric.FabricObject[];
        if (validObjects.length === 0) return;
        
        const activeLayerId = canvasStore.get().activeLayer;
        const layerColor = layersStore.get()[activeLayerId]?.color || '#ffffff';
        
        const layerMode = layersStore.get()[activeLayerId]?.mode || 'line';
        
        const obj = fabric.util.groupSVGElements(validObjects, options);
        
        // Zuweisen zu Ebene und zentrieren
        obj.set({
          left: machineWidthPx / 2,
          top: machineHeightPx / 2,
          originX: 'center',
          originY: 'center',
          strokeWidth: 2
        });

        // Setze gravityId und barcode Metadaten
        const data: any = { gravityId: uuidv4() };
        if (barcodeMeta) {
          data.barcode = barcodeMeta;
        }
        obj.set('data', data);
        
        // Rekursive Farbanpassung anwenden
        applyLayerColor(obj, layerColor, layerMode, activeLayerId);

        canvas.add(obj);
        canvas.setActiveObject(obj);
        canvas.requestRenderAll();
        consoleStore.logLine("SVG erfolgreich importiert.", "info");
      } catch (err) {
        console.error("Fehler beim SVG Import:", err);
      }
    };
    window.addEventListener('loadSVG', handleLoadSVG);

    const handleLoadDXF = (e: Event) => {
      const customEvent = e as CustomEvent;
      const dxfString = customEvent.detail;
      
      try {
        const pathData = DxfImportService.convertToSvgPath(dxfString);
        if (!pathData) {
          alert("Fehler: Keine gültigen Geometrien im DXF gefunden.");
          return;
        }

        const activeLayerId = canvasStore.get().activeLayer;
        const layerColor = layersStore.get()[activeLayerId]?.color || '#ffffff';
        const layerMode = layersStore.get()[activeLayerId]?.mode || 'line';

        const pathObj = new fabric.Path(pathData, {
          stroke: layerColor,
          fill: layerMode === 'fill' ? layerColor : 'transparent',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
          left: machineWidthPx / 2,
          top: machineHeightPx / 2
        });

        // Unique gravityId for history and Gcode reference
        const gravityId = uuidv4();
        pathObj.set('data', { layerId: activeLayerId, gravityId });

        canvas.add(pathObj);
        canvas.setActiveObject(pathObj);
        canvas.requestRenderAll();
        handleSelection();
        consoleStore.logLine("DXF erfolgreich importiert.", "info");
      } catch (err: any) {
        alert(`DXF Import fehlgeschlagen: ${err.message}`);
      }
    };
    window.addEventListener('loadDXF', handleLoadDXF);

    const handleLoadImage = (e: Event) => {
      const customEvent = e as CustomEvent;
      const dataUrl = customEvent.detail;
      
      const tempImg = new Image();
      tempImg.onload = () => {
        const totalPixels = tempImg.naturalWidth * tempImg.naturalHeight;
        let finalDataUrl = dataUrl;
        
        if (totalPixels > 50_000_000) {
          const proceed = confirm(
            `Warnung: Das Bild hat ${Math.round(totalPixels / 1_000_000)} Megapixel. Große Bilder können die Leistung beeinträchtigen oder zu Speicherproblemen (OOM) führen.\n\nSoll das Bild automatisch herunterskaliert werden (empfohlen)?`
          );
          if (proceed) {
            try {
              // Downscale to ~12 Megapixels
              const scale = Math.sqrt(12_000_000 / totalPixels);
              const downCanvas = document.createElement('canvas');
              downCanvas.width = Math.round(tempImg.naturalWidth * scale);
              downCanvas.height = Math.round(tempImg.naturalHeight * scale);
              const downCtx = downCanvas.getContext('2d');
              if (downCtx) {
                downCtx.drawImage(tempImg, 0, 0, downCanvas.width, downCanvas.height);
                finalDataUrl = downCanvas.toDataURL('image/png');
                consoleStore.logLine(`Bild automatisch von ${Math.round(totalPixels / 1_000_000)}MP auf ${Math.round((downCanvas.width * downCanvas.height) / 1_000_000)}MP herunterskaliert.`, "info");
              }
            } catch (err: any) {
              console.error("Downscaling fehlgeschlagen:", err);
            }
          }
        }
        
        fabric.FabricImage.fromURL(finalDataUrl).then((img) => {
          const activeLayerId = canvasStore.get().activeLayer;
          
          // Scale down proportionally if image size exceeds 80% of workspace size
          const maxW = machineWidthPx * 0.8;
          const maxH = machineHeightPx * 0.8;
          let scale = 1;
          if (img.width && img.width > maxW) {
            scale = Math.min(scale, maxW / img.width);
          }
          if (img.height && img.height > maxH) {
            scale = Math.min(scale, maxH / img.height);
          }

          img.set({
            left: machineWidthPx / 2,
            top: machineHeightPx / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
          });
          
          // Initialize default image processing properties
          (img as any).imageMode = 'grayscale';
          (img as any).ditherType = 'floyd-steinberg';
          (img as any).brightness = 0;
          (img as any).contrast = 0;
          (img as any).gamma = 1.0;
          (img as any).invert = false;
          (img as any).thresholdValue = 128;
          (img as any).overscan = 2.5;

          applyImageFilters(img);

          img.set('data', { layerId: activeLayerId });
          
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
          consoleStore.logLine("Bild erfolgreich importiert.", "info");
          handleSelection();
        }).catch(err => {
          console.error("Fehler beim Laden des Bildes:", err);
        });
      };
      tempImg.onerror = (err) => {
        console.error("Fehler beim Vorladen des Bildes:", err);
      };
      tempImg.src = dataUrl;
    };
    window.addEventListener('loadImage', handleLoadImage);

    // 7. Layer Change Listener
    const handleChangeLayer = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { layerId } = customEvent.detail;
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        const data = activeObj.get('data') as any;
        const oldLayerId = data?.layerId || 'C00';
        const gravityId = data?.gravityId;
        const layerColor = layersStore.get()[layerId]?.color || '#ffffff';
        const layerMode = layersStore.get()[layerId]?.mode || 'line';
        
        applyLayerColor(activeObj, layerColor, layerMode, layerId);
        
        canvas.requestRenderAll();
        
        // History-Eintrag für Layer-Wechsel
        if (gravityId && oldLayerId !== layerId) {
          historyStore.registerCommand({
            id: uuidv4(),
            type: 'layerChange',
            description: `Layer: ${oldLayerId} → ${layerId}`,
            params: {
              targetIds: [gravityId],
              oldLayerId,
              layerId,
              color: layerColor,
              mode: layerMode,
            }
          });
        }
        
        // Store aktualisieren, damit UI es sofort merkt
        handleSelection();
      }
    };
    window.addEventListener('changeLayer', handleChangeLayer);

    // 8. Object Properties Update Listener (vom PropertiesPanel)
    const handleUpdateActiveObject = (e: Event) => {
      if (historyStore.isRebuilding) return;
      const customEvent = e as CustomEvent;
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        const data = activeObj.get('data') as any;
        const gravityId = data?.gravityId;
        const updates = { ...customEvent.detail }; // Clone um Original nicht zu verändern
        
        // Alte Werte erfassen VOR der Änderung
        const oldProperties: any = {};
        const newPropertiesForHistory: any = {};

        // Position (mm-Werte)
        if (updates.x !== undefined) {
          oldProperties.xMm = getObjectLeftMm(activeObj);
          newPropertiesForHistory.xMm = updates.x;
        }
        if (updates.y !== undefined) {
          oldProperties.yMm = getObjectBottomMm(activeObj);
          newPropertiesForHistory.yMm = updates.y;
        }
        
        // Geometrie
        if (updates.width !== undefined) {
          oldProperties.scaleX = activeObj.scaleX;
          newPropertiesForHistory.scaleX = (updates.width * scalePxPerMm) / (activeObj.width || 1);
        }
        if (updates.height !== undefined) {
          oldProperties.scaleY = activeObj.scaleY;
          newPropertiesForHistory.scaleY = (updates.height * scalePxPerMm) / (activeObj.height || 1);
        }
        if (updates.angle !== undefined) {
          oldProperties.angle = activeObj.angle;
          newPropertiesForHistory.angle = updates.angle;
        }
        if (updates.scaleX !== undefined) {
          oldProperties.scaleX = activeObj.scaleX;
          newPropertiesForHistory.scaleX = updates.scaleX;
        }
        if (updates.scaleY !== undefined) {
          oldProperties.scaleY = activeObj.scaleY;
          newPropertiesForHistory.scaleY = updates.scaleY;
        }

        // Data-Felder (Image-Filter, Kerf etc.)
        const dataFields = ['imageMode', 'ditherType', 'brightness', 'contrast', 'gamma', 
                           'invert', 'thresholdValue', 'overscan', 'kerf', 'kerfMode'];
        for (const field of dataFields) {
          if (updates[field] !== undefined) {
            oldProperties[field] = data?.[field] ?? (activeObj as any)[field];
            newPropertiesForHistory[field] = updates[field];
          }
        }
        
        // Jetzt die eigentliche Änderung durchführen
        const currentYMm = getObjectBottomMm(activeObj);
        const newXMm = updates.x;
        const newYMm = updates.y;
        delete updates.x;
        delete updates.y;
        
        if (updates.width !== undefined) {
           updates.scaleX = (updates.width * scalePxPerMm) / (activeObj.width || 1);
           delete updates.width;
        }
        if (updates.height !== undefined) {
           updates.scaleY = (updates.height * scalePxPerMm) / (activeObj.height || 1);
           delete updates.height;
        }

        activeObj.set(updates);

        // Apply positioning
        const yToSet = newYMm !== undefined ? newYMm : (updates.height !== undefined ? currentYMm : undefined);
        setObjectPosition(activeObj, newXMm, yToSet);
        if (activeObj.type === 'image') {
          applyImageFilters(activeObj);
        }
        activeObj.setCoords();
        canvas.requestRenderAll();
        handleSelection();

        // History-Eintrag registrieren
        if (gravityId && Object.keys(newPropertiesForHistory).length > 0) {
          // Beschreibung generieren
          let description = '';
          const changedKeys = Object.keys(newPropertiesForHistory);
          if (changedKeys.length === 1) {
            const key = changedKeys[0];
            const fieldNames: Record<string, string> = {
              xMm: 'X', yMm: 'Y', scaleX: 'Scale X', scaleY: 'Scale Y', 
              angle: '∠', brightness: '☀', contrast: '◐', gamma: 'γ',
              thresholdValue: 'Threshold', overscan: 'Overscan',
              kerf: 'Kerf', kerfMode: 'Kerf', imageMode: 'Mode',
              ditherType: 'Dither', invert: 'Invert'
            };
            const name = fieldNames[key] || key;
            const oldVal = typeof oldProperties[key] === 'number' ? Math.round(oldProperties[key] * 10) / 10 : oldProperties[key];
            const newVal = typeof newPropertiesForHistory[key] === 'number' ? Math.round(newPropertiesForHistory[key] * 10) / 10 : newPropertiesForHistory[key];
            description = `${name}: ${oldVal} → ${newVal}`;
          } else {
            description = changedKeys.map(k => {
              const fieldNames: Record<string, string> = { xMm: 'X', yMm: 'Y', scaleX: 'W', scaleY: 'H', angle: '∠' };
              return fieldNames[k] || k;
            }).join(', ');
          }

          historyStore.registerCommand({
            id: uuidv4(),
            type: 'propertyChange',
            description,
            params: {
              targetId: gravityId,
              oldProperties,
              newProperties: {
                ...newPropertiesForHistory,
                // Speichere auch die finalen Canvas-Pixel-Werte für den Replay
                left: activeObj.left,
                top: activeObj.top,
                scaleX: activeObj.scaleX,
                scaleY: activeObj.scaleY,
                angle: activeObj.angle,
              },
            }
          });
        }
      }
    };
    window.addEventListener('updateActiveObject', handleUpdateActiveObject);

    const handleUpdateBarcodeProperties = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.get('data')?.barcode) {
        const { template, bcid, scale, height } = customEvent.detail;
        const currentMeta = activeObj.get('data').barcode;
        const newMeta = {
          template: template !== undefined ? template : currentMeta.template,
          bcid: bcid !== undefined ? bcid : currentMeta.bcid,
          scale: scale !== undefined ? scale : currentMeta.scale,
          height: height !== undefined ? height : currentMeta.height
        };

        try {
          // Generate new SVG (use dummy text for canvas rendering representation)
          const dummyText = newMeta.template
            .replace(/{date[^}]*}/g, new Date().toLocaleDateString())
            .replace(/{time[^}]*}/g, '12:00')
            .replace(/{week}/g, '28')
            .replace(/{serial[^}]*}/g, '0001')
            .replace(/{csv:[^}]*}/g, 'CSV-Wert');

          const svgString = BarcodeService.generateSVG(newMeta.bcid, dummyText, {
            scale: newMeta.scale || 3,
            height: newMeta.height || 10
          });

          const { objects, options } = await fabric.loadSVGFromString(svgString);
          const validObjects = objects.filter(obj => obj !== null) as fabric.FabricObject[];
          if (validObjects.length === 0) return;

          // Save current position and rotation
          const left = activeObj.left;
          const top = activeObj.top;
          const angle = activeObj.angle;
          const scaleX = activeObj.scaleX;
          const scaleY = activeObj.scaleY;
          const layerId = activeObj.get('data')?.layerId || 'C00';

          const newGroup = fabric.util.groupSVGElements(validObjects, options);
          newGroup.set({
            left,
            top,
            angle,
            scaleX,
            scaleY,
            originX: activeObj.originX,
            originY: activeObj.originY
          });

          newGroup.set('data', {
            gravityId: activeObj.get('data').gravityId,
            barcode: newMeta,
            layerId
          });

          // Apply color settings of active layer
          const layerColor = layersStore.get()[layerId]?.color || '#ffffff';
          const layerMode = layersStore.get()[layerId]?.mode || 'line';
          applyLayerColor(newGroup, layerColor, layerMode, layerId);

          canvas.remove(activeObj);
          canvas.add(newGroup);
          canvas.setActiveObject(newGroup);
          canvas.requestRenderAll();
          handleSelection();
        } catch (err) {
          console.error("Barcode-Aktualisierung fehlgeschlagen:", err);
        }
      }
    };
    window.addEventListener('updateBarcodeProperties', handleUpdateBarcodeProperties);

    const handleProjectLoaded = () => {
      // Die Maschineneinstellungen können sich durch das geladene Projekt verändert haben.
      // Aktuelle Werte aus dem Store lesen:
      const currentSettings = settingsStore.get();
      const newWidthPx = currentSettings.workingSizeX * scalePxPerMm;
      const newHeightPx = currentSettings.workingSizeY * scalePxPerMm;

      // Grid, Lineale, Nullpunkt und Maschinenbereich-Hintergrund neu aufbauen
      // (canvas.clear() in loadProject hat alles gelöscht, auch excludeFromExport-Objekte)
      createGridAndOrigin(canvas, newWidthPx, newHeightPx, scalePxPerMm);

      // Bildfilter auf alle geladenen Bilder anwenden
      canvas.getObjects().forEach((obj) => {
        if (obj.type === 'image') {
          applyImageFilters(obj);
        }
      });

      // Viewport zentrieren auf den neuen Arbeitsbereich
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        const padding = 0.9;
        const scX = cw / newWidthPx;
        const scY = ch / newHeightPx;
        const zoom = Math.min(scX, scY) * padding;
        canvas.setZoom(zoom);

        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] = (cw - newWidthPx * zoom) / 2;
          vpt[5] = (ch - newHeightPx * zoom) / 2;
          canvas.setViewportTransform(vpt);
        }
      }

      canvas.requestRenderAll();
    };
    window.addEventListener('projectLoaded', handleProjectLoaded);

    // 9. Sync objects when layers update (e.g. Mode or Color changed in LayerPanel)
    const syncObjectsWithLayers = () => {
      const allLayers = layersStore.get();
      let changed = false;
      canvas.getObjects().forEach((obj) => {
        if (obj.excludeFromExport) return; // Grid, MachineBg etc.
        const layerId = obj.get('data')?.layerId;
        if (layerId && allLayers[layerId]) {
           const layerColor = allLayers[layerId].color;
           const layerMode = allLayers[layerId].mode;
           
           const isLine = obj.type === 'line';
           const targetFill = (layerMode === 'fill' && !isLine) || obj.type === 'i-text' ? layerColor : 'transparent';
           
           if (obj.stroke !== layerColor || obj.fill !== targetFill) {
             applyLayerColor(obj, layerColor, layerMode, layerId);
             changed = true;
           }
        }
      });
      if (changed) canvas.requestRenderAll();
    };

    const unsubscribeLayers = layersStore.subscribe(() => {
       syncObjectsWithLayers();
    });

    const unsubscribeCanvasStore = canvasStore.subscribe((state) => {
      const activeObj = canvas.getActiveObject();
      if (!activeObj) return;
      if (state.activeTool === 'node-edit') {
        enableNodeEditing(activeObj, canvas);
      } else {
        disableNodeEditing(activeObj, canvas);
      }
    });

    // 10. Canvas Actions (Gruppieren, Boolesche Ops etc.)
    const handleCanvasAction = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { action } = customEvent.detail;
      const activeObj = canvas.getActiveObject();

      if (!activeObj) return;

      if (action.toLowerCase() === 'group' && activeObj.type.toLowerCase() === 'activeselection') {
        const activeSelection = activeObj as fabric.ActiveSelection;
        const objects = activeSelection.getObjects();
        const groupIds = objects.map((o: any) => o.get('data')?.gravityId).filter(Boolean);
        const newGroupId = uuidv4();
        
        const group = new fabric.Group(objects);
        group.set('data', { gravityId: newGroupId });
        
        // Entferne die alten Objekte vom Canvas
        objects.forEach(obj => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.requestRenderAll();
        
        historyStore.registerCommand({
          id: uuidv4(),
          type: 'group',
          params: {
            groupIds,
            newGroupId,
            groupProperties: group.toObject(['data', 'selectable', 'evented', 'excludeFromExport'] as any)
          }
        });
        
        handleSelection();
      } else if (action === 'ungroup' && activeObj.type.toLowerCase() === 'group') {
        const group = activeObj as fabric.Group;
        const groupId = group.get('data')?.gravityId;
        const items = group.getObjects();
        canvas.remove(group);
        
        const childIds = items.map((item) => {
          const cid = uuidv4();
          item.set('data', { gravityId: cid });
          canvas.add(item);
          return cid;
        });

        const sel = new fabric.ActiveSelection(items, { canvas });
        canvas.setActiveObject(sel);
        canvas.requestRenderAll();
        
        if (groupId) {
          historyStore.registerCommand({
            id: uuidv4(),
            type: 'ungroup',
            params: {
              groupId,
              childIds
            }
          });
        }
        
      } else if (action === 'clip-image') {
        if (activeObj.type.toLowerCase() !== 'activeselection') {
          consoleStore.logLine("Bildmaskierung benötigt die Auswahl eines Bildes und einer Vektorform", "error");
          return;
        }

        const activeSelection = activeObj as fabric.ActiveSelection;
        const objects = [...activeSelection.getObjects()];
        
        if (objects.length !== 2) {
          consoleStore.logLine("Bitte wähle genau ein Bild und eine Vektorform aus", "error");
          return;
        }

        const img = objects.find(o => o.type.toLowerCase() === 'image' || o.type.toLowerCase() === 'fabricimage' || (o as any).imageSrc) as fabric.FabricImage;
        const vector = objects.find(o => o.type.toLowerCase() !== 'image' && o.type.toLowerCase() !== 'fabricimage' && !(o as any).imageSrc) as fabric.FabricObject;

        if (!img || !vector) {
          consoleStore.logLine("Die Auswahl muss genau ein Bild und eine Vektorform (Pfad, Rechteck, Kreis etc.) enthalten", "error");
          return;
        }

        consoleStore.logLine("Maskiere Bild mit ausgewählter Vektorform...", "info");

        // Aufheben der Auswahl auf dem Canvas
        canvas.discardActiveObject();

        vector.set({
          absolutePositioned: true
        });

        img.set({
          clipPath: vector
        });

        canvas.remove(vector);

        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        handleSelection();
        consoleStore.logLine("Bild erfolgreich maskiert.", "info");
      } else if (action === 'unclip-image') {
        const img = activeObj as fabric.FabricImage;
        if (!img || !img.clipPath) {
          consoleStore.logLine("Das ausgewählte Objekt hat keine Maske", "error");
          return;
        }

        const vector = img.clipPath as fabric.FabricObject;
        img.set({
          clipPath: undefined
        });

        canvas.add(vector);
        canvas.setActiveObject(vector);
        canvas.requestRenderAll();
        handleSelection();
        consoleStore.logLine("Bildmaskierung aufgehoben.", "info");
      } else if (['union', 'subtract', 'intersect'].includes(action)) {
        // Boolesche Operationen
        if (activeObj.type.toLowerCase() !== 'activeselection') {
          consoleStore.logLine("Boolesche Operationen benötigen mindestens zwei ausgewählte Objekte", "error");
          return;
        }

        const activeSelection = activeObj as fabric.ActiveSelection;
        const objects = [...activeSelection.getObjects()];
        
        if (objects.length < 2) return;

        consoleStore.logLine(`Führe ${action} Operation durch...`, "info");
        
        // WICHTIG: Auswahl aufheben, damit die Objekte wieder globale Koordinaten erhalten!
        canvas.discardActiveObject();
        
        const targetIds = objects.map((o: any) => o.get('data')?.gravityId).filter(Boolean);
        // Exportiere alle Objekte als SVG Strings mit echten globalen Koordinaten
        const svgData = objects.map(obj => obj.toSVG());
        const layerId = objects[0]?.get('data')?.layerId || 'C00';
        const layerColor = layersStore.get()[layerId]?.color || '#ffffff';

        try {
          const resultPathData = await BooleanOperationService.execute(action as any, svgData);
          
          // Originale Objekte entfernen
          objects.forEach(obj => canvas.remove(obj));

          if (resultPathData) {
             const newPathId = uuidv4();
             const resultPath = new fabric.Path(resultPathData, {
               strokeWidth: 2,
             });
             
             const center = resultPath.getCenterPoint();
             resultPath.set({
               originX: 'center',
               originY: 'center',
               left: center.x,
               top: center.y
             });
             
             const layerMode = layersStore.get()[layerId]?.mode || 'line';
             applyLayerColor(resultPath, layerColor, layerMode, layerId);
             resultPath.set('data', { gravityId: newPathId, layerId });
             
             // Füge in Canvas ein
             canvas.add(resultPath);
             canvas.setActiveObject(resultPath);
             canvas.requestRenderAll();
             
             historyStore.registerCommand({
               id: uuidv4(),
               type: 'boolean',
               params: {
                 action,
                 targetIds,
                 newPathId,
                 resultSvgPath: resultPathData,
                 resultProperties: resultPath.toObject(['data', 'selectable', 'evented', 'excludeFromExport'] as any)
               }
             });
             
             consoleStore.logLine(`Operation ${action} erfolgreich.`, "info");
             handleSelection();
          }

        } catch (err: any) {
          consoleStore.logLine(`Fehler bei ${action}: ${err.message}`, "error");
        }
      } else if (action === 'update-text') {
        if (activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text')) {
          const { fontFamily, fontSize } = customEvent.detail;
          const gid = activeObj.get('data')?.gravityId;
          const properties: any = {};
          if (fontFamily) properties.fontFamily = fontFamily;
          if (fontSize) properties.fontSize = fontSize;
          
          if (fontFamily) activeObj.set('fontFamily', fontFamily);
          if (fontSize) activeObj.set('fontSize', fontSize);
          canvas.requestRenderAll();

          if (gid) {
            historyStore.registerCommand({
              id: uuidv4(),
              type: 'update',
              params: {
                targetId: gid,
                properties
              }
            });
          }
          handleSelection();
        }
      } else if (action.startsWith('align-')) {
        if (activeObj.type.toLowerCase() !== 'activeselection') return;
        const activeSelection = activeObj as fabric.ActiveSelection;
        const objects = activeSelection.getObjects();
        if (objects.length < 2) return;

        objects.forEach(obj => {
          const selW = activeSelection.width || 0;
          const selH = activeSelection.height || 0;
          const objW = obj.width! * obj.scaleX!;
          const objH = obj.height! * obj.scaleY!;

          switch (action) {
            case 'align-left':
              obj.set('left', -selW / 2);
              break;
            case 'align-right':
              obj.set('left', (selW / 2) - objW);
              break;
            case 'align-center-h':
              obj.set('left', -objW / 2);
              break;
            case 'align-top':
              obj.set('top', -selH / 2);
              break;
            case 'align-bottom':
              obj.set('top', (selH / 2) - objH);
              break;
            case 'align-center-v':
              obj.set('top', -objH / 2);
              break;
          }
          obj.setCoords();
        });

        // Selektion auflösen und neu erstellen, damit BoundingBox neu berechnet wird
        canvas.discardActiveObject();
        const newSel = new fabric.ActiveSelection(objects, { canvas });
        canvas.setActiveObject(newSel);
        canvas.requestRenderAll();
        
        const alignments: Record<string, { left: number, top: number }> = {};
        objects.forEach((obj: any) => {
          const gid = obj.get('data')?.gravityId;
          if (gid) {
            alignments[gid] = { left: obj.left, top: obj.top };
          }
        });

        historyStore.registerCommand({
          id: uuidv4(),
          type: 'align',
          params: {
            action,
            alignments
          }
        });
        
        handleSelection();
      }
    };
    window.addEventListener('canvasAction', handleCanvasAction);

    // 11. Add Test Pattern Event (Material / Focus / Interval Test)
    const handleAddTestPattern = (e: Event) => {
      const { objects } = (e as CustomEvent).detail;
      
      const fabricObjects = objects.map((objData: any) => {
        const commonData = {
            layerId: objData.layerId,
            customSpeed: objData.customSpeed,
            customPower: objData.customPower,
            customZ: objData.customZ,
            customPasses: objData.customPasses,
            customMode: objData.customMode,
            customInterval: objData.customInterval,
            customHatchAngle: objData.customHatchAngle,
            isTestPattern: true
        };

        if (objData.type === 'path') {
          // opentype.js commands -> fabric path string
          // Koordinaten sind bereits relativ zu (0,0) und werden normal skaliert
          let pathStr = "";
          for (let cmd of objData.path) {
             if (cmd.type === 'M') pathStr += `M ${cmd.x * scalePxPerMm} ${cmd.y * scalePxPerMm} `;
             else if (cmd.type === 'L') pathStr += `L ${cmd.x * scalePxPerMm} ${cmd.y * scalePxPerMm} `;
             else if (cmd.type === 'Q') pathStr += `Q ${cmd.x1 * scalePxPerMm} ${cmd.y1 * scalePxPerMm} ${cmd.x * scalePxPerMm} ${cmd.y * scalePxPerMm} `;
             else if (cmd.type === 'C') pathStr += `C ${cmd.x1 * scalePxPerMm} ${cmd.y1 * scalePxPerMm} ${cmd.x2 * scalePxPerMm} ${cmd.y2 * scalePxPerMm} ${cmd.x * scalePxPerMm} ${cmd.y * scalePxPerMm} `;
             else if (cmd.type === 'Z') pathStr += `Z `;
          }
          return new fabric.Path(pathStr, {
            left: objData.left * scalePxPerMm,
            top: machineHeightPx - (objData.top * scalePxPerMm),
            originX: 'center',
            originY: 'center',
            angle: objData.angle || 0,
            fill: '#ff00ff',
            stroke: 'transparent',
            data: commonData
          });
        }

        if (objData.type === 'line') {
          return new fabric.Line([
            objData.left * scalePxPerMm,
            machineHeightPx - (objData.top * scalePxPerMm),
            (objData.left + objData.width) * scalePxPerMm,
            machineHeightPx - (objData.top * scalePxPerMm)
          ], {
            stroke: '#ff00ff',
            strokeWidth: 2,
            data: commonData
          });
        }

        return new fabric.Rect({
          left: objData.left * scalePxPerMm,
          top: machineHeightPx - (objData.top * scalePxPerMm) - (objData.height * scalePxPerMm),
          width: objData.width * scalePxPerMm,
          height: objData.height * scalePxPerMm,
          originX: 'left',
          originY: 'top',
          angle: objData.angle || 0,
          fill: objData.customMode === 'Fill' ? '#ff00ff' : 'transparent',
          stroke: '#ff00ff',
          strokeWidth: 2,
          data: commonData
        });
      });

      const group = new fabric.Group(fabricObjects, {
        selectable: true
      });
      
      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.requestRenderAll();
      handleSelection();

      // Auto-Simulation deaktiviert auf Nutzer-Wunsch
      // falls gewünscht, kann sie später über canvasSimulator aufgerufen werden.
    };
    window.addEventListener('addTestPattern', handleAddTestPattern);

    // Mouse Events & Tooling werden in den ausgelagerten handlern geregelt (unten)

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('loadSVG', handleLoadSVG);
      window.removeEventListener('loadDXF', handleLoadDXF);
      window.removeEventListener('loadImage', handleLoadImage);
      window.removeEventListener('changeLayer', handleChangeLayer);
      window.removeEventListener('updateActiveObject', handleUpdateActiveObject);
      window.removeEventListener('updateBarcodeProperties', handleUpdateBarcodeProperties);
      window.removeEventListener('projectLoaded', handleProjectLoaded);
      window.removeEventListener('canvasAction', handleCanvasAction);
      window.removeEventListener('addTestPattern', handleAddTestPattern);
      unsubscribeLayers();
      unsubscribeCanvasStore();
      resizeObserver.disconnect();
      canvas.dispose();
      fabricCanvasRef.current = null;
      delete (window as any).fabricCanvas;
    };
  }, [machineWidthPx, machineHeightPx]); // Canvas neu initialisieren, wenn sich die Größe ändert

  // 10.2 Dynamischer Hintergrund- und Gitter-Aufbau bei Thema- oder Modusänderung
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Alle alten System-Objekte entfernen (excludeFromExport: true)
    const stale = canvas.getObjects().filter((obj: any) => obj.excludeFromExport);
    stale.forEach((obj) => canvas.remove(obj));

    const isLight = uiState.theme === 'light';
    const wPx = settings.workingSizeX * scalePxPerMm;
    const hPx = settings.workingSizeY * scalePxPerMm;

    // Gitter und Nullpunkt neu erstellen
    createGridAndOrigin(canvas, wPx, hPx, scalePxPerMm);

    // Kamera-Overlay laden, falls nötig
    if (canvasState.backgroundMode === 'camera') {
      const cameraSrc = canvasState.cameraImage || '/camera_mockup.png';
      fabric.FabricImage.fromURL(cameraSrc).then((camImg) => {
        camImg.set({
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          scaleX: wPx / camImg.width!,
          scaleY: hPx / camImg.height!,
          selectable: false,
          evented: false,
          excludeFromExport: true,
          opacity: settings.cameraOpacity !== undefined ? settings.cameraOpacity : (isLight ? 0.35 : 0.55)
        });
        camImg.set('data', { isCameraOverlay: true });
        
        // Ganz unten hinzufügen (über dem Hintergrund)
        canvas.insertAt(0, camImg);
        canvas.requestRenderAll();
      }).catch(err => {
        console.error("Fehler beim Laden des Kamera-Overlays:", err);
      });
    }

    canvas.requestRenderAll();
  }, [canvasState.backgroundMode, canvasState.cameraImage, uiState.theme, settings.workingSizeX, settings.workingSizeY]);

  /**
   * Zeichnet ein Gitter-Overlay auf das Canvas (10mm Hauptgitter, 1mm Feingitter)
   */
  const createGridAndOrigin = (canvas: fabric.Canvas, machineWidthPx: number, machineHeightPx: number, scalePxPerMm: number) => {
    const isLight = uiState.theme === 'light';
    const gridSize = 10 * scalePxPerMm; // 10mm Kästchen
    
    // Farbwerte basierend auf Dark/Light Mode
    const gridColor = isLight ? '#e2e8f0' : '#1f293d';
    const rulerColor = isLight ? '#475569' : '#00f0ff';
    const machineBgFill = isLight ? '#ffffff' : '#111827';
    const machineBgStroke = isLight ? '#64748b' : '#00f0ff';
    const originColor = '#ff3366'; // Knalliges Rot für den Ursprung
    
    // Canvas Hintergrund außerhalb der Arbeitsfläche
    canvas.set('backgroundColor', isLight ? '#f1f5f9' : '#070a13');

    // Maschinenbereich-Hintergrund (Der sichtbare Arbeitsbereich)
    const machineBg = new fabric.Rect({
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      width: machineWidthPx,
      height: machineHeightPx,
      fill: machineBgFill, // Fallback
      stroke: machineBgStroke,
      strokeWidth: 2,
      selectable: false,
      evented: false,
      excludeFromExport: true,
      data: { isMachineBg: true }
    });
    canvas.insertAt(0, machineBg);

    const gridSvg = `<svg width="${gridSize}" height="${gridSize}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${gridSize}" height="${gridSize}" fill="${machineBgFill}"/>
      <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="${gridColor}" stroke-width="0.75"/>
    </svg>`;
    const blob = new Blob([gridSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const pattern = new fabric.Pattern({
        source: img,
        repeat: 'repeat',
      });
      machineBg.set('fill', pattern);
      canvas.requestRenderAll();
    };
    img.src = url;

    // Nullpunkt (0/0) Text und Kreis (Unten Links)
    const originRadius = 4;
    const originMarker = new fabric.Circle({
      left: 0,
      top: machineHeightPx,
      originX: 'center',
      originY: 'center',
      radius: originRadius,
      fill: 'transparent',
      stroke: originColor,
      strokeWidth: 2,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    canvas.add(originMarker);

    const originText = new fabric.IText('0,0', {
      left: -25,
      top: machineHeightPx + 5,
      fontSize: 12,
      fill: originColor,
      fontWeight: 'bold',
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    canvas.add(originText);

    // X-Achsen Lineal (unten)
    const xAxisLines = [];
    for (let mm = 0; mm <= machineWidthPx / scalePxPerMm; mm += 5) {
      const px = mm * scalePxPerMm;
      const isMajor = mm % 10 === 0;
      const tickLength = isMajor ? 12 : 6;
      
      xAxisLines.push(new fabric.Line([px, machineHeightPx, px, machineHeightPx + tickLength], {
        stroke: rulerColor, strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true
      }));

      if (isMajor && mm > 0) {
        xAxisLines.push(new fabric.IText(mm.toString(), {
          left: px, top: machineHeightPx + tickLength + 4, fontSize: 10, fill: rulerColor,
          originX: 'center', originY: 'top', selectable: false, evented: false, excludeFromExport: true
        }));
      }
    }
    canvas.add(...xAxisLines);

    // Y-Achsen Lineal (links)
    const yAxisLines = [];
    for (let mm = 0; mm <= machineHeightPx / scalePxPerMm; mm += 5) {
      const px = machineHeightPx - (mm * scalePxPerMm); // Y ist invertiert
      const isMajor = mm % 10 === 0;
      const tickLength = isMajor ? 12 : 6;

      yAxisLines.push(new fabric.Line([0, px, -tickLength, px], {
        stroke: rulerColor, strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true
      }));

      if (isMajor && mm > 0) {
        yAxisLines.push(new fabric.IText(mm.toString(), {
          left: -tickLength - 4, top: px, fontSize: 10, fill: rulerColor,
          originX: 'right', originY: 'center', selectable: false, evented: false, excludeFromExport: true
        }));
      }
    }
    canvas.add(...yAxisLines);
  };

  /**
   * Zeichnen starten (MouseDown)
   */
  const handleMouseDown = (opt: fabric.TPointerEventInfo, canvas: fabric.Canvas) => {
    const tool = canvasStore.get().activeTool;
    const e = opt.e as MouseEvent;
    const isPan = tool === 'pan' || e.altKey || e.button === 1 || e.button === 2;

    if (isPan) {
      canvas.setCursor('grab');
      isDrawingRef.current = true;
      startPointRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (tool === 'select' || tool === 'node-edit') return;

    // Wenn ein existierendes Objekt angeklickt wird, wollen wir dieses auswählen/verschieben/skalieren
    // anstatt ein neues zu zeichnen.
    if (opt.target) return;

    const pointer = canvas.getScenePoint(opt.e);
    isDrawingRef.current = true;
    startPointRef.current = { x: pointer.x, y: pointer.y };

    const activeLayerId = canvasStore.get().activeLayer;
    const layerColor = layers[activeLayerId]?.color || '#ffffff';
    const layerMode = layers[activeLayerId]?.mode || 'line';

    if (tool === 'rect') {
      const rect = new fabric.Rect({
        left: pointer.x,
        top: pointer.y,
        originX: 'left',
        originY: 'top',
        width: 0,
        height: 0,
        fill: layerMode === 'fill' ? layerColor : 'transparent',
        stroke: layerColor,
        strokeWidth: 2,
        strokeUniform: true,
      });
      rect.set('data', { layerId: activeLayerId });
      activeObjectRef.current = rect;
      canvas.add(rect);
    } else if (tool === 'circle') {
      const circle = new fabric.Circle({
        left: pointer.x,
        top: pointer.y,
        originX: 'left',
        originY: 'top',
        radius: 0,
        fill: layerMode === 'fill' ? layerColor : 'transparent',
        stroke: layerColor,
        strokeWidth: 2,
        strokeUniform: true,
      });
      circle.set('data', { layerId: activeLayerId });
      activeObjectRef.current = circle;
      canvas.add(circle);
    } else if (tool === 'ellipse') {
      const ellipse = new fabric.Ellipse({
        left: pointer.x, top: pointer.y, originX: 'left', originY: 'top', rx: 0, ry: 0, fill: layerMode === 'fill' ? layerColor : 'transparent', stroke: layerColor, strokeWidth: 2, strokeUniform: true
      });
      ellipse.set('data', { layerId: activeLayerId });
      activeObjectRef.current = ellipse;
      canvas.add(ellipse);
    } else if (tool === 'triangle') {
      const triangle = new fabric.Triangle({
        left: pointer.x, top: pointer.y, originX: 'left', originY: 'top', width: 0, height: 0, fill: layerMode === 'fill' ? layerColor : 'transparent', stroke: layerColor, strokeWidth: 2, strokeUniform: true
      });
      triangle.set('data', { layerId: activeLayerId });
      activeObjectRef.current = triangle;
      canvas.add(triangle);
    } else if (['star', 'heart', 'arrow', 'hexagon', 'polygon'].includes(tool)) {
      let pathData = '';
      if (tool === 'star') pathData = 'M 50 5 L 61 35 L 95 35 L 68 55 L 78 85 L 50 65 L 22 85 L 32 55 L 5 35 L 39 35 Z';
      else if (tool === 'heart') pathData = 'M 50 90 C 50 90 5 60 5 30 C 5 10 25 10 50 30 C 75 10 95 10 95 30 C 95 60 50 90 50 90 Z';
      else if (tool === 'arrow') pathData = 'M 0 40 L 60 40 L 60 20 L 100 50 L 60 80 L 60 60 L 0 60 Z';
      else if (tool === 'hexagon') pathData = 'M 25 0 L 75 0 L 100 50 L 75 100 L 25 100 L 0 50 Z';
      else if (tool === 'polygon') pathData = 'M 50 0 L 100 38 L 81 100 L 19 100 L 0 38 Z';

      const pathObj = new fabric.Path(pathData, {
        left: pointer.x, top: pointer.y, originX: 'left', originY: 'top', scaleX: 0, scaleY: 0, fill: layerMode === 'fill' ? layerColor : 'transparent', stroke: layerColor, strokeWidth: 2, strokeUniform: true
      });
      pathObj.set('data', { layerId: activeLayerId });
      activeObjectRef.current = pathObj;
      canvas.add(pathObj);
    } else if (tool === 'line') {
      const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: layerColor,
        strokeWidth: 2,
      } as any);
      line.set('data', { layerId: activeLayerId });
      activeObjectRef.current = line;
      canvas.add(line);
    } else if (tool === 'text') {
      const text = new fabric.IText('Text', {
        left: pointer.x,
        top: pointer.y - 10,
        fontSize: 24,
        fill: layerColor,
        fontFamily: 'Inter',
      });
      text.set('data', { layerId: activeLayerId });
      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      text.selectAll();
      isDrawingRef.current = false;
      canvasStore.setActiveTool('select');
      canvas.requestRenderAll();
    }
  };

  /**
   * Größe der Form anpassen während der Mausbewegung (MouseMove)
   */
  const handleMouseMove = (opt: fabric.TPointerEventInfo, canvas: fabric.Canvas) => {
    if (!isDrawingRef.current || !startPointRef.current) return;

    const tool = canvasStore.get().activeTool;
    const e = opt.e as MouseEvent;
    const isPan = tool === 'pan' || e.altKey || e.button === 1 || e.button === 2;

    if (isPan) {
      const vpt = canvas.viewportTransform;
      if (vpt) {
        vpt[4] += e.clientX - startPointRef.current.x;
        vpt[5] += e.clientY - startPointRef.current.y;
        
        if (canvas.backgroundColor && (canvas.backgroundColor as any).offsetX !== undefined) {
           (canvas.backgroundColor as any).offsetX = vpt[4];
           (canvas.backgroundColor as any).offsetY = vpt[5];
        }
        
        canvas.requestRenderAll();
      }
      startPointRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!activeObjectRef.current) return;

    const pointer = canvas.getScenePoint(opt.e);
    const startX = startPointRef.current.x;
    const startY = startPointRef.current.y;

    const dx = pointer.x - startX;
    const dy = pointer.y - startY;

    if (tool === 'rect') {
      const rect = activeObjectRef.current as fabric.Rect;
      rect.set({
        originX: dx > 0 ? 'left' : 'right',
        originY: dy > 0 ? 'top' : 'bottom',
        width: Math.abs(dx),
        height: Math.abs(dy),
      });
    } else if (tool === 'circle') {
      const circle = activeObjectRef.current as fabric.Circle;
      const radius = Math.max(Math.abs(dx), Math.abs(dy)) / 2;
      circle.set({
        originX: dx > 0 ? 'left' : 'right',
        originY: dy > 0 ? 'top' : 'bottom',
        radius,
      });
    } else if (tool === 'ellipse') {
      const ellipse = activeObjectRef.current as fabric.Ellipse;
      ellipse.set({ originX: dx > 0 ? 'left' : 'right', originY: dy > 0 ? 'top' : 'bottom', rx: Math.abs(dx) / 2, ry: Math.abs(dy) / 2 });
    } else if (tool === 'triangle') {
      const triangle = activeObjectRef.current as fabric.Triangle;
      triangle.set({ originX: dx > 0 ? 'left' : 'right', originY: dy > 0 ? 'top' : 'bottom', width: Math.abs(dx), height: Math.abs(dy) });
    } else if (['star', 'heart', 'arrow', 'hexagon', 'polygon'].includes(tool)) {
      const pathObj = activeObjectRef.current as fabric.Path;
      pathObj.set({ originX: dx > 0 ? 'left' : 'right', originY: dy > 0 ? 'top' : 'bottom', scaleX: Math.abs(dx) / 100, scaleY: Math.abs(dy) / 100 });
    } else if (tool === 'line') {
      const line = activeObjectRef.current as fabric.Line;
      line.set({
        x2: pointer.x,
        y2: pointer.y,
      });
    }

    canvas.requestRenderAll();
  };

  /**
   * Zeichnen abschließen (MouseUp)
   */
  const handleMouseUp = (opt: fabric.TPointerEventInfo, canvas: fabric.Canvas) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const tool = canvasStore.get().activeTool;
    const e = opt.e as MouseEvent;
    const isPan = tool === 'pan' || e.altKey || e.button === 1 || e.button === 2;

    if (isPan) {
      canvas.setCursor('default');
      startPointRef.current = null;
      return;
    }

    const activeObj = activeObjectRef.current;
    if (activeObj) {
      // Prüfen, ob das gezeichnete Objekt eine Mindestgröße hat, sonst löschen
      const isTooSmall = 
        (activeObj.type === 'rect' && (activeObj.width || 0) < 3 && (activeObj.height || 0) < 3) ||
        (activeObj.type === 'circle' && ((activeObj as fabric.Circle).radius || 0) < 2) ||
        (activeObj.type === 'line' && Math.abs((activeObj as any).x2 - (activeObj as any).x1) < 3);

      if (isTooSmall) {
        canvas.remove(activeObj);
      } else {
        canvas.setActiveObject(activeObj);
      }
    }

    activeObjectRef.current = null;
    startPointRef.current = null;

    // Bleibt im aktuellen Zeichenwerkzeug (LightBurn-Style)
    // canvasStore.setActiveTool('select');
    canvas.requestRenderAll();
  };

  /**
   * Helferfunktion, um alle Objekte vom Canvas für den GcodeGenerator auszulesen
   */
  (window as any).getCanvasObjectsForGcode = (): CanvasObjectData[] => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return [];

    const objects = canvas.getObjects().filter((obj) => {
      // Ignoriere Gitterlinien und System-Overlays
      return !(obj as any).excludeFromExport && obj.selectable;
    });

    const serializeObject = (obj: any): CanvasObjectData => {
      const dataObj = obj.data || (typeof obj.get === 'function' ? obj.get('data') : null);
      let matrix = obj.calcTransformMatrix();
      
      const decomposed = fabric.util.qrDecompose(matrix);
      
      // FabricJS calcTransformMatrix und getCenterPoint liefern bereits absolute Koordinaten (inkl. aller Parent-Gruppen)
      let center = obj.getCenterPoint();
      
      // Das unrotierte left/top berechnet sich aus dem Center abzüglich der halben skalierten Dimensionen
      const l = center.x - (obj.width * decomposed.scaleX) / 2;
      const t = center.y - (obj.height * decomposed.scaleY) / 2;

      const layerId = dataObj?.layerId || 'C00';

      // Native Rasterisierung für Texte und Vektoren auf Füllungs-Ebenen
      const isText = obj.type === 'text' || obj.type === 'i-text';
      const layerMode = layersStore.get()[layerId]?.mode || 'line';
      const isFillVector = (layerMode === 'fill' && obj.type !== 'line' && obj.type !== 'image');
      
      let targetType = obj.type || 'unknown';
      let imageElement = obj.originalImageElement || obj._element || undefined;
      let isRasterizedVector = false;
      let customPathCommands: any[] | undefined = undefined;
      let textWidthMm = obj.width / scalePxPerMm;
      let textHeightMm = obj.height / scalePxPerMm;
      let textLeftMm = l / scalePxPerMm;
      let textTopMm = t / scalePxPerMm;

      if (isText && cachedFont) {
        try {
          const fontSize = obj.fontSize || 40;
          const font = cachedFont;
          const linesText = (obj.text || '').split('\n');
          const lineHeight = obj.lineHeight || 1.16;
          const rawCommands: any[] = [];
          
          let currentY = 0;
          for (let lineText of linesText) {
            // opentype.js draws text baseline at y, so y = currentY + fontSize * 0.8
            const linePath = font.getPath(lineText, 0, currentY + fontSize * 0.8, fontSize);
            rawCommands.push(...linePath.commands);
            currentY += fontSize * lineHeight;
          }

          const mmCommands = rawCommands.map((cmd: any) => {
            const newCmd = { ...cmd };
            if (newCmd.x !== undefined) newCmd.x /= scalePxPerMm;
            if (newCmd.y !== undefined) newCmd.y /= scalePxPerMm;
            if (newCmd.x1 !== undefined) newCmd.x1 /= scalePxPerMm;
            if (newCmd.y1 !== undefined) newCmd.y1 /= scalePxPerMm;
            if (newCmd.x2 !== undefined) newCmd.x2 /= scalePxPerMm;
            if (newCmd.y2 !== undefined) newCmd.y2 /= scalePxPerMm;
            return newCmd;
          });

          let minX = Infinity, maxX = -Infinity;
          let minY = Infinity, maxY = -Infinity;
          
          mmCommands.forEach((cmd: any) => {
            const pts = [
              { x: cmd.x, y: cmd.y },
              { x: cmd.x1, y: cmd.y1 },
              { x: cmd.x2, y: cmd.y2 }
            ];
            pts.forEach(p => {
              if (p.x !== undefined && !isNaN(p.x)) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
              }
              if (p.y !== undefined && !isNaN(p.y)) {
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
              }
            });
          });

          if (minX !== Infinity) {
            const w = maxX - minX;
            const h = maxY - minY;
            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;

            customPathCommands = mmCommands.map((cmd: any) => {
              const newCmd = { ...cmd };
              if (newCmd.x !== undefined) newCmd.x -= cx;
              if (newCmd.y !== undefined) newCmd.y -= cy;
              if (newCmd.x1 !== undefined) newCmd.x1 -= cx;
              if (newCmd.y1 !== undefined) newCmd.y1 -= cy;
              if (newCmd.x2 !== undefined) newCmd.x2 -= cx;
              if (newCmd.y2 !== undefined) newCmd.y2 -= cy;
              return newCmd;
            });

            textWidthMm = w;
            textHeightMm = h;
            
            const centerMmX = center.x / scalePxPerMm;
            const centerMmY = center.y / scalePxPerMm;
            textLeftMm = centerMmX - (w * decomposed.scaleX) / 2;
            textTopMm = centerMmY - (h * decomposed.scaleY) / 2;
            targetType = 'path';
          }
        } catch (e) {
          console.error("Fehler beim Konvertieren des Texts in Pfade:", e);
        }
      }

      if ((isText && targetType !== 'path') || isFillVector) {
        try {
          // WICHTIG: Temporär die Rotation auf 0 setzen, da GcodeGenerator die Rotation selbst anwendet!
          const originalAngle = obj.angle;
          // Füllfarbe auf Schwarz setzen, damit der Grauton-Threshold die Form korrekt erkennt
          // (z.B. Gelb = Grau~202 > Threshold 128 = unsichtbar! Schwarz = Grau 0 = sichtbar)
          const originalFill = obj.fill;
          const originalStroke = obj.stroke;
          const originalStrokeWidth = obj.strokeWidth;
          obj.set({ angle: 0, fill: '#000000', stroke: 'transparent', strokeWidth: 0 });
          obj.setCoords();

          // Unrotierten Canvas des Vektors direkt von FabricJS erzeugen lassen (4x Auflösung für perfekte Schärfe)
          const canvasEl = obj.toCanvasElement({
            multiplier: 4,
          });
          
          // Originalwerte wiederherstellen
          obj.set({ angle: originalAngle, fill: originalFill, stroke: originalStroke, strokeWidth: originalStrokeWidth });
          obj.setCoords();

          targetType = 'image';
          imageElement = canvasEl;
          isRasterizedVector = true;
        } catch (e) {
          console.error("Fehler beim nativen Rastern des Objekts:", e);
        }
      }

      return {
        type: targetType,
        left: Number((textLeftMm).toFixed(3)),
        top: Number((textTopMm).toFixed(3)),
        width: Number((textWidthMm).toFixed(3)),
        height: Number((textHeightMm).toFixed(3)),
        scaleX: decomposed.scaleX,
        scaleY: decomposed.scaleY,
        angle: decomposed.angle,
        imageSrc: obj.getSrc ? obj.getSrc() : (obj.src || undefined),
        imageElement: imageElement,
        imageMode: isRasterizedVector ? 'threshold' : (obj.imageMode || 'grayscale'),
        ditherType: obj.ditherType || 'floyd-steinberg',
        brightness: isRasterizedVector ? 0 : (obj.brightness !== undefined ? obj.brightness : 0),
        contrast: isRasterizedVector ? 0 : (obj.contrast !== undefined ? obj.contrast : 0),
        gamma: isRasterizedVector ? 1.0 : (obj.gamma !== undefined ? obj.gamma : 1.0),
        invert: isRasterizedVector ? false : (obj.invert !== undefined ? obj.invert : false),
        thresholdValue: isRasterizedVector ? 128 : (obj.thresholdValue !== undefined ? obj.thresholdValue : 128),
        overscan: obj.overscan !== undefined ? obj.overscan : 2.5,
        radius: obj.radius ? Number((obj.radius / scalePxPerMm).toFixed(3)) : undefined,
        layerId: layerId,
        customSpeed: dataObj?.customSpeed,
        customPower: dataObj?.customPower,
        customZ: dataObj?.customZ,
        customPasses: dataObj?.customPasses,
        customMode: dataObj?.customMode,
        customInterval: dataObj?.customInterval,
        customHatchAngle: dataObj?.customHatchAngle,
        kerf: obj.kerf !== undefined ? obj.kerf : undefined,
        kerfMode: obj.kerfMode !== undefined ? obj.kerfMode : undefined,
        isRasterizedVector: isRasterizedVector,
        text: obj.text,
        fontFamily: obj.fontFamily,
        fontSize: obj.fontSize,
        fontWeight: obj.fontWeight,
        fontStyle: obj.fontStyle,
        charSpacing: obj.charSpacing,
        lineHeight: obj.lineHeight,
        textAlign: obj.textAlign,
        path: customPathCommands || (obj.path ? obj.path.map((cmd: any) => {
          const dx = obj.pathOffset ? obj.pathOffset.x : 0;
          const dy = obj.pathOffset ? obj.pathOffset.y : 0;
          if (Array.isArray(cmd)) {
            const type = cmd[0];
            if (type === 'M' || type === 'L') {
               return { 
                 type, 
                 x: Number(((cmd[1] - dx) / scalePxPerMm).toFixed(3)), 
                 y: Number(((cmd[2] - dy) / scalePxPerMm).toFixed(3)) 
               };
            } else if (type === 'Q') {
               return { 
                 type, 
                 x1: Number(((cmd[1] - dx) / scalePxPerMm).toFixed(3)), 
                 y1: Number(((cmd[2] - dy) / scalePxPerMm).toFixed(3)), 
                 x: Number(((cmd[3] - dx) / scalePxPerMm).toFixed(3)), 
                 y: Number(((cmd[4] - dy) / scalePxPerMm).toFixed(3)) 
               };
            } else if (type === 'C') {
               return { 
                 type, 
                 x1: Number(((cmd[1] - dx) / scalePxPerMm).toFixed(3)), 
                 y1: Number(((cmd[2] - dy) / scalePxPerMm).toFixed(3)), 
                 x2: Number(((cmd[3] - dx) / scalePxPerMm).toFixed(3)), 
                 y2: Number(((cmd[4] - dy) / scalePxPerMm).toFixed(3)), 
                 x: Number(((cmd[5] - dx) / scalePxPerMm).toFixed(3)), 
                 y: Number(((cmd[6] - dy) / scalePxPerMm).toFixed(3)) 
               };
            } else if (type === 'Z' || type === 'z') {
               return { type: 'Z' };
            }
          }
          // Fallback if already object
          const newCmd = {...cmd};
          if (newCmd.x !== undefined) newCmd.x = Number(((newCmd.x - dx) / scalePxPerMm).toFixed(3));
          if (newCmd.y !== undefined) newCmd.y = Number(((newCmd.y - dy) / scalePxPerMm).toFixed(3));
          if (newCmd.x1 !== undefined) newCmd.x1 = Number(((newCmd.x1 - dx) / scalePxPerMm).toFixed(3));
          if (newCmd.y1 !== undefined) newCmd.y1 = Number(((newCmd.y1 - dy) / scalePxPerMm).toFixed(3));
          if (newCmd.x2 !== undefined) newCmd.x2 = Number(((newCmd.x2 - dx) / scalePxPerMm).toFixed(3));
          if (newCmd.y2 !== undefined) newCmd.y2 = Number(((newCmd.y2 - dy) / scalePxPerMm).toFixed(3));
          return newCmd;
        }) : undefined),
        objects: obj._objects ? obj._objects.map(serializeObject) : undefined,
      };
    };

    return objects.map(serializeObject);
  };

  const handleZoomIn = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    let zoom = canvas.getZoom();
    zoom *= 1.2;
    if (zoom > 20) zoom = 20;
    canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 } as fabric.Point, zoom);
  };

  const handleZoomOut = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    let zoom = canvas.getZoom();
    zoom *= 0.8;
    if (zoom < 0.1) zoom = 0.1;
    canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 } as fabric.Point, zoom);
  };

  const handleFit = () => {
    if (!fabricCanvasRef.current || !containerRef.current) return;
    const canvas = fabricCanvasRef.current;
    
    // Grenzen mit Linealen: Links ab ca. -40mm, Unten bis ca. machineHeight + 40mm
    const extraWidth = 60;  // Platz für linkes Lineal und rechten Rand
    const extraHeight = 60; // Platz für unteres Lineal und oberen Rand
    
    const scaleX = containerRef.current.clientWidth / (machineWidthPx + extraWidth);
    const scaleY = containerRef.current.clientHeight / (machineHeightPx + extraHeight);
    
    // Passenden Zoomfaktor wählen
    let zoom = Math.min(scaleX, scaleY);
    if (zoom > 2) zoom = 2;
    if (zoom < 0.1) zoom = 0.1;
    
    canvas.setZoom(zoom);
    
    // Berechne die verschobenen Mittelpunkte, damit die Lineale sichtbar sind
    const vpt = canvas.viewportTransform;
    if (vpt) {
      vpt[4] = containerRef.current.clientWidth / 2 - ((machineWidthPx - 40) / 2) * zoom;
      vpt[5] = containerRef.current.clientHeight / 2 - ((machineHeightPx + 40) / 2) * zoom;
      canvas.requestRenderAll();
    }
  };

  return (
    <div ref={containerRef} className="canvas-area" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ border: '1px solid var(--border-color)', borderRadius: '4px', boxShadow: 'var(--shadow-sm)' }} />
      
      <CanvasControls 
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFit={handleFit}
        onClear={() => {
          if (fabricCanvasRef.current) {
            const canvas = fabricCanvasRef.current;
            canvas.getObjects().forEach(obj => {
              if (!obj.excludeFromExport) {
                canvas.remove(obj);
              }
            });
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            canvasStore.setSelectedObject(null);
            consoleStore.logLine(t('canvas.cleared', "Canvas geleert."), "info");
          }
        }}
      />
    </div>
  );
};

export const applyImageFilters = (img: any) => {
  if (typeof document === 'undefined') return;
  
  try {
    if (!img.originalImageElement) {
      img.originalImageElement = img.getElement();
    }
    const original = img.originalImageElement;
    if (!original) return;

    const canvas = document.createElement('canvas');
    canvas.width = original.naturalWidth || original.width || 100;
    canvas.height = original.naturalHeight || original.height || 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(original, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const brightness = img.brightness !== undefined ? img.brightness : 0;
    const contrast = img.contrast !== undefined ? img.contrast : 0;
    const gamma = img.gamma !== undefined ? img.gamma : 1.0;
    const invert = img.invert !== undefined ? img.invert : false;
    const imageMode = img.imageMode || 'grayscale';
    const ditherType = img.ditherType || 'floyd-steinberg';
    const thresholdValue = img.thresholdValue !== undefined ? img.thresholdValue : 128;

    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    const gammaCorrection = 1.0 / gamma;
    const clamp = (val: number) => Math.min(255, Math.max(0, val));

    for (let i = 0; i < data.length; i += 4) {
      const A = data[i + 3];
      if (A === 0) {
        data[i] = data[i+1] = data[i+2] = 255;
        continue;
      }

      const R = data[i];
      const G = data[i+1];
      const B = data[i+2];

      let gray = 0.299 * R + 0.587 * G + 0.114 * B;

      if (invert) {
        gray = 255 - gray;
      }

      if (brightness !== 0 || contrast !== 0) {
        gray = contrastFactor * (gray - 128) + 128 + brightness;
      }

      if (gamma !== 1.0) {
        gray = 255 * Math.pow(clamp(gray) / 255, gammaCorrection);
      }

      gray = clamp(gray);
      data[i] = data[i+1] = data[i+2] = gray;
    }

    if (imageMode === 'threshold') {
      for (let i = 0; i < data.length; i += 4) {
        const val = data[i] < thresholdValue ? 0 : 255;
        data[i] = data[i+1] = data[i+2] = val;
      }
    } else if (imageMode === 'dither') {
      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Float32Array(width * height);
      for (let i = 0; i < pixels.length; i++) {
        pixels[i] = data[i * 4];
      }

      for (let y = 0; y < height; y++) {
        const isLeftToRight = y % 2 === 0;
        const startX = isLeftToRight ? 0 : width - 1;
        const endX = isLeftToRight ? width : -1;
        const step = isLeftToRight ? 1 : -1;

        const addError = (dx: number, dy: number, weight: number, divisor: number, currentX: number, currentY: number, err: number) => {
          const nx = currentX + (isLeftToRight ? dx : -dx);
          const ny = currentY + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            pixels[ny * width + nx] += err * (weight / divisor);
          }
        };

        for (let x = startX; x !== endX; x += step) {
          const idx = y * width + x;
          const oldVal = pixels[idx];
          const newVal = oldVal < thresholdValue ? 0 : 255;
          pixels[idx] = newVal;
          const err = oldVal - newVal;

          if (err === 0) continue;

          if (ditherType === 'floyd-steinberg') {
            addError(1, 0, 7, 16, x, y, err);
            addError(-1, 1, 3, 16, x, y, err);
            addError(0, 1, 5, 16, x, y, err);
            addError(1, 1, 1, 16, x, y, err);
          } else if (ditherType === 'atkinson') {
            addError(1, 0, 1, 8, x, y, err);
            addError(2, 0, 1, 8, x, y, err);
            addError(-1, 1, 1, 8, x, y, err);
            addError(0, 1, 1, 8, x, y, err);
            addError(1, 1, 1, 8, x, y, err);
            addError(0, 2, 1, 8, x, y, err);
          } else if (ditherType === 'stucki') {
            addError(1, 0, 8, 42, x, y, err);
            addError(2, 0, 4, 42, x, y, err);
            addError(-2, 1, 2, 42, x, y, err);
            addError(-1, 1, 4, 42, x, y, err);
            addError(0, 1, 8, 42, x, y, err);
            addError(1, 1, 4, 42, x, y, err);
            addError(2, 1, 2, 42, x, y, err);
            addError(-2, 2, 1, 42, x, y, err);
            addError(-1, 2, 2, 42, x, y, err);
            addError(0, 2, 4, 42, x, y, err);
            addError(1, 2, 2, 42, x, y, err);
            addError(2, 2, 1, 42, x, y, err);
          } else if (ditherType === 'jarvis') {
            addError(1, 0, 7, 48, x, y, err);
            addError(2, 0, 5, 48, x, y, err);
            addError(-2, 1, 3, 48, x, y, err);
            addError(-1, 1, 5, 48, x, y, err);
            addError(0, 1, 7, 48, x, y, err);
            addError(1, 1, 5, 48, x, y, err);
            addError(2, 1, 3, 48, x, y, err);
            addError(-2, 2, 1, 48, x, y, err);
            addError(-1, 2, 3, 48, x, y, err);
            addError(0, 2, 5, 48, x, y, err);
            addError(1, 2, 3, 48, x, y, err);
            addError(2, 2, 1, 48, x, y, err);
          }
        }
      }

      for (let i = 0; i < pixels.length; i++) {
        const val = clamp(pixels[i]);
        data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = val;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    img.setElement(canvas);
  } catch (err: any) {
    console.error("Fehler beim Anwenden der Bildfilter:", err);
    consoleStore.logLine("⚠️ Bildfilter konnten nicht angewendet werden (Speicherlimit erreicht?): " + err.message, "error");
  }
};
