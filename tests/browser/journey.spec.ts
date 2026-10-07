import { test, expect } from '@playwright/test';

// Keep visual-feedback checks below the game's adaptive graphics threshold in
// emulated tablets; the full suite separately exercises quality reduction.
test.use({ deviceScaleFactor: 1 });

type Game = {
  snapshot(): { position: {x:number;y:number;z:number}; mode:string; waterDepth:number; contacts:number; terrainTracks:number; terrainRipples:number; input:{forward:boolean}; streaming:{activeRender:number;activePhysics:number} };
  placeVehicle(x:number,z:number,heading:number):Promise<void>;
  reset():Promise<void>;
  pause():void;
};

test('regional resets recover from the sea and an unloaded region, clearing input', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/?area=northern-reach&start=river-valley');
  await expect(page.locator('#start')).toBeEnabled({timeout:30_000});
  await page.locator('#start').click();
  const state=()=>page.evaluate(()=>(window as unknown as {__ROAMER__:Game}).__ROAMER__.snapshot());
  await page.evaluate(()=>(window as unknown as {__ROAMER__:Game}).__ROAMER__.placeVehicle(-720,400,0));
  await page.keyboard.down('KeyW');
  await page.locator('#reset').click();
  await expect(page.locator('#toast')).toHaveText('Back at Fjord Coast');
  await expect.poll(async()=>(await state()).position.z).toBeCloseTo(400,0);
  expect((await state()).waterDepth).toBe(0);
  expect((await state()).input.forward).toBe(false);
  await page.keyboard.up('KeyW');
  await page.locator('#reset').click();
  await expect.poll(async()=>(await state()).contacts).toBeGreaterThanOrEqual(2);
  await page.evaluate(()=>(window as unknown as {__ROAMER__:Game}).__ROAMER__.placeVehicle(640,420,0));
  await page.locator('#reset').click();
  await expect(page.locator('#toast')).toHaveText('Back at Ember Basin');
  await expect.poll(async()=>(await state()).mode).toBe('playing');
  // More than three chunks from High Pass: recovery must prepare a new neighborhood.
  await page.evaluate(()=>(window as unknown as {__ROAMER__:Game}).__ROAMER__.placeVehicle(740,-740,0));
  await page.locator('#reset').click();
  await expect(page.locator('#toast')).toHaveText('Back at High Pass');
  await expect.poll(async()=>(await state()).position.z).toBeCloseTo(-425,0);
  expect((await state()).streaming.activeRender).toBeLessThanOrEqual(25);
  expect((await state()).streaming.activePhysics).toBeLessThanOrEqual(9);
  await page.evaluate(async () => {
    const game = (window as unknown as {__ROAMER__:Game}).__ROAMER__;
    const resetting = game.reset(); game.pause(); await resetting;
  });
  expect((await state()).mode).toBe('paused');
  await page.locator('#resume').click();
  await expect.poll(async()=>(await state()).contacts).toBeGreaterThanOrEqual(2);
});

test('terrain feedback and pause work through a River Valley visit', async ({page}, info) => {
  test.setTimeout(120_000);
  const errors:string[]=[];page.on('pageerror', e=>errors.push(e.message));
  await page.goto('/?area=northern-reach&start=river-valley');
  await expect(page.locator('#start')).toBeEnabled({timeout:30_000});
  await page.locator('#start').click();
  const state=()=>page.evaluate(()=>(window as unknown as {__ROAMER__:Game}).__ROAMER__.snapshot());
  await page.keyboard.down('KeyW');
  await expect.poll(async()=>(await state()).terrainTracks).toBeGreaterThan(0);
  await page.keyboard.up('KeyW');
  await page.locator('#pause').click();
  await page.locator('#resume').click();
  await page.evaluate(()=>(window as unknown as {__ROAMER__:Game}).__ROAMER__.placeVehicle(-249,149,Math.atan2(20,8)));
  await page.keyboard.down('KeyW');
  await expect.poll(async()=>(await state()).position.x,{timeout:20_000}).toBeLessThan(-266);
  await page.keyboard.up('KeyW');
  await page.screenshot({path:info.outputPath('rocky-branch.png')});
  await page.evaluate(()=>(window as unknown as {__ROAMER__:Game}).__ROAMER__.placeVehicle(-285,120,Math.PI));
  await expect.poll(async()=>(await state()).contacts).toBeGreaterThanOrEqual(2);
  await page.screenshot({path:info.outputPath('valley-lookout.png')});
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled({timeout:30_000});
  await page.locator('#start').click();
  expect(errors).toEqual([]);
});

test('a fresh River Valley ford crossing makes temporary water wakes', async ({page}, info) => {
  test.setTimeout(60_000);
  await page.goto('/?area=northern-reach&start=river-valley');
  await expect(page.locator('#start')).toBeEnabled({timeout:30_000});
  await page.locator('#start').click();
  const state=()=>page.evaluate(()=>(window as unknown as {__ROAMER__:Game}).__ROAMER__.snapshot());
  await page.evaluate(()=>(window as unknown as {__ROAMER__:Game}).__ROAMER__.placeVehicle(-240,185,0));
  await page.keyboard.down('KeyW');
  await expect.poll(async()=>(await state()).waterDepth,{timeout:8_000}).toBeGreaterThan(0.05);
  await expect.poll(async()=>(await state()).terrainRipples,{timeout:8_000}).toBeGreaterThan(0);
  await page.keyboard.up('KeyW');
  await page.screenshot({path:info.outputPath('ford-wakes.png')});
});
