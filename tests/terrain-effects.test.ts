import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { TerrainEffects } from '../src/game/terrain-effects';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';
import type { SurfaceId } from '../src/game/surfaces';

before(async () => { await RAPIER.init(); });

test('sand and mud leave bounded, fading wheel tracks that clear on reset', () => {
  const scene = new THREE.Scene();
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.1, 100).setTranslation(0, -0.1, 0));
  let surface: SurfaceId = 'sand';
  const vehicle = new Vehicle(scene, world, { x: 0, y: 1.2, z: 20 }, 1, () => surface);
  const effects = new TerrainEffects(scene, () => null);
  const drive = () => {
    for (let i = 0; i < 180; i++) {
      vehicle.beforeStep({ steer: 0, forward: true, reverse: false }, 1 / 60);
      world.step(); vehicle.capture();
      effects.update(1 / 60, vehicle);
    }
  };
  try {
    drive();
    assert.ok(effects.trackCount > 0 && effects.trackCount <= effects.trackCapacity);
    vehicle.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    effects.update(7, vehicle);
    assert.equal(effects.trackCount, 0, 'old sand tracks should fade away');

    surface = 'mud';
    vehicle.reset(); effects.clear();
    drive();
    assert.ok(effects.trackCount > 0 && effects.trackCount <= effects.trackCapacity);
    effects.setReduced(true);
    assert.equal(effects.trackCount, 0, 'reduced graphics should release old mud tracks');
    effects.setReduced(false);
    effects.clear();

    surface = 'dirt';
    vehicle.reset();
    drive();
    assert.equal(effects.trackCount, 0, 'packed dirt should not leave soft-ground tracks');
  } finally { effects.dispose(); world.free(); disposeScene(scene); }
});
