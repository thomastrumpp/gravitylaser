import fs from 'fs';
const file = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/lib/canvas/LaserCanvas.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/left: Number\(\(obj\.left \/ scalePxPerMm\)\.toFixed\(3\)\),/, `left: (() => {
          let l = obj.left;
          if (obj.originX === 'center') l -= (obj.width * obj.scaleX) / 2;
          else if (obj.originX === 'right') l -= (obj.width * obj.scaleX);
          return Number((l / scalePxPerMm).toFixed(3));
        })(),`);

code = code.replace(/top: Number\(\(obj\.top \/ scalePxPerMm\)\.toFixed\(3\)\),/, `top: (() => {
          let t = obj.top;
          if (obj.originY === 'center') t -= (obj.height * obj.scaleY) / 2;
          else if (obj.originY === 'bottom') t -= (obj.height * obj.scaleY);
          return Number((t / scalePxPerMm).toFixed(3));
        })(),`);

fs.writeFileSync(file, code);
