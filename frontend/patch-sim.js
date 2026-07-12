import fs from 'fs';
const file = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/lib/gcode/GcodeSimulator.ts';
let code = fs.readFileSync(file, 'utf8');

// Add import
if (!code.includes("settingsStore")) {
  code = code.replace("import { consoleStore } from '../stores/consoleStore';", "import { consoleStore } from '../stores/consoleStore';\nimport { settingsStore } from '../stores/settingsStore';");
}

code = code.replace("private bedHeight = 300;", `
  private getInverseY(yMach: number): number {
    const settings = settingsStore.get();
    if (settings.origin.includes('Bottom')) return settings.workingSizeY - yMach;
    if (settings.origin === 'Center') return (settings.workingSizeY / 2) - yMach;
    return yMach;
  }
  
  private getInverseX(xMach: number): number {
    const settings = settingsStore.get();
    if (settings.origin.includes('Right')) return settings.workingSizeX - xMach;
    if (settings.origin === 'Center') return xMach + (settings.workingSizeX / 2);
    return xMach;
  }
`);

code = code.replace("top: this.bedHeight * this.scalePxPerMm,", "top: this.getInverseY(0) * this.scalePxPerMm,\n      left: this.getInverseX(0) * this.scalePxPerMm,");

code = code.replace("const startPxY = (this.bedHeight - startY) * this.scalePxPerMm;", "const startPxY = this.getInverseY(startY) * this.scalePxPerMm;");
code = code.replace("const endPxY = (this.bedHeight - endY) * this.scalePxPerMm;", "const endPxY = this.getInverseY(endY) * this.scalePxPerMm;");

code = code.replace("const startPxX = startX * this.scalePxPerMm;", "const startPxX = this.getInverseX(startX) * this.scalePxPerMm;");
code = code.replace("const endPxX = endX * this.scalePxPerMm;", "const endPxX = this.getInverseX(endX) * this.scalePxPerMm;");

fs.writeFileSync(file, code);
