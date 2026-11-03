import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { AREAS, isAreaId } from '../../src/game/areas';
import { IslandRuntime } from '../../src/game/island';
import {
  ISLAND_ROUTES, ISLAND_STARTS, islandGroundHeight, islandDrivingHeight, islandTerrainGeometry,
  islandWaterGeometry, islandWaterHeight, islandSpawn, islandRouteSample, islandSurfaceAt, nearestIslandStart,
} from '../../src/game/island-terrain';
import { islandTrees } from '../../src/game/island-scenery';
import { Vehicle, type VehicleModelId } from '../../src/game/vehicle';
import { disposeScene } from '../../src/game/dispose';

before(async () => { await RAPIER.init(); });

test('Island remains internal, with dry regional entries and unchanged Earth handling', () => {
  assert.equal(isAreaId('island'), false);
  assert.equal(AREAS.island.gravity, undefined);
  assert.equal(AREAS.island.handling, undefined);
  assert.equal(AREAS.island.half, 240);
  for (const start of ISLAND_STARTS) {
    assert.equal(nearestIslandStart(start.position.x, start.position.z).id, start.id);
    assert.equal(islandWaterHeight(start.position.x, start.position.z), null);
    assert.ok(Math.abs(islandSpawn(start.position).y - start.position.y - 1.2) < 0.001);
    for (const dx of [-3, 0, 3]) for (const dz of [-3, 0, 3])
      assert.ok(Math.abs(islandGroundHeight(start.position.x + dx, start.position.z + dz) - start.position.y) < 0.01);
  }
  assert.equal(islandGroundHeight(0, 0), 5);
  assert.equal(islandDrivingHeight(0, 0), 26);
  assert.equal(islandWaterHeight(210, 180), 0);
});

test('terrain and fitted sea are deterministic and agree with the exact interpolated ground', () => {
  const geometry = islandTerrainGeometry(), other = islandTerrainGeometry();
  const water = islandWaterGeometry(geometry);
  try {
    assert.deepEqual(geometry.getAttribute('position').array, other.getAttribute('position').array);
    const p = geometry.getAttribute('position'), indices = geometry.getIndex()!;
    for (let i = 0; i < indices.count; i += 102) {
      const ids = [0, 1, 2].map(k => indices.getX(i + k));
      const x = ids.reduce((sum, n) => sum + p.getX(n), 0) / 3;
      const y = ids.reduce((sum, n) => sum + p.getY(n), 0) / 3;
      const z = ids.reduce((sum, n) => sum + p.getZ(n), 0) / 3;
      assert.ok(Math.abs(islandGroundHeight(x, z) - y) < 0.00001);
    }
    const w = water.getAttribute('position');
    let shorelineVertices = 0, shallow = 0, deep = 0;
    for (let i = 0; i < w.count; i++) {
      const x = w.getX(i), z = w.getZ(i);
      if (Math.abs(x) > 240 || Math.abs(z) > 240) continue;
      const ground = islandGroundHeight(x, z);
      assert.ok(ground < 0.00003, `water cannot cover dry land ${x},${z}: ${ground}`);
      if (Math.abs(ground) < 0.00003) shorelineVertices++;
      if (ground > -1 && ground < -0.1) shallow++;
      if (ground < -9) deep++;
    }
    assert.ok(shorelineVertices > 100 && shallow > 100 && deep > 100);
  } finally { geometry.dispose(); other.dispose(); water.dispose(); }
});

test('main routes are dry and broadly graded, and all final tree positions clear the driving envelope', () => {
  for (const route of ISLAND_ROUTES.filter(r => !r.rough && !r.elevated)) for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    for (const side of [-3, 0, 3]) {
      let previous: number | undefined;
      for (let step = 0; step <= Math.ceil(length); step++) {
        const t = step / Math.ceil(length), x = a.x + dx * t - dz / length * side, z = a.z + dz * t + dx / length * side;
        const h = islandGroundHeight(x, z);
        assert.ok(h > 1.5, `${route.name} must stay dry`);
        if (previous !== undefined) assert.ok(Math.abs(h - previous) < 0.45, `${route.name}: steep grade ${h - previous} at ${x},${z}`);
        previous = h;
      }
    }
  }
  const trees = islandTrees();
  assert.deepEqual(trees, islandTrees());
  assert.ok(trees.filter(t => t.palm).length >= 12, 'coast needs palms');
  assert.ok(trees.filter(t => !t.palm).length >= 100, 'inland needs a layered forest');
  for (const tree of trees) {
    assert.ok(islandRouteSample(tree.x, tree.z, true).distance > 9, 'whole root footprint stays outside driving shoulders');
    assert.ok(tree.y === islandGroundHeight(tree.x, tree.z));
  }
  for (let z = 6; z < 140; z += 2) {
    const x = 64 + (z - 6) * 0.32;
    assert.ok(islandGroundHeight(x, z) < 29 - (z - 6) * 0.2, 'actual ocean-overlook sightline must clear the seaward terrain');
  }
});

test('aqueduct has matching solid deck, open lower passage, bounded resources and complete disposal', async () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const before = performance.now(), runtime = new IslandRuntime(scene, world);
  try {
    await runtime.ensureReady(0, 0); world.step(); scene.updateMatrixWorld(true);
    assert.ok(runtime.stats.triangles < 350_000, `${runtime.stats.triangles} triangles`);
    assert.ok(runtime.stats.colliderCount <= 12);
    assert.equal(runtime.stats.activePhysics, 1);
    const arch = scene.getObjectByName('Island aqueduct solids')!;
    for (const name of ['Island solid stones', 'Island cairns', 'Island buttress roots', 'Island tree trunks']) {
      const mesh = scene.getObjectByName(name) as THREE.Mesh;
      const p = mesh.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++)
        assert.ok(islandRouteSample(p.getX(i), p.getZ(i), true).distance > 4.2, `${name} intrudes into the driving envelope`);
    }
    for (const [origin, direction, expected] of [
      [{ x: 0, y: 40, z: 0 }, { x: 0, y: -1, z: 0 }, 26],
      [{ x: 0, y: 10, z: 0 }, { x: 0, y: -1, z: 0 }, 5],
      [{ x: 0, y: 10, z: 0 }, { x: 0, y: 1, z: 0 }, 23],
    ] as const) {
      const hit = world.castRay(new RAPIER.Ray(origin, direction), 50, true);
      assert.ok(hit);
      assert.ok(Math.abs(origin.y + direction.y * hit.timeOfImpact - expected) < 0.01);
    }
    const through = new THREE.Raycaster(new THREE.Vector3(0, 7, 12), new THREE.Vector3(0, 0, -1), 0, 24);
    assert.equal(through.intersectObject(arch, true).length, 0);
    assert.equal(world.castRay(new RAPIER.Ray({ x: 0, y: 7, z: 12 }, { x: 0, y: 0, z: -1 }), 24, true), null);
    const down = new THREE.Raycaster(new THREE.Vector3(0, 40, 0), new THREE.Vector3(0, -1, 0));
    assert.ok(Math.abs(down.intersectObject(arch)[0].point.y - 26) < 0.001);
    const vertices = (scene.getObjectByName('Island continuous terrain') as THREE.Mesh).geometry.getAttribute('position');
    for (const start of ISLAND_STARTS) {
      await runtime.ensureReady(start.position.x, start.position.z); runtime.update(start.position.x, start.position.z);
      assert.equal((scene.getObjectByName('Island continuous terrain') as THREE.Mesh).geometry.getAttribute('position'), vertices);
    }
    console.log(`Island construction ${Math.round(performance.now() - before)} ms; ${runtime.stats.triangles} triangles, ${runtime.stats.colliderCount} colliders`);
    await assert.rejects(runtime.ensureReady(1000, 0), /outside/);
    let disposed = 0;
    scene.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.addEventListener('dispose', () => disposed++); });
    runtime.dispose(); runtime.dispose();
    assert.ok(disposed >= 10);
    assert.equal(world.colliders.len(), 0); assert.equal(scene.children.length, 0);
    await assert.rejects(runtime.waitForIdle(), /disposed/);
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
});

async function drive(path: readonly { x: number; y: number; z: number }[], model: VehicleModelId) {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new IslandRuntime(scene, world);
  try {
    world.step();
    const car = new Vehicle(scene, world, islandSpawn(path[0]), 1.45, islandSurfaceAt, islandWaterHeight, undefined, model);
    car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0),
      Math.atan2(-(path[1].x - path[0].x), -(path[1].z - path[0].z))), true);
    let next = 1, air = 0, peakAir = 0, under = false, over = false;
    for (let tick = 0; tick < 18000 && next < path.length; tick++) {
      const target = path[next], dx = target.x - car.position.x, dz = target.z - car.position.z;
      if (Math.hypot(dx, dz) < 3.2) { next++; continue; }
      const f = new THREE.Vector3(0, 0, -1).applyQuaternion(car.body.rotation());
      const angle = Math.atan2(dx, -dz) - Math.atan2(f.x, -f.z);
      const error = Math.atan2(Math.sin(angle), Math.cos(angle));
      car.beforeStep({ steer: Math.max(-1, Math.min(1, error * 2)), forward: tick > 90 && Math.abs(car.speed) < (Math.abs(error) > 0.5 ? 3 : 6), reverse: false }, 1 / 60);
      world.step(); car.capture();
      if (tick > 90) {
        air = car.contactCount() === 0 ? air + 1 : 0; peakAir = Math.max(peakAir, air);
        assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(car.body.rotation()).y > 0.7, 'remain upright');
      }
      if (Math.abs(car.position.x) < 4 && Math.abs(car.position.z) < 4) {
        if (car.position.y < 8) under = true;
        if (car.position.y > 25) over = true;
      }
    }
    assert.equal(next, path.length, `${model} stalled approaching ${next}: ${JSON.stringify(car.position)}`);
    assert.ok(peakAir < 30, `unexpected flight: ${peakAir}`);
    return { under, over };
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
}

for (const model of ['modern', 'classic'] as const) for (const reverse of [false, true]) {
  test(`${model} drives the complete Island loop ${reverse ? 'backwards' : 'forwards'} through and over the aqueduct`, async () => {
    const loop = ISLAND_ROUTES.slice(0, 4).flatMap((route, i) => i ? route.points.slice(1) : route.points);
    const result = await drive(reverse ? [...loop].reverse() : loop, model);
    assert.ok(result.under && result.over, 'actually traverse both stacked routes, not just approach the landmark');
  });
}

test('rough shortcut is optional, joins the climb and supports actual driving both ways', async () => {
  const path = ISLAND_ROUTES[4].points;
  await drive(path, 'classic');
  await drive([...path].reverse(), 'modern');
});

test('an overturned car rights on the lower trail without teleporting onto the aqueduct', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new IslandRuntime(scene, world);
  try {
    const car = new Vehicle(scene, world, { x: 0, y: 5.85, z: 0 }, 1.45, islandSurfaceAt, islandWaterHeight);
    world.step();
    car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), true);
    car.capture();
    assert.equal(car.tryRight(), true);
    for (let i = 0; i < 90; i++) {
      car.beforeStep({ steer: 0, forward: false, reverse: false }, 1 / 60); world.step(); car.capture();
    }
    assert.equal(car.contactCount(), 4);
    assert.ok(car.position.y > 5 && car.position.y < 7);
    assert.ok(Math.abs(car.position.x) < 0.1 && Math.abs(car.position.z) < 0.1);
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
});
