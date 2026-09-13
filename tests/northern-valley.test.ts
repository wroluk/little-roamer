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
