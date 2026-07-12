// src/lib/workers/paperWorker.ts

// Da wir im Worker laufen, können wir kein DOM nutzen
// Paper.js unterstützt einen "headless" Modus via paper.setup(new paper.Size(1,1))
import paper from 'paper';

type BooleanAction = 'union' | 'subtract' | 'intersect';

interface PaperWorkerMessage {
  id: string;
  action: BooleanAction;
  svgData: string[]; // SVG Strings der auszuwählenden Pfade
}

// Initialisiere Paper im Headless Modus
paper.setup(new paper.Size(1, 1));

self.onmessage = async (e: MessageEvent<PaperWorkerMessage>) => {
  const { id, action, svgData } = e.data;
  
  try {
    if (svgData.length < 2) {
      throw new Error("Mindestens zwei Pfade erforderlich");
    }

    // 1. SVGs in Paper-Pfade umwandeln
    const items = svgData.map(svgString => {
      const item = paper.project.importSVG(svgString) as paper.Item;
      // Normalerweise gibt importSVG eine Group zurück, wir brauchen das erste Kind (den Path)
      return item.children ? item.children[0] : item;
    });

    let resultItem = items[0] as paper.PathItem;

    // 2. Boolesche Operationen anwenden
    for (let i = 1; i < items.length; i++) {
      const currentItem = items[i] as paper.PathItem;
      let newResult: paper.PathItem;

      switch (action) {
        case 'union':
          newResult = resultItem.unite(currentItem);
          break;
        case 'subtract':
          newResult = resultItem.subtract(currentItem);
          break;
        case 'intersect':
          newResult = resultItem.intersect(currentItem);
          break;
        default:
          throw new Error("Unbekannte Aktion: " + action);
      }

      // Aufräumen der alten Items im paper.project
      resultItem.remove();
      currentItem.remove();
      
      resultItem = newResult;
    }

    // 3. Ergebnis zurück in SVG exportieren
    const finalSvg = resultItem.exportSVG({ asString: true }) as string;
    
    // Bereinige das Projekt
    paper.project.clear();

    self.postMessage({ id, success: true, result: finalSvg });

  } catch (error: any) {
    self.postMessage({ id, success: false, error: error.message });
  }
};
