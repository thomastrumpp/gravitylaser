// @ts-expect-error - bwip-js does not have declarations in this environment
import bwipjs from 'bwip-js';

export class BarcodeService {
  
  /**
   * Generiert einen Barcode/QR-Code als SVG-String.
   * Unterstützt 100+ Formate (z.B. 'qrcode', 'datamatrix', 'code128', 'ean13', 'code39').
   * 
   * @param bcid Barcode-Typ (Format-ID)
   * @param text Zu kodierender Inhalt
   * @param options Zusatzoptionen wie Skalierung und Höhe
   * @returns SVG-String
   */
  public static generateSVG(
    bcid: string,
    text: string,
    options: {
      scale?: number;
      height?: number;
      includetext?: boolean;
    } = {}
  ): string {
    if (!text) {
      throw new Error("Barcode-Text darf nicht leer sein");
    }

    try {
      // bwipjs.toSVG liefert synchron einen SVG-String
      const svg = bwipjs.toSVG({
        bcid: bcid,
        text: text,
        scale: options.scale ?? 3,
        height: options.height ?? 10,
        includetext: options.includetext !== undefined ? options.includetext : true,
        textxalign: 'center'
      });
      
      return svg;
    } catch (err: any) {
      throw new Error(`Fehler bei der Barcode-Generierung (${bcid}): ${err.message}`);
    }
  }
}
