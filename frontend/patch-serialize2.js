import fs from 'fs';
const file = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/lib/canvas/LaserCanvas.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/width: obj\.width,/, "width: Number((obj.width / scalePxPerMm).toFixed(3)),");
code = code.replace(/height: obj\.height,/, "height: Number((obj.height / scalePxPerMm).toFixed(3)),");
code = code.replace(/radius: obj\.radius,/, "radius: obj.radius ? Number((obj.radius / scalePxPerMm).toFixed(3)) : undefined,");
code = code.replace(/path: obj\.path,/, `path: obj.path ? obj.path.map((cmd: any) => {
          const newCmd = {...cmd};
          if (newCmd.x !== undefined) newCmd.x = newCmd.x / scalePxPerMm;
          if (newCmd.y !== undefined) newCmd.y = newCmd.y / scalePxPerMm;
          if (newCmd.x1 !== undefined) newCmd.x1 = newCmd.x1 / scalePxPerMm;
          if (newCmd.y1 !== undefined) newCmd.y1 = newCmd.y1 / scalePxPerMm;
          if (newCmd.x2 !== undefined) newCmd.x2 = newCmd.x2 / scalePxPerMm;
          if (newCmd.y2 !== undefined) newCmd.y2 = newCmd.y2 / scalePxPerMm;
          return newCmd;
        }) : undefined,`);

fs.writeFileSync(file, code);
