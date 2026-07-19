
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

export class NestingService {
  public static async nest(
    objects: any[],
    binWidth: number,
    binHeight: number,
    options: NestingOptions
  ): Promise<{ moved: { id: string; x: number; y: number; angle: number }[]; packedCount: number }> {
    
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
        angle: obj.angle || 0,
        allowRotation: obj.get('data')?.lockRotation ? false : options.allowRotation,
        originalObj: null // Cannot serialize fabric object to worker
      };
    });

    if (items.length === 0) {
      return { moved: [], packedCount: 0 };
    }

    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('../workers/NestingWorker.ts', import.meta.url), { type: 'module' });
      
      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate();
      };
      
      worker.onerror = (e) => {
        reject(new Error(e.message));
        worker.terminate();
      };
      
      worker.postMessage({
        items,
        binWidth,
        binHeight,
        options
      });
    });
  }

}
