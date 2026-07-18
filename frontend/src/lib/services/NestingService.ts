
export interface NestingItem {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  angle: number;
  allowRotation: boolean;
  // Reference to original canvas object
  originalObj: any;
}

export interface NestingGroup {
  items: NestingItem[];
  // Combined bounding box
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface NestingOptions {
  padding: number;      // Abstand zwischen Objekten (mm)
  edgeBuffer: number;   // Abstand zum Rand (mm)
  allowRotation: boolean; // Globale Rotationsfreigabe (in 90°-Schritten)
  lockInnerObjects: boolean; // Zusammenhalt verschachtelter Objekte
}

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class NestingService {
  /**
   * Führt das Nesting (Verschachtelung) der übergebenen Objekte aus.
   */
  public static nest(
    objects: any[],
    binWidth: number,
    binHeight: number,
    options: NestingOptions
  ): { moved: { id: string; x: number; y: number; angle: number }[]; packedCount: number } {
    
    // 1. Konvertiere Canvas-Objekte in NestingItems anhand ihrer echten visuellen Bounding-Box
    const items: NestingItem[] = objects.map(obj => {
      const br = typeof obj.getBoundingRect === 'function'
        ? obj.getBoundingRect(true, true)
        : { width: obj.width, height: obj.height, left: obj.left, top: obj.top };
      return {
        id: obj.get?.('data')?.gravityId || obj.get?.('data')?.id || obj.id || Math.random().toString(),
        width: br.width,
        height: br.height,
        x: br.left,
        y: br.top,
        angle: obj.angle || 0, // Wir merken uns den ursprünglichen Winkel für relative Addition
        allowRotation: obj.get('data')?.lockRotation ? false : options.allowRotation,
        originalObj: obj
      };
    });

    if (items.length === 0) {
      return { moved: [], packedCount: 0 };
    }

    // 2. Gruppiere überlappende Bounding Boxes (Topologie-Locking)
    const groups: NestingGroup[] = options.lockInnerObjects
      ? this.groupOverlappingItems(items)
      : items.map(item => ({
          items: [item],
          width: item.width,
          height: item.height,
          x: item.x,
          y: item.y
        }));

    // Sortiere Gruppen absteigend nach ihrer Fläche (große Objekte zuerst packen)
    groups.sort((a, b) => (b.width * b.height) - (a.width * a.height));

    // 3. MaxRects Packing initialisieren
    // Der nutzbare Bereich ist um den edgeBuffer verkleinert
    const usableW = binWidth - 2 * options.edgeBuffer;
    const usableH = binHeight - 2 * options.edgeBuffer;

    if (usableW <= 0 || usableH <= 0) {
      return { moved: [], packedCount: 0 };
    }

    const freeRects: FreeRect[] = [{ x: 0, y: 0, w: usableW, h: usableH }];
    const moved: { id: string; x: number; y: number; angle: number }[] = [];
    let packedCount = 0;

    // 4. Packe jede Gruppe
    for (const group of groups) {
      // Berechne benötigte Breite/Höhe inklusive Padding
      const neededW = group.width + options.padding;
      const neededH = group.height + options.padding;

      let bestSsf = Infinity;
      let bestRect: FreeRect | null = null;
      let bestRotated = false;

      // Finde den besten freien Platz (BSSF - Best Short Side Fit)
      for (const free of freeRects) {
        // Option A: Unrotiert
        if (free.w >= neededW && free.h >= neededH) {
          const ssf = Math.min(free.w - neededW, free.h - neededH);
          if (ssf < bestSsf) {
            bestSsf = ssf;
            bestRect = free;
            bestRotated = false;
          }
        }
        
        // Option B: Rotiert (nur wenn alle Items in der Gruppe Rotation erlauben)
        const groupAllowsRotation = group.items.every(it => it.allowRotation);
        if (groupAllowsRotation && free.w >= neededH && free.h >= neededW) {
          const ssf = Math.min(free.w - neededH, free.h - neededW);
          if (ssf < bestSsf) {
            bestSsf = ssf;
            bestRect = free;
            bestRotated = true;
          }
        }
      }

      // Wenn kein Platz gefunden wurde
      if (!bestRect) {
        continue;
      }

      // Ziel-Koordinaten im nutzbaren Bereich (inklusive EdgeBuffer)
      const targetW = bestRotated ? neededH : neededW;
      const targetH = bestRotated ? neededW : neededH;
      const packX = bestRect.x + options.edgeBuffer + options.padding / 2;
      const packY = bestRect.y + options.edgeBuffer + options.padding / 2;

      // Delta Verschiebung für alle Gruppenmitglieder berechnen
      const groupCenterDesignX = group.x + group.width / 2;
      const groupCenterDesignY = group.y + group.height / 2;

      const groupCenterPackX = packX + (bestRotated ? group.height : group.width) / 2;
      const groupCenterPackY = packY + (bestRotated ? group.width : group.height) / 2;

      // Verschiebe jedes Element der Gruppe relativ zum Gruppenmittelpunkt
      for (const item of group.items) {
        let relX = item.x + item.width / 2 - groupCenterDesignX;
        let relY = item.y + item.height / 2 - groupCenterDesignY;
        let newAngle = item.angle;

        if (bestRotated) {
          // Rotationsmatrix um 90° im Uhrzeigersinn anwenden
          const rx = -relY;
          const ry = relX;
          relX = rx;
          relY = ry;
          newAngle = (item.angle + 90) % 360;
        }

        // Neue absolute Position (Zentrum des Objekts)
        const centerX = groupCenterPackX + relX;
        const centerY = groupCenterPackY + relY;

        moved.push({
          id: item.id,
          x: centerX,
          y: centerY,
          angle: newAngle
        });
      }

      packedCount++;

      // Splitte freie Flächen anhand des belegten Bereichs (packX, packY, targetW, targetH)
      // Wir müssen den belegten Bereich im Koordinatensystem der freeRects betrachten (ohne edgeBuffer/padding)
      const occupiedX = packX - options.edgeBuffer - options.padding / 2;
      const occupiedY = packY - options.edgeBuffer - options.padding / 2;

      this.splitFreeRects(freeRects, occupiedX, occupiedY, targetW, targetH);
      this.pruneFreeRects(freeRects);
    }

    return { moved, packedCount };
  }

  /**
   * Gruppiert überlappende oder ineinander liegende Items zusammen
   */
  private static groupOverlappingItems(items: NestingItem[]): NestingGroup[] {
    const parentMap = new Map<string, string>();

    // Initialisiere: Jedes Item zeigt auf sich selbst
    items.forEach(it => parentMap.set(it.id, it.id));

    const find = (id: string): string => {
      let root = id;
      while (parentMap.get(root) !== root) {
        root = parentMap.get(root)!;
      }
      // Pfadkompression
      let curr = id;
      while (curr !== root) {
        const nxt = parentMap.get(curr)!;
        parentMap.set(curr, root);
        curr = nxt;
      }
      return root;
    };

    const union = (id1: string, id2: string) => {
      const root1 = find(id1);
      const root2 = find(id2);
      if (root1 !== root2) {
        parentMap.set(root1, root2);
      }
    };

    // Finde Überlappungen
    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      const aLeft = a.x;
      const aRight = a.x + a.width;
      const aTop = a.y;
      const aBottom = a.y + a.height;

      for (let j = i + 1; j < items.length; j++) {
        const b = items[j];
        const bLeft = b.x;
        const bRight = b.x + b.width;
        const bTop = b.y;
        const bBottom = b.y + b.height;

        // Wir wollen nur "Innere Aussparungen" gruppieren, nicht alles was sich überschneidet.
        // Ein Objekt ist eine Aussparung, wenn seine Bounding-Box komplett (mit kleiner Toleranz)
        // innerhalb der Bounding-Box eines anderen Objekts liegt.
        const TOLERANCE = 2; // Pixel
        const bInA = (
          bLeft >= aLeft - TOLERANCE &&
          bRight <= aRight + TOLERANCE &&
          bTop >= aTop - TOLERANCE &&
          bBottom <= aBottom + TOLERANCE
        );
        
        const aInB = (
          aLeft >= bLeft - TOLERANCE &&
          aRight <= bRight + TOLERANCE &&
          aTop >= bTop - TOLERANCE &&
          aBottom <= bBottom + TOLERANCE
        );

        if (bInA || aInB) {
          union(a.id, b.id);
        }
      }
    }

    // Erstelle Gruppen
    const groupMap = new Map<string, NestingItem[]>();
    items.forEach(item => {
      const root = find(item.id);
      if (!groupMap.has(root)) {
        groupMap.set(root, []);
      }
      groupMap.get(root)!.push(item);
    });

    // Berechne kombinierte Bounding Box für jede Gruppe
    return Array.from(groupMap.values()).map(groupItems => {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      groupItems.forEach(it => {
        minX = Math.min(minX, it.x);
        maxX = Math.max(maxX, it.x + it.width);
        minY = Math.min(minY, it.y);
        maxY = Math.max(maxY, it.y + it.height);
      });

      return {
        items: groupItems,
        width: maxX - minX,
        height: maxY - minY,
        x: minX,
        y: minY
      };
    });
  }

  /**
   * Splittet freie Rechtecke anhand eines platzierten Rechtecks (MaxRects Splitting)
   */
  private static splitFreeRects(freeRects: FreeRect[], px: number, py: number, pw: number, ph: number) {
    const n = freeRects.length;
    for (let i = 0; i < n; i++) {
      const free = freeRects[i];

      // Prüfe auf Überlappung
      const overlap = !(
        free.x >= px + pw ||
        px >= free.x + free.w ||
        free.y >= py + ph ||
        py >= free.y + free.h
      );

      if (!overlap) {
        continue;
      }

      // Splitting in bis zu 4 Sub-Rechtecke
      // Links
      if (px > free.x && px < free.x + free.w) {
        freeRects.push({ x: free.x, y: free.y, w: px - free.x, h: free.h });
      }
      // Rechts
      if (px + pw < free.x + free.w) {
        freeRects.push({ x: px + pw, y: free.y, w: (free.x + free.w) - (px + pw), h: free.h });
      }
      // Oben
      if (py > free.y && py < free.y + free.h) {
        freeRects.push({ x: free.x, y: free.y, w: free.w, h: py - free.y });
      }
      // Unten
      if (py + ph < free.y + free.h) {
        freeRects.push({ x: free.x, y: py + ph, w: free.w, h: (free.y + free.h) - (py + ph) });
      }

      // Entferne das ursprüngliche Rechteck (markiere als ungültig durch w=0, h=0)
      free.w = 0;
      free.h = 0;
    }
  }

  /**
   * Bereinigt die Liste der freien Rechtecke (entfernt Duplikate und Teilflächen)
   */
  private static pruneFreeRects(freeRects: FreeRect[]) {
    // 1. Filter ungültige Rechtecke (w=0, h=0) heraus
    const active = freeRects.filter(r => r.w > 0 && r.h > 0);

    // 2. Entferne Teilflächen (Rechtecke, die vollständig in einem anderen liegen)
    for (let i = 0; i < active.length; i++) {
      const r1 = active[i];
      for (let j = 0; j < active.length; j++) {
        if (i === j) continue;
        const r2 = active[j];
        
        // Prüfe, ob r1 vollständig in r2 enthalten ist
        if (
          r1.x >= r2.x &&
          r1.y >= r2.y &&
          r1.x + r1.w <= r2.x + r2.w &&
          r1.y + r1.h <= r2.y + r2.h
        ) {
          r1.w = 0; // r1 ist überflüssig
          r1.h = 0;
          break;
        }
      }
    }

    // Aktualisiere die Originalliste
    freeRects.length = 0;
    freeRects.push(...active.filter(r => r.w > 0 && r.h > 0));
  }
}
