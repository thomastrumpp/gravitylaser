import fs from 'fs';
const file = '/home/thomas/Antigravity_Projects/TTS10/frontend/tests/unit/GcodeGenerator.test.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/\.\.\/src/g, '../../src');
fs.writeFileSync(file, code);
