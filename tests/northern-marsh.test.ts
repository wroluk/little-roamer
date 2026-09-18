import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { MARSH_TRAILS, MARSH_START, MARSH_LOOKOUT, MARSH_POOLS } from '../src/game/northern-marsh';
import { generateNorthernChunk, sampledHeightAt, waterHeightAt, northernSurfaceAt, NORTHERN_SPAWN } from '../src/game/northern-terrain';
import { InProcessChunkTransport, NorthernStreamingRuntime } from '../src/game/northern-streaming';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';

before(async () => { await RAPIER.init(); });

test('marsh routes have only shallow ford water and stay below a 29-degree grade', () => {
  for (const route of MARSH_TRAILS) for (let i = 0; i < route.points.length - 1; i++) {
    const a = route.points[i], b = route.points[i + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.ceil(length);
    for (const side of [-2.5, 0, 2.5]) {
      let previous: number | undefined;
      for (let j = 0; j <= steps; j++) {
        const x = a.x + (b.x - a.x) * j / steps + (b.z - a.z) / length * side;
        const z = a.z + (b.z - a.z) * j / steps - (b.x - a.x) / length * side;
        const h = sampledHeightAt(x, z);
        const water = waterHeightAt(x, z);
        if (route.name === 'Reed Ford') assert.ok(water === null || water - h < 0.38);
        else assert.equal(water, null, `${route.name} unexpected water at ${x},${z}`);
        if (previous !== undefined) assert.ok(Math.abs(h - previous) / (length / steps) < Math.tan(29 * Math.PI / 180),
          `${route.name} slope ${Math.abs(h - previous) / (length / steps)} at ${x},${z}`);
        previous = h;
      }
    }
  }
});
test('marsh clearings are level, pools are wet and the ford is shallower than open water', () => {
  for (const p of [MARSH_START, MARSH_LOOKOUT]) for (const dx of [-3, 0, 3]) for (const dz of [-3, 0, 3])
    assert.ok(Math.abs(sampledHeightAt(p.x + dx, p.z + dz) - p.y) < 0.1);
  assert.equal(waterHeightAt(-267, -45), 12);
  assert.ok(12 - sampledHeightAt(-267, -45) < 0.35);
  assert.ok(12 - sampledHeightAt(-282, -45) > 0.7);
  assert.equal(waterHeightAt(MARSH_POOLS[1].x, MARSH_POOLS[1].z), 12.6);
  const a = generateNorthernChunk(-3, -1), b = generateNorthernChunk(-2, -1);
  for (let row = 0; row <= 40; row++) for (let c = 0; c < 3; c++) {
    assert.equal(a.vertices[(row * 41 + 40) * 3 + c], b.vertices[row * 41 * 3 + c]);
    assert.equal(a.colors[(row * 41 + 40) * 3 + c], b.colors[row * 41 * 3 + c]);
  }
});
test('rendered marsh water stays inside the physical shoreline', () => {
  for (const [cx, cz] of [[-3, -1], [-4, -1], [-4, -2]]) {
    const vertices = generateNorthernChunk(cx, cz).waterVertices;
    assert.ok(vertices, `pool water expected in chunk ${cx},${cz}`);
    for (let i = 0; i < vertices.length; i += 9) {
      const x = (vertices[i] + vertices[i + 3] + vertices[i + 6]) / 3;
      const z = (vertices[i + 2] + vertices[i + 5] + vertices[i + 8]) / 3;
      const level = waterHeightAt(x, z);
      assert.notEqual(level, null, 'visible water must match wet ground');
      assert.ok(Math.abs((vertices[i + 1] + vertices[i + 4] + vertices[i + 7]) / 3 - level! - 0.015) < 0.001);
    }
  }
});
test('the actual streamed vehicle completes each marsh route with bounded streaming', async () => {
  for (const source of MARSH_TRAILS) for (const reversed of [false, true]) {
  const route = { name: source.name + (reversed ? ' reverse' : ''), points: reversed ? [...source.points].reverse() : source.points };
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new NorthernStreamingRuntime(scene, world, new InProcessChunkTransport());
  try {
    const path = route.points;
    const start = path[0];
    await runtime.ensureReady(start.x, start.z); world.step();
    const car = new Vehicle(scene, world, { x: start.x, z: start.z, y: sampledHeightAt(start.x, start.z) + 1.25 }, 1.45, northernSurfaceAt, waterHeightAt);
    const angle = Math.atan2(-(path[1].x - start.x), -(path[1].z - start.z));
    car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle), true);
    const forward = new THREE.Vector3();
    let next = 1;
    for (let tick = 0; tick < 10000 && next < path.length; tick++) {
      const target = path[next];
      const dx = target.x - car.position.x, dz = target.z - car.position.z;
      if (Math.hypot(dx, dz) < 5) { next++; continue; }
      forward.set(0, 0, -1).applyQuaternion(car.body.rotation() as THREE.Quaternion);
      const desired = Math.atan2(dx, -dz), heading = Math.atan2(forward.x, -forward.z);
      const error = Math.atan2(Math.sin(desired - heading), Math.cos(desired - heading));
      runtime.update(car.position.x, car.position.z);
      car.beforeStep({ steer: Math.max(-1, Math.min(1, error * 1.5)), forward: tick > 90, reverse: false }, 1 / 60);
      world.step(); car.capture();
      assert.ok(car.position.y > sampledHeightAt(car.position.x, car.position.z) - 0.5);
    }
    assert.equal(next, path.length, `${route.name} stuck before waypoint ${next} at ${car.position.x},${car.position.z}: ${JSON.stringify({rotation:car.body.rotation(), velocity:car.body.linvel(), contacts:car.contactCount()})}`);
    await runtime.ensureReady(NORTHERN_SPAWN.x, NORTHERN_SPAWN.z);
    assert.ok(runtime.stats.activeRender <= 25 && runtime.stats.activePhysics <= 9);
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
  }
});

