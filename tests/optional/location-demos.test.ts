import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { AREAS, isAreaId } from '../../src/game/areas';
import { LocationDemoRuntime } from '../../src/game/location-demos';
import {
  DEMOS, DEMO_IDS, demoGroundHeight, demoDrivingHeight, demoSpawn, demoSurfaceAt, demoWaterHeight,
  demoTerrainGeometry, demoWaterGeometry, demoRouteSample, type DemoId, type DemoPoint,
} from '../../src/game/location-demo-terrain';
import { demoTrees, demoObstacleGeometry } from '../../src/game/location-demo-scenery';
import {
  demoObstacles, QUARRY_CHAMBER, QUARRY_COVER, QUARRY_DESCENT, WOODLAND_RIDGE,
} from '../../src/game/location-demo-adventures';
import { Vehicle, type VehicleModelId } from '../../src/game/vehicle';
import { disposeScene } from '../../src/game/dispose';

before(async () => { await RAPIER.init(); });
test('pilots have different driving landforms and surfaces, not just different colours', () => {
  assert.equal(demoSurfaceAt('dune-sea', 30, -104), 'sand');
  assert.equal(demoSurfaceAt('dune-sea', -40, 25), 'dirt');
  assert.ok(demoGroundHeight('dune-sea', 30, -104) - demoGroundHeight('dune-sea', -40, 25) > 14);
  assert.ok(demoGroundHeight('old-quarry', -70, 80) - demoGroundHeight('old-quarry', 25, 28) > 25);
  assert.ok(demoGroundHeight('red-canyon', 44, 32) - demoGroundHeight('red-canyon', -60, 25) > 15);
  assert.equal(demoWaterHeight('autumn-woods', 45, -25), 0);
  assert.equal(demoSurfaceAt('autumn-woods', 45, -25), 'water');
  assert.equal(demoSurfaceAt('autumn-woods', 45, 45), 'dirt');
});

test('Copper Falls has a wet upstream source, an exposed supported drop and a connected creek outlet', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new LocationDemoRuntime('autumn-woods', scene, world);
  try {
    assert.equal(demoWaterHeight('autumn-woods', 60, -55), 3.8);
    for (let x = 45; x <= 50; x += 0.25) assert.equal(demoWaterHeight('autumn-woods', x, -55), 0, `outlet at ${x}`);
    const mesh = scene.getObjectByName('Copper Falls') as THREE.Mesh, p = mesh.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++)
      assert.ok(p.getY(i) > demoGroundHeight('autumn-woods', p.getX(i), p.getZ(i)), `buried falling water at ${p.getX(i)},${p.getZ(i)}`);
    for (let i = 0; i < p.count; i += 3) for (let u = 0; u <= 8; u++) for (let v = 0; v <= 8 - u; v++) {
      const weights = [1 - (u + v) / 8, u / 8, v / 8];
      const x = weights.reduce((sum, w, k) => sum + w * p.getX(i + k), 0);
      const y = weights.reduce((sum, w, k) => sum + w * p.getY(i + k), 0);
      const z = weights.reduce((sum, w, k) => sum + w * p.getZ(i + k), 0);
      assert.ok(y > demoGroundHeight('autumn-woods', x, z), `buried falling-water triangle at ${x},${z}`);
    }
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
});

for (const id of DEMO_IDS) {
  test(`${id}: internal entry, dry level start, exact deterministic terrain and clear routes`, () => {
    assert.equal(isAreaId(id), false); assert.equal(AREAS[id].gravity, undefined); assert.equal(AREAS[id].handling, undefined);
    const start = DEMOS[id].loop[0];
    assert.equal(demoWaterHeight(id, start.x, start.z), null);
    assert.equal(demoSpawn(id).y, start.y + 1.2);
    for (const dx of [-3, 0, 3]) for (const dz of [-3, 0, 3])
      assert.ok(Math.abs(demoGroundHeight(id, start.x + dx, start.z + dz) - start.y) < 0.001);
    const terrain = demoTerrainGeometry(id), other = demoTerrainGeometry(id);
    try {
      assert.deepEqual(terrain.getAttribute('position').array, other.getAttribute('position').array);
      const p = terrain.getAttribute('position'), index = terrain.index!;
      for (let i = 0; i < index.count; i += 303) {
        const ids = [0, 1, 2].map(k => index.getX(i + k));
        const x = ids.reduce((sum, n) => sum + p.getX(n), 0) / 3;
        const z = ids.reduce((sum, n) => sum + p.getZ(n), 0) / 3;
        const y = ids.reduce((sum, n) => sum + p.getY(n), 0) / 3;
        assert.ok(Math.abs(demoGroundHeight(id, x, z) - y) < 0.00002);
      }
      if (id === 'autumn-woods') for (const level of [0, 3.8]) {
        const water = demoWaterGeometry(terrain, level, level ? [55, -60, 96, -50] : undefined);
        const p = water.getAttribute('position');
        assert.ok(p.count > 100);
        for (let i = 0; i < p.count; i++)
          assert.ok(demoGroundHeight(id, p.getX(i), p.getZ(i)) <= level + 0.00005, 'water cannot cover dry terrain');
        water.dispose();
      }
    } finally { terrain.dispose(); other.dispose(); }
    for (const tree of demoTrees(id)) {
      assert.ok(demoRouteSample(id, tree.x, tree.z).distance >= 10);
      assert.equal(tree.y, demoGroundHeight(id, tree.x, tree.z));
    }
    const loop = DEMOS[id].loop;
    for (let i = 1; i < loop.length; i++) {
      const a = loop[i - 1], b = loop[i], length = Math.hypot(b.x - a.x, b.z - a.z);
      for (const side of [-2.5, 0, 2.5]) {
        let previous: number | undefined;
        for (let step = 0; step <= Math.ceil(length); step++) {
          const t = step / Math.ceil(length), x = a.x + (b.x - a.x) * t - (b.z - a.z) / length * side;
          const z = a.z + (b.z - a.z) * t + (b.x - a.x) / length * side, h = demoDrivingHeight(id, x, z);
          if (previous !== undefined) assert.ok(Math.abs(h - previous) < 0.55, `steep ${id} at ${x},${z}: ${h - previous}`);
          previous = h;
          assert.ok((demoWaterHeight(id, x, z) ?? h) - h < 0.4, 'easy circuit avoids deep water');
        }
      }
    }
  });
  test(`${id}: resident resources, matching passage/landmark collision and disposal`, async () => {
    const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    const runtime = new LocationDemoRuntime(id, scene, world);
    try {
      world.step(); scene.updateMatrixWorld(true);
      assert.ok(runtime.stats.triangles < 230_000, `${runtime.stats.triangles} triangles`);
      assert.ok(runtime.stats.colliderCount <= 10); await runtime.ensureReady(0, 0);
      for (const name of ['Grounded rocks', 'Tree trunks']) {
        const mesh = scene.getObjectByName(name) as THREE.Mesh | undefined;
        if (!mesh) continue;
        const p = mesh.geometry.getAttribute('position');
        for (let i = 0; i < p.count; i++)
          assert.ok(demoRouteSample(id, p.getX(i), p.getZ(i)).distance > 4, `${name} blocks a route`);
      }
      if (id === 'red-canyon') {
        assert.equal(world.castRay(new RAPIER.Ray({ x: -7, y: 10, z: -65 }, { x: 1, y: 0, z: 0 }), 14, true), null);
        const hit = world.castRay(new RAPIER.Ray({ x: 0, y: 50, z: -65 }, { x: 0, y: -1, z: 0 }), 50, true);
        assert.ok(hit && 50 - hit.timeOfImpact > 30, 'Echo Arch has a solid roof');
      }
      if (id === 'autumn-woods') {
        const hit = world.castRay(new RAPIER.Ray({ x: 45, y: 8, z: 45 }, { x: 0, y: -1, z: 0 }), 10, true);
        assert.ok(hit && Math.abs(8 - hit.timeOfImpact - 4) < 0.001, 'visible bridge deck is solid');
      }
      const count = runtime.stats.triangles; runtime.update(100, 100);
      assert.equal(runtime.stats.triangles, count);
      await assert.rejects(runtime.ensureReady(400, 0), /outside/);
      let disposed = 0;
      scene.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.addEventListener('dispose', () => disposed++); });
      console.log(`${id}: ${count} triangles, ${runtime.stats.colliderCount} colliders`);
      runtime.dispose(); runtime.dispose();
      assert.ok(disposed >= 3); assert.equal(scene.children.length, 0); assert.equal(world.colliders.len(), 0);
      await assert.rejects(runtime.waitForIdle(), /disposed/);
    } finally { runtime.dispose(); world.free(); disposeScene(scene); }
  });
}

async function drive(id: DemoId, path: readonly DemoPoint[], model: VehicleModelId, maximumSpeed = 5.5, observe?: (car: Vehicle) => void) {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new LocationDemoRuntime(id, scene, world);
  try {
    world.step();
    const start = path[0], car = new Vehicle(scene, world, { ...start, y: demoDrivingHeight(id, start.x, start.z) + 1.2 }, 1.45,
      (x, z) => demoSurfaceAt(id, x, z), (x, z) => demoWaterHeight(id, x, z), undefined, model);
    car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0),
      Math.atan2(-(path[1].x - start.x), -(path[1].z - start.z))), true);
    let next = 1, peakAir = 0, air = 0, maxWater = 0;
    for (let tick = 0; tick < 18000 && next < path.length; tick++) {
      const target = path[next], dx = target.x - car.position.x, dz = target.z - car.position.z;
      if (Math.hypot(dx, dz) < 3) { next++; continue; }
      const f = new THREE.Vector3(0, 0, -1).applyQuaternion(car.body.rotation());
      const angle = Math.atan2(dx, -dz) - Math.atan2(f.x, -f.z), error = Math.atan2(Math.sin(angle), Math.cos(angle));
      car.beforeStep({ steer: Math.max(-1, Math.min(1, error * 2)),
        forward: tick > 90 && Math.abs(car.speed) < (Math.abs(error) > 0.5 ? Math.min(3, maximumSpeed) : maximumSpeed), reverse: false }, 1 / 60);
      world.step(); car.capture(); maxWater = Math.max(maxWater, car.waterDepth);
      if (tick > 90) observe?.(car);
      if (tick > 90) {
        air = car.contactCount() === 0 ? air + 1 : 0; peakAir = Math.max(peakAir, air);
        assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(car.body.rotation()).y > 0.65, `${id} tips at ${JSON.stringify(car.position)}`);
      }
    }
    assert.equal(next, path.length, `${id}/${model} stalled before ${next}: ${JSON.stringify(car.position)}`);
    assert.ok(peakAir < 35, `${id} unexpected flight: ${peakAir}`);
    assert.ok(maxWater < 0.45, `${id} deep water: ${maxWater}`);
    if (id === 'autumn-woods' && path.some(p => p.x === 45 && p.z === -25))
      assert.ok(maxWater > 0.1, 'the actual car must cross the wet ford, not an invisible dry bridge');
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
}
test('adventure obstacles are deterministic solid shapes, embedded rather than floating or invisible ramps', () => {
  for (const id of ['old-quarry', 'autumn-woods'] as const) for (const obstacle of demoObstacles(id)) {
    const a = demoObstacleGeometry(id, obstacle), b = demoObstacleGeometry(id, obstacle);
    try {
      assert.deepEqual(a.getAttribute('position').array, b.getAttribute('position').array);
      const positions = a.getAttribute('position'), heights = Array.from({ length: positions.count }, (_, i) =>
        positions.getY(i) - demoGroundHeight(id, positions.getX(i), positions.getZ(i)));
      assert.ok(Math.min(...heights) < -0.02, `${obstacle.name} must be embedded`);
      assert.ok(Math.max(...heights) > 0.15 && Math.max(...heights) < 0.45, obstacle.name);
      assert.ok(demoRouteSample(id, obstacle.x, obstacle.z, false).distance > 8, 'relaxed bypass stays clear');
    } finally { a.dispose(); b.dispose(); }
  }
});

test('Deep Cut has a real covered descending passage, a wider chamber, a second exit and safe local recovery', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new LocationDemoRuntime('old-quarry', scene, world);
  try {
    world.step();
    assert.ok(DEMOS['old-quarry'].loop[0].y - demoGroundHeight('old-quarry', 65, -110) > 54);
    const roof = scene.getObjectByName('Deep Cut roof') as THREE.Mesh;
    for (const p of QUARRY_COVER.slice(1, -1)) {
      const floor = demoGroundHeight('old-quarry', p.x, p.z);
      const hit = world.castRay(new RAPIER.Ray({ x: p.x, y: floor + 1, z: p.z }, { x: 0, y: 1, z: 0 }), 70, true);
      assert.ok(hit && hit.timeOfImpact > 4 && hit.timeOfImpact < 14, `actual ceiling above ${p.x},${p.z}`);
      const visual = new THREE.Raycaster(v3(p.x, floor + 1, p.z), v3(0, 1, 0)).intersectObject(roof);
      assert.ok(visual.length && Math.abs(visual[0].distance - hit.timeOfImpact) < 0.001, 'roof render/collision agreement');
    }
    for (const p of [QUARRY_DESCENT[1], QUARRY_DESCENT[8]]) {
      const hit = world.castRay(new RAPIER.Ray({ x: p.x, y: demoGroundHeight('old-quarry', p.x, p.z) + 1, z: p.z },
        { x: 0, y: 1, z: 0 }), 70, true);
      assert.ok(hit === null, `exterior approach at ${p.x},${p.z} must be open; hit ${hit?.timeOfImpact}`);
    }
    for (const dx of [-5, 0, 5]) for (const dz of [-5, 0, 5])
      assert.ok(Math.abs(demoGroundHeight('old-quarry', QUARRY_CHAMBER.x + dx, QUARRY_CHAMBER.z + dz) - QUARRY_CHAMBER.y) < 0.01,
        'broad level chamber allows turning');
    const car = new Vehicle(scene, world, { ...QUARRY_CHAMBER, y: QUARRY_CHAMBER.y + 0.7 }, 1.45,
      (x, z) => demoSurfaceAt('old-quarry', x, z));
    car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(v3(0, 0, 1), Math.PI), true);
    world.step();
    assert.equal(car.tryRight(), true); assert.ok(car.position.y < QUARRY_CHAMBER.y + 2, 'recovery must not jump to the roof');
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
});
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
for (const model of ['classic', 'modern'] as const) test(`${model}: turns around inside the underground chamber`, async () => {
  const path = Array.from({ length: 9 }, (_, i) => ({
    x: QUARRY_CHAMBER.x + Math.cos(i * Math.PI / 4) * 5.5,
    z: QUARRY_CHAMBER.z + Math.sin(i * Math.PI / 4) * 5.5, y: QUARRY_CHAMBER.y,
  }));
  await drive('old-quarry', path, model, 2.3);
});
for (const id of ['old-quarry', 'autumn-woods'] as const) for (const model of ['classic', 'modern'] as const) {
  for (const reverse of [false, true]) test(`${id}: ${model} drives the full tactile adventure ${reverse ? 'reverse' : 'forward'}`, async () => {
    const source = id === 'old-quarry' ? QUARRY_DESCENT : WOODLAND_RIDGE;
    let low = Infinity, high = -Infinity;
    await drive(id, reverse ? [...source].reverse() : source, model, 3.2, car => {
      low = Math.min(low, car.position.y); high = Math.max(high, car.position.y);
    });
    assert.ok(id === 'old-quarry' ? low < -23 && high > 17 : high > 43 && low < 10, 'drive the actual vertical journey');
  });
  for (const obstacle of demoObstacles(id)) for (const reverse of [false, true])
    test(`${model}: tactile contact across ${obstacle.name} ${reverse ? 'reverse' : 'forward'}`, async () => {
      const dx = -Math.sin(obstacle.heading) * (reverse ? -1 : 1), dz = -Math.cos(obstacle.heading) * (reverse ? -1 : 1);
      const path = [-10, 10].map(distance => ({ x: obstacle.x + dx * distance, z: obstacle.z + dz * distance, y: 0 }));
      let lift = 0, articulation = 0;
      // This face needs a controlled run-up with load-bounded tyre forces.
      const speed = obstacle.name === 'Diagonal fallen oak' && !reverse ? 3.2 : 2.7;
      await drive(id, path, model, speed, car => {
        const heights = [];
        for (let i = 0; i < 4; i++) {
          const point = car.controller.wheelContactPoint(i);
          if (point && car.controller.wheelIsInContact(i)) {
            const height = point.y - demoGroundHeight(id, point.x, point.z);
            lift = Math.max(lift, height); heights.push(height);
          }
        }
        if (heights.length >= 2) articulation = Math.max(articulation, Math.max(...heights) - Math.min(...heights));
      });
      assert.ok(lift > 0.1, `${obstacle.name}: real wheel lift ${lift}`);
      assert.ok(articulation > 0.08, `${obstacle.name}: independent wheel contact ${articulation}`);
    });
}
for (const id of DEMO_IDS) for (const reverse of [false, true]) {
  for (const model of ['classic', 'modern'] as const) test(`${id}: ${model} drives entire ${reverse ? 'reverse' : 'forward'} circuit`, async () => {
    await drive(id, reverse ? [...DEMOS[id].loop].reverse() : DEMOS[id].loop, model);
  });
  test(`${id}: optional line ${reverse ? 'reverse' : 'forward'} reconnects`, async () => {
    await drive(id, reverse ? [...DEMOS[id].option].reverse() : DEMOS[id].option, 'classic');
  });
}
