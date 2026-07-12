import Offset from 'polygon-offset';

interface WorkerRequest {
  id: string;
  points: [number, number][];
  stepover: number;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, points, stepover } = e.data;
  const toolpaths: [number, number][][] = [];

  try {
    if (!points || points.length < 3) {
      self.postMessage({ id, success: true, toolpaths: [] });
      return;
    }

    // Ensure the initial polygon is closed
    const initialPoly = [...points];
    if (
      initialPoly[0][0] !== initialPoly[initialPoly.length - 1][0] ||
      initialPoly[0][1] !== initialPoly[initialPoly.length - 1][1]
    ) {
      initialPoly.push([...initialPoly[0]]);
    }

    toolpaths.push(initialPoly);

    const offsetInstance = new Offset();
    let currentPolygons = [initialPoly];
    let safetyCounter = 0;
    const maxIterations = 500; // Prevent infinite loops

    while (currentPolygons.length > 0 && safetyCounter < maxIterations) {
      safetyCounter++;
      const nextPolygons: [number, number][][] = [];

      for (const poly of currentPolygons) {
        try {
          const results = offsetInstance.data(poly).padding(stepover);
          if (results && results.length > 0) {
            for (const res of results) {
              if (res && res.length >= 3) {
                // Ensure closed loop
                const closed = [...res];
                if (
                  closed[0][0] !== closed[closed.length - 1][0] ||
                  closed[0][1] !== closed[closed.length - 1][1]
                ) {
                  closed.push([...closed[0]]);
                }
                toolpaths.push(closed);
                nextPolygons.push(closed);
              }
            }
          }
        } catch (err) {
          // Ignore errors on self-intersecting or degenerate collapsed geometries
        }
      }

      currentPolygons = nextPolygons;
    }

    self.postMessage({ id, success: true, toolpaths });
  } catch (error: any) {
    self.postMessage({ id, success: false, error: error.message });
  }
};
