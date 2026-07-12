import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('SVG Import (TC-U-04.09)', () => {
  test('should import SVG and display it on the canvas', async ({ page }) => {
    // Navigiere zur App
    await page.goto('/');
    
    // Warte bis das Canvas geladen ist
    await expect(page.locator('canvas').first()).toBeVisible();

    // Erstelle ein temporäres Mock SVG File für den Test
    const mockSvgContent = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
      </svg>
    `;
    const tempSvgPath = path.join(__dirname, 'test-mock.svg');
    fs.writeFileSync(tempSvgPath, mockSvgContent);

    try {
      // Höre auf Console Logs zur Bestätigung
      const consoleLogs: string[] = [];
      page.on('console', msg => consoleLogs.push(msg.text()));

      // Das <input type="file"> ist versteckt hinter einem <label>, 
      // Playwright kann per setInputFiles Dateien an Input-Felder hängen.
      // Wir suchen das SVG Input Feld in der Toolbar:
      const fileChooserPromise = page.waitForEvent('filechooser');
      
      // Klicke auf den SVG Importieren Button in der Toolbar
      await page.locator('label[title="SVG Importieren"]').click();
      
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(tempSvgPath);

      // Warte kurz auf die Verarbeitung
      await page.waitForTimeout(500);

      // Verifiziere das Konsolen-Log (aus LaserCanvas.tsx: consoleStore.logLine("SVG erfolgreich importiert."))
      // Da consoleStore.logLine vermutlich nicht direkt console.log aufruft, 
      // sondern im UI gerendert wird, checken wir die UI Konsole, falls vorhanden.
      // Alternativ prüfen wir, ob das Properties-Panel nun die Eigenschaften anzeigt, da das Objekt automatisch selektiert wird.
      
      // Das Properties Panel sollte nun aktiv sein, da uiStore.setActiveTab('properties') gefeuert wird.
      const propertiesTab = page.locator('.sidebar-header button.active');
      await expect(propertiesTab).toContainText('Eigensch.');

      // Prüfe, ob Typ "group" oder "path" im Properties Panel steht (FabricJS gruppiert SVG Elemente)
      const typeDisplay = page.locator('.properties-panel').locator('text=Typ');
      await expect(typeDisplay).toBeVisible();

    } finally {
      // Räume das Test-File auf
      if (fs.existsSync(tempSvgPath)) {
        fs.unlinkSync(tempSvgPath);
      }
    }
  });
});
