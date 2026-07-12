import fs from 'fs';
const file = '/home/thomas/Antigravity_Projects/TTS10/frontend/vitest.config.ts';
if (fs.existsSync(file)) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes("globals: true")) {
    code = code.replace("environment: 'jsdom',", "environment: 'jsdom',\n    globals: true,");
    fs.writeFileSync(file, code);
  }
}
