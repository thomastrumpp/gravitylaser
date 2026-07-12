import fs from 'fs';
const file = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/lib/panels/MachineSettingsModal.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("Laser Modus")) {
  code = code.replace(
    /<div className="setting-row">\s*<label>Ursprung<\/label>[\s\S]*?<\/select>\s*<\/div>/,
    `$&
          <div className="setting-row">
            <label>Laser Modus</label>
            <select
              className="input-field"
              value={settings.laserMode || 'M4'}
              onChange={(e) => settingsStore.updateSettings({ laserMode: e.target.value as 'M3' | 'M4' })}
            >
              <option value="M4">M4 (Dynamisch - Standard)</option>
              <option value="M3">M3 (Konstant)</option>
            </select>
          </div>`
  );
  fs.writeFileSync(file, code);
}
