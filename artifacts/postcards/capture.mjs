// Reproducible car-free captures from the user's saved photo-mode views.
import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { POSTCARDS } from '../../src/game/postcards.ts';

const areas = ['northern-reach', 'mars', 'island-tracks'];
const views = Object.fromEntries(await Promise.all(areas.map(async area => [
  area,
  JSON.parse(await readFile(new URL(area === 'island-tracks'
    ? '../island-tracks/postcards/photo-views.json' : `./${area}-photo-views.json`, import.meta.url), 'utf8')),
])));
for (const area of areas) {
  const expected = POSTCARDS.filter(card => card.area === area).map(card => card.id);
  const missing = expected.filter(id => !views[area][id]);
  const unknown = Object.keys(views[area]).filter(id => !expected.includes(id));
  if (missing.length || unknown.length) throw new Error(`${area} photo views mismatch: missing ${missing.join(', ') || 'none'}; unknown ${unknown.join(', ') || 'none'}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 800, height: 520 }, deviceScaleFactor: 1 });
const baseUrl = process.env.POSTCARD_BASE_URL ?? 'http://127.0.0.1:5173';
const outputDir = process.env.POSTCARD_OUTPUT_DIR ?? 'public/postcards';
const selectedArea = process.env.POSTCARD_AREA;
const skippedIds = new Set((process.env.POSTCARD_SKIP_IDS ?? '').split(',').filter(Boolean));
const requestedIds = new Set(process.argv.slice(2));
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  for (const area of areas.filter(area => (!selectedArea || selectedArea === area)
    && (!requestedIds.size || POSTCARDS.some(card => card.area === area && requestedIds.has(card.id))))) {
    await mkdir(`${outputDir}/${area}`, { recursive: true });
    await page.goto(`${baseUrl}/?area=${area}`, { waitUntil: 'networkidle' });
    await page.locator('#start').click({ timeout: 30000 });
    await page.addStyleTag({ content: '#app > :not(#game) { visibility: hidden !important; }' });
    for (const card of POSTCARDS.filter(item => item.area === area)) {
      if (skippedIds.has(card.id) || (requestedIds.size && !requestedIds.has(card.id))) continue;
      await page.evaluate(async saved => {
        await window.__ROAMER__.setPhotoView(saved.camera);
      }, views[area][card.id]);
      await page.waitForTimeout(300);
      if (area === 'island-tracks') {
        const rendered = await page.evaluate(() => ({
          position: window.__ROAMER__.camera.position.toArray(),
          direction: window.__ROAMER__.camera.getWorldDirection(window.__ROAMER__.camera.position.clone()).toArray(),
          fov: window.__ROAMER__.camera.fov,
          visible: window.__ROAMER__.vehicle.model.visible,
        }));
        const { position, target, fov } = views[area][card.id].camera;
        const delta = [target.x - position.x, target.y - position.y, target.z - position.z];
        if (rendered.visible || rendered.fov !== fov || ['x', 'y', 'z'].some((axis, i) =>
          Math.abs(rendered.position[i] - position[axis]) > 0.000001
          || Math.abs(rendered.direction[i] - delta[i] / Math.hypot(...delta)) > 0.000001))
          throw new Error(`Postcard ${card.id} did not retain its car-free saved camera`);
      }
      await page.screenshot({ path: `${outputDir}/${area}/${card.id}.jpg`, type: 'jpeg', quality: 82 });
      console.log(card.id);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await browser.close();
}
