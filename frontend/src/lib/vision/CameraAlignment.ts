import type { Point } from '../services/PrintAndCutService';

export class CameraAlignment {
  /**
   * Berechnet die 3x3 Homographie-Matrix mit dem DLT (Direct Linear Transform) Algorithmus.
   * Projiziert 4 Quellpunkte (Kamera-Pixel) auf 4 Zielpunkte (Maschinen-Millimeter).
   */
  public static computeHomography(src: Point[], dest: Point[]): number[] {
    if (src.length !== 4 || dest.length !== 4) {
      throw new Error("Es müssen exakt 4 Punkt-Paare angegeben werden.");
    }

    const A: number[][] = [];
    const B: number[] = [];

    for (let i = 0; i < 4; i++) {
      const x = src[i].x;
      const y = src[i].y;
      const u = dest[i].x;
      const v = dest[i].y;

      // Gleichung 1
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
      B.push(u);

      // Gleichung 2
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
      B.push(v);
    }

    // Löse das 8x8 Gleichungssystem A * h = B
    const h = this.solveLinearSystem(A, B);
    
    // Homographie-Matrix als flaches Array [h00, h01, h02, h10, h11, h12, h20, h21, h22]
    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0];
  }

  /**
   * Projiziert einen 2D-Punkt unter Verwendung der Homographie-Matrix
   */
  public static transformPoint(x: number, y: number, H: number[]): Point {
    const w = H[6] * x + H[7] * y + H[8];
    const targetW = w !== 0 ? w : 1.0;
    return {
      x: (H[0] * x + H[1] * y + H[2]) / targetW,
      y: (H[3] * x + H[4] * y + H[5]) / targetW
    };
  }

  /**
   * Projiziert ein Bild (DataURL) über die inverse Homographie-Matrix auf die Zielgröße (Arbeitsbereich)
   */
  public static async warpImage(
    dataUrl: string,
    H: number[],
    widthPx: number,
    heightPx: number
  ): Promise<string> {
    // Berechne die Inverse Homographie, um von Ziel-Pixeln (Arbeitsbereich) zu Quell-Pixeln (Kamera) zurückzumappen
    const invH = this.invertMatrix3x3(H);
    if (!invH) {
      return dataUrl; // Fallback auf Original, wenn Matrix singulär ist
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const srcW = img.width;
        const srcH = img.height;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = srcW;
        srcCanvas.height = srcH;
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) {
          reject(new Error("Source context is null"));
          return;
        }
        srcCtx.drawImage(img, 0, 0);
        const srcData = srcCtx.getImageData(0, 0, srcW, srcH);
        const srcPixels = srcData.data;

        const destCanvas = document.createElement('canvas');
        destCanvas.width = widthPx;
        destCanvas.height = heightPx;
        const destCtx = destCanvas.getContext('2d');
        if (!destCtx) {
          reject(new Error("Dest context is null"));
          return;
        }
        const destData = destCtx.createImageData(widthPx, heightPx);
        const destPixels = destData.data;

        for (let y = 0; y < heightPx; y++) {
          const yOff = y * widthPx * 4;
          for (let x = 0; x < widthPx; x++) {
            // Projiziere Ziel-Koordinaten (x, y) zurück in das Quell-Kamerabild (srcX, srcY)
            const w = invH[6] * x + invH[7] * y + invH[8];
            const srcX = Math.round((invH[0] * x + invH[1] * y + invH[2]) / (w !== 0 ? w : 1.0));
            const srcY = Math.round((invH[3] * x + invH[4] * y + invH[5]) / (w !== 0 ? w : 1.0));

            const destOffset = yOff + x * 4;

            if (srcX >= 0 && srcX < srcW && srcY >= 0 && srcY < srcH) {
              const srcOffset = (srcY * srcW + srcX) * 4;
              destPixels[destOffset] = srcPixels[srcOffset];
              destPixels[destOffset + 1] = srcPixels[srcOffset + 1];
              destPixels[destOffset + 2] = srcPixels[srcOffset + 2];
              destPixels[destOffset + 3] = srcPixels[srcOffset + 3];
            } else {
              // Hintergrund transparent
              destPixels[destOffset] = 0;
              destPixels[destOffset + 1] = 0;
              destPixels[destOffset + 2] = 0;
              destPixels[destOffset + 3] = 0;
            }
          }
        }

        destCtx.putImageData(destData, 0, 0);
        resolve(destCanvas.toDataURL('image/png'));
      };
      img.onerror = (e) => reject(e);
      img.src = dataUrl;
    });
  }

  // Löst A * x = B über Gauss-Elimination (8x8)
  private static solveLinearSystem(A: number[][], B: number[]): number[] {
    const n = 8;
    for (let i = 0; i < n; i++) {
      let maxEl = Math.abs(A[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > maxEl) {
          maxEl = Math.abs(A[k][i]);
          maxRow = k;
        }
      }

      const tmpRow = A[maxRow];
      A[maxRow] = A[i];
      A[i] = tmpRow;
      const tmpB = B[maxRow];
      B[maxRow] = B[i];
      B[i] = tmpB;

      if (Math.abs(A[i][i]) < 1e-12) {
        throw new Error("Gleichungssystem singulär (Marker liegen vermutlich kollinear).");
      }

      for (let k = i + 1; k < n; k++) {
        const c = -A[k][i] / A[i][i];
        for (let j = i; j < n; j++) {
          if (i === j) {
            A[k][j] = 0;
          } else {
            A[k][j] += c * A[i][j];
          }
        }
        B[k] += c * B[i];
      }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = B[i] / A[i][i];
      for (let k = i - 1; k >= 0; k--) {
        B[k] -= A[k][i] * x[i];
      }
    }
    return x;
  }

  // Invertiert eine flache 3x3 Homographie-Matrix
  private static invertMatrix3x3(m: number[]): number[] | null {
    const [a, b, c, d, e, f, g, h, i] = m;
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);

    if (Math.abs(det) < 1e-12) {
      return null;
    }

    const invdet = 1.0 / det;
    return [
      (e * i - f * h) * invdet,
      (c * h - b * i) * invdet,
      (b * f - c * e) * invdet,
      (f * g - d * i) * invdet,
      (a * i - c * g) * invdet,
      (c * d - a * f) * invdet,
      (d * h - e * g) * invdet,
      (b * g - a * h) * invdet,
      (a * e - b * d) * invdet
    ];
  }
}
