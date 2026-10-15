import { expect, test } from '@playwright/test';

test('photo mode moves the camera without driving and restores the car', async ({ page }, testInfo) => {
  await page.goto('/?area=mars');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await expect(page.locator('#photo-mode')).toHaveCount(0);
  const snapshot = () => page.evaluate(() => (window as unknown as {
    __ROAMER__: { snapshot(): { camera: number[]; position: { x: number; z: number } }; vehicle: { model: { visible: boolean } } }
  }).__ROAMER__.snapshot());
  const before = await snapshot();
  await page.keyboard.press('KeyP');
  await expect(page.locator('#photo-panel')).toBeVisible();
  await expect(page.locator('#controls')).toBeHidden();
  await page.keyboard.press('KeyH');
  await expect(page.locator('#photo-car')).toHaveText('Show car');
  expect(await page.evaluate(() => (window as unknown as { __ROAMER__: { vehicle: { model: { visible: boolean } } } }).__ROAMER__.vehicle.model.visible)).toBe(false);
  await page.keyboard.press('KeyU');
  await expect(page.locator('body')).toHaveClass(/photo-clean/);
  const beforeDrag = await snapshot();
  const canvas = await page.locator('#game').boundingBox();
  expect(canvas).not.toBeNull();
  const fromX = canvas!.x + canvas!.width * 0.58;
  const fromY = canvas!.y + canvas!.height * 0.55;
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(fromX + canvas!.width * 0.15, fromY + canvas!.height * 0.1, { steps: 8 });
  await page.mouse.up();
  const dragged = await snapshot();
  expect(Math.hypot(...dragged.camera.map((value, index) => value - beforeDrag.camera[index]))).toBeGreaterThan(1);
  await page.screenshot({ path: testInfo.outputPath('photo-mode-mars.png') });
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(450);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyW');
  await page.keyboard.up('ArrowUp');
  const moved = await snapshot();
  expect(Math.hypot(...moved.camera.map((value, index) => value - before.camera[index]))).toBeGreaterThan(1);
  expect(Math.hypot(moved.position.x - before.position.x, moved.position.z - before.position.z)).toBeLessThan(0.01);
  await page.keyboard.press('Escape');
  await expect(page.locator('#photo-panel')).toBeHidden();
  await expect(page.locator('#controls')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __ROAMER__: { vehicle: { model: { visible: boolean } } } }).__ROAMER__.vehicle.model.visible)).toBe(true);
});

test('background events preserve photo mode and clear held camera movement', async ({ page }) => {
  await page.goto('/?area=mars');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await page.keyboard.press('KeyP');
  await page.keyboard.press('KeyH');
  await page.keyboard.press('KeyU');
  await page.keyboard.down('KeyW');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    window.dispatchEvent(new Event('blur'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const snapshot = () => page.evaluate(() => (window as unknown as {
    __ROAMER__: { snapshot(): { mode: string; camera: number[] }; vehicle: { model: { visible: boolean } } }
  }).__ROAMER__.snapshot());
  const afterReturn = await snapshot();
  await page.waitForTimeout(250);
  const settled = await snapshot();
  expect(settled.mode).toBe('playing');
  expect(Math.hypot(...settled.camera.map((value, index) => value - afterReturn.camera[index]))).toBeLessThan(0.01);
  await expect(page.locator('body')).toHaveClass(/photo-clean/);
  expect(await page.locator('#photo-panel').evaluate(panel => !(panel as HTMLElement).hidden)).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { __ROAMER__: { vehicle: { model: { visible: boolean } } } }).__ROAMER__.vehicle.model.visible)).toBe(false);
  await page.keyboard.up('KeyW');
  await page.keyboard.press('Escape');
  await expect(page.locator('#controls')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#paused')).toBeVisible();
});
