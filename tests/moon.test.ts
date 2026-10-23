import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  generateMoonChunk, MOON_BASE, MOON_CELL, MOON_CELLS, MOON_ROUTES, MOON_STARTS,
  moonHeightAt, moonSpawn, moonSurfaceAt, moonSurfaceHeight, nearestMoonStart,
} from '../src/game/moon-terrain';
import { MOON_GRAVITY, MOON_HANDLING, MoonRuntime } from '../src/game/moon';
import { Vehicle } from '../src/game/vehicle';
import { AREAS, isAreaId } from '../src/game/areas';
import { disposeScene } from '../src/game/dispose';
import { buildMoonScenery, buildMoonSky, MOON_EARTH_DIRECTION } from '../src/game/moon-scenery';

before(async () => { await RAPIER.init(); });

test('Moon is internal, haze-free and isolated from existing world gravity and handling', () => {
  assert.equal(isAreaId('moon'), false, 'Node/production must not publish the internal pilot');
  assert.equal(AREAS.moon.fogDisabled, true);
  assert.equal(AREAS.moon.gravity, -3);
  assert.equal(AREAS.mars.gravity, undefined);
  assert.equal(AREAS.valley.handling, undefined);
  assert.equal(moonSurfaceAt(0, 0), 'lunar-regolith');
  assert.equal(nearestMoonStart(-140, 80).id, 'earthview-base');
  assert.equal(nearestMoonStart(-45, -200).id, 'earthrise-overlook');
});

test('Earth texture is deterministic, smoothly sampled and continuous at its seam and poles', () => {
  const scene = new THREE.Scene(), a = buildMoonSky(), b = buildMoonSky();
  scene.add(a, b);
  try {
    const earth = a.getObjectByName('Earth') as THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
    const other = b.getObjectByName('Earth') as THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
    const map = earth.material.map;
    assert.ok(map instanceof THREE.DataTexture);
    assert.deepEqual(map.image.data, other.material.map!.image.data);
    assert.equal(map.wrapS, THREE.RepeatWrapping);
    assert.equal(map.minFilter, THREE.LinearMipmapLinearFilter);
    assert.equal(map.generateMipmaps, true);
    const { width, height, data } = map.image;
    assert.equal(width, 512);
    assert.equal(height, 256);
    let blendedCoastPixels = 0;
    for (let j = 0; j < height; j++) {
      const start = j * width * 4;
      assert.deepEqual(data.slice(start, start + 4), data.slice(start + (width - 1) * 4, start + width * 4));
      for (let i = 0; i < width; i++) {
        const offset = start + i * 4;
        assert.equal(data[offset + 3], 255);
        if (j === 0 || j === height - 1) assert.deepEqual(data.slice(offset, offset + 4), data.slice(start, start + 4));
        // Land blending lowers ocean blue; clouds raise it, so cloudy ocean cannot satisfy this check.
        const land = (data[offset] - 20) / 80;
        if (land > 0.1 && land < 0.9
          && Math.abs(data[offset + 1] - (76 + 57 * land)) < 2
          && Math.abs(data[offset + 2] - (149 - 44 * land)) < 2) blendedCoastPixels++;
      }
    }
    assert.ok(blendedCoastPixels > 50, `Coastlines must blend land/ocean rather than use binary pixel masks: ${blendedCoastPixels}`);
    assert.ok(earth.position.distanceTo(MOON_EARTH_DIRECTION.clone().multiplyScalar(1800)) < 0.000001);
    assert.equal(earth.geometry.parameters.radius, 72);
    let disposed = 0;
    for (const resource of [earth.geometry, earth.material, map]) resource.addEventListener('dispose', () => disposed++);
    disposeScene(scene);
    assert.equal(disposed, 3);
  } finally { disposeScene(scene); }
});

test('lunar structures have buried full-footprint bases, positive matching solids and a clear supported deck', () => {
  const scene = new THREE.Scene(), { group, solids } = buildMoonScenery();
  scene.add(group);
  try {
    const foundations = solids.filter(s => s.y - s.hy < moonSurfaceHeight(s.x, s.z));
    assert.equal(foundations.length, 16, 'four feet, four shelter legs, six solar legs, mast and instrument');
    for (const solid of solids) {
      assert.ok(solid.hx > 0 && solid.hy > 0 && solid.hz > 0, 'no inverted supports or collider dimensions');
    }
    for (const s of foundations) for (let j = 0; j <= 24; j++) for (let i = 0; i <= 24; i++) {
      const x = s.x - s.hx + s.hx * 2 * i / 24, z = s.z - s.hz + s.hz * 2 * j / 24;
      const ground = moonSurfaceHeight(x, z);
      assert.ok(s.y - s.hy < ground - 0.04, `exposed footing underside at ${x},${z}`);
      assert.ok(s.y + s.hy > ground + 0.04, `buried footing top at ${x},${z}`);
    }
    const deck = solids.find(s => s.hx === 4.5 && s.hz === 3.5)!;
    for (let j = 0; j <= 40; j++) for (let i = 0; i <= 40; i++) {
      const x = deck.x - deck.hx + deck.hx * 2 * i / 40, z = deck.z - deck.hz + deck.hz * 2 * j / 40;
      assert.ok(deck.y - deck.hy > moonSurfaceHeight(x, z) + 0.1, 'terrain cannot penetrate the raised deck');
    }
    for (const leg of solids.filter(s => s.hx === 0.225 && s.hz === 0.225))
      assert.ok(leg.y + leg.hy > deck.y - deck.hy, 'each leg connects to the deck');
    const raycaster = new THREE.Raycaster(), up = new THREE.Vector3(0, 1, 0);
    group.updateMatrixWorld(true);
    for (const s of foundations) {
      raycaster.set(new THREE.Vector3(s.x, s.y - s.hy - 0.1, s.z), up);
      const hits = raycaster.intersectObject(group, true);
      assert.ok(hits.some(hit => Math.abs(hit.point.y - (s.y - s.hy)) < 0.00001), 'rendered underside matches collider');
    }
  } finally { disposeScene(scene); }
});

test('lunar lattice, colors and normals are deterministic and exact at seams and collision samples', () => {
  for (const [cx, cz] of [[-2, 0], [-1, -3], [1, -2]]) {
    const a = generateMoonChunk(cx, cz), b = generateMoonChunk(cx + 1, cz);
    assert.deepEqual(a, generateMoonChunk(cx, cz));
    const positions = new Map<string, number>();
    for (let i = 0; i < b.vertices.length; i += 3) positions.set(`${b.vertices[i]},${b.vertices[i + 2]}`, i);
    for (let i = 0; i < a.vertices.length; i += 3) {
      const index = positions.get(`${a.vertices[i]},${a.vertices[i + 2]}`);
      if (index === undefined) continue;
      assert.equal(a.vertices[i + 1], b.vertices[index + 1]);
      assert.deepEqual(a.normals.slice(i, i + 3), b.normals.slice(index, index + 3));
      assert.deepEqual(a.colors.slice(i, i + 3), b.colors.slice(index, index + 3));
    }
    for (let i = 0; i < a.indices.length; i += 111) {
      const vertices = [0, 1, 2].map(k => a.indices[i + k] * 3);
      const x = vertices.reduce((n, j) => n + a.vertices[j], 0) / 3;
      const y = vertices.reduce((n, j) => n + a.vertices[j + 1], 0) / 3;
      const z = vertices.reduce((n, j) => n + a.vertices[j + 2], 0) / 3;
      assert.ok(Math.abs(moonSurfaceHeight(x, z) - y) < 0.00001);
    }
  }
});

test('fixed far terrain stitches to all four pilot edges without T junctions or shading changes', () => {
  for (const [cx, cz, axis, boundary] of [[4, -1, 0, 384], [-5, 1, 0, -384], [-1, 4, 2, 384], [1, -5, 2, -384]]) {
    const coarse = generateMoonChunk(cx, cz, true);
    const boundaryVertices: number[] = [];
    for (let i = 0; i < coarse.vertices.length; i += 3) if (coarse.vertices[i + axis] === boundary) boundaryVertices.push(i);
    assert.equal(boundaryVertices.length, MOON_CELLS + 1);
    for (const i of boundaryVertices) {
      const x = coarse.vertices[i], z = coarse.vertices[i + 2];
      assert.equal(coarse.vertices[i + 1], Math.fround(moonHeightAt(x, z)));
      const fine = generateMoonChunk(axis === 0 ? cx === 4 ? 3 : -4 : cx, axis === 2 ? cz === 4 ? 3 : -4 : cz);
      let found = -1;
      for (let j = 0; j < fine.vertices.length; j += 3) if (fine.vertices[j] === x && fine.vertices[j + 2] === z) found = j;
      assert.ok(found >= 0);
      assert.deepEqual(coarse.normals.slice(i, i + 3), fine.normals.slice(found, found + 3));
    }
  }
});

test('lunar easy routes have broad gentle grades and regional clearings are level', () => {
  for (const route of MOON_ROUTES) for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    for (const side of [-4, 0, 4]) {
      let previous: number | undefined;
      for (let step = 0; step <= Math.ceil(length); step++) {
        const t = step / Math.ceil(length), x = a.x + dx * t + dz / length * side, z = a.z + dz * t - dx / length * side;
        const height = moonSurfaceHeight(x, z);
        if (previous !== undefined) assert.ok(Math.abs(height - previous) < 0.35, `${route.name} at ${x},${z}`);
        previous = height;
      }
    }
  }
  for (const start of MOON_STARTS) for (const x of [-3, 0, 3]) for (const z of [-3, 0, 3])
    assert.ok(Math.abs(moonSurfaceHeight(start.position.x + x, start.position.z + z) - start.position.y) < 0.02);
  assert.ok(MOON_CELL <= 4);
});

test('Moon has bounded collision, fixed render buffers, explicit invalid destinations and complete disposal', async () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: MOON_GRAVITY, z: 0 });
  const started = performance.now(), runtime = new MoonRuntime(scene, world);
  const terrain = scene.getObjectByName('Moon continuous landscape') as THREE.Mesh;
  const positions = terrain.geometry.getAttribute('position'), normals = terrain.geometry.getAttribute('normal');
  try {
    assert.ok(runtime.stats.triangles < 100_000, `${runtime.stats.triangles} triangles`);
    for (const start of MOON_STARTS) {
      await runtime.ensureReady(start.position.x, start.position.z); world.step();
      assert.ok(runtime.stats.activePhysics <= 9);
      assert.equal(runtime.stats.queued, 0);
      assert.equal(terrain.geometry.getAttribute('position'), positions);
      assert.equal(terrain.geometry.getAttribute('normal'), normals);
      const ray = new RAPIER.Ray({ ...start.position, y: 200 }, { x: 0, y: -1, z: 0 });
      const hit = world.castRay(ray, 250, true);
      assert.ok(hit);
      assert.ok(Math.abs(200 - hit.timeOfImpact - start.position.y) < 0.001);
    }
    console.log(`Moon construction ${Math.round(performance.now() - started)}ms; ${runtime.stats.triangles} terrain triangles`);
    await assert.rejects(runtime.ensureReady(2000, 0), /outside/);
    runtime.dispose(); runtime.dispose();
    assert.equal(world.colliders.len(), 0);
    assert.equal(scene.children.length, 0);
    await assert.rejects(runtime.ensureReady(0, 0), /disposed/);
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
});

test('real lunar rover completes the circuit and crater descent in both directions without reset', async () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: MOON_GRAVITY, z: 0 });
  const runtime = new MoonRuntime(scene, world);
  try {
    const car = new Vehicle(scene, world, moonSpawn(MOON_BASE), 1, moonSurfaceAt, () => null, undefined, 'mars-scout', MOON_HANDLING);
    for (const route of MOON_ROUTES) for (const reversed of [false, true]) {
      const path = reversed ? [...route.points].reverse() : [...route.points];
      await runtime.ensureReady(path[0].x, path[0].z); world.step();
      car.reset(moonSpawn(path[0]));
      car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0),
        Math.atan2(-(path[1].x - path[0].x), -(path[1].z - path[0].z))), true);
      for (let i = 0; i < 150; i++) { car.beforeStep({ steer: 0, forward: false, reverse: false }, 1 / 60); world.step(); car.capture(); }
      assert.ok(car.contactCount() >= 2);
      let next = 1, longestAirborne = 0, airborne = 0;
      for (let tick = 0; tick < 26000 && next < path.length; tick++) {
        const target = path[next], dx = target.x - car.position.x, dz = target.z - car.position.z;
        if (Math.hypot(dx, dz) < 4) { next++; continue; }
        runtime.update(car.position.x, car.position.z);
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(car.body.rotation());
        const angle = Math.atan2(dx, -dz) - Math.atan2(forward.x, -forward.z);
        const error = Math.atan2(Math.sin(angle), Math.cos(angle));
        const limit = Math.abs(error) > 0.45 ? 2.4 : 4.8;
        car.beforeStep({ steer: Math.max(-1, Math.min(1, error * 2)), forward: Math.abs(car.speed) < limit, reverse: false }, 1 / 60);
        world.step(); car.capture();
        airborne = car.contactCount() === 0 ? airborne + 1 : 0;
        longestAirborne = Math.max(longestAirborne, airborne);
        assert.ok(car.position.y > moonSurfaceHeight(car.position.x, car.position.z) - 0.4, 'no terrain penetration');
        assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(car.rotation).y > 0.45, 'rover stays upright');
      }
      assert.equal(next, path.length, `${route.name} reverse=${reversed} at ${car.position.x},${car.position.z}; speed=${car.speed}`);
      assert.ok(longestAirborne < 120, 'easy line does not repeatedly launch the rover');
    }
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
});

test('low lunar gravity extends free flight and rover speed/braking remain controlled', async () => {
  const heights: number[] = [];
  for (const gravity of [-18, MOON_GRAVITY]) {
    const world = new RAPIER.World({ x: 0, y: gravity, z: 0 });
    try {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 20, 0));
      world.createCollider(RAPIER.ColliderDesc.ball(0.5).setMass(1), body);
      for (let i = 0; i < 60; i++) world.step();
      heights.push(body.translation().y);
    } finally { world.free(); }
  }
  assert.ok(heights[1] - heights[0] > 7);
  const world = new RAPIER.World({ x: 0, y: MOON_GRAVITY, z: 0 }), scene = new THREE.Scene();
  try {
    world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.1, 100).setTranslation(0, -0.1, 0));
    const car = new Vehicle(scene, world, { x: 0, y: 1.2, z: 20 }, 1, moonSurfaceAt, () => null, undefined, 'mars-scout', MOON_HANDLING);
    for (let i = 0; i < 600; i++) {
      car.beforeStep({ steer: 0, forward: i > 150, reverse: false }, 1 / 60); world.step(); car.capture();
    }
    assert.ok(car.speed > 4 && car.speed <= 6.91);
    const start = car.position.clone();
    for (let i = 0; i < 180 && car.speed > 0.5; i++) {
      car.beforeStep({ steer: 0, forward: false, reverse: true }, 1 / 60); world.step(); car.capture();
    }
    assert.ok(car.speed < 0.6);
    assert.ok(car.position.distanceTo(start) < 14, 'lunar braking has a readable stopping distance');
  } finally { world.free(); disposeScene(scene); }
});
