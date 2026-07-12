// src/lib/services/booleanOps.ts

export type BooleanAction = 'union' | 'subtract' | 'intersect';

export class BooleanOperationService {
  private static worker: Worker | null = null;
  private static messageId = 0;
  private static callbacks = new Map<string, { resolve: (result: string) => void, reject: (err: any) => void }>();

  private static initWorker() {
    if (!this.worker) {
      // Importiere den WebWorker. Vite bündelt das automatisch.
      this.worker = new Worker(new URL('../workers/paperWorker.ts', import.meta.url), { type: 'module' });
      
      this.worker.onmessage = (e) => {
        const { id, success, result, error } = e.data;
        const cb = this.callbacks.get(id);
        if (cb) {
          if (success) cb.resolve(result);
          else cb.reject(new Error(error));
          this.callbacks.delete(id);
        }
      };
    }
  }

  /**
   * Führt eine Boolesche Operation auf einer Liste von SVG-Strings aus.
   * Läuft im WebWorker, um den Main-Thread nicht zu blockieren.
   */
  public static async execute(action: BooleanAction, svgData: string[]): Promise<string> {
    this.initWorker();
    
    return new Promise((resolve, reject) => {
      const id = String(++this.messageId);
      this.callbacks.set(id, { resolve, reject });
      
      this.worker!.postMessage({
        id,
        action,
        svgData
      });
    });
  }
}
