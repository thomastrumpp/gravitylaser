import * as fabric from 'fabric';
import { layersStore } from '../stores/layersStore';
import { consoleStore } from '../stores/consoleStore';
import { settingsStore } from '../stores/settingsStore';

export class GcodeSimulator {
  private canvas: fabric.Canvas;
  private laserDot: fabric.Circle | null = null;
  private isSimulating = false;
  
  private getInverseY(yMach: number): number {
    const settings = settingsStore.get();
    if (settings.origin.includes('Bottom')) return settings.workingSizeY - yMach;
    if (settings.origin === 'Center') return (settings.workingSizeY / 2) - yMach;
    return yMach;
  }
  
  private getInverseX(xMach: number): number {
    const settings = settingsStore.get();
    if (settings.origin.includes('Right')) return settings.workingSizeX - xMach;
    if (settings.origin === 'Center') return xMach + (settings.workingSizeX / 2);
    return xMach;
  }

  private scalePxPerMm = 2;
  private simulationSpeedMultiplier = 5; // Simuliere 5x so schnell wie real
  private currentAnimationId: number | null = null;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  public async simulate(gcode: string) {
    if (this.isSimulating) return;
    this.isSimulating = true;
    consoleStore.logLine("🚀 Simulation gestartet...", "info");

    const lines = gcode.split('\n');
    
    // Laser Dot erstellen
    this.laserDot = new fabric.Circle({
      radius: 3,
      fill: 'transparent',
      top: this.getInverseY(0) * this.scalePxPerMm,
      left: this.getInverseX(0) * this.scalePxPerMm, // Home Position (0,0 in Laser coords -> bottom-left in Canvas)
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      excludeFromExport: true,
      shadow: new fabric.Shadow({
        color: 'transparent',
        blur: 10,
      })
    });
    this.canvas.add(this.laserDot);

    let currentX = 0;
    let currentY = 0;
    let currentS = 0;
    let currentLayerColor = '#ff0000'; // Default
    let currentFeed = 1000;

    // Parse GCode and execute sequentially
    for (const line of lines) {
      if (!this.isSimulating) break;

      const cleanLine = line.split(';')[0].trim();
      
      // Parse Layer Info from comments to get the color
      const layerMatch = line.match(/; --- Ebene: .*? \(Modus: .*\) ---/);
      if (layerMatch) {
         // Wir können die Farbe hier aus dem Store holen, wenn wir die LayerId hätten.
         // Einfachheitshalber iterieren wir:
         const layers = layersStore.get();
         // Ein heuristischer Weg, um die Farbe zu finden (da der Name im G-Code steht)
         const nameMatch = line.match(/Ebene: (.*?) \(/);
         if (nameMatch) {
            const lName = nameMatch[1];
            const lDef = Object.values(layers).find(l => l.name === lName);
            if (lDef) {
               currentLayerColor = lDef.color;
            }
         }
      }

      if (cleanLine.startsWith('M4') || cleanLine.startsWith('M3')) {
        const sMatch = cleanLine.match(/S([\d.]+)/);
        if (sMatch) currentS = parseFloat(sMatch[1]);
        
        // Farbe anpassen: Bei G1 nimmt der Punkt die Ebenenfarbe an
        this.laserDot.set({ 
            fill: currentLayerColor,
            shadow: new fabric.Shadow({
              color: currentLayerColor,
              blur: 15 + (currentS / 1000) * 15 // Je stärker der Laser, desto mehr Glow
            })
        });
        this.canvas.requestRenderAll();
        await this.delay(10);
      } else if (cleanLine.startsWith('M5')) {
        this.laserDot.set({ 
            fill: 'transparent',
            shadow: new fabric.Shadow({ color: 'transparent' })
        });
        this.canvas.requestRenderAll();
        await this.delay(10);
      } else if (cleanLine.startsWith('G0') || cleanLine.startsWith('G1')) {
        const isRapid = cleanLine.startsWith('G0');
        
        const xMatch = cleanLine.match(/X([\d.-]+)/);
        const yMatch = cleanLine.match(/Y([\d.-]+)/);
        const fMatch = cleanLine.match(/F([\d.]+)/);

        if (fMatch) currentFeed = parseFloat(fMatch[1]);

        const targetX = xMatch ? parseFloat(xMatch[1]) : currentX;
        const targetY = yMatch ? parseFloat(yMatch[1]) : currentY;

        // Animate movement
        await this.animateMove(currentX, currentY, targetX, targetY, isRapid ? 6000 : currentFeed);

        currentX = targetX;
        currentY = targetY;
      }
    }

    // Cleanup
    if (this.laserDot) {
      this.canvas.remove(this.laserDot);
      this.laserDot = null;
    }
    this.isSimulating = false;
    this.canvas.requestRenderAll();
    consoleStore.logLine("🏁 Simulation beendet.", "info");
  }

  public stop() {
    this.isSimulating = false;
    if (this.currentAnimationId) {
        cancelAnimationFrame(this.currentAnimationId);
    }
  }

  private animateMove(startX: number, startY: number, endX: number, endY: number, feedRate: number): Promise<void> {
    return new Promise((resolve) => {
      // Umrechnung Laser-Koordinaten (0 unten-links) zu Fabric-Koordinaten (0 oben-links)
      const startPxX = this.getInverseX(startX) * this.scalePxPerMm;
      const startPxY = this.getInverseY(startY) * this.scalePxPerMm;
      
      const endPxX = this.getInverseX(endX) * this.scalePxPerMm;
      const endPxY = this.getInverseY(endY) * this.scalePxPerMm;

      // Distanz in mm
      const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
      if (dist < 0.1) {
          resolve();
          return;
      }

      // feedRate ist in mm/min. mm/sec = feedRate / 60
      const mmPerSec = feedRate / 60;
      // Dauer in ms
      const durationMs = (dist / mmPerSec) * 1000;
      // Simulierte Dauer
      const simDurationMs = Math.max(50, durationMs / this.simulationSpeedMultiplier);

      const startTime = performance.now();

      const animate = (time: number) => {
        if (!this.isSimulating) {
            resolve();
            return;
        }

        const elapsed = time - startTime;
        const progress = Math.min(1, elapsed / simDurationMs);

        const currentPxX = startPxX + (endPxX - startPxX) * progress;
        const currentPxY = startPxY + (endPxY - startPxY) * progress;

        if (this.laserDot) {
            this.laserDot.set({ left: currentPxX, top: currentPxY });
            this.canvas.requestRenderAll();
        }

        if (progress < 1) {
            this.currentAnimationId = requestAnimationFrame(animate);
        } else {
            resolve();
        }
      };

      this.currentAnimationId = requestAnimationFrame(animate);
    });
  }

  private delay(ms: number) {
      return new Promise(res => setTimeout(res, ms));
  }
}
