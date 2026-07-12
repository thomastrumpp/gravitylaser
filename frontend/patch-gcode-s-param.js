import fs from 'fs';
const file = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/lib/gcode/GcodeGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

// Rect / Line / Circle / Path
// We will replace `F${speed}` with `S${sValue} F${speed}` in all G1/G2/G3 moves to ensure S is present.
code = code.replace(/F\$\{speed\}/g, "S${sValue} F${speed}");
code = code.replace(/F\$\{obj\.customSpeed \?\? layer\.speed\}/g, "S${sValue} F${obj.customSpeed ?? layer.speed}");

fs.writeFileSync(file, code);
