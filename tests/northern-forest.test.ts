import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { FOREST_TRAILS, FOREST_LOOKOUT, FOREST_SIGNS } from '../src/game/northern-forest';
import { generateNorthernChunk, sampledHeightAt, waterHeightAt, northernSurfaceAt, NORTHERN_SPAWN, NORTHERN_PROP_TYPES } from '../src/game/northern-terrain';
import { InProcessChunkTransport, NorthernStreamingRuntime } from '../src/game/northern-streaming';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';

before(async () => { await RAPIER.init(); });

test('forest routes are dry, stay below a 29-degree grade and the lookout is level', () => {
  for (const route of FOREST_TRAILS) for (let i = 0; i < route.points.length - 1; i++) {
    const a = route.points[i], b = route.points[i + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.ceil(length);
    for (const side of [-2.5, 0, 2.5]) {
      let previous: number | undefined;
      for (let j = 0; j <= steps; j++) {
        const x = a.x + (b.x - a.x) * j / steps + (b.z - a.z) / length * side;
        const z = a.z + (b.z - a.z) * j / steps - (b.x - a.x) / length * side;
        const h = sampledHeightAt(x, z);
        assert.equal(waterHeightAt(x, z), null, `${route.name} water at ${x},${z}`);
        if (previous !== undefined) assert.ok(Math.abs(h - previous) / (length / steps) < Math.tan(29 * Math.PI / 180),
          `${route.name} slope ${Math.abs(h - previous) / (length / steps)} at ${x},${z}`);
        previous = h;
      }
    }
  }
  const y = sampledHeightAt(FOREST_LOOKOUT.x, FOREST_LOOKOUT.z);
  assert.ok(y > 30, 'lookout should rise above the lake waterline');
  for (const dx of [-2, 0, 2]) for (const dz of [-2, 0, 2]) {
    assert.ok(Math.abs(sampledHeightAt(FOREST_LOOKOUT.x + dx, FOREST_LOOKOUT.z + dz) - y) < 0.05);
  }
});

test('forest chunks agree on their seam and own every sign exactly once', () => {
  const left = generateNorthernChunk(-2, 4), right = generateNorthernChunk(-1, 4);
  for (let row = 0; row <= 40; row++) for (let c = 0; c < 3; c++) {
    assert.equal(left.vertices[(row * 41 + 40) * 3 + c], right.vertices[row * 41 * 3 + c]);
    assert.equal(left.colors[(row * 41 + 40) * 3 + c], right.colors[row * 41 * 3 + c]);
  }
  const signs: string[] = [];
  for (let cx = -3; cx <= 0; cx++) for (let cz = 3; cz <= 5; cz++) {
    const chunk = generateNorthernChunk(cx, cz);
    for (let i = 0; i < chunk.props.count; i++) if (NORTHERN_PROP_TYPES[chunk.props.type[i]] === 'forestSign') {
      signs.push(`${chunk.props.x[i]},${chunk.props.z[i]}`);
    }
  }
  assert.deepEqual(signs.sort(), FOREST_SIGNS.map(s => `${s.x},${s.z}`).sort());
});

test('the actual streamed vehicle completes each forest route with bounded streaming', async () => {
  for (const route of FOREST_TRAILS) {
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
