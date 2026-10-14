// Direct game captures only; no test runner or driving scenario.
import { chromium } from '@playwright/test';
import { wreckPoint, WRECK_SITE } from '../../../src/game/mars-wreck-layout.ts';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
page.on('pageerror', e => console.log('PAGE ERROR',e.message));
await page.goto('http://127.0.0.1:5174/?area=mars&start=fossil-delta',{waitUntil:'networkidle'});
await page.locator('#start').click({timeout:30000});
await page.evaluate(() => window.__ROAMER__.follow.orbit(0,-0.18));
for (const [name,p] of [
 ['reveal',wreckPoint(-15,100)], ['stern',wreckPoint(-30,62)], ['side',wreckPoint(-45,15)],
 ['connector',{x:-515,z:239}], ['perimeter',{x:-622,z:127}],
]) {
 const heading=Math.atan2(-(WRECK_SITE.x-p.x),-(WRECK_SITE.z-p.z));
 await page.evaluate(async ({p,heading})=>{await window.__ROAMER__.placeVehicle(p.x,p.z,heading);await window.__ROAMER__.waitForStreamingIdle();},{p,heading});
 await page.waitForTimeout(900);
 await page.screenshot({path:`artifacts/mars/shuttle-wreck/${name}.png`});
 console.log(name);
}
await browser.close();
