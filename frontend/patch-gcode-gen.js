import fs from 'fs';
const file = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/lib/gcode/GcodeGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

// Add import
if (!code.includes("settingsStore")) {
  code = code.replace("import { type LayerSettings, layersStore } from '../stores/layersStore';", "import { type LayerSettings, layersStore } from '../stores/layersStore';\nimport { settingsStore } from '../stores/settingsStore';");
}

// Remove bedHeight
code = code.replace("private bedHeight = 300; // Bettgröße Y des TTS-10 PRO in mm", `
  private mapX(xCanv: number): number {
    const settings = settingsStore.get();
    if (settings.origin.includes('Right')) return settings.workingSizeX - xCanv;
    if (settings.origin === 'Center') return xCanv - (settings.workingSizeX / 2);
    return xCanv;
  }

  private mapY(yCanv: number): number {
    const settings = settingsStore.get();
    if (settings.origin.includes('Bottom')) return settings.workingSizeY - yCanv;
    if (settings.origin === 'Center') return (settings.workingSizeY / 2) - yCanv;
    return yCanv;
  }
`);

// Replace this.bedHeight - Y with this.mapY(Y)
code = code.replace(/this\.bedHeight - \((obj\.top[^)]+)\)/g, 'this.mapY($1)');
code = code.replace(/this\.bedHeight - obj\.top/g, 'this.mapY(obj.top)');

// Fix circle center bug
code = code.replace("const xCenter = obj.left;", "const xCenter = obj.left + r;");
code = code.replace("const yCenter = this.mapY(obj.top);", "const yCenter = this.mapY(obj.top + r);");

fs.writeFileSync(file, code);
