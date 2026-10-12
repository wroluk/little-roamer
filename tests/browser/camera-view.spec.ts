import { expect, test } from '@playwright/test';

test.use({ deviceScaleFactor: 1 });

for (const area of ['northern-reach', 'valley', 'highlands', 'samurai-village', 'mars']) {
  test(`${area} starts with the lower driving camera in both orientations`, async ({ page }, info) => {
    await page.goto(`/?area=${area}`);
    await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
    await page.locator('#start').click();
    await expect(page.locator('#controls')).toBeVisible();
    for (const viewport of [{ width: 1024, height: 768 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(250);
      const view = await page.evaluate(() => (window as unknown as { __ROAMER__: { snapshot(): {
        position: { y: number }; camera: number[]; cameraObstructed: boolean;
      } } }).__ROAMER__.snapshot());
      expect(view.cameraObstructed).toBe(false);
      expect(view.camera[1] - view.position.y).toBeLessThan(6.5);
      await page.screenshot({ path: info.outputPath(`${area}-${viewport.width}x${viewport.height}.png`) });
    }
  });
}
