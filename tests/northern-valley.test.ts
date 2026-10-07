import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { VALLEY_FORDS, VALLEY_TRAIL } from '../src/game/northern-valley';
import { sampledHeightAt, waterHeightAt, northernSurfaceAt } from '../src/game/northern-terrain';
import { InProcessChunkTransport, NorthernStreamingRuntime } from '../src/game/northern-streaming';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';

before(async () => { await RAPIER.init(); });

test('authored ford lanes have shallow water, gradual banks and dry exits', () => {
  for (const ford of VALLEY_FORDS) {
    for (const dx of [-4, 0, 4]) {
      let wet = 0;
      for (let dz = -ford.halfLength; dz <= ford.halfLength; dz += 0.6) {
        const x = ford.x + dx, z = ford.z + dz;
        const h = sampledHeightAt(x, z), water = waterHeightAt(x, z);
        const slope = Math.abs(sampledHeightAt(x, z + 0.6) - h) / 0.6;
        assert.ok(slope < 0.45, `${ford.name} bank slope ${slope} at ${x},${z}`);
        if (water !== null) {
          wet++;
          assert.ok(water - h <= 0.45, `${ford.name} depth ${water - h}`);
        }
      }
      assert.ok(wet > 12);
      for (const side of [-1, 1]) assert.equal(waterHeightAt(ford.x + dx, ford.z + side * ford.halfLength), null);
    }
  }
});

test('ridge loop has drivable slopes and water only at the marked crossings', () => {
  for (let i = 0; i < VALLEY_TRAIL.length - 1; i++) {
    const a = VALLEY_TRAIL[i], b = VALLEY_TRAIL[i + 1];
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
    let previous = sampledHeightAt(a.x, a.z);
    for (let j = 1; j <= steps; j++) {
      const x = a.x + (b.x - a.x) * j / steps, z = a.z + (b.z - a.z) * j / steps;
      const h = sampledHeightAt(x, z);
      assert.ok(Math.abs(h - previous) < 0.45, `trail slope at ${x},${z}: ${h - previous}`);
      if (waterHeightAt(x, z) !== null) assert.ok(VALLEY_FORDS.some(f => Math.abs(f.x - x) < 5), `unexpected water on trail at ${x},${z}`);
      previous = h;
    }
  }
});

test('real four-wheel vehicle crosses both streamed fords in both directions', async () => {
  for (const ford of VALLEY_FORDS) for (const direction of [-1, 1]) {
    const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    const runtime = new NorthernStreamingRuntime(scene, world, new InProcessChunkTransport());
    try {
      const z = ford.z + direction * ford.halfLength;
      await runtime.ensureReady(ford.x, z);
      world.step();
      const car = new Vehicle(scene, world, { x: ford.x, y: sampledHeightAt(ford.x, z) + 1.25, z }, 1.45, northernSurfaceAt, waterHeightAt);
      car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), direction === 1 ? 0 : Math.PI), true);
      let touchedWater = false;
      for (let tick = 0; tick < 2100; tick++) {
        runtime.update(car.position.x, car.position.z);
        car.beforeStep({ steer: 0, forward: tick > 90, reverse: false }, 1 / 60);
        world.step(); car.capture();
        touchedWater ||= car.waterDepth > 0.05;
        assert.ok(car.position.y > sampledHeightAt(car.position.x, car.position.z) - 0.5);
        if (direction * (car.position.z - ford.z) < -ford.halfLength) break;
      }
      assert.ok(touchedWater, `${ford.name} should drive through water`);
      assert.ok(direction * (car.position.z - ford.z) < -ford.halfLength, `${ford.name} direction ${direction} stopped at ${car.position.x},${car.position.z}`);
    } finally { runtime.dispose(); world.free(); disposeScene(scene); }
  }
});

import { VALLEY_ROCK_BRANCH, VALLEY_MUD_ROUTE, VALLEY_DRY_ROUTE, VALLEY_LOOKOUT } from '../src/game/northern-valley';

test('route choices offer rock, mud and a dry alternative with an open lookout', () => {
  assert.equal(northernSurfaceAt(-262, 143), 'rock');
  assert.equal(northernSurfaceAt(-293, 268), 'mud');
  assert.notEqual(northernSurfaceAt(-294, 262), 'mud');
  for (const dx of [-2, 0, 2]) for (const dz of [-2, 0, 2]) {
    assert.equal(waterHeightAt(VALLEY_LOOKOUT.x+dx, VALLEY_LOOKOUT.z+dz), null);
    assert.ok(Math.abs(sampledHeightAt(VALLEY_LOOKOUT.x+dx, VALLEY_LOOKOUT.z+dz)-sampledHeightAt(VALLEY_LOOKOUT.x, VALLEY_LOOKOUT.z)) < 0.15);
  }
});

test('real vehicle drives rocky branch, bypass, muddy return and dry line both ways', async () => {
  const routes = [VALLEY_ROCK_BRANCH, [VALLEY_TRAIL[4], VALLEY_TRAIL[5]], VALLEY_MUD_ROUTE, VALLEY_DRY_ROUTE];
  for (const [routeIndex, source] of routes.entries()) for (const reverse of [false, true]) {
    const path = reverse ? [...source].reverse() : source;
    const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    const runtime = new NorthernStreamingRuntime(scene, world, new InProcessChunkTransport());
    try {
      const start = path[0];
      await runtime.ensureReady(start.x, start.z); world.step();
      const car = new Vehicle(scene, world, { ...start, y: sampledHeightAt(start.x,start.z)+1.25 }, 1.45, northernSurfaceAt, waterHeightAt);
      car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.atan2(-(path[1].x-start.x),-(path[1].z-start.z))),true);
      const forward = new THREE.Vector3();
      let next=1, lift=0, mud=false;
      for (let tick=0; tick<5000 && next<path.length; tick++) {
        const target=path[next], dx=target.x-car.position.x, dz=target.z-car.position.z;
        if (Math.hypot(dx,dz)<2.5) { next++; continue; }
        forward.set(0,0,-1).applyQuaternion(car.body.rotation() as THREE.Quaternion);
        const heading=Math.atan2(forward.x,-forward.z), desired=Math.atan2(dx,-dz);
        const error=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading));
        car.beforeStep({steer:Math.max(-1,Math.min(1,error*2)),forward:tick>90 && Math.abs(car.speed)<4,reverse:false},1/60);
        world.step(); car.capture();
        mud ||= car.currentSurface.id === 'mud';
        for(let i=0;i<4;i++) { const contact=car.controller.wheelContactPoint(i); if(contact && car.controller.wheelIsInContact(i)) lift=Math.max(lift,contact.y-sampledHeightAt(contact.x,contact.z)); }
      }
      assert.equal(next,path.length,`route ${routeIndex}, reverse=${reverse} stopped at ${car.position.x},${car.position.z}`);
      if(routeIndex===0) assert.ok(lift>0.08,`rock branch must lift wheels onto rocks; lift=${lift}`);
      if(routeIndex===2) assert.ok(mud,'mud route should encounter mud');
    } finally { runtime.dispose(); world.free(); disposeScene(scene); }
  }
});
