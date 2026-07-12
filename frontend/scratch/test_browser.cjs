const { chromium } = require('@playwright/test');

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  page.on('pageerror', exception => {
    console.error(`[BROWSER UNCAUGHT EXCEPTION]`, exception);
  });

  console.log("Navigating to http://localhost:5173/ ...");
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);

  const buttons = await page.$$('.sidebar-tools button');

  // --- 1. Select Circle tool and draw one circle ---
  console.log("Clicking Circle button...");
  for (let i = 0; i < buttons.length; i++) {
    const title = await buttons[i].getAttribute('title');
    if (title && (title.toLowerCase().includes('kreis') || title.toLowerCase().includes('circle'))) {
      await buttons[i].click();
      break;
    }
  }

  const canvasElement = await page.$('canvas.upper-canvas');
  const box = await canvasElement.boundingBox();
  
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  console.log(`Drawing first circle at ${startX}, ${startY}...`);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.move(startX + 80, startY + 80);
  await page.waitForTimeout(200);
  await page.mouse.up();

  await page.waitForTimeout(1000);

  // Get count of canvas objects from the page window
  let countBefore = await page.evaluate(() => {
    return window.getCanvasObjectsForGcode ? window.getCanvasObjectsForGcode().length : 0;
  });
  console.log(`Objects count before dragging: ${countBefore}`);

  // --- 2. Try dragging the existing circle (mouse down on its center) ---
  console.log("Attempting to drag the existing circle from its center...");
  // We click exactly at the center where we started drawing the circle
  await page.mouse.move(startX + 40, startY + 40);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.move(startX + 150, startY + 150); // Move it to a new location
  await page.waitForTimeout(200);
  await page.mouse.up();

  await page.waitForTimeout(1000);

  // Get count of canvas objects after dragging
  let countAfter = await page.evaluate(() => {
    return window.getCanvasObjectsForGcode ? window.getCanvasObjectsForGcode().length : 0;
  });
  console.log(`Objects count after dragging: ${countAfter}`);

  await page.screenshot({ path: '/home/thomas/Antigravity_Projects/TTS10/frontend/scratch/drag_test.png' });

  if (countAfter === countBefore) {
    console.log("SUCCESS: Dragging did NOT create a duplicate object!");
  } else {
    console.error(`FAILURE: Duplicate object created! Count went from ${countBefore} to ${countAfter}`);
  }

  await browser.close();
})();
