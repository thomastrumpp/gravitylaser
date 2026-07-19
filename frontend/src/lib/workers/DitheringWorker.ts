export type DitheringAlgorithm = 'threshold' | 'floyd-steinberg' | 'atkinson' | 'jarvis' | 'stucki';

export interface DitheringConfig {
  algorithm: DitheringAlgorithm;
  thresholdValue?: number;
  contrast?: number;
  brightness?: number;
  gamma?: number;
}

export interface DitherMessageData {
  id: string;
  imageData: Uint8ClampedArray;
  width: number;
  height: number;
  config: DitheringConfig;
}

export interface DitherMessageResult {
  id: string;
  resultData: Uint8ClampedArray;
  error?: string;
}

// clamp helper
const clamp = (val: number) => Math.max(0, Math.min(255, val));

self.onmessage = (e: MessageEvent<DitherMessageData>) => {
  const { id, imageData, width, height, config } = e.data;
  
  try {
    const { algorithm, thresholdValue = 128, contrast = 0, brightness = 0, gamma = 1.0 } = config;
    
    // 1. Grayscale, Brightness, Contrast & Gamma
    const pixels = new Float32Array(width * height);
    
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    const gammaCorrection = 1 / gamma;

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const i = (r * width + c) * 4;
        const R = imageData[i];
        const G = imageData[i + 1];
        const B = imageData[i + 2];
        const A = imageData[i + 3];

        if (A < 128) {
          pixels[r * width + c] = 255; // White background for transparent
          continue;
        }

        // BT.709 Luma
        let gray = 0.2126 * R + 0.7152 * G + 0.0722 * B;
        gray += brightness;
        gray = contrastFactor * (gray - 128) + 128;

        if (gamma !== 1.0) {
          gray = 255 * Math.pow(clamp(gray) / 255, gammaCorrection);
        }

        pixels[r * width + c] = clamp(gray);
      }
    }

    // 2. Dithering
    if (algorithm === 'threshold') {
      for (let i = 0; i < pixels.length; i++) {
        pixels[i] = pixels[i] < thresholdValue ? 0 : 255;
      }
    } else {
      // Error diffusion
      for (let r = 0; r < height; r++) {
        const isLeftToRight = r % 2 === 0;
        const startC = isLeftToRight ? 0 : width - 1;
        const endC = isLeftToRight ? width : -1;
        const step = isLeftToRight ? 1 : -1;

        const addError = (dc: number, dr: number, weight: number, divisor: number, currentC: number, currentR: number, err: number) => {
          const nc = currentC + (isLeftToRight ? dc : -dc);
          const nr = currentR + dr;
          if (nc >= 0 && nc < width && nr >= 0 && nr < height) {
            pixels[nr * width + nc] += err * (weight / divisor);
          }
        };

        for (let c = startC; c !== endC; c += step) {
          const idx = r * width + c;
          const oldPixel = pixels[idx];
          const newPixel = oldPixel < thresholdValue ? 0 : 255;
          pixels[idx] = newPixel;
          const err = oldPixel - newPixel;

          if (err !== 0) {
            if (algorithm === 'floyd-steinberg') {
              addError(1, 0, 7, 16, c, r, err);
              addError(-1, 1, 3, 16, c, r, err);
              addError(0, 1, 5, 16, c, r, err);
              addError(1, 1, 1, 16, c, r, err);
            } else if (algorithm === 'atkinson') {
              addError(1, 0, 1, 8, c, r, err);
              addError(2, 0, 1, 8, c, r, err);
              addError(-1, 1, 1, 8, c, r, err);
              addError(0, 1, 1, 8, c, r, err);
              addError(1, 1, 1, 8, c, r, err);
              addError(0, 2, 1, 8, c, r, err);
            } else if (algorithm === 'jarvis') {
              addError(1, 0, 7, 48, c, r, err);
              addError(2, 0, 5, 48, c, r, err);
              addError(-2, 1, 3, 48, c, r, err);
              addError(-1, 1, 5, 48, c, r, err);
              addError(0, 1, 7, 48, c, r, err);
              addError(1, 1, 5, 48, c, r, err);
              addError(2, 1, 3, 48, c, r, err);
              addError(-2, 2, 1, 48, c, r, err);
              addError(-1, 2, 3, 48, c, r, err);
              addError(0, 2, 5, 48, c, r, err);
              addError(1, 2, 3, 48, c, r, err);
              addError(2, 2, 1, 48, c, r, err);
            } else if (algorithm === 'stucki') {
              addError(1, 0, 8, 42, c, r, err);
              addError(2, 0, 4, 42, c, r, err);
              addError(-2, 1, 2, 42, c, r, err);
              addError(-1, 1, 4, 42, c, r, err);
              addError(0, 1, 8, 42, c, r, err);
              addError(1, 1, 4, 42, c, r, err);
              addError(2, 1, 2, 42, c, r, err);
              addError(-2, 2, 1, 42, c, r, err);
              addError(-1, 2, 2, 42, c, r, err);
              addError(0, 2, 4, 42, c, r, err);
              addError(1, 2, 2, 42, c, r, err);
              addError(2, 2, 1, 42, c, r, err);
            }
          }
        }
      }
    }

    // Write back to Uint8ClampedArray
    const resultData = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < pixels.length; i++) {
      const val = clamp(pixels[i]);
      const idx = i * 4;
      resultData[idx] = val;     // R
      resultData[idx+1] = val;   // G
      resultData[idx+2] = val;   // B
      resultData[idx+3] = 255;   // A
    }

    self.postMessage({ id, resultData } as DitherMessageResult, [resultData.buffer] as any);

  } catch (err: any) {
    self.postMessage({ id, resultData: new Uint8ClampedArray(), error: err.message } as DitherMessageResult);
  }
};
