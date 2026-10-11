import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { expect, test } from '@playwright/test';

for (const smallScreen of [false, true]) test(`a waiting release updates only after confirmation (${smallScreen ? 'phone' : 'tablet'})`, async ({ page }) => {
  test.setTimeout(90_000);
  let release = 1;
  const root = resolve('dist');
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url!, 'http://localhost').pathname;
      const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(root + sep)) {
        response.writeHead(403).end();
        return;
      }
      let content = await readFile(file);
      if (pathname === '/' || pathname === '/index.html') {
        content = Buffer.from(content.toString().replace('<head>', `<head><meta name="test-release" content="${release}">`));
      }
      if (pathname === '/sw.js') {
        let worker = content.toString().replace(/(url:"index\.html",revision:")[^"]+/, `$1release-${release}`);
        // Model the deployed worker, which did not claim existing clients.
        if (release === 1) worker = worker.replace(/\w+\.clientsClaim\(\),?/, '');
        content = Buffer.from(worker);
      }
      const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css'
        : file.endsWith('.html') ? 'text/html' : file.endsWith('.png') ? 'image/png'
          : file.endsWith('.svg') ? 'image/svg+xml' : 'application/json';
      response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(content);
    } catch (error) {
      console.error('Update test server:', error);
      response.writeHead(500).end();
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  try {
    await page.goto(`http://127.0.0.1:${address.port}/?area=mars`);
    await expect(page.locator('#offline-status')).toHaveText('Ready to play offline', { timeout: 30_000 });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect(page.locator('#start')).toBeEnabled();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    release = 2;
    await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
    if (smallScreen) await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#update-game')).toBeVisible();
    await expect(page.locator('meta[name="test-release"]')).toHaveAttribute('content', '1');
    await page.screenshot({ path: test.info().outputPath('update-ready.png') });
    await page.locator('#update-game').click();
    await expect(page.locator('meta[name="test-release"]')).toHaveAttribute('content', '2', { timeout: 30_000 });
    await expect(page.locator('#start')).toBeEnabled();
    await expect(page.locator('#update-game')).toBeHidden();
    await expect(page.locator('body')).toHaveAttribute('data-area', 'mars');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
