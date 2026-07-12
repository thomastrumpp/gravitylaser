import opentype from 'opentype.js';
import fs from 'fs';

const buffer = fs.readFileSync('./public/Roboto-Regular.ttf').buffer;
try {
  const font = opentype.parse(buffer);
  console.log("Success:", !!font, "Commands:", font.getPath("Test", 0, 0, 10).commands.length);
} catch (e) {
  console.error("Parse Error:", e);
}
