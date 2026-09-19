// Capture the app icon from the same Three.js scene, vehicle and showcase camera used by the game.
// Run: node --import tsx scripts/render-app-icon.ts
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const output = 'artifacts/app-icon/little-roamer-icon-render.png';
const server = await createServer({
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 0 },
});

await server.listen();
const address = server.httpServer?.address();
if (!address || typeof address === 'string') throw new Error('Could not start the icon render server.');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${address.port}/?area=northern-reach`);
  await page.locator('#start').waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('#start').waitFor({ state: 'attached' });
  await page.waitForFunction(() => !(document.querySelector<HTMLButtonElement>('#start')?.disabled));
  await page.evaluate(async () => {
    const game = (window as unknown as {
      __ROAMER__: {
        placeVehicle(x: number, z: number, heading: number): Promise<void>;
        camera: { fov: number; updateProjectionMatrix(): void };
      };
    }).__ROAMER__;
    await game.placeVehicle(-72, 520, 1.05);
    game.camera.fov = 30;
    game.camera.updateProjectionMatrix();
  });
  // Give the follow camera and streamed Pine Hollow scene a few frames to settle before capture.
  await page.waitForTimeout(750);
  await page.addStyleTag({ content: '#app > :not(#game) { display: none !important; }' });
  await page.waitForTimeout(100);
  await mkdir('artifacts/app-icon', { recursive: true });
  await page.screenshot({
    path: output,
    clip: { x: 320, y: 230, width: 640, height: 640 },
  });
  console.log(`Rendered ${output} from the live game canvas.`);
} finally {
  await browser.close();
  await server.close();
}
