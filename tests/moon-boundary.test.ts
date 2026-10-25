import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { MOON_DRIVE_HALF, MOON_GRAVITY, MOON_HANDLING, MoonRuntime } from '../src/game/moon';
import { MOON_HALF, moonSpawn, moonSurfaceAt, moonSurfaceHeight } from '../src/game/moon-terrain';
import { BOUNDARY_COLLISION_GROUPS, SCENERY_QUERY_GROUPS } from '../src/game/collision-groups';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';

before(async () => { await RAPIER.init(); });

test('Moon safety colliders leave scenery unchanged and do not obstruct camera or scenery queries', async () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: MOON_GRAVITY, z: 0 });
  const runtime = new MoonRuntime(scene, world);
  try {
    await runtime.ensureReady(-374, -149); world.step();
    let boundaries = 0;
    world.forEachCollider(collider => {
      if (collider.collisionGroups() === BOUNDARY_COLLISION_GROUPS) boundaries++;
    });
    assert.equal(boundaries, 4);
    assert.equal(runtime.stats.triangles, 91_008, 'no added visible terrain or boundary geometry');
    assert.ok(MOON_DRIVE_HALF < MOON_HALF - 3, 'retain support beyond the whole vehicle and predicted movement');
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const origin = { x: dx * (MOON_DRIVE_HALF - 3), y: 100, z: dz * (MOON_DRIVE_HALF - 3) };
      const ray = new RAPIER.Ray(origin, { x: dx, y: 0, z: dz });
      const solid = world.castRay(ray, 10, true);
      assert.ok(solid, 'the physical vehicle cannot pass through the guard');
      assert.equal(solid.collider.collisionGroups(), BOUNDARY_COLLISION_GROUPS);
      assert.ok(Math.abs(solid.timeOfImpact - 3) < 0.001);
      assert.equal(world.castRay(ray, 10, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, SCENERY_QUERY_GROUPS), null,
        'camera/drag rays pass through the invisible guard');
      assert.equal(world.intersectionWithShape({ x: dx * (MOON_DRIVE_HALF + 0.5), y: 100,
        z: dz * (MOON_DRIVE_HALF + 0.5) }, { x: 0, y: 0, z: 0, w: 1 }, new RAPIER.Ball(0.4),
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, SCENERY_QUERY_GROUPS), null, 'camera probe ignores the guard');
    }
    runtime.dispose();
    assert.equal(world.colliders.len(), 0, 'boundary colliders are released along with the world');
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
});

for (const model of ['lunar-rover', 'lunar-nomad'] as const) test(`real ${model} stops at all four edges and corners and can reverse without the streaming freeze`, async () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: MOON_GRAVITY, z: 0 });
  const runtime = new MoonRuntime(scene, world);
  const car = new Vehicle(scene, world, moonSpawn(), 1, moonSurfaceAt, () => null, undefined, model, MOON_HANDLING);
  try {
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const start = { x: dx * (MOON_DRIVE_HALF - 5), z: dz ? dz * (MOON_DRIVE_HALF - 5) : -149.002 };
      await runtime.ensureReady(start.x, start.z); world.step();
      car.reset(moonSpawn(start), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-dx, -dz)));
      const tick = (forward: boolean, reverse: boolean) => {
        runtime.update(car.position.x, car.position.z);
        const velocity = car.body.linvel();
        assert.ok(runtime.isCollisionReadyAt(car.position.x + velocity.x * 0.15, car.position.z + velocity.z * 0.15),
          `${dx},${dz}: the existing streaming safeguard must not freeze the car`);
        car.beforeStep({ steer: 0, forward, reverse }, 1 / 60); world.step(); car.capture();
        assert.ok(Math.max(Math.abs(car.position.x), Math.abs(car.position.z)) < MOON_DRIVE_HALF,
          `${dx},${dz}: the whole vehicle stays inside the supported perimeter`);
        assert.ok(car.position.y > moonSurfaceHeight(car.position.x, car.position.z) - 0.4);
      };
      for (let i = 0; i < 150; i++) tick(false, false);
      for (let i = 0; i < 600; i++) tick(true, false);
      const stopped = car.position.clone();
      assert.ok(Math.max(Math.abs(stopped.x), Math.abs(stopped.z)) > MOON_DRIVE_HALF - 3, 'reach the guard, not just nearby terrain');
      assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(car.rotation).y > 0.8, 'contact does not flip the car');
      for (let i = 0; i < 420; i++) tick(false, true);
      assert.ok((stopped.x - car.position.x) * dx + (stopped.z - car.position.z) * dz > 3, 'reverse away normally');
      assert.ok(runtime.stats.activePhysics <= 9);
    }
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
});
