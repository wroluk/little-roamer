import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { valleySurfaceAt } from '../src/game/terrain';
import {
  FORDS, GLACIER, highlandsSurfaceAt, highlandsSurfaceHeight, VOLCANOES,
} from '../src/game/highlands';
import { SURFACES, type SurfaceId } from '../src/game/surfaces';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';

before(async () => { await RAPIER.init(); });

function flatDrive(surface: SurfaceId) {
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.1, 100).setTranslation(0, -0.1, 0));
  const scene = new THREE.Scene();
  const vehicle = new Vehicle(scene, world, { x: 0, y: 1.2, z: 20 }, 1, () => surface);
  const tick = (count: number, forward: boolean) => {
    for (let i = 0; i < count; i++) {
      vehicle.beforeStep({ steer: 0, forward, reverse: false }, 1 / 60);
      world.step();
      vehicle.capture();
    }
  };
  tick(100, false);
  tick(180, true);
  const poweredSpeed = Math.abs(vehicle.speed);
  tick(120, false);
  const coastSpeed = Math.abs(vehicle.speed);
  world.free();
  disposeScene(scene);
  return { poweredSpeed, coastSpeed };
}

test('surface maps match visible terrain regions', () => {
  assert.equal(valleySurfaceAt(0, 22), 'dirt');
  assert.equal(valleySurfaceAt(65, 65), 'grass');
  for (const ford of FORDS) assert.equal(highlandsSurfaceAt(ford.x, ford.z), 'water');
  assert.equal(highlandsSurfaceAt(GLACIER.x, GLACIER.z), 'ice');
  assert.equal(highlandsSurfaceAt(220, -10), 'ash');
  const volcano = VOLCANOES[0];
  let lavaPoint: [number, number] | undefined;
  let mossPoint: [number, number] | undefined;
  for (let z = volcano.z; z < 40; z += 2) {
    for (let x = volcano.x - 40; x < volcano.x + 40; x += 2) {
      const surface = highlandsSurfaceAt(x, z);
      if (surface === 'lava') lavaPoint = [x, z];
      if (surface === 'moss') mossPoint = [x, z];
    }
  }
  assert.ok(lavaPoint, 'visible lava flow should classify as rough lava');
  assert.ok(mossPoint, 'visible moss patch should classify as springy moss');
  assert.ok(highlandsSurfaceHeight(GLACIER.x, GLACIER.z) > 30);
});

test('loose ash and water reduce speed while rough lava slows coasting', () => {
  const dirt = flatDrive('dirt');
  const ash = flatDrive('ash');
  const lava = flatDrive('lava');
  const water = flatDrive('water');
  assert.ok(dirt.poweredSpeed > ash.poweredSpeed + 2, `${dirt.poweredSpeed} vs ${ash.poweredSpeed}`);
  assert.ok(ash.poweredSpeed > water.poweredSpeed + 1, `${ash.poweredSpeed} vs ${water.poweredSpeed}`);
  assert.ok(dirt.coastSpeed > lava.coastSpeed + 3, `${dirt.coastSpeed} vs ${lava.coastSpeed}`);
});

test('surface profiles express distinct traction, resistance, and steering', () => {
  assert.ok(SURFACES.ice.grip < SURFACES.ash.grip);
  assert.ok(SURFACES.ice.steering < SURFACES.grass.steering);
  assert.ok(SURFACES.water.drag > SURFACES.lava.drag);
  assert.ok(SURFACES.lava.rollingBrake > SURFACES.moss.rollingBrake);
  assert.ok(SURFACES.dirt.speed > SURFACES.water.speed);
});
