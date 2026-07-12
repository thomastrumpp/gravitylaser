import fs from 'fs';
const file = '/home/thomas/Antigravity_Projects/TTS10/frontend/tests/unit/GcodeGenerator.test.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace("expect(coords[1].x).toBe(110);\n    expect(coords[1].y).toBe(230);", "expect(coords[1].x).toBe(110);\n    expect(coords[1].y).toBe(280);\n    expect(coords[2].x).toBe(110);\n    expect(coords[2].y).toBe(230);");
code = code.replace("expect(coords[1].x).toBe(110);\n    expect(coords[1].y).toBe(70);", "expect(coords[1].x).toBe(110);\n    expect(coords[1].y).toBe(20);\n    expect(coords[2].x).toBe(110);\n    expect(coords[2].y).toBe(70);");
code = code.replace("expect(coords[1].x).toBe(190);\n    expect(coords[1].y).toBe(70);", "expect(coords[1].x).toBe(190);\n    expect(coords[1].y).toBe(20);\n    expect(coords[2].x).toBe(190);\n    expect(coords[2].y).toBe(70);");

fs.writeFileSync(file, code);
