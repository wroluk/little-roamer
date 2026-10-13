import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
await page.goto('http://127.0.0.1:5174/?area=northern-reach', { waitUntil: 'networkidle' });
await page.locator('#start').click({ timeout: 30000 });
const views = [
  ['pine-track', -150, 492], ['timber-track', -315, 505], ['upland-track', 0, 560],
  ['north-hill', -170, 585], ['entrance', -170, 680], ['inside', -170, 655],
];
for (const [name, x, z] of views) {
  if (process.argv.length > 2 && !process.argv.slice(2).includes(name)) continue;
  const heading = Math.atan2(-(-170 - x), -(650 - z));
  await page.evaluate(async ({ x, z, heading }) => {
    await window.__ROAMER__.placeVehicle(x, z, heading);
    await window.__ROAMER__.waitForStreamingIdle();
  }, { x, z, heading });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `artifacts/northern/stone-circle-rework/${name}.png` });
  console.log(name, await page.evaluate(() => ({ camera: window.__ROAMER__.snapshot().camera, position: window.__ROAMER__.snapshot().position })));
}
await browser.close();
