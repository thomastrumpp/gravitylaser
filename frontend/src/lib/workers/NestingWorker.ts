// src/lib/workers/NestingWorker.ts

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NestingItem {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  angle: number;
  allowRotation: boolean;
}

export interface NestingGroup {
  items: NestingItem[];
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface NestingOptions {
  padding: number;      
  edgeBuffer: number;   
  allowRotation: boolean; 
  lockInnerObjects: boolean; 
}

const splitFreeRects = (freeRects: FreeRect[], px: number, py: number, pw: number, ph: number) => {
  const n = freeRects.length;
  for (let i = 0; i < n; i++) {
    const free = freeRects[i];
    const overlap = !(
      free.x >= px + pw ||
      px >= free.x + free.w ||
      free.y >= py + ph ||
      py >= free.y + free.h
    );

    if (!overlap) continue;

    if (px > free.x && px < free.x + free.w) {
      freeRects.push({ x: free.x, y: free.y, w: px - free.x, h: free.h });
    }
    if (px + pw < free.x + free.w) {
      freeRects.push({ x: px + pw, y: free.y, w: (free.x + free.w) - (px + pw), h: free.h });
    }
    if (py > free.y && py < free.y + free.h) {
      freeRects.push({ x: free.x, y: free.y, w: free.w, h: py - free.y });
    }
    if (py + ph < free.y + free.h) {
      freeRects.push({ x: free.x, y: py + ph, w: free.w, h: (free.y + free.h) - (py + ph) });
    }

    free.w = 0;
    free.h = 0;
  }
};

const pruneFreeRects = (freeRects: FreeRect[]) => {
  const active = freeRects.filter(r => r.w > 0 && r.h > 0);
  for (let i = 0; i < active.length; i++) {
    const r1 = active[i];
    for (let j = 0; j < active.length; j++) {
      if (i === j) continue;
      const r2 = active[j];
      if (
        r1.x >= r2.x &&
        r1.y >= r2.y &&
        r1.x + r1.w <= r2.x + r2.w &&
        r1.y + r1.h <= r2.y + r2.h
      ) {
        r1.w = 0;
        r1.h = 0;
        break;
      }
    }
  }
  freeRects.length = 0;
  freeRects.push(...active.filter(r => r.w > 0 && r.h > 0));
};

const groupOverlappingItems = (items: NestingItem[]): NestingGroup[] => {
  const parentMap = new Map<string, string>();
  items.forEach(it => parentMap.set(it.id, it.id));

  const find = (id: string): string => {
    let root = id;
    while (parentMap.get(root) !== root) {
      root = parentMap.get(root)!;
    }
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

  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    const aLeft = a.x, aRight = a.x + a.width, aTop = a.y, aBottom = a.y + a.height;
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j];
      const bLeft = b.x, bRight = b.x + b.width, bTop = b.y, bBottom = b.y + b.height;
      const TOLERANCE = 2;
      const bInA = (bLeft >= aLeft - TOLERANCE && bRight <= aRight + TOLERANCE && bTop >= aTop - TOLERANCE && bBottom <= aBottom + TOLERANCE);
      const aInB = (aLeft >= bLeft - TOLERANCE && aRight <= bRight + TOLERANCE && aTop >= bTop - TOLERANCE && aBottom <= bBottom + TOLERANCE);
      if (bInA || aInB) {
        union(a.id, b.id);
      }
    }
  }

  const groupMap = new Map<string, NestingItem[]>();
  items.forEach(item => {
    const root = find(item.id);
    if (!groupMap.has(root)) groupMap.set(root, []);
    groupMap.get(root)!.push(item);
  });

  return Array.from(groupMap.values()).map(groupItems => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    groupItems.forEach(it => {
      minX = Math.min(minX, it.x);
      maxX = Math.max(maxX, it.x + it.width);
      minY = Math.min(minY, it.y);
      maxY = Math.max(maxY, it.y + it.height);
    });
    return { items: groupItems, width: maxX - minX, height: maxY - minY, x: minX, y: minY };
  });
};

self.onmessage = (e: MessageEvent) => {
  const { items, binWidth, binHeight, options } = e.data;

  const groups: NestingGroup[] = options.lockInnerObjects
    ? groupOverlappingItems(items)
    : items.map((item: any) => ({
        items: [item],
        width: item.width,
        height: item.height,
        x: item.x,
        y: item.y
      }));

  groups.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  const usableW = binWidth - 2 * options.edgeBuffer;
  const usableH = binHeight - 2 * options.edgeBuffer;

  if (usableW <= 0 || usableH <= 0) {
    self.postMessage({ moved: [], packedCount: 0 });
    return;
  }

  const freeRects: FreeRect[] = [{ x: 0, y: 0, w: usableW, h: usableH }];
  const moved: { id: string; x: number; y: number; angle: number }[] = [];
  let packedCount = 0;

  for (const group of groups) {
    const neededW = group.width + options.padding;
    const neededH = group.height + options.padding;

    let bestSsf = Infinity;
    let bestRect: FreeRect | null = null;
    let bestRotated = false;

    for (const free of freeRects) {
      if (free.w >= neededW && free.h >= neededH) {
        const ssf = Math.min(free.w - neededW, free.h - neededH);
        if (ssf < bestSsf) {
          bestSsf = ssf;
          bestRect = free;
          bestRotated = false;
        }
      }
      
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

    if (!bestRect) continue;

    const targetW = bestRotated ? neededH : neededW;
    const targetH = bestRotated ? neededW : neededH;
    const packX = bestRect.x + options.edgeBuffer + options.padding / 2;
    const packY = bestRect.y + options.edgeBuffer + options.padding / 2;

    const groupCenterDesignX = group.x + group.width / 2;
    const groupCenterDesignY = group.y + group.height / 2;

    const groupCenterPackX = packX + (bestRotated ? group.height : group.width) / 2;
    const groupCenterPackY = packY + (bestRotated ? group.width : group.height) / 2;

    for (const item of group.items) {
      let relX = item.x + item.width / 2 - groupCenterDesignX;
      let relY = item.y + item.height / 2 - groupCenterDesignY;
      let newAngle = item.angle;

      if (bestRotated) {
        const rx = -relY;
        const ry = relX;
        relX = rx;
        relY = ry;
        newAngle = (item.angle + 90) % 360;
      }

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

    const occupiedX = packX - options.edgeBuffer - options.padding / 2;
    const occupiedY = packY - options.edgeBuffer - options.padding / 2;

    splitFreeRects(freeRects, occupiedX, occupiedY, targetW, targetH);
    pruneFreeRects(freeRects);
  }

  self.postMessage({ moved, packedCount });
};
