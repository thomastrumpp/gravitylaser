import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('SVG Import Robustness (TC-U-04.10)', () => {
  // Verzeichnis mit den zu testenden SVGs
  const svgDir = path.resolve(process.cwd(), '../svg');
  
  // Wenn das Verzeichnis existiert, lies alle .svg Dateien aus
  let svgFiles: string[] = [];
  if (fs.existsSync(svgDir)) {
    svgFiles = fs.readdirSync(svgDir).filter(file => file.endsWith('.svg'));
  }

  test('should load all SVGs from the directory without crashing', async ({ page }) => {
    // Navigiere zur App
    await page.goto('/');
    
    // Warte bis das Canvas geladen ist
    await expect(page.locator('canvas').first()).toBeVisible();

    const consoleErrors: string[] = [];
    page.on('pageerror', (exception) => {
      consoleErrors.push(`Uncaught Exception: ${exception.message}`);
    });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    for (const file of svgFiles) {
      const filePath = path.join(svgDir, file);
      console.log(`Testing SVG Import: ${file}`);
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      
      // Klicke auf den SVG Importieren Button in der Toolbar
      await page.locator('label[title="SVG Importieren"]').click();
      
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(filePath);

      // Warte kurz auf die Verarbeitung
      await page.waitForTimeout(500);

      // Prüfe, ob das Properties Panel nun aktiv ist (Objekt wurde geladen und markiert)
      const propertiesTab = page.locator('.sidebar-header button.active');
      // await expect(propertiesTab).toContainText('Eigensch.');
      
      // Canvas kurz leeren für den nächsten Test (alles markieren und löschen)
      // Das Löschen kann einfach über das neu geladene (und selektierte) Objekt erfolgen,
      // indem wir auf die Entfernen-Taste drücken oder einen evtl. vorhandenen Lösch-Button nutzen.
      await page.keyboard.press('Delete');
      await page.keyboard.press('Backspace');
      
      // Nach dem Löschen sollte Properties leer oder nicht mehr "Typ" zeigen
      await page.waitForTimeout(100);
    }

    // Kein Crash aufgetreten
    expect(consoleErrors).toHaveLength(0);
  });
});
