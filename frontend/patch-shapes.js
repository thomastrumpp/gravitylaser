import fs from 'fs';
const file = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/lib/gcode/GcodeGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

// Rect
code = code.replace(
  "const xStart = obj.left;\n    const yStart = this.mapY(obj.top);\n    const xEnd = xStart + w;\n    const yEnd = yStart - h;",
  "const xStart = this.mapX(obj.left);\n    const yStart = this.mapY(obj.top);\n    const xEnd = this.mapX(obj.left + w);\n    const yEnd = this.mapY(obj.top + h);"
);

// Line
code = code.replace(
  "const xStart = obj.left;\n    const yStart = this.mapY(obj.top);\n    const xEnd = xStart + w;\n    const yEnd = yStart - h;",
  "const xStart = this.mapX(obj.left);\n    const yStart = this.mapY(obj.top);\n    const xEnd = this.mapX(obj.left + w);\n    const yEnd = this.mapY(obj.top + h);"
);

// Circle
code = code.replace(
  "const xCenter = obj.left + r;\n    const yCenter = this.mapY(obj.top + r);\n\n    const xStart = xCenter - r;\n    const yStart = yCenter;",
  "const xCenter = this.mapX(obj.left + r);\n    const yCenter = this.mapY(obj.top + r);\n\n    const xStart = this.mapX(obj.left);\n    const yStart = yCenter;"
);
code = code.replace("const xMid = xCenter + r;", "const xMid = this.mapX(obj.left + 2*r);");

// Paths
code = code.replace(
  "const targetX = obj.left + (cmd.x * obj.scaleX);\n        const targetY = this.mapY(obj.top + (cmd.y * obj.scaleY));",
  "const targetX = this.mapX(obj.left + (cmd.x * obj.scaleX));\n        const targetY = this.mapY(obj.top + (cmd.y * obj.scaleY));"
);
code = code.replace(
  "const targetX = obj.left + (cmd.x * obj.scaleX);\n        const targetY = this.mapY(obj.top + (cmd.y * obj.scaleY));",
  "const targetX = this.mapX(obj.left + (cmd.x * obj.scaleX));\n        const targetY = this.mapY(obj.top + (cmd.y * obj.scaleY));"
);
code = code.replace(
  "const x1 = obj.left + (cmd.x1 * obj.scaleX);\n        const y1 = this.mapY(obj.top + (cmd.y1 * obj.scaleY));\n        const x2 = obj.left + (cmd.x2 * obj.scaleX);\n        const y2 = this.mapY(obj.top + (cmd.y2 * obj.scaleY));\n        const x3 = obj.left + (cmd.x * obj.scaleX);\n        const y3 = this.mapY(obj.top + (cmd.y * obj.scaleY));",
  "const x1 = this.mapX(obj.left + (cmd.x1 * obj.scaleX));\n        const y1 = this.mapY(obj.top + (cmd.y1 * obj.scaleY));\n        const x2 = this.mapX(obj.left + (cmd.x2 * obj.scaleX));\n        const y2 = this.mapY(obj.top + (cmd.y2 * obj.scaleY));\n        const x3 = this.mapX(obj.left + (cmd.x * obj.scaleX));\n        const y3 = this.mapY(obj.top + (cmd.y * obj.scaleY));"
);
code = code.replace(
  "const x1 = obj.left + (cmd.x1 * obj.scaleX);\n        const y1 = this.mapY(obj.top + (cmd.y1 * obj.scaleY));\n        const x2 = obj.left + (cmd.x * obj.scaleX);\n        const y2 = this.mapY(obj.top + (cmd.y * obj.scaleY));",
  "const x1 = this.mapX(obj.left + (cmd.x1 * obj.scaleX));\n        const y1 = this.mapY(obj.top + (cmd.y1 * obj.scaleY));\n        const x2 = this.mapX(obj.left + (cmd.x * obj.scaleX));\n        const y2 = this.mapY(obj.top + (cmd.y * obj.scaleY));"
);

fs.writeFileSync(file, code);
