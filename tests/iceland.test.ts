import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { generateIcelandChunk, icelandSurfaceHeight, icelandSurfaceAt, icelandWaterHeight, icelandDrivingHeight, COASTAL_TURNOUT, shoreZ,
  icelandSpawn, riverX, FORD_PATH, BRIDGE_PATH, ICELAND_LOOP, type IcelandPoint } from '../src/game/iceland-terrain';
import { IcelandStreamingRuntime, LocalIcelandTransport, type IcelandTransport } from '../src/game/iceland-streaming';
import { ICELAND_RING_ROAD, ICELAND_RING_LENGTH, ringRoadAt } from '../src/game/iceland-road';
import { buildIcelandRoadGeometry } from '../src/game/iceland-road-scenery';
import { Vehicle } from '../src/game/vehicle';
import { buildSkogafossWater, FALL } from '../src/game/iceland-waterfall';
import { disposeScene } from '../src/game/dispose';
before(async () => { await RAPIER.init(); });

test('Skógafoss drops vertically with a bounded moving spray plume that respects reduced motion', () => {
  const scene = new THREE.Scene(), effect = buildSkogafossWater(scene);
  const water = scene.getObjectByName('Skógafoss · vertical falling water') as THREE.Mesh;
  water.geometry.computeBoundingBox(); const bounds = water.geometry.boundingBox!;
  assert.ok(bounds.max.y - bounds.min.y > 40);
  assert.ok(bounds.max.z - bounds.min.z < 1, 'water must not follow a sloping terrain strip');
  const positions = water.geometry.attributes.position;
  const first = 20, second = 41 + first, rounded = 4 * 41 + first;
  assert.ok(positions.getZ(second) - positions.getZ(first) > 0.2,
    'the first falling row rolls out beyond the brink');
  assert.ok(positions.getY(first) - positions.getY(second) < 0.1,
    'the water turns over the lip before dropping vertically');
  assert.ok(positions.getY(first) - positions.getY(rounded) < 1.1,
    'the rounded overflow occupies only the top metre');
  for (let i = 0; i < positions.count; i++) if (positions.getY(i) >= FALL.top - 0.001)
    assert.ok(Math.abs(positions.getZ(i) - FALL.lipZ) < 0.001, 'the entire upper edge must meet the brink');
  const row = 41;
  for (let j = 0; j < 64; j++) {
    const left = positions.getX(j * row), nextLeft = positions.getX((j + 1) * row);
    const right = positions.getX(j * row + 40), nextRight = positions.getX((j + 1) * row + 40);
    assert.ok(nextLeft <= left && nextRight >= right, 'the falling sheet spreads smoothly without waved edges');
  }
  const spray = scene.getObjectByName('Skógafoss · spray') as THREE.InstancedMesh;
  assert.equal(spray.count, 56);
  const before = spray.instanceMatrix.array.slice(); effect.animate(1 / 30, false);
  assert.notDeepEqual(spray.instanceMatrix.array, before);
  const frozen = spray.instanceMatrix.array.slice(); effect.animate(1 / 30, true);
  assert.deepEqual(spray.instanceMatrix.array, frozen);
  disposeScene(scene); assert.equal(scene.children.length, 0);
});

test('Iceland meshes are deterministic with exact sampled triangles and matching normals at chunk/LOD seams', () => {
  for (const [cx, cz] of [[-6, 4], [-6, 5], [-6, 6], [-7, 7]]) {
    const c = generateIcelandChunk(cx, cz);
    assert.deepEqual(c, generateIcelandChunk(cx, cz));
    const neighbor = generateIcelandChunk(cx + 1, cz), coarse = generateIcelandChunk(cx, cz, true);
    const edge = new Map<string, number>();
    for (let i = 0; i < neighbor.vertices.length; i += 3) edge.set(`${neighbor.vertices[i]},${neighbor.vertices[i + 2]}`, i);
    const low = new Set<string>();
    for (let i = 0; i < coarse.vertices.length; i += 3) low.add(Array.from(coarse.vertices.subarray(i, i + 3)).join(','));
    for (let i = 0; i < c.vertices.length; i += 3) {
      const [x, , z] = c.vertices.subarray(i, i + 3), n = edge.get(`${x},${z}`);
      if (n !== undefined) {
        assert.deepEqual(c.vertices.subarray(i, i + 3), neighbor.vertices.subarray(n, n + 3));
        assert.deepEqual(c.normals.subarray(i, i + 3), neighbor.normals.subarray(n, n + 3));
      }
      if (Math.abs(x - cx * 96) < 0.001 || Math.abs(x - (cx + 1) * 96) < 0.001 || Math.abs(z - cz * 96) < 0.001 || Math.abs(z - (cz + 1) * 96) < 0.001)
        assert.ok(low.has(Array.from(c.vertices.subarray(i, i + 3)).join(',')));
    }
    for (let i = 0; i < c.indices.length; i += 57) {
      const ids = Array.from(c.indices.subarray(i, i + 3));
      const point = [0, 1, 2].map(axis => ids.reduce((sum, id) => sum + c.vertices[id * 3 + axis], 0) / 3);
      assert.ok(Math.abs(icelandSurfaceHeight(point[0], point[2]) - point[1]) < 0.001);
    }
  }
});

test('ford has a shallow broad bed, other river sections are deep, sea is deep', () => {
  for (let z = 581; z <= 589; z += 2) for (let x = riverX(z) - 5; x <= riverX(z) + 5; x += 2) {
    const depth = icelandWaterHeight(x, z)! - icelandSurfaceHeight(x, z);
    assert.ok(depth > 0.1 && depth < 0.4, `ford ${x},${z}: ${depth}`);
    assert.equal(icelandSurfaceAt(x, z), 'water');
  }
  assert.ok(icelandWaterHeight(riverX(550), 550)! - icelandSurfaceHeight(riverX(550), 550) > 1.5);
  assert.ok(icelandDrivingHeight(-531, 530) - icelandSurfaceHeight(-531, 530) > 3);
  assert.equal(icelandSurfaceAt(-531, 530), 'asphalt');
  assert.equal(icelandWaterHeight(-450, 740), 0);
  assert.ok(icelandSurfaceHeight(-450, 740) < -10);
});

async function drive(path: IcelandPoint[], model: 'modern' | 'classic', road = false) {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new IcelandStreamingRuntime(scene, world, new LocalIcelandTransport());
  let vehicleColliders = 0;
  try {
    await runtime.ensureReady(path[0].x, path[0].z); world.step();
    const car = new Vehicle(scene, world, icelandSpawn(path[0]), 1.45, icelandSurfaceAt, icelandWaterHeight, undefined, model);
    vehicleColliders = world.colliders.len() - runtime.stats.colliderCount;
    car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(path[0].x - path[1].x, path[0].z - path[1].z)), true);
    let next = 1, depth = 0;
    for (let tick = 0; tick < (road ? Math.ceil(ICELAND_RING_LENGTH / 4 * 60) : 16000) && next < path.length; tick++) {
      const dx = path[next].x - car.position.x, dz = path[next].z - car.position.z;
      if (Math.hypot(dx, dz) < 3) { next++; continue; }
      runtime.update(car.position.x, car.position.z); if (runtime.stats.queued) await runtime.waitForIdle();
      assert.ok(runtime.stats.activeRender <= 25 && runtime.stats.activePhysics <= 9);
      const f = new THREE.Vector3(0, 0, -1).applyQuaternion(car.body.rotation());
      const angle = Math.atan2(dx, -dz) - Math.atan2(f.x, -f.z), error = Math.atan2(Math.sin(angle), Math.cos(angle));
      car.beforeStep({ steer: Math.max(-1, Math.min(1, error * 2)), forward: tick > 90 && Math.abs(car.speed) < (Math.abs(error) > 0.5 ? 3 : road ? 8 : 5), reverse: false }, 1 / 60);
      world.step(); car.capture(); depth = Math.max(depth, car.waterDepth);
      assert.ok(car.position.y > icelandSurfaceHeight(car.position.x, car.position.z) - 1);
    }
    assert.equal(next, path.length, `${model}: stopped at ${JSON.stringify(car.position)}`);
    return depth;
  } finally {
    runtime.dispose(); assert.equal(world.colliders.len(), vehicleColliders); world.free(); disposeScene(scene);
  }
}
for (const model of ['modern', 'classic'] as const) {
  test(`${model} drives the Skógá ford and bridge in both directions with actual wheels`, async () => {
    for (const reverse of [false, true]) {
      const ford = reverse ? [...FORD_PATH].reverse() : FORD_PATH;
      assert.ok(await drive(ford, model) > 0.1);
      assert.equal(await drive(reverse ? [...BRIDGE_PATH].reverse() : BRIDGE_PATH, model), 0);
    }
  });
}
test('real Modern completes the river loop and Classic completes its reverse', async () => {
  await drive(ICELAND_LOOP, 'modern'); await drive([...ICELAND_LOOP].reverse(), 'classic');
});
test('the black coast stalls a powered car in deep water and reset recovers onto dry land', async () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new IcelandStreamingRuntime(scene, world, new LocalIcelandTransport());
  try {
    await runtime.ensureReady(-450, 655); world.step();
    const car = new Vehicle(scene, world, icelandSpawn({ x: -450, z: 655 }), 1.45, icelandSurfaceAt, icelandWaterHeight);
    car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), true);
    let maximumDepth = 0;
    for (let tick = 0; tick < 2400; tick++) {
      runtime.update(car.position.x, car.position.z); if (runtime.stats.queued) await runtime.waitForIdle();
      car.beforeStep({ steer: 0, forward: tick > 90, reverse: false }, 1 / 60);
      world.step(); car.capture(); maximumDepth = Math.max(maximumDepth, car.waterDepth);
    }
    assert.ok(maximumDepth > 0.95, `depth ${maximumDepth}`);
    assert.ok(car.position.z < 760, `escaped sea boundary: ${car.position.z}`);
    assert.ok(Math.abs(car.speed) < 0.5, `did not stall: ${car.speed}`);
    await runtime.ensureReady(icelandSpawn().x, icelandSpawn().z);
    car.reset(icelandSpawn());
    for (let tick = 0; tick < 90; tick++) {
      car.beforeStep({ steer: 0, forward: false, reverse: false }, 1 / 60); world.step(); car.capture();
    }
    assert.equal(car.waterDepth, 0);
    assert.ok(car.position.y > icelandSurfaceHeight(car.position.x, car.position.z));
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
});
test('delayed/stale worker results stay unready and errors propagate; disposal removes every collider', async () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const pending: (() => void)[] = [];
  const transport: IcelandTransport = { generate: (cx, cz) => new Promise(resolve => pending.push(() => resolve(generateIcelandChunk(cx, cz)))), dispose() {} };
  const runtime = new IcelandStreamingRuntime(scene, world, transport);
  runtime.update(-489, 518); assert.equal(runtime.isCollisionReadyAt(-489, 518), false);
  runtime.update(-300, 600); pending.splice(0).forEach(f => f()); await runtime.waitForIdle();
  assert.equal(runtime.isCollisionReadyAt(-300, 600), true);
  assert.ok(runtime.stats.activeRender <= 25 && runtime.stats.activePhysics <= 9);
  runtime.dispose(); assert.equal(world.colliders.len(), 0); world.free(); disposeScene(scene);
  const failedWorld = new RAPIER.World({ x: 0, y: -18, z: 0 }), failedScene = new THREE.Scene();
  const failed = new IcelandStreamingRuntime(failedScene, failedWorld, { generate: async () => { throw new Error('injected worker failure'); }, dispose() {} });
  await assert.rejects(failed.ensureReady(-489, 518), /injected worker failure/);
  failed.dispose(); assert.equal(failedWorld.colliders.len(), 0); failedWorld.free(); disposeScene(failedScene);
});

test('Ring Road is closed, graded, inside the shore and crosses the river on a dry bridge', () => {
  assert.deepEqual(ICELAND_RING_ROAD[0], ICELAND_RING_ROAD.at(-1));
  assert.ok(ICELAND_RING_LENGTH > 4000);
  for (let i = 1; i < ICELAND_RING_ROAD.length; i++) {
    const p = ICELAND_RING_ROAD[i], a = ICELAND_RING_ROAD[i - 1];
    assert.ok(Math.abs(p.x) < 660 && Math.abs(p.z) < 660);
    const h = icelandDrivingHeight(p.x, p.z), water = icelandWaterHeight(p.x, p.z);
    assert.ok(water === null || water < h, `road water ${JSON.stringify(p)}`);
    assert.ok(Math.abs(h - icelandDrivingHeight(a.x, a.z)) / Math.hypot(p.x - a.x, p.z - a.z) < 0.3, `road grade ${JSON.stringify(p)}`);
    assert.ok(ringRoadAt(p.x, p.z).distance < 0.01);
  }
});
test('Modern drives the full Ring Road clockwise and Classic returns counterclockwise', async () => {
  await drive(ICELAND_RING_ROAD, 'modern', true);
  await drive([...ICELAND_RING_ROAD].reverse(), 'classic', true);
});

test('road pavement is one closed ribbon with no unshared segment ends or turn gaps', () => {
  const { pavement, markings, rows } = buildIcelandRoadGeometry();
  const edges = new Map<string, number>(), ids = pavement.index!.array;
  for (let i = 0; i < ids.length; i += 3) for (let j = 0; j < 3; j++) {
    const a = ids[i + j], b = ids[i + (j + 1) % 3], key = a < b ? `${a},${b}` : `${b},${a}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  }
  assert.equal([...edges.values()].filter(n => n === 1).length, rows * 2, 'only the two road verges may have open edges');
  assert.ok([...edges.values()].every(n => n === 1 || n === 2));
  pavement.dispose(); markings.dispose();
});
test('waterfall brink rests on the river bed and has unobstructed vertical clearance to the pool', () => {
  for (let x = FALL.x - 7; x <= FALL.x + 7; x += 1) {
    assert.ok(Math.abs(icelandSurfaceHeight(x, FALL.terrainLipZ) - (FALL.top - 0.24)) < 0.03);
    assert.ok(icelandSurfaceHeight(x, FALL.lipZ) < FALL.bottom, 'ground must remain behind the falling water');
  }
});

test('Skógá water follows the wet terrain and fades at its bank boundary', async () => {
  const { buildIcelandRiverGeometry, SKOGA_MOUTH_Z } = await import('../src/game/iceland-river');
  const geometry = buildIcelandRiverGeometry(), p = geometry.attributes.position, depth = geometry.attributes.waterDepth;
  const color = geometry.attributes.color;
  assert.equal(color.itemSize, 4, 'depth opacity uses the standard RGBA vertex-colour path');
  let bankVertices = 0, fordVertices = 0;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    assert.ok(z <= SKOGA_MOUTH_Z + 0.001, 'no river sheet beyond the sea-level join');
    const sampleZ = z > 468 && z < 468.09 && y > 40 ? 468 : z;
    assert.ok(icelandSurfaceHeight(x, sampleZ) <= y + 0.035, `water over dry ground at ${x}, ${z}`);
    if (depth.getX(i) < 0.0001) { bankVertices++; if (z < SKOGA_MOUTH_Z - 32) assert.ok(color.getW(i) < 0.01, 'the clipped bank fades out'); }
    if (Math.abs(z - 585) < 3 && Math.abs(x + 535) < 5) { fordVertices++; assert.ok(depth.getX(i) < 0.4); }
    if (z > 520 && z < 560 && depth.getX(i) > 1) assert.ok(color.getW(i) > 0.5, 'the main river stays visible');
  }
  assert.ok(bankVertices > 100, 'water has clipped bank edges');
  assert.ok(fordVertices > 10, 'shallow ford remains covered');
  const upperEdge: number[] = [], upstream: number[] = [];
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getZ(i) - FALL.lipZ) < 0.001 && p.getY(i) > 40) upperEdge.push(p.getX(i));
    if (Math.abs(p.getZ(i) - 444) < 0.001 && p.getY(i) > 40) upstream.push(p.getX(i));
  }
  assert.ok(upperEdge.length > 10 && upstream.length > 10);
  assert.ok(Math.abs(Math.min(...upperEdge) - (FALL.x - FALL.halfWidth)) < 1.5);
  assert.ok(Math.abs(Math.max(...upperEdge) - (FALL.x + FALL.halfWidth)) < 1.5);
  assert.ok(Math.max(...upstream) - Math.min(...upstream) > Math.max(...upperEdge) - Math.min(...upperEdge) + 4,
    'the upstream river narrows into the falling sheet');
  geometry.dispose();
});

test('upper Skógá closes naturally at its source and stays wet through the plateau to the brink', async () => {
  const { SKOGA_WATER_START, SKOGA_SOURCE_Z, riverLevel } = await import('../src/game/iceland-terrain');
  const { buildIcelandRiverGeometry } = await import('../src/game/iceland-river');
  const g = buildIcelandRiverGeometry(); g.computeBoundingBox();
  assert.ok(SKOGA_SOURCE_Z <= 100, 'the upper river reaches inland beyond the original short channel');
  assert.ok(g.boundingBox!.min.z > SKOGA_WATER_START + 10, 'source closes on terrain before the mesh boundary');
  assert.ok(g.boundingBox!.min.z < SKOGA_SOURCE_Z, 'rounded pool extends behind its centre');
  for (let z = SKOGA_SOURCE_Z; z <= 468; z += 2) {
    const x = riverX(z), level = riverLevel(z);
    assert.ok(icelandSurfaceHeight(x, z) < level - 0.15, `continuous wet bed at ${z}`);
    assert.equal(icelandWaterHeight(x, z), level);
  }
  // Photo mode retains the same bank geometry when the car is elsewhere.
  for (const cz of [0, 1, 2, 3, 4, 5, 6, 7]) {
    assert.deepEqual(generateIcelandChunk(-6, cz, true).vertices, generateIcelandChunk(-6, cz).vertices);
  }
  g.dispose();
});


test('narrow river reaches sea level before the ocean takes ownership', async () => {
  const { buildIcelandSeaGeometry, buildIcelandRiverGeometry, SKOGA_MOUTH_Z, SKOGA_SEA_Y,
    SKOGA_WATER_MIN_X, SKOGA_WATER_MAX_X } = await import('../src/game/iceland-river');
  const sea = buildIcelandSeaGeometry(), water = buildIcelandRiverGeometry();
  assert.ok(shoreZ(-539) < shoreZ(-620) - 10, 'shoreline bends into the tidal inlet');
  assert.ok(icelandSurfaceHeight(-539, 660) < 0 && icelandSurfaceHeight(-470, 660) > 0,
    'the river outlet opens to sea without cutting a straight beach-wide edge');
  const seaRay = new THREE.Mesh(sea, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const ray = new THREE.Raycaster();
  for (let z = 610; z < SKOGA_MOUTH_Z - 1; z += 3) {
    for (const x of [SKOGA_WATER_MIN_X + 1, riverX(z), SKOGA_WATER_MAX_X - 1]) {
      ray.set(new THREE.Vector3(x, 10, z), new THREE.Vector3(0, -1, 0));
      assert.equal(ray.intersectObject(seaRay).length, 0, 'no ocean visible through the riverbed');
    }
  }
  ray.set(new THREE.Vector3(-535, 10, SKOGA_MOUTH_Z + 1), new THREE.Vector3(0, -1, 0));
  assert.ok(ray.intersectObject(seaRay).length > 0, 'ocean starts at the narrow mouth');
  const p = water.attributes.position;
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getZ(i) - SKOGA_MOUTH_Z) < 0.001) {
    assert.ok(Math.abs(p.getY(i) - SKOGA_SEA_Y) < 0.0001);
    assert.ok(Math.abs(p.getX(i) - riverX(SKOGA_MOUTH_Z)) < 25,
      'river must meet the sea before its wet edge reaches the rectangular generator bound');
  }
  sea.dispose(); water.dispose(); (seaRay.material as THREE.Material).dispose();
});

test('Ring Road and bridge are asphalt while the gravel track and ford remain distinct', async () => {
  const { SURFACES } = await import('../src/game/surfaces');
  for (const p of ICELAND_RING_ROAD) assert.equal(icelandSurfaceAt(p.x, p.z), 'asphalt');
  assert.equal(icelandSurfaceAt(-531, 530), 'asphalt');
  assert.equal(icelandSurfaceAt(-490, 555), 'dirt');
  assert.equal(icelandSurfaceAt(-535, 585), 'water');
  assert.equal(SURFACES.asphalt.label, 'Asphalt');
  assert.equal(SURFACES.asphalt.particleRate, 0);
});

test('western Ring Road stays on the coastal shelf and the dirt trail has a broad dry turnout', () => {
  const west = ringRoadAt(-640, 420);
  assert.ok(west.distance < 3);
  assert.ok(west.height < 15, 'the Ring Road stays below the waterfall cliff');
  assert.ok(icelandSurfaceHeight(-640, 420) < 15);
  assert.equal(icelandSurfaceAt(COASTAL_TURNOUT.x, COASTAL_TURNOUT.z), 'dirt');
  for (const [dx, dz] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
    const x = COASTAL_TURNOUT.x + dx, z = COASTAL_TURNOUT.z + dz;
    assert.equal(icelandSurfaceAt(x, z), 'dirt');
    assert.equal(icelandWaterHeight(x, z), null);
  }
});

test('ground detail stays sparse, deterministic and clear of the paved driving surface', async () => {
  const { buildIcelandGroundDetail } = await import('../src/game/iceland-detail');
  const a = new THREE.Scene(), b = new THREE.Scene();
  const count = buildIcelandGroundDetail(a); assert.deepEqual(buildIcelandGroundDetail(b), count);
  assert.ok(count.stones > 300 && count.stones < 1800);
  assert.ok(count.shrubs > 200 && count.shrubs < 1300);
  assert.equal(count.collider.vertices.length / 3, 7 * (count.stones + count.shrubs));
  for (let j = 0; j < a.children.length; j++) {
    const mesh = a.children[j] as THREE.InstancedMesh;
    assert.equal(mesh.castShadow, false);
    assert.equal(mesh.receiveShadow, false);
    assert.deepEqual(mesh.instanceMatrix.array, (b.children[j] as THREE.InstancedMesh).instanceMatrix.array);
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, m); p.setFromMatrixPosition(m);
      assert.ok(ringRoadAt(p.x, p.z).distance > 6, 'road and bridge stay clear');
      assert.equal(icelandWaterHeight(p.x, p.z), null, 'detail stays out of the river');
    }
  }
  disposeScene(a); disposeScene(b);
});
