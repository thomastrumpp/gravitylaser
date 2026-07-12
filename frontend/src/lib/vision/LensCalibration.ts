/**
 * LensCalibration — Behebt radiale Linsenverzerrungen (Kissen-/Trommelverzerrung)
 * unter Verwendung des Brown-Conrady Modells.
 */

export class LensCalibration {
  /**
   * Entzerrt ein Bild (DataURL) anhand der radialen Linsenverzerrungskoeffizienten k1 und k2
   */
  public static async undistort(dataUrl: string, k1: number, k2: number): Promise<string> {
    if (k1 === 0 && k2 === 0) return dataUrl;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = w;
        srcCanvas.height = h;
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) {
          reject(new Error("Source context is null"));
          return;
        }
        srcCtx.drawImage(img, 0, 0);
        const srcData = srcCtx.getImageData(0, 0, w, h);
        const srcPixels = srcData.data;

        const destCanvas = document.createElement('canvas');
        destCanvas.width = w;
        destCanvas.height = h;
        const destCtx = destCanvas.getContext('2d');
        if (!destCtx) {
          reject(new Error("Dest context is null"));
          return;
        }
        const destData = destCtx.createImageData(w, h);
        const destPixels = destData.data;

        const cx = w / 2;
        const cy = h / 2;

        // Skalierungsfaktor für Normalisierung (Brennweite schätzen)
        const f = Math.max(w, h);

        for (let y = 0; y < h; y++) {
          const dy = (y - cy) / f;
          const yOff = y * w * 4;

          for (let x = 0; x < w; x++) {
            const dx = (x - cx) / f;
            const r2 = dx * dx + dy * dy;
            const radial = 1.0 + k1 * r2 + k2 * r2 * r2;

            // Zurück-Mappen auf das verzerrte Bild
            const distIndexX = Math.round(cx + dx * radial * f);
            const distIndexY = Math.round(cy + dy * radial * f);

            const xOff = x * 4;
            const destOffset = yOff + xOff;

            if (distIndexX >= 0 && distIndexX < w && distIndexY >= 0 && distIndexY < h) {
              const srcOffset = (distIndexY * w + distIndexX) * 4;
              destPixels[destOffset] = srcPixels[srcOffset];
              destPixels[destOffset + 1] = srcPixels[srcOffset + 1];
              destPixels[destOffset + 2] = srcPixels[srcOffset + 2];
              destPixels[destOffset + 3] = srcPixels[srcOffset + 3];
            } else {
              destPixels[destOffset] = 0;
              destPixels[destOffset + 1] = 0;
              destPixels[destOffset + 2] = 0;
              destPixels[destOffset + 3] = 0;
            }
          }
        }

        destCtx.putImageData(destData, 0, 0);
        resolve(destCanvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = (e) => reject(e);
      img.src = dataUrl;
    });
  }
}
