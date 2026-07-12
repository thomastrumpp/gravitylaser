// src/lib/services/BooleanOperationService.ts
// @ts-expect-error paper/dist/paper-full has no types
import paper from 'paper/dist/paper-full';

export class BooleanOperationService {
  private static initialized = false;

  public static init() {
    if (this.initialized) return;
    
    // Initialisiere Paper.js auf einem unsichtbaren Canvas (Main Thread, hat Zugriff auf DOMParser)
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1000;
    paper.setup(canvas);
    this.initialized = true;
  }

  public static async execute(action: 'union' | 'subtract' | 'intersect', svgPaths: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.init();

        if (!svgPaths || svgPaths.length < 2) {
          throw new Error('At least two paths are required for boolean operations.');
        }

        // Project leeren
        paper.project.clear();

        const paperPaths = svgPaths.map((svgStr: string) => {
            const tempItem = paper.project.importSVG(svgStr) as paper.Item;
            let pathResult: paper.PathItem | null = null;
            
            // Rekursiv alle Items durchsuchen und Shape in Path umwandeln
            tempItem.getItems({}).forEach((child: any) => {
                if (child.className === 'Shape') {
                    pathResult = (child as any).toPath() as paper.PathItem;
                } else if (child instanceof paper.PathItem) {
                    pathResult = child;
                }
            });

            if (pathResult) {
                // WICHTIG: Beim SVG Import liegen Transformationen (Position/Rotation/Scale) oft
                // auf dem übergeordneten Group-Element (<g>). Wenn wir nur den Path extrahieren,
                // gehen diese verloren und das Objekt springt nach 0,0!
                
                // 1. Sichere die absolute Matrix im globalen Raum
                const absoluteMatrix = pathResult.globalMatrix;
                
                // 2. Löse den Pfad aus seiner Gruppe (er verliert dadurch die Gruppen-Matrix)
                paper.project.activeLayer.addChild(pathResult);
                tempItem.remove(); // Alten Baum löschen
                
                // 3. Wende die gesicherte Matrix als lokale Matrix an
                pathResult.matrix = absoluteMatrix;
                
                // 4. Backe die Matrix fest in die Pfad-Punkte (Segments) ein
                pathResult.applyMatrix = true;
            } else {
                // Fallback, falls weder Shape noch Path gefunden wurde
                pathResult = tempItem as unknown as paper.PathItem;
            }
            return pathResult;
        });

        let resultPath: paper.PathItem = paperPaths[0];

        for (let i = 1; i < paperPaths.length; i++) {
            const currentPath = paperPaths[i];
            let newResult: paper.PathItem;

            switch (action) {
                case 'union':
                    newResult = resultPath.unite(currentPath);
                    break;
                case 'subtract':
                    newResult = resultPath.subtract(currentPath);
                    break;
                case 'intersect':
                    newResult = resultPath.intersect(currentPath);
                    break;
                default:
                    throw new Error(`Unknown boolean action: ${action}`);
            }

            resultPath.remove();
            currentPath.remove();
            resultPath = newResult;
        }

        const svgExport = resultPath.exportSVG({ asString: false }) as SVGElement;
        let pathData = '';
        
        if (svgExport.tagName === 'path') {
            pathData = svgExport.getAttribute('d') || '';
        } else if (svgExport.tagName === 'g') {
            const children = Array.from(svgExport.children);
            for (const child of children) {
                if (child.tagName === 'path') {
                    pathData += (child.getAttribute('d') || '') + ' ';
                }
            }
        }

        resultPath.remove();
        resolve(pathData.trim());
      } catch (err: any) {
        console.error("Boolean error:", err);
        reject(err);
      }
    });
  }
}
