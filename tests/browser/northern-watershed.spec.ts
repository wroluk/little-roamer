import { test, expect } from '@playwright/test';
import { LAKESHORE_START, lakeShorePoint, INLET_FORDS } from '../../src/game/northern-watershed';

type Game = {
  snapshot(): { position: { x:number; y:number; z:number }; waterDepth:number; contacts:number; streaming:{activeRender:number;activePhysics:number} };
  placeVehicle(x:number,z:number,heading:number):Promise<void>;
};
for(const id of ['great-lake','alder-river']) test(`${id}: shore driving, shallow water and reset`,async({page},testInfo)=>{
  test.setTimeout(150_000);
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`/?area=northern-reach&start=${id}`);
  await expect(page.locator('#start')).toBeEnabled({timeout:30_000});
  await page.locator('#start').click();
  const state=()=>page.evaluate(()=>(window as unknown as {__ROAMER__:Game}).__ROAMER__.snapshot());
  const place=(x:number,z:number,heading:number)=>page.evaluate(p=>(window as unknown as {__ROAMER__:Game}).__ROAMER__.placeVehicle(p.x,p.z,p.heading),{x,z,heading});
  if(id==='great-lake') {
    const next=lakeShorePoint(0,22);
    await place(LAKESHORE_START.x,LAKESHORE_START.z,Math.atan2(-(next.x-LAKESHORE_START.x),-(next.z-LAKESHORE_START.z)));
    await page.screenshot({path:testInfo.outputPath('shore-trail.png')});
    await page.keyboard.down('KeyW');
    await expect.poll(async()=>(await state()).position.z,{timeout:40_000}).toBeLessThan(190);
    await page.keyboard.up('KeyW');
    expect((await state()).waterDepth).toBe(0);
    const shelf=lakeShorePoint(0,-8);
    await place(shelf.x,shelf.z,0);
    await expect.poll(async()=>(await state()).contacts).toBeGreaterThanOrEqual(2);
    await expect.poll(async()=>(await state()).waterDepth).toBeGreaterThan(0.05);
    expect((await state()).waterDepth).toBeLessThan(0.6);
    await page.screenshot({path:testInfo.outputPath('willow-coves.png')});
  } else {
    const ford=INLET_FORDS[0];
    for(const direction of [1,-1]) {
      await place(ford.x-direction*34,ford.z,-direction*Math.PI/2);
      await page.keyboard.down('KeyW');
      await expect.poll(async()=>(await state()).waterDepth,{timeout:30_000}).toBeGreaterThan(0.05);
      expect((await state()).waterDepth).toBeLessThan(0.4);
      await page.screenshot({path:testInfo.outputPath(`alder-ford-${direction}.png`)});
      await expect.poll(async()=>direction*((await state()).position.x-ford.x),{timeout:40_000}).toBeGreaterThan(34);
      await page.keyboard.up('KeyW');
      expect((await state()).waterDepth).toBe(0);
    }
  }
  expect((await state()).streaming.activeRender).toBeLessThanOrEqual(25);
  expect((await state()).streaming.activePhysics).toBeLessThanOrEqual(9);
  await page.locator('#reset').click();
  await expect.poll(async()=>(await state()).waterDepth).toBe(0);
  expect(errors).toEqual([]);
});
