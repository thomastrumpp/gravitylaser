const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // Create artifact screenshot
  await page.screenshot({ path: '/home/thomas/.gemini/antigravity/brain/7c4b2ab1-093f-4cec-89d3-741de6f79048/app-screenshot.png' });
  
  await browser.close();
})();
