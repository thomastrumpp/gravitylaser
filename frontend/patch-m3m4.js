import fs from 'fs';
const settingsFile = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/lib/stores/settingsStore.ts';
let settingsCode = fs.readFileSync(settingsFile, 'utf8');

if (!settingsCode.includes("laserMode:")) {
  settingsCode = settingsCode.replace("units: 'mm' | 'cm';", "units: 'mm' | 'cm';\n  laserMode: 'M3' | 'M4';");
  settingsCode = settingsCode.replace("units: 'mm'", "units: 'mm',\n  laserMode: 'M4'");
  fs.writeFileSync(settingsFile, settingsCode);
}

const gcodeFile = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/lib/gcode/GcodeGenerator.ts';
let gcodeCode = fs.readFileSync(gcodeFile, 'utf8');

gcodeCode = gcodeCode.replace(/M4 S\$\{sValue\}/g, "${settingsStore.get().laserMode || 'M4'} S${sValue}");
fs.writeFileSync(gcodeFile, gcodeCode);
