// Actual game Moon postcards and low-camera review views; run with a local dev server.
// node --import tsx scripts/render-moon-discoveries.ts [baseURL] [captureName]
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { moonSurfaceHeight } from '../src/game/moon-terrain';
import { MOON_LANDING_SITE, MOON_SURVEY_ROVER } from '../src/game/moon-discoveries';

type Point = { x: number; y: number; z: number };
type PhotoView = { position: Point; target: Point; fov: number };
type Game = {
  snapshot(): unknown;
  camera: import('three').PerspectiveCamera;
  vehicle: { model: import('three').Group };
  setPhotoView(view: PhotoView): Promise<void>;
};
const windowView: { camera: PhotoView } = JSON.parse(await readFile(
  new URL('../artifacts/moon/discoveries/window-photo-view.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({ args: process.platform === 'darwin' ? ['--use-angle=metal'] : [] });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
  const folder = 'artifacts/moon/discoveries';
  await mkdir(folder, { recursive: true }); await mkdir('public/postcards/moon', { recursive: true });
  const captures: { name: string; site: { x: number; z: number };
    camera: { x: number; z: number; height: number } | Point; postcard: boolean;
    target?: Point; fov?: number }[] = [
    { name: 'small-blue-home', site: { x: -45, z: -200 },
      camera: { x: -45, z: -195, height: 2.4 }, postcard: true,
      target: { x: -39, y: moonSurfaceHeight(-45, -195) + 6.4, z: -235 } },
    { name: 'window-into-darkness', site: { x: -246, z: 184 },
      camera: windowView.camera.position, postcard: true,
      target: windowView.camera.target, fov: windowView.camera.fov },
    { name: 'sea-turned-to-stone', site: { x: 65, z: 235 },
      camera: { x: 65, z: 235, height: 2.4 }, postcard: true,
      target: { x: 25, y: moonSurfaceHeight(65, 235) + 2.7, z: 202 } },
    { name: 'first-landing', site: MOON_LANDING_SITE, camera: { x: 89, z: 64, height: 2.8 }, postcard: true },
    { name: 'first-landing-side', site: MOON_LANDING_SITE, camera: { x: 60, z: 49, height: 2.8 }, postcard: false },
    { name: 'landing-screened-from-circuit', site: { x: 78, z: 85 }, camera: { x: 75, z: 105, height: 2.8 }, postcard: false },
    { name: 'stranded-surveyor', site: MOON_SURVEY_ROVER, camera: { x: 299, z: 250, height: 2.8 }, postcard: true },
    { name: 'stranded-surveyor-side', site: MOON_SURVEY_ROVER, camera: { x: 279, z: 227, height: 2.8 }, postcard: false },
    { name: 'surveyor-screened-from-rille', site: { x: 258, z: 158 }, camera: { x: 250, z: 140, height: 2.8 }, postcard: false },
  ];
  const evidence: { name: string; position: Point; target: Point; fov?: number; state: unknown;
    renderedView?: { position: number[]; direction: number[]; fov: number; vehicleVisible: boolean } }[] =
    process.argv[3] ? JSON.parse(await readFile(`${folder}/capture-views.json`, 'utf8')) : [];
  const selected = captures.filter(capture => !process.argv[3] || capture.name === process.argv[3]);
  assert.ok(selected.length, `Unknown Moon capture: ${process.argv[3]}`);
  for (const capture of selected) {
    await page.goto(`${process.argv[2] ?? 'http://127.0.0.1:5173'}/?area=moon&car=lunar-nomad`);
    await page.locator('#start:not([disabled])').waitFor(); await page.locator('#start').click();
    const position = { x: capture.camera.x, y: 'y' in capture.camera ? capture.camera.y
      : moonSurfaceHeight(capture.camera.x, capture.camera.z) + capture.camera.height, z: capture.camera.z };
    const target = capture.target ?? { ...capture.site, y: moonSurfaceHeight(capture.site.x, capture.site.z) + 1.6 };
    const fov = capture.fov ?? 48;
    await page.evaluate(view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view),
      { position, target, fov });
    await page.addStyleTag({ content: '#app > :not(#game) { visibility: hidden !important; }' });
    await page.waitForTimeout(400);
    const renderedView = await page.evaluate(() => {
      const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
      return { position: game.camera.position.toArray(),
        direction: game.camera.getWorldDirection(game.camera.position.clone()).toArray(),
        fov: game.camera.fov, vehicleVisible: game.vehicle.model.visible };
    });
    const delta = [target.x - position.x, target.y - position.y, target.z - position.z];
    for (const [i, axis] of (['x', 'y', 'z'] as const).entries()) {
      assert.ok(Math.abs(renderedView.position[i] - position[axis]) < 0.000001, 'Keep the requested camera position');
      assert.ok(Math.abs(renderedView.direction[i] - delta[i] / Math.hypot(...delta)) < 0.000001, 'Keep the requested camera target');
    }
    assert.equal(renderedView.fov, fov); assert.equal(renderedView.vehicleVisible, false);
    await page.locator('#game').screenshot({ path: `${folder}/${capture.name}.png` });
    if (capture.postcard) await page.locator('#game').screenshot({
      path: `public/postcards/moon/${capture.name}.jpg`, type: 'jpeg', quality: 88,
    });
    const entry = { name: capture.name, position, target, fov, renderedView, state: await page.evaluate(() =>
      (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot()) };
    const index = evidence.findIndex(view => view.name === capture.name);
    if (index < 0) evidence.push(entry); else evidence[index] = entry;
    console.log(`Captured ${capture.name}`);
  }
  await writeFile(`${folder}/capture-views.json`, JSON.stringify(evidence, null, 2));
} finally { await browser.close(); }
