import DxfParser from 'dxf-parser';

export class DxfImportService {
  /**
   * Parses DXF text content and converts it into a single SVG path string.
   */
  public static convertToSvgPath(dxfText: string): string {
    const parser = new DxfParser();
    let dxf: any;
    try {
      dxf = parser.parseSync(dxfText);
    } catch (err: any) {
      throw new Error(`DXF Parsing fehlgeschlagen: ${err.message}`);
    }

    if (!dxf || !dxf.entities) {
      return '';
    }

    const pathCommands: string[] = [];

    for (const entity of dxf.entities) {
      try {
        switch (entity.type.toUpperCase()) {
          case 'LINE': {
            const start = entity.start || (entity.vertices && entity.vertices[0]);
            const end = entity.end || (entity.vertices && entity.vertices[1]);
            if (start && end) {
              pathCommands.push(`M ${start.x} ${start.y} L ${end.x} ${end.y}`);
            }
            break;
          }

          case 'LWPOLYLINE':
          case 'POLYLINE': {
            const vertices = entity.vertices;
            if (vertices && vertices.length > 0) {
              const start = vertices[0];
              pathCommands.push(`M ${start.x} ${start.y}`);
              for (let i = 1; i < vertices.length; i++) {
                pathCommands.push(`L ${vertices[i].x} ${vertices[i].y}`);
              }
              // If closed
              if (entity.shape || entity.closed) {
                pathCommands.push('Z');
              }
            }
            break;
          }

          case 'CIRCLE': {
            const center = entity.center;
            const radius = entity.radius;
            if (center && typeof radius === 'number') {
              const cx = center.x;
              const cy = center.y;
              pathCommands.push(
                `M ${cx - radius} ${cy} `,
                `A ${radius} ${radius} 0 1 0 ${cx + radius} ${cy} `,
                `A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy} Z`
              );
            }
            break;
          }

          case 'ARC': {
            const center = entity.center;
            const radius = entity.radius;
            let startAngle = entity.startAngle; // in radians or degrees? dxf-parser returns degrees
            let endAngle = entity.endAngle;

            if (center && typeof radius === 'number' && typeof startAngle === 'number' && typeof endAngle === 'number') {
              // Convert angles to radians
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;

              const sx = center.x + radius * Math.cos(startRad);
              const sy = center.y + radius * Math.sin(startRad);
              const ex = center.x + radius * Math.cos(endRad);
              const ey = center.y + radius * Math.sin(endRad);

              // Calculate sweep angle in degrees
              let diff = endAngle - startAngle;
              if (diff < 0) diff += 360;

              const largeArcFlag = diff > 180 ? 1 : 0;
              const sweepFlag = 1; // DXF arcs are always counter-clockwise

              pathCommands.push(`M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${ex} ${ey}`);
            }
            break;
          }

          case 'SPLINE': {
            const controlPoints = entity.controlPoints;
            if (controlPoints && controlPoints.length > 0) {
              const start = controlPoints[0];
              pathCommands.push(`M ${start.x} ${start.y}`);
              for (let i = 1; i < controlPoints.length; i++) {
                pathCommands.push(`L ${controlPoints[i].x} ${controlPoints[i].y}`);
              }
              if (entity.closed) {
                pathCommands.push('Z');
              }
            }
            break;
          }

          case 'ELLIPSE': {
            const center = entity.center;
            const major = entity.majorAxisEndPoint;
            const ratio = entity.axisRatio;

            if (center && major && typeof ratio === 'number') {
              const rx = Math.sqrt(major.x * major.x + major.y * major.y);
              const ry = rx * ratio;
              const cx = center.x;
              const cy = center.y;
              // Simple ellipse approximation in SVG path
              pathCommands.push(
                `M ${cx - rx} ${cy} `,
                `A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} `,
                `A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`
              );
            }
            break;
          }

          default:
            // Skip other entity types silently
            break;
        }
      } catch (err) {
        // Skip corrupt entities
      }
    }

    return pathCommands.join(' ');
  }
}
