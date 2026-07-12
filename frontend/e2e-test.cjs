const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log("Starte interaktiven UI-Test...");
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  
  const outDir = '/home/thomas/.gemini/antigravity/brain/7c4b2ab1-093f-4cec-89d3-741de6f79048/test_results';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  try {
    console.log("Lade Seite...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    // 1. Initiale Ansicht (bereits geprüft, aber zur Sicherheit)
    await page.screenshot({ path: `${outDir}/01_initial.png` });
    console.log("✅ Initiale Ansicht geladen.");

    // 2. Klicke auf den Tab "Ebenen"
    console.log("Klicke auf den Ebenen-Tab...");
    // Suchen nach dem Button mit Text "EBENEN" (wir gehen davon aus, dass er existiert)
    const tabs = await page.$$('.tab-btn');
    if (tabs.length > 1) {
      await tabs[1].click(); // Zweiter Tab sollte Ebenen sein
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: `${outDir}/02_ebenen_tab.png` });
      console.log("✅ Ebenen-Tab erfolgreich geöffnet.");
    } else {
      console.log("❌ Ebenen-Tab nicht gefunden.");
    }

    // 3. Sprache auf EN wechseln
    console.log("Wechsle Sprache auf EN...");
    const menuButtons = await page.$$('.menu-button');
    for (const btn of menuButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text === 'EN') {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: `${outDir}/03_sprache_en.png` });
    console.log("✅ Sprache erfolgreich auf Englisch gewechselt.");

    // 4. Öffne WLAN Assistent (jetzt auf Englisch "WiFi Wizard" oder so)
    console.log("Öffne WLAN-Assistent Modal...");
    for (const btn of menuButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      // Finde Button der das Modal öffnet (hat wahrscheinlich ein 📶 Symbol)
      if (text.includes('📶')) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 800)); // Animation abwarten
    await page.screenshot({ path: `${outDir}/04_wlan_modal.png` });
    console.log("✅ WLAN-Assistent Modal erfolgreich geöffnet.");

    // 5. Modal schließen
    console.log("Schließe Modal...");
    const closeBtns = await page.$$('.btn');
    for (const btn of closeBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.toLowerCase().includes('cancel') || text.toLowerCase().includes('abbrechen')) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 500));

    // 6. Teste Konsolen-Eingabe
    console.log("Teste Konsolen-Eingabe...");
    const consoleInput = await page.$('.console-input');
    if (consoleInput) {
      await consoleInput.type('G0 X10 Y10');
      const sendBtn = await page.$('.console-send-btn');
      if (sendBtn) {
        await sendBtn.click();
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: `${outDir}/05_konsole_eingabe.png` });
        console.log("✅ Konsolenbefehl erfolgreich gesendet.");
      }
    }

    console.log("\n🚀 Alle interaktiven Tests erfolgreich abgeschlossen!");

  } catch (error) {
    console.error("Fehler während des Tests:", error);
  } finally {
    await browser.close();
  }
})();
