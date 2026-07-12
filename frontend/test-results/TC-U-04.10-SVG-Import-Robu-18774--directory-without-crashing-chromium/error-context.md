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