import type { DitheringConfig, DitherMessageData, DitherMessageResult } from '../workers/DitheringWorker';

// Initialize the worker. Using Vite's ?worker import
import DitheringWorker from '../workers/DitheringWorker?worker';

class DitheringService {
  private worker: Worker;
  private pendingRequests: Map<string, { resolve: (data: Uint8ClampedArray) => void; reject: (err: any) => void }> = new Map();
  private nextId = 0;

  constructor() {
    this.worker = new DitheringWorker();
    this.worker.onmessage = (e: MessageEvent<DitherMessageResult>) => {
      const { id, resultData, error } = e.data;
      const handlers = this.pendingRequests.get(id);
      if (handlers) {
        if (error) {
          handlers.reject(new Error(error));
        } else {
          handlers.resolve(resultData);
        }
        this.pendingRequests.delete(id);
      }
    };
  }

  public async processImage(imageData: Uint8ClampedArray, width: number, height: number, config: DitheringConfig): Promise<Uint8ClampedArray> {
    return new Promise((resolve, reject) => {
      const id = `dither_${this.nextId++}`;
      this.pendingRequests.set(id, { resolve, reject });
      
      const payload: DitherMessageData = {
        id,
        imageData,
        width,
        height,
        config
      };

      // We clone the image data before sending because the worker uses it and we can't always transfer it depending on how canvas got it.
      // But actually, we CAN transfer a new Uint8ClampedArray buffer if we make a copy. 
      // It's safer to copy here to avoid Detached Buffer errors if the caller re-uses it.
      const bufferCopy = new Uint8ClampedArray(imageData).buffer;
      payload.imageData = new Uint8ClampedArray(bufferCopy);
      
      this.worker.postMessage(payload, [bufferCopy]);
    });
  }

  public destroy() {
    this.worker.terminate();
  }
}

export const ditheringService = new DitheringService();
