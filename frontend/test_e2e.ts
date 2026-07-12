import { chromium } from 'playwright';

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors: string[] = [];
  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  console.log("Navigating to app...");
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  console.log("Checking UI Layout...");
  // Check Right Sidebar
  const sidebar = page.locator('aside.right-sidebar');
  await sidebar.waitFor();
  
  console.log("Taking initial screenshot...");
  await page.screenshot({ path: 'test-artifacts/initial_load.png' });

  console.log("Testing Material Test Modal...");
  await page.getByText('Material Test').click();
  const materialModal = page.locator('.modal-content');
  await materialModal.waitFor();
  await page.screenshot({ path: 'test-artifacts/material_test_modal.png' });

  // Start Test
  await page.getByRole('button', { name: '🚀 Start Test' }).click();
  // Wait for rendering
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-artifacts/material_test_rendered.png' });

  console.log("Testing Focus Test Modal...");
  await page.getByText('Focus Test').click();
  await page.getByRole('button', { name: '🚀 Start Test' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-artifacts/focus_test_rendered.png' });

  console.log("Testing Interval Test Modal...");
  await page.getByText('Interval Test').click();
  await page.getByRole('button', { name: '🚀 Start Test' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-artifacts/interval_test_rendered.png' });

  console.log("Testing Boolean Operations...");
  await page.getByText('Union').hover();
  
  console.log("Testing Right Sidebar Collapse...");
  await page.locator('.tab-btn[title="Seitenleiste einklappen"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-artifacts/sidebar_collapsed.png' });

  console.log("Test execution finished.");
  if (errors.length > 0) {
    console.error("Errors found during tests:");
    errors.forEach(e => console.error(e));
  } else {
    console.log("No console/page errors found!");
  }

  await browser.close();
}

runTests().catch(console.error);
