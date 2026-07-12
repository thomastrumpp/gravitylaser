import { v4 as uuidv4 } from 'uuid';

export class OffsetFillService {
  private static worker: Worker | null = null;
  private static pendingRequests = new Map<
    string,
    {
      resolve: (value: [number, number][][]) => void;
      reject: (reason: any) => void;
    }
  >();

  private static initWorker() {
    if (this.worker) return;

    this.worker = new Worker(
      new URL('../workers/offsetFillWorker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (e: MessageEvent) => {
      const { id, success, toolpaths, error } = e.data;
      const request = this.pendingRequests.get(id);
      if (!request) return;

      this.pendingRequests.delete(id);

      if (success) {
        request.resolve(toolpaths);
      } else {
        request.reject(new Error(error || 'Failed to calculate offset fill.'));
      }
    };

    this.worker.onerror = (err) => {
      console.error('OffsetFillWorker Error:', err);
    };
  }

  public static calculate(
    points: [number, number][],
    stepover: number
  ): Promise<[number, number][][]> {
    this.initWorker();

    return new Promise((resolve, reject) => {
      const id = uuidv4();
      this.pendingRequests.set(id, { resolve, reject });

      if (this.worker) {
        this.worker.postMessage({ id, points, stepover });
      } else {
        reject(new Error('OffsetFillWorker could not be initialized.'));
      }
    });
  }
}
