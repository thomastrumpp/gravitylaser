# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: TC-U-04.10.spec.ts >> SVG Import Robustness (TC-U-04.10) >> should load all SVGs from the directory without crashing
- Location: tests/e2e/TC-U-04.10.spec.ts:15:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForEvent: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for event "filechooser"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: ☄
        - text: GravityLaser
      - generic [ref=e8]:
        - button "File" [ref=e10] [cursor=pointer]
        - button "Settings" [ref=e12] [cursor=pointer]
    - generic [ref=e13]:
      - button "☀️" [ref=e14] [cursor=pointer]
      - button "🇩🇪 DE" [ref=e17] [cursor=pointer]:
        - generic [ref=e18]: 🇩🇪
        - generic [ref=e19]: DE
      - button "🚨 E-Stop" [ref=e20] [cursor=pointer]
  - main [ref=e21]:
    - generic [ref=e23]:
      - generic [ref=e25]:
        - button "Select Tool (S)" [ref=e26] [cursor=pointer]:
          - img [ref=e27]
        - button "Edit Nodes (N)" [ref=e30] [cursor=pointer]:
          - img [ref=e31]
        - 'button "Draw Shape: Rectangle" [ref=e35] [cursor=pointer]':
          - img [ref=e36]
        - button "Insert Text (T)" [ref=e38] [cursor=pointer]:
          - img [ref=e39]
        - button "Insert Barcode / QR Code" [ref=e41] [cursor=pointer]:
          - img [ref=e42]
        - button "Smart-Nesting (Materialplatzierung) starten" [ref=e43] [cursor=pointer]:
          - img [ref=e44]
        - button "▼" [ref=e50] [cursor=pointer]:
          - img [ref=e51]
          - generic [ref=e53]: ▼
        - button "▼" [ref=e56] [cursor=pointer]:
          - img [ref=e57]
          - generic [ref=e60]: ▼
        - button "▼" [ref=e63] [cursor=pointer]:
          - img [ref=e64]
          - generic [ref=e65]: ▼
      - generic [ref=e66]:
        - generic [ref=e71]:
          - button "+" [ref=e72] [cursor=pointer]:
            - generic [ref=e73]: +
          - button "-" [ref=e74] [cursor=pointer]:
            - generic [ref=e75]: "-"
          - button "⛶" [ref=e76] [cursor=pointer]:
            - generic [ref=e77]: ⛶
          - button "🗑️" [ref=e78] [cursor=pointer]:
            - generic [ref=e79]: 🗑️
          - button "📷" [ref=e81] [cursor=pointer]:
            - generic [ref=e82]: 📷
        - generic [ref=e83]:
          - generic [ref=e84]:
            - button "Rückgängig (Ctrl+Z)" [disabled] [ref=e85]:
              - img [ref=e86]
            - button "Wiederholen (Ctrl+Y)" [disabled] [ref=e89]:
              - img [ref=e90]
            - button "Zum Anfang springen" [disabled] [ref=e93]:
              - img [ref=e94]
          - generic [ref=e98]: No history available. Draw a shape to start the timeline.
        - generic [ref=e101]:
          - generic [ref=e102]:
            - button "G-Code Term" [ref=e103] [cursor=pointer]
            - button "System Logs" [ref=e104] [cursor=pointer]
          - button "▲" [ref=e106] [cursor=pointer]
      - complementary [ref=e107]:
        - generic [ref=e108]:
          - generic [ref=e109]:
            - generic [ref=e110]:
              - button "▶" [ref=e111] [cursor=pointer]
              - button "🎮" [ref=e113] [cursor=pointer]
              - button "🎨" [ref=e114] [cursor=pointer]
              - button "📏" [ref=e115] [cursor=pointer]
              - button "⌨️" [ref=e116] [cursor=pointer]
            - generic [ref=e117]:
              - generic [ref=e118]: Control
              - generic "Disconnected" [ref=e119]
          - generic [ref=e122]:
            - generic [ref=e124]:
              - button "↖" [disabled] [ref=e125]
              - button "▲" [disabled] [ref=e126]
              - button "↗" [disabled] [ref=e127]
              - button "◀" [disabled] [ref=e128]
              - button "⌂" [disabled] [ref=e129]
              - button "▶" [disabled] [ref=e130]
              - button "↙" [disabled] [ref=e131]
              - button "▼" [disabled] [ref=e132]
              - button "↘" [disabled] [ref=e133]
            - generic [ref=e134]:
              - generic [ref=e135]:
                - generic [ref=e136]: Step (mm)
                - combobox [ref=e137]:
                  - option "0.1 mm"
                  - option "1.0 mm"
                  - option "10 mm" [selected]
                  - option "50 mm"
                  - option "100 mm"
              - generic [ref=e138]:
                - generic [ref=e139]: Speed (mm/min)
                - combobox [ref=e140]:
                  - option "500 mm/min"
                  - option "1000 mm/min"
                  - option "3000 mm/min" [selected]
                  - option "6000 mm/min"
                  - option "10000 mm/min"
            - generic [ref=e141]:
              - button "🏠 Home" [disabled] [ref=e142]
              - button "🔓 Unlock" [disabled] [ref=e143]
              - button "🎯 Set Zero" [disabled] [ref=e144]
              - button "🔥 Laser Dot On" [disabled] [ref=e145]
          - generic [ref=e146]:
            - generic [ref=e147]:
              - generic [ref=e148]: Job Control
              - generic [ref=e149]: Idle
            - generic [ref=e150]:
              - generic [ref=e151]:
                - button "🔥 Start Laser" [disabled] [ref=e152]
                - button "📐 Frame" [disabled] [ref=e153]
              - generic [ref=e154]:
                - button "💾 G-Code" [ref=e155] [cursor=pointer]
                - button "👁️ Vorschau" [ref=e156] [cursor=pointer]
                - button "📊 Serien" [ref=e157] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import fs from 'fs';
  3  | import path from 'path';
  4  | 
  5  | test.describe('SVG Import Robustness (TC-U-04.10)', () => {
  6  |   // Verzeichnis mit den zu testenden SVGs
  7  |   const svgDir = path.resolve(process.cwd(), '../svg');
  8  |   
  9  |   // Wenn das Verzeichnis existiert, lies alle .svg Dateien aus
  10 |   let svgFiles: string[] = [];
  11 |   if (fs.existsSync(svgDir)) {
  12 |     svgFiles = fs.readdirSync(svgDir).filter(file => file.endsWith('.svg'));
  13 |   }
  14 | 
  15 |   test('should load all SVGs from the directory without crashing', async ({ page }) => {
  16 |     // Navigiere zur App
  17 |     await page.goto('/');
  18 |     
  19 |     // Warte bis das Canvas geladen ist
  20 |     await expect(page.locator('canvas').first()).toBeVisible();
  21 | 
  22 |     const consoleErrors: string[] = [];
  23 |     page.on('pageerror', (exception) => {
  24 |       consoleErrors.push(`Uncaught Exception: ${exception.message}`);
  25 |     });
  26 |     page.on('console', msg => {
  27 |       if (msg.type() === 'error') {
  28 |         consoleErrors.push(msg.text());
  29 |       }
  30 |     });
  31 | 
  32 |     for (const file of svgFiles) {
  33 |       const filePath = path.join(svgDir, file);
  34 |       console.log(`Testing SVG Import: ${file}`);
  35 |       
> 36 |       const fileChooserPromise = page.waitForEvent('filechooser');
     |                                       ^ Error: page.waitForEvent: Test timeout of 30000ms exceeded.
  37 |       
  38 |       // Klicke auf den SVG Importieren Button in der Toolbar
  39 |       await page.locator('label[title="SVG Importieren"]').click();
  40 |       
  41 |       const fileChooser = await fileChooserPromise;
  42 |       await fileChooser.setFiles(filePath);
  43 | 
  44 |       // Warte kurz auf die Verarbeitung
  45 |       await page.waitForTimeout(500);
  46 | 
  47 |       // Prüfe, ob das Properties Panel nun aktiv ist (Objekt wurde geladen und markiert)
  48 |       const propertiesTab = page.locator('.sidebar-header button.active');
  49 |       // await expect(propertiesTab).toContainText('Eigensch.');
  50 |       
  51 |       // Canvas kurz leeren für den nächsten Test (alles markieren und löschen)
  52 |       // Das Löschen kann einfach über das neu geladene (und selektierte) Objekt erfolgen,
  53 |       // indem wir auf die Entfernen-Taste drücken oder einen evtl. vorhandenen Lösch-Button nutzen.
  54 |       await page.keyboard.press('Delete');
  55 |       await page.keyboard.press('Backspace');
  56 |       
  57 |       // Nach dem Löschen sollte Properties leer oder nicht mehr "Typ" zeigen
  58 |       await page.waitForTimeout(100);
  59 |     }
  60 | 
  61 |     // Kein Crash aufgetreten
  62 |     expect(consoleErrors).toHaveLength(0);
  63 |   });
  64 | });
  65 | 
```