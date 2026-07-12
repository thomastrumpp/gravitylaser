import { Store } from './store';
import * as fabric from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import { canvasStore } from './canvasStore';

export interface Command {
  id: string; // Eindeutige ID der Aktion
  type: 'create' | 'update' | 'delete' | 'layerChange' | 'group' | 'ungroup' | 'boolean' | 'align';
  params: any;
}

export interface HistoryState {
  commands: Command[];
  playheadIndex: number; // Zeigt auf das letzte aktive Command (-1 = leerer Zustand)
}

class HistoryStore extends Store<HistoryState> {
  private canvas: fabric.Canvas | null = null;
  public isRebuilding = false;

  constructor() {
    super({
      commands: [],
      playheadIndex: -1,
    });
  }

  /**
   * Setzt die Referenz auf den FabricJS Canvas
   */
  public setCanvas(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  /**
   * Registriert ein neues Command und führt es aus
   */
  public registerCommand(cmd: Command) {
    if (this.isRebuilding) return;

    this.update((state) => {
      // Wenn der Playhead nicht am Ende steht, löschen wir alle nachfolgenden Commands (destruktiv ab Playhead)
      // Das entspricht dem klassischen Verzweigungsverhalten, aber wir können parametrisch in der Geschichte zurückgehen.
      const newCommands = state.commands.slice(0, state.playheadIndex + 1);
      newCommands.push(cmd);
      
      return {
        commands: newCommands,
        playheadIndex: newCommands.length - 1,
      };
    });
  }

  /**
   * Verschiebt den Playhead (Zeitreise) und baut den Zustand neu auf
   */
  public setPlayhead(index: number) {
    const commands = this.get().commands;
    const targetIndex = Math.max(-1, Math.min(index, commands.length - 1));

    this.update((state) => ({
      ...state,
      playheadIndex: targetIndex,
    }));

    this.rebuild();
  }

  /**
   * Macht den letzten Schritt rückgängig (Playhead links)
   */
  public undo() {
    const { playheadIndex } = this.get();
    if (playheadIndex >= 0) {
      this.setPlayhead(playheadIndex - 1);
    }
  }

  /**
   * Holt den letzten Schritt wieder (Playhead rechts)
   */
  public redo() {
    const { playheadIndex, commands } = this.get();
    if (playheadIndex < commands.length - 1) {
      this.setPlayhead(playheadIndex + 1);
    }
  }

  /**
   * Ändert die Parameter eines vergangenen Commands und re-evaluiert alle Folgeschritte
   */
  public updateCommandParams(commandId: string, newParams: any) {
    this.update((state) => {
      const newCommands = state.commands.map((cmd) => {
        if (cmd.id === commandId) {
          return {
            ...cmd,
            params: {
              ...cmd.params,
              ...newParams,
            },
          };
        }
        return cmd;
      });

      return {
        ...state,
        commands: newCommands,
      };
    });

    this.rebuild();
  }

  /**
   * Löscht die komplette Historie
   */
  public clearHistory() {
    this.set({
      commands: [],
      playheadIndex: -1,
    });
  }

  /**
   * Löscht den Canvas und führt alle Commands bis zum playheadIndex sequentiell aus
   */
  public rebuild() {
    if (!this.canvas) return;
    this.isRebuilding = true;

    // 1. Alle existierenden Benutzerobjekte entfernen
    const objects = this.canvas.getObjects().filter(
      (obj) => !(obj as any).excludeFromExport && obj.selectable
    );
    objects.forEach((obj) => this.canvas!.remove(obj));

    const { commands, playheadIndex } = this.get();

    // Registry zur Zuordnung von gravityId zu Fabric-Objekten während des Replays
    const objectMap = new Map<string, fabric.FabricObject>();

    // 2. Commands nacheinander ausführen
    for (let i = 0; i <= playheadIndex; i++) {
      const cmd = commands[i];
      try {
        this.executeCommandReplay(cmd, objectMap);
      } catch (err) {
        console.error(`Fehler beim Replay von Command ${cmd.type} (Index ${i}):`, err);
      }
    }

    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    this.isRebuilding = false;

    // Aktuelles selektiertes Objekt im canvasStore aktualisieren
    const active = this.canvas.getActiveObject();
    if (active) {
      const data = active.get('data') as any;
      canvasStore.setSelectedObject({
        type: active.type,
        width: active.width * active.scaleX,
        height: active.height * active.scaleY,
        x: active.left,
        y: active.top,
        angle: active.angle,
        text: (active as any).text,
        imageMode: data?.imageMode,
        ditherType: data?.ditherType,
        brightness: data?.brightness,
        contrast: data?.contrast,
        gamma: data?.gamma,
        invert: data?.invert,
        thresholdValue: data?.thresholdValue,
        overscan: data?.overscan,
        kerf: data?.kerf,
        kerfMode: data?.kerfMode,
        layerId: data?.layerId || 'C00',
        data: data || {},
      });
    } else {
      canvasStore.setSelectedObject(null);
    }
  }

  /**
   * Führt ein einzelnes Command während des Replays aus
   */
  private executeCommandReplay(cmd: Command, objectMap: Map<string, fabric.FabricObject>) {
    if (!this.canvas) return;

    const { type, params } = cmd;

    switch (type) {
      case 'create': {
        const { gravityId, shapeType, ...props } = params;
        let obj: fabric.FabricObject;

        if (shapeType === 'rect') {
          obj = new fabric.Rect(props);
        } else if (shapeType === 'circle') {
          obj = new fabric.Circle(props);
        } else if (shapeType === 'ellipse') {
          obj = new fabric.Ellipse(props);
        } else if (shapeType === 'triangle') {
          obj = new fabric.Triangle(props);
        } else if (shapeType === 'line') {
          const { x1, y1, x2, y2, ...lineProps } = props;
          obj = new fabric.Line([x1, y1, x2, y2], lineProps);
        } else if (['star', 'heart', 'arrow', 'hexagon', 'polygon'].includes(shapeType)) {
          obj = new fabric.Path(props.pathData, props);
        } else if (shapeType === 'text' || shapeType === 'i-text') {
          obj = new fabric.IText(props.text || 'Text', props);
        } else if (shapeType === 'image') {
          // Für Bilder laden wir das ImageElement oder die Data-URL
          const imgEl = document.createElement('img');
          imgEl.src = props.imageSrc;
          obj = new fabric.FabricImage(imgEl, props);
        } else if (shapeType === 'path') {
          obj = new fabric.Path(props.pathData, props);
        } else {
          console.warn(`Unbekannter ShapeType beim Replay: ${shapeType}`);
          return;
        }

        // Metadaten setzen
        obj.set('data', { 
          layerId: props.layerId || 'C00', 
          gravityId,
          imageMode: props.imageMode,
          ditherType: props.ditherType,
          brightness: props.brightness,
          contrast: props.contrast,
          gamma: props.gamma,
          invert: props.invert,
          thresholdValue: props.thresholdValue,
          overscan: props.overscan,
          kerf: props.kerf,
          kerfMode: props.kerfMode,
          isRasterizedVector: props.isRasterizedVector,
        });

        objectMap.set(gravityId, obj);
        this.canvas.add(obj);
        break;
      }

      case 'update': {
        const { targetId, properties } = params;
        const obj = objectMap.get(targetId);
        if (obj) {
          obj.set(properties);
          // Wenn das data-Objekt aktualisiert werden muss
          if (properties.layerId !== undefined || properties.imageMode !== undefined || properties.kerf !== undefined || properties.kerfMode !== undefined) {
            const currentData = obj.get('data') || {};
            obj.set('data', {
              ...currentData,
              layerId: properties.layerId ?? currentData.layerId,
              imageMode: properties.imageMode ?? currentData.imageMode,
              ditherType: properties.ditherType ?? currentData.ditherType,
              brightness: properties.brightness ?? currentData.brightness,
              contrast: properties.contrast ?? currentData.contrast,
              gamma: properties.gamma ?? currentData.gamma,
              invert: properties.invert ?? currentData.invert,
              thresholdValue: properties.thresholdValue ?? currentData.thresholdValue,
              overscan: properties.overscan ?? currentData.overscan,
              kerf: properties.kerf ?? currentData.kerf,
              kerfMode: properties.kerfMode ?? currentData.kerfMode,
            });
          }
          obj.setCoords();
        }
        break;
      }

      case 'delete': {
        const { targetIds } = params;
        targetIds.forEach((id: string) => {
          const obj = objectMap.get(id);
          if (obj) {
            this.canvas!.remove(obj);
            objectMap.delete(id);
          }
        });
        break;
      }

      case 'layerChange': {
        const { targetIds, layerId, color, mode } = params;
        targetIds.forEach((id: string) => {
          const obj = objectMap.get(id);
          if (obj) {
            const data = obj.get('data') || {};
            obj.set('data', { ...data, layerId });
            obj.set({
              stroke: color,
              fill: mode === 'fill' ? color : 'transparent',
            });
          }
        });
        break;
      }

      case 'group': {
        const { groupIds, newGroupId, groupProperties } = params;
        const children: fabric.FabricObject[] = [];
        groupIds.forEach((id: string) => {
          const obj = objectMap.get(id);
          if (obj) {
            children.push(obj);
            this.canvas!.remove(obj);
          }
        });

        if (children.length > 0) {
          const group = new fabric.Group(children, groupProperties);
          group.set('data', { gravityId: newGroupId });
          objectMap.set(newGroupId, group);
          this.canvas.add(group);
        }
        break;
      }

      case 'ungroup': {
        const { groupId, childIds } = params;
        const group = objectMap.get(groupId) as fabric.Group;
        if (group && group.type === 'group') {
          const items = group.getObjects();
          this.canvas.remove(group);
          objectMap.delete(groupId);

          items.forEach((item, index) => {
            const cid = childIds[index] || uuidv4();
            item.set('data', { gravityId: cid });
            objectMap.set(cid, item);
            this.canvas!.add(item);
          });
        }
        break;
      }

      case 'boolean': {
        const { targetIds, newPathId, resultSvgPath, resultProperties } = params;
        // Alte Vektoren entfernen
        targetIds.forEach((id: string) => {
          const obj = objectMap.get(id);
          if (obj) {
            this.canvas!.remove(obj);
            objectMap.delete(id);
          }
        });

        // Resultat-Pfad aus SVG importieren
        const pathObj = new fabric.Path(resultSvgPath, resultProperties);
        pathObj.set('data', { 
          gravityId: newPathId, 
          layerId: resultProperties.layerId || 'C00',
          kerf: resultProperties.kerf,
          kerfMode: resultProperties.kerfMode,
        });
        objectMap.set(newPathId, pathObj);
        this.canvas.add(pathObj);
        break;
      }

      case 'align': {
        const { alignments } = params;
        Object.keys(alignments).forEach((id) => {
          const obj = objectMap.get(id);
          if (obj) {
            const pos = alignments[id];
            if (pos.left !== undefined) obj.set('left', pos.left);
            if (pos.top !== undefined) obj.set('top', pos.top);
            obj.setCoords();
          }
        });
        break;
      }
    }
  }
}

export const historyStore = new HistoryStore();
export default historyStore;
