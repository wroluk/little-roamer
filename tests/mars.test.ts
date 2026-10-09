import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { MARS_ROUTES, MARS_STARTS, generateMarsChunk, marsSurfaceHeight, marsSurfaceAt, marsSpawn, nearestMarsStart } from '../src/game/mars-terrain';
import { LocalMarsTransport, MarsStreamingRuntime, type MarsTransport } from '../src/game/mars-streaming';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';
import { groundMarsRock, marsRockGeometry } from '../src/game/mars-landmarks';
before(async () => { await RAPIER.init(); });

test('coarse Mars tiles retain every detailed perimeter edge at steep rim transitions', () => {
  for (const [cx, cz] of [[-4, -3], [3, -3], [-2, 3], [2, -4]]) {
    const fine = generateMarsChunk(cx, cz), coarse = generateMarsChunk(cx, cz, 4);
    const positions = new Map<string, number>();
    for (let i = 0; i < coarse.vertices.length; i += 3) positions.set(`${coarse.vertices[i]},${coarse.vertices[i + 2]}`, coarse.vertices[i + 1]);
    for (let j = 0; j <= 40; j++) for (let i = 0; i <= 40; i++) {
      if (i !== 0 && i !== 40 && j !== 0 && j !== 40) continue;
      const k = (j * 41 + i) * 3;
      assert.equal(positions.get(`${fine.vertices[k]},${fine.vertices[k + 2]}`), fine.vertices[k + 1]);
    }
    const edges = new Map<string, number>();
    for (let i = 0; i < coarse.indices.length; i += 3) for (let j = 0; j < 3; j++) {
      const edge = [coarse.indices[i + j], coarse.indices[i + (j + 1) % 3]].sort((a, b) => a - b).join(',');
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
    let boundary = 0;
    for (const [edge, count] of edges) {
      assert.ok(count === 1 || count === 2);
      if (count !== 1) continue;
      boundary++;
      const [a, b] = edge.split(',').map(Number).map(i => i * 3);
      assert.ok(Math.abs(Math.hypot(coarse.vertices[a] - coarse.vertices[b], coarse.vertices[a + 2] - coarse.vertices[b + 2]) - 2.4) < 0.00005);
    }
    assert.equal(boundary, 160, 'all four sides have 40 matching fine edges');
  }
});

test('rock skirts stay buried across steep footprints and shape seeds change silhouettes', () => {
  const silhouettes = new Set<string>();
  for (const [x, z, width, height] of [[-37, -275, 7, 11], [-22, -285, 5, 16], [26, -282, 8, 13], [355, 130, 2, 1]]) {
    for (const seed of [1, 5, 12]) {
      const rock = groundMarsRock(marsRockGeometry(width, height, seed).rotateY(seed), x, z);
      const p = rock.getAttribute('position');
      silhouettes.add(Array.from(p.array).slice(27, 54).join(','));
      for (let i = 0; i < 9; i++) {
        const a = new THREE.Vector3().fromBufferAttribute(p, i), b = new THREE.Vector3().fromBufferAttribute(p, (i + 1) % 9);
        for (let j = 0; j <= 40; j++) {
          const point = a.clone().lerp(b, j / 40);
          assert.ok(point.y < marsSurfaceHeight(point.x, point.z), `exposed rock base at ${point.x},${point.z}`);
        }
      }
      rock.dispose();
    }
  }
  assert.equal(silhouettes.size, 12);
});

test('Mars chunks are deterministic, share exact seam vertices and colors, and agree with surface sampling', () => {
  for (const [cx, cz] of [[-1, -3], [0, -2], [-1, 0], [2, 1]]) {
    const a = generateMarsChunk(cx, cz), b = generateMarsChunk(cx + 1, cz);
    assert.deepEqual(a, generateMarsChunk(cx, cz));
    assert.ok(a.vertices.every(Number.isFinite));
    for (let j = 0; j <= 40; j++) for (let k = 0; k < 3; k++) {
      assert.equal(a.vertices[(j * 41 + 40) * 3 + k], b.vertices[j * 41 * 3 + k]);
      assert.equal(a.colors[(j * 41 + 40) * 3 + k], b.colors[j * 41 * 3 + k]);
    }
    const down = generateMarsChunk(cx, cz + 1);
    for (let i = 0; i <= 40; i++) for (let k = 0; k < 3; k++)
      assert.equal(a.vertices[(40 * 41 + i) * 3 + k], down.vertices[i * 3 + k]);
    // Centroids on both diagonal halves verify interpolation, not just lattice corners.
    for (let i = 0; i < a.indices.length; i += 111) {
      const v = [0, 1, 2].map(k => a.indices[i + k] * 3);
      const x = v.reduce((n, j) => n + a.vertices[j], 0) / 3;
      const z = v.reduce((n, j) => n + a.vertices[j + 2], 0) / 3;
      const y = v.reduce((n, j) => n + a.vertices[j + 1], 0) / 3;
      assert.ok(Math.abs(marsSurfaceHeight(x, z) - y) < 0.0001, `${x},${z}`);
    }
  }
});

test('pilot roads have broad graded shoulders and regional starts are flat', () => {
  for (const route of MARS_ROUTES) for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    for (const side of [-3, 0, 3]) {
      let previous: number | undefined;
      const steps = Math.ceil(length);
      for (let j = 0; j <= steps; j++) {
        const x = a.x + dx * j / steps + dz / length * side, z = a.z + dz * j / steps - dx / length * side;
        const h = marsSurfaceHeight(x, z);
        if (previous !== undefined) assert.ok(Math.abs(h - previous) / (length / steps) < 0.55, `${route.name} grade at ${x},${z}`);
        previous = h;
      }
    }
  }
  for (const start of MARS_STARTS) for (const dx of [-3, 0, 3]) for (const dz of [-3, 0, 3])
    assert.ok(Math.abs(marsSurfaceHeight(start.position.x + dx, start.position.z + dz) - start.position.y) < 0.1);
  assert.equal(nearestMarsStart(0, -220).id, 'crown-crater');
  assert.equal(marsSurfaceAt(110, 80), 'mars-dust');
});

test('Mars stream bounds, transitions, and cleanup leave no terrain or scenery behind', async () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new MarsStreamingRuntime(scene, world, new LocalMarsTransport());
  try {
    for (const [x, z, distantDish] of [[0, 8, true], [0, -120, false], [0, -295, false], [210, -210, false], [0, 8, true]] as const) {
      await runtime.ensureReady(x, z);
      assert.equal(scene.getObjectByName('Mars · distant dish')?.visible, distantDish, 'distant receiver yields to detailed scenery and returns after unloading');
      assert.ok(runtime.isCollisionReadyAt(x, z));
      assert.ok(runtime.stats.activeRender <= 25 && runtime.stats.activePhysics <= 9);
      assert.equal(runtime.stats.queued, 0);
    }
    runtime.dispose(); runtime.dispose();
    assert.equal(world.colliders.len(), 0);
    assert.equal(scene.children.length, 0);
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
});

test('failed and late Mars generation cannot produce false-ready destinations', async () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const transport: MarsTransport = { generate: async () => { throw new Error('worker unavailable'); }, dispose() {} };
  const runtime = new MarsStreamingRuntime(scene, world, transport);
  await assert.rejects(runtime.ensureReady(0, 8), /worker unavailable/);
  assert.equal(runtime.isCollisionReadyAt(0, 8), false); runtime.dispose(); world.free();
  const world2 = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const pending: (() => void)[] = [];
  const slow: MarsTransport = { generate: (cx, cz) => new Promise(resolve => pending.push(() => resolve(generateMarsChunk(cx, cz)))), dispose() {} };
  const late = new MarsStreamingRuntime(scene, world2, slow);
  late.update(0, 8); late.dispose(); pending.forEach(resolve => resolve()); await Promise.resolve();
  assert.equal(scene.children.length, 0); assert.equal(world2.colliders.len(), 0); world2.free();
});

test('the Great Ring stops the Scout at all four visible basin edges', async () => {
  for (const [x, z] of [[0, -318], [0, 318], [-318, 0], [318, 0]]) {
    const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    const runtime = new MarsStreamingRuntime(scene, world, new LocalMarsTransport());
    try {
      await runtime.ensureReady(x, z); world.step();
      const car = new Vehicle(scene, world, marsSpawn({ x, z }), 1.45, marsSurfaceAt, () => null, undefined, 'mars-scout');
      car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-x, -z)), true);
      for (let tick = 0; tick < 1500; tick++) {
        runtime.update(car.position.x, car.position.z); if (runtime.stats.queued) await runtime.waitForIdle();
        car.beforeStep({ steer: 0, forward: tick > 90, reverse: false }, 1 / 60); world.step(); car.capture();
        assert.ok(Math.max(Math.abs(car.position.x), Math.abs(car.position.z)) < 380, `escaped at ${car.position.x},${car.position.z}`);
        assert.ok(car.position.y > marsSurfaceHeight(car.position.x, car.position.z) - 0.2);
      }
    } finally { runtime.dispose(); world.free(); disposeScene(scene); }
  }
});

for (const route of MARS_ROUTES) for (const reversed of [false, true]) test(`Mars Scout drives ${route.name}${reversed ? ' in reverse direction' : ''}`, async () => {
  const path = reversed ? [...route.points].reverse() : route.points;
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new MarsStreamingRuntime(scene, world, new LocalMarsTransport());
  try {
    await runtime.ensureReady(path[0].x, path[0].z); world.step();
    const car = new Vehicle(scene, world, marsSpawn(path[0]), 1.45, marsSurfaceAt, () => null, undefined, 'mars-scout');
    car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-(path[1].x - path[0].x), -(path[1].z - path[0].z))), true);
    let next = 1, minHeight = Infinity;
    for (let tick = 0; tick < 14000 && next < path.length; tick++) {
      const target = path[next], dx = target.x - car.position.x, dz = target.z - car.position.z;
      if (Math.hypot(dx, dz) < 3.5) { next++; continue; }
      runtime.update(car.position.x, car.position.z);
      if (runtime.stats.queued) await runtime.waitForIdle();
      const f = new THREE.Vector3(0, 0, -1).applyQuaternion(car.body.rotation());
      const desired = Math.atan2(dx, -dz), heading = Math.atan2(f.x, -f.z);
      const error = Math.atan2(Math.sin(desired - heading), Math.cos(desired - heading));
      car.beforeStep({ steer: Math.max(-1, Math.min(1, error * 2)), forward: tick > 90 && Math.abs(car.speed) < 6, reverse: false }, 1 / 60);
      world.step(); car.capture();
      minHeight = Math.min(minHeight, car.position.y - marsSurfaceHeight(car.position.x, car.position.z));
    }
    assert.equal(next, path.length, `stopped before ${next} at ${car.position.x},${car.position.z}; contacts=${car.contactCount()}`);
    assert.ok(minHeight > -0.15, 'vehicle stays above visible collision terrain');
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
});
