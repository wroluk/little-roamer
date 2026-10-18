// Render the editable concept map without raster-generation dependencies.
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1040 }, deviceScaleFactor: 1 });
  await page.setContent(await readFile(new URL('./concept-map.svg', import.meta.url), 'utf8'));
  await page.addStyleTag({ content: 'body{margin:0}svg{display:block;width:1280px;height:1040px}' });
  await page.screenshot({ path: new URL('./concept-map.png', import.meta.url).pathname });
} finally { await browser.close(); }
