import { chromium } from 'playwright';
import fs from 'fs';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`BROWSER LOG: ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.error(`BROWSER ERROR:`, err);
  });

  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  console.log("Checking canvasEl dimensions...");
  
  const evaluationCode = `
    (() => {
      const canvas = window.fabricCanvas;
      const fabric = window.fabric;
      
      if (!canvas || !fabric) {
        return { error: "Canvas or Fabric not found" };
      }
      
      canvas.clear();
      
      const scalePxPerMm = 2;
      
      const text = new fabric.IText('Text', {
        left: 100 * scalePxPerMm,
        top: (300 - 100) * scalePxPerMm,
        fontSize: 40,
        fill: 'black',
        angle: 0, // unrotated
        originX: 'center',
        originY: 'center'
      });
      canvas.add(text);
      canvas.renderAll();
      
      const canvasEl = text.toCanvasElement({
        multiplier: 4
      });
      
      return {
        textWidth: text.width,
        textHeight: text.height,
        canvasElWidth: canvasEl.width,
        canvasElHeight: canvasEl.height,
        expectedCanvasElWidth: text.width * 4,
        expectedCanvasElHeight: text.height * 4
      };
    })()
  `;
  
  const report = await page.evaluate(evaluationCode);

  console.log("Dimensions report:", JSON.stringify(report, null, 2));
  
  await browser.close();
}

run().catch(console.error);
