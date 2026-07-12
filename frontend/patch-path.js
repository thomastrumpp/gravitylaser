import fs from 'fs';
const file = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/lib/canvas/LaserCanvas.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/path: obj\.path \? obj\.path\.map[^]*?\) : undefined,/, `path: obj.path ? obj.path.map((cmd: any) => {
          if (Array.isArray(cmd)) {
            const type = cmd[0];
            if (type === 'M' || type === 'L') {
               return { type, x: Number((cmd[1] / scalePxPerMm).toFixed(3)), y: Number((cmd[2] / scalePxPerMm).toFixed(3)) };
            } else if (type === 'Q') {
               return { type, x1: Number((cmd[1] / scalePxPerMm).toFixed(3)), y1: Number((cmd[2] / scalePxPerMm).toFixed(3)), x: Number((cmd[3] / scalePxPerMm).toFixed(3)), y: Number((cmd[4] / scalePxPerMm).toFixed(3)) };
            } else if (type === 'C') {
               return { type, x1: Number((cmd[1] / scalePxPerMm).toFixed(3)), y1: Number((cmd[2] / scalePxPerMm).toFixed(3)), x2: Number((cmd[3] / scalePxPerMm).toFixed(3)), y2: Number((cmd[4] / scalePxPerMm).toFixed(3)), x: Number((cmd[5] / scalePxPerMm).toFixed(3)), y: Number((cmd[6] / scalePxPerMm).toFixed(3)) };
            } else if (type === 'Z' || type === 'z') {
               return { type: 'Z' };
            }
          }
          // Fallback if already object
          const newCmd = {...cmd};
          if (newCmd.x !== undefined) newCmd.x = Number((newCmd.x / scalePxPerMm).toFixed(3));
          if (newCmd.y !== undefined) newCmd.y = Number((newCmd.y / scalePxPerMm).toFixed(3));
          if (newCmd.x1 !== undefined) newCmd.x1 = Number((newCmd.x1 / scalePxPerMm).toFixed(3));
          if (newCmd.y1 !== undefined) newCmd.y1 = Number((newCmd.y1 / scalePxPerMm).toFixed(3));
          if (newCmd.x2 !== undefined) newCmd.x2 = Number((newCmd.x2 / scalePxPerMm).toFixed(3));
          if (newCmd.y2 !== undefined) newCmd.y2 = Number((newCmd.y2 / scalePxPerMm).toFixed(3));
          return newCmd;
        }) : undefined,`);

fs.writeFileSync(file, code);
