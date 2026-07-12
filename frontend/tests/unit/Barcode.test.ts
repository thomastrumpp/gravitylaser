import { describe, it, expect } from 'vitest';
import { BarcodeService } from '../../src/lib/services/BarcodeService';
import { gcodeGen } from '../../src/lib/gcode/GcodeGenerator';
import { variableTextStore } from '../../src/lib/stores/variableTextStore';

describe('Barcode Engine (REQ-DYN-04)', () => {
  it('generates a valid SVG string for a QR-Code', () => {
    const svg = BarcodeService.generateSVG('qrcode', 'https://github.com/google/antigravity');
    
    // Should be a valid SVG element
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    // QR Codes should contain path elements representing the matrix modules
    expect(svg).toContain('path');
  });

  it('generates a valid SVG string for a Code128 barcode', () => {
    const svg = BarcodeService.generateSVG('code128', 'GRAVITY12345', { includetext: true });
    
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    // Code 128 uses path elements for the bars and vectorized text
    expect(svg).toContain('path');
  });

  it('throws error for invalid input or format', () => {
    expect(() => {
      BarcodeService.generateSVG('invalid_format', 'test');
    }).toThrow();

    expect(() => {
      BarcodeService.generateSVG('qrcode', '');
    }).toThrow();
  });

  describe('G-code Generator Integration', () => {
    it('resolves dynamic barcode templates and outputs vector path commands', () => {
      variableTextStore.reset();
      variableTextStore.updateSerialParams({ start: 123, step: 1, format: '0000' });

      // Create a mock barcode canvas object
      const barcodeObj = {
        id: 'barcode_1',
        type: 'barcode_placeholder',
        left: 50,
        top: 50,
        width: 100,
        height: 30,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        layerId: 'C00',
        barcode: {
          bcid: 'code128',
          template: 'SN-{serial:0000}',
          scale: 1,
          height: 10
        }
      };

      // Generate G-code
      const gcode = gcodeGen.generate([barcodeObj]);

      // G-code should contain path move (G0) and cut (G1) commands
      expect(gcode).toContain('G0 X');
      expect(gcode).toContain('G1 X');
      
      // Let's verify that the output has been generated
      expect(gcode.length).toBeGreaterThan(500);
    });
  });
});
