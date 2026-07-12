const fs = require('fs');
const file = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/lib/canvas/LaserCanvas.tsx';
let code = fs.readFileSync(file, 'utf8');

const mouseDownReplace = `
    if (tool === 'rect') {
      const rect = new fabric.Rect({ left: pointer.x, top: pointer.y, originX: 'left', originY: 'top', width: 0, height: 0, fill: layerMode === 'fill' ? layerColor : 'transparent', stroke: layerColor, strokeWidth: 2, strokeUniform: true });
      rect.set('data', { layerId: activeLayerId });
      activeObjectRef.current = rect;
      canvas.add(rect);
    } else if (tool === 'circle') {
      const circle = new fabric.Circle({ left: pointer.x, top: pointer.y, originX: 'left', originY: 'top', radius: 0, fill: layerMode === 'fill' ? layerColor : 'transparent', stroke: layerColor, strokeWidth: 2, strokeUniform: true });
      circle.set('data', { layerId: activeLayerId });
      activeObjectRef.current = circle;
      canvas.add(circle);
    } else if (tool === 'ellipse') {
      const ellipse = new fabric.Ellipse({ left: pointer.x, top: pointer.y, originX: 'left', originY: 'top', rx: 0, ry: 0, fill: layerMode === 'fill' ? layerColor : 'transparent', stroke: layerColor, strokeWidth: 2, strokeUniform: true });
      ellipse.set('data', { layerId: activeLayerId });
      activeObjectRef.current = ellipse;
      canvas.add(ellipse);
    } else if (tool === 'triangle') {
      const triangle = new fabric.Triangle({ left: pointer.x, top: pointer.y, originX: 'left', originY: 'top', width: 0, height: 0, fill: layerMode === 'fill' ? layerColor : 'transparent', stroke: layerColor, strokeWidth: 2, strokeUniform: true });
      triangle.set('data', { layerId: activeLayerId });
      activeObjectRef.current = triangle;
      canvas.add(triangle);
    } else if (['star', 'heart', 'arrow', 'hexagon', 'polygon'].includes(tool)) {
      let pathData = '';
      if (tool === 'star') pathData = 'M 50 5 L 61 35 L 95 35 L 68 55 L 78 85 L 50 65 L 22 85 L 32 55 L 5 35 L 39 35 Z';
      else if (tool === 'heart') pathData = 'M 50 90 C 50 90 5 60 5 30 C 5 10 25 10 50 30 C 75 10 95 10 95 30 C 95 60 50 90 50 90 Z';
      else if (tool === 'arrow') pathData = 'M 0 40 L 60 40 L 60 20 L 100 50 L 60 80 L 60 60 L 0 60 Z';
      else if (tool === 'hexagon') pathData = 'M 25 0 L 75 0 L 100 50 L 75 100 L 25 100 L 0 50 Z';
      else if (tool === 'polygon') pathData = 'M 50 0 L 100 38 L 81 100 L 19 100 L 0 38 Z';

      const pathObj = new fabric.Path(pathData, { left: pointer.x, top: pointer.y, originX: 'left', originY: 'top', scaleX: 0, scaleY: 0, fill: layerMode === 'fill' ? layerColor : 'transparent', stroke: layerColor, strokeWidth: 2, strokeUniform: true });
      pathObj.set('data', { layerId: activeLayerId });
      activeObjectRef.current = pathObj;
      canvas.add(pathObj);
    } else if (tool === 'line') {
`;

code = code.replace(/if \(tool === 'rect'\) \{[\s\S]*?\} else if \(tool === 'line'\) \{/, mouseDownReplace);

const mouseMoveReplace = `
    if (tool === 'rect') {
      const rect = activeObjectRef.current as fabric.Rect;
      rect.set({ originX: dx > 0 ? 'left' : 'right', originY: dy > 0 ? 'top' : 'bottom', width: Math.abs(dx), height: Math.abs(dy) });
    } else if (tool === 'circle') {
      const circle = activeObjectRef.current as fabric.Circle;
      const radius = Math.max(Math.abs(dx), Math.abs(dy)) / 2;
      circle.set({ originX: dx > 0 ? 'left' : 'right', originY: dy > 0 ? 'top' : 'bottom', radius });
    } else if (tool === 'ellipse') {
      const ellipse = activeObjectRef.current as fabric.Ellipse;
      ellipse.set({ originX: dx > 0 ? 'left' : 'right', originY: dy > 0 ? 'top' : 'bottom', rx: Math.abs(dx) / 2, ry: Math.abs(dy) / 2 });
    } else if (tool === 'triangle') {
      const triangle = activeObjectRef.current as fabric.Triangle;
      triangle.set({ originX: dx > 0 ? 'left' : 'right', originY: dy > 0 ? 'top' : 'bottom', width: Math.abs(dx), height: Math.abs(dy) });
    } else if (['star', 'heart', 'arrow', 'hexagon', 'polygon'].includes(tool)) {
      const pathObj = activeObjectRef.current as fabric.Path;
      pathObj.set({ originX: dx > 0 ? 'left' : 'right', originY: dy > 0 ? 'top' : 'bottom', scaleX: Math.abs(dx) / 100, scaleY: Math.abs(dy) / 100 });
    } else if (tool === 'line') {
`;

code = code.replace(/if \(tool === 'rect'\) \{[\s\S]*?\} else if \(tool === 'line'\) \{/, mouseMoveReplace);

fs.writeFileSync(file, code);
