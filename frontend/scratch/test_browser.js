const { chromium } = require('@playwright/test');
const fs = require('fs');

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
  
  // Wait for loading
  await page.waitForTimeout(3000);

  // Click on the circle tool (or rect tool)
  // Let's find button with text/icon or we can find elements by selector
  // Let's take a screenshot first to see the loaded state
  console.log("Taking initial screenshot...");
  await page.screenshot({ path: '/home/thomas/Antigravity_Projects/TTS10/frontend/scratch/initial_page.png' });

  console.log("Clicking circle drawing tool button...");
  // Let's find tool buttons in the left toolbar
  // The sidebar-tools container
  const circleBtn = await page.$('.sidebar-tools button:nth-child(3)'); // let's try selector or get all buttons
  const buttons = await page.$$('.sidebar-tools button');
  console.log(`Found ${buttons.length} buttons in left sidebar.`);
  
  // Let's print out what text/title/HTML they have
  for (let i = 0; i < buttons.length; i++) {
    const title = await buttons[i].getAttribute('title');
    const html = await buttons[i].innerHTML();
    console.log(`Button #${i}: title="${title}"`);
  }

  // Let's click the button that corresponds to circle or rect
  // Let's click Circle
  let clicked = false;
  for (let i = 0; i < buttons.length; i++) {
    const title = await buttons[i].getAttribute('title');
    if (title && (title.toLowerCase().includes('kreis') || title.toLowerCase().includes('circle'))) {
      console.log(`Clicking button #${i} with title "${title}"`);
      await buttons[i].click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    console.log("Could not find circle button by title, clicking 3rd button...");
    await buttons[2].click();
  }

  // Simulate mouse down, mouse move, mouse up on the canvas to draw a shape
  console.log("Simulating canvas drawing...");
  const canvasElement = await page.$('canvas.upper-canvas');
  if (canvasElement) {
    const box = await canvasElement.boundingBox();
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      console.log(`Canvas bounding box:`, box);
      console.log(`Drawing from ${startX}, ${startY} to ${startX + 100}, ${startY + 100}`);
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.waitForTimeout(200);
      await page.mouse.move(startX + 100, startY + 100);
      await page.waitForTimeout(200);
      await page.mouse.up();
      console.log("Mouse drawing completed.");
    } else {
      console.log("Canvas has no bounding box!");
    }
  } else {
    console.log("Canvas element not found!");
  }

  await page.waitForTimeout(2000);
  console.log("Taking post-drawing screenshot...");
  await page.screenshot({ path: '/home/thomas/Antigravity_Projects/TTS10/frontend/scratch/after_drawing.png' });

  await browser.close();
  console.log("Browser closed.");
})();
