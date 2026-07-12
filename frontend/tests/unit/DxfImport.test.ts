import { describe, it, expect } from 'vitest';
import { DxfImportService } from '../../src/lib/services/DxfImportService';

describe('DxfImportService Tests', () => {
  it('correctly parses LINE and CIRCLE entities from DXF text and converts to SVG path commands', () => {
    const dxfText = `0
SECTION
2
ENTITIES
0
LINE
8
0
10
10
20
20
11
50
21
60
0
CIRCLE
8
0
10
100
20
150
40
25
0
ENDSEC
0
EOF`;

    const svgPath = DxfImportService.convertToSvgPath(dxfText);
    
    // Check if the LINE commands are present
    expect(svgPath).toContain('M 10 20 L 50 60');
    
    // Check if the CIRCLE commands are present (center 100, 150, radius 25)
    // Starts at cx - r = 75, cy = 150
    expect(svgPath).toContain('M 75 150');
    expect(svgPath).toContain('A 25 25 0 1 0 125 150');
    expect(svgPath).toContain('A 25 25 0 1 0 75 150 Z');
  });
});
