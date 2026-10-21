import { lagoonCarve } from '../src/game/iceland-lagoon';
import { icelandNoise } from '../src/game/iceland-noise';
import { GRIMSVOTN, VATNAJOKULL_ROUTE, vatnajokullRouteAt } from '../src/game/iceland-vatnajokull';
import { buildIcelandGlacierGeometry } from '../src/game/iceland-glacier';
import { icelandSeaTint } from '../src/game/iceland-river';
import { LAGOON_VIEW_ROUTE, GLACIER_VIEW_ROUTE, JOKULSA_CROSSING, JOKULSA_BRIDGE, lagoonRadius, southernGlacier, GLACIER_MARGIN_WEIGHT, LAGOON_WATER_BOUNDS } from '../src/game/iceland-lagoon';
import { buildLagoonWater, addLagoonScenery } from '../src/game/iceland-lagoon-scenery';
import { LOMAGNUPUR_ROUTE, LOMAGNUPUR, lomagnupurRouteDistance } from '../src/game/iceland-skeidararsandur';
import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { generateIcelandChunk, icelandSurfaceHeight, icelandBedHeight, icelandGlacierHeight, icelandIceAt, icelandSurfaceAt, icelandWaterHeight, icelandDrivingHeight, COASTAL_TURNOUT, shoreZ,
  icelandSpawn, riverX, FORD_PATH, BRIDGE_PATH, ICELAND_LOOP, type IcelandPoint } from '../src/game/iceland-terrain';
import { IcelandStreamingRuntime, LocalIcelandTransport, type IcelandTransport } from '../src/game/iceland-streaming';
import { ICELAND_RING_ROAD, ICELAND_RING_LENGTH, ringRoadAt, ringRoadCoastAt } from '../src/game/iceland-road';
import { buildIcelandRoadGeometry } from '../src/game/iceland-road-scenery';
import { buildIcelandScenery } from '../src/game/iceland-scenery';
import { Vehicle } from '../src/game/vehicle';
import { buildSkogafossWater, FALL } from '../src/game/iceland-waterfall';
import { disposeScene } from '../src/game/dispose';
import { SOLHEIMASANDUR_APPROACH, SOLHEIMASANDUR_WRECK, solheimasandurApproachDistance } from '../src/game/iceland-sandur';
import { addSolheimasandurWreck, SOLHEIMASANDUR_BURIAL } from '../src/game/iceland-wreck';
import { ICELAND_STARTS, nearestIcelandStart, icelandStartSpawn } from '../src/game/iceland-starts';
import { REYNIS_BEACH_PATH, REYNIS_CAVE, REYNIS_SHORE_ROUTE, REYNIS_STACKS, reynisBeachPathDistance,
  reynisShallowWaterAt } from '../src/game/iceland-reynisfjara';
import { addReynisfjaraScenery } from '../src/game/iceland-reynisfjara-scenery';
import { REYNIS_SHALLOW_BOUNDS, buildReynisShallowGeometry } from '../src/game/iceland-river';
before(async () => { await RAPIER.init(); });

test('Iceland regional starts are unique, dry, level and select the nearest reset', () => {
  assert.deepEqual(ICELAND_STARTS.map(start => start.id), ['skogafoss', 'solheimasandur', 'reynisfjara', 'lomagnupur', 'vatnajokull', 'jokulsarlon']);
  assert.equal(new Set(ICELAND_STARTS.map(start => start.id)).size, ICELAND_STARTS.length);
  for (const start of ICELAND_STARTS) {
    const { x, z } = start.position, spawn = icelandStartSpawn(start);
    assert.equal(icelandWaterHeight(x, z), null);
    assert.ok(spawn.y > icelandSurfaceHeight(x, z) + 1);
    assert.ok(Number.isFinite(start.heading));
    assert.equal(nearestIcelandStart(x, z), start);
    for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]])
      assert.ok(Math.abs(icelandSurfaceHeight(x + dx, z + dz) - icelandSurfaceHeight(x, z)) < 0.7);
  }
  assert.equal(nearestIcelandStart(-365, 635).id, 'solheimasandur');
  assert.equal(nearestIcelandStart(-535, 480).id, 'skogafoss');
  assert.equal(nearestIcelandStart(-263, 595).id, 'reynisfjara');
});

test('Vatnajökull traverse has broad dry graded shoulders and a low half-buried brown rim', () => {
  for (let i = 1; i < VATNAJOKULL_ROUTE.length; i++) {
    const a = VATNAJOKULL_ROUTE[i - 1], b = VATNAJOKULL_ROUTE[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let d = 0; d <= length; d += 1) {
      const x = a.x + (b.x - a.x) * d / length, z = a.z + (b.z - a.z) * d / length;
      assert.ok(vatnajokullRouteAt(x, z).distance < 0.001);
      for (const side of [-5, 0, 5]) {
        const sx = x + (b.z - a.z) / length * side, sz = z - (b.x - a.x) / length * side;
        const height = icelandSurfaceHeight(sx, sz);
        assert.equal(icelandWaterHeight(sx, sz), null, `dry traverse ${sx},${sz}`);
        assert.ok(Math.abs(height - (a.y + (b.y - a.y) * d / length)) < 4,
          `graded shoulder ${sx},${sz}: ${height}`);
        assert.ok(Math.abs(icelandSurfaceHeight(sx + 0.5, sz) - height) < 0.9);
        assert.ok(Math.abs(icelandSurfaceHeight(sx, sz + 0.5) - height) < 0.9);
      }
    }
  }
  const rim: number[] = [];
  for (let i = 0; i < 36; i++) {
    const angle = i * Math.PI / 18;
    rim.push(icelandSurfaceHeight(GRIMSVOTN.x + Math.cos(angle) * GRIMSVOTN.radiusX,
      GRIMSVOTN.z + Math.sin(angle) * GRIMSVOTN.radiusZ));
  }
  assert.ok(Math.max(...rim) > 117 && Math.max(...rim) < 123, 'only a low rim rises above the 110 m snowfield');
  let visible = 0;
  for (let i = 0; i < 72; i++) {
    const angle = i * Math.PI / 36;
    if (icelandSurfaceAt(GRIMSVOTN.x + Math.cos(angle) * GRIMSVOTN.radiusX,
      GRIMSVOTN.z + Math.sin(angle) * GRIMSVOTN.radiusZ) === 'rock') visible++;
  }
  assert.ok(visible >= 29 && visible <= 40, `roughly half of the rim is exposed: ${visible}/72`);
  const chunk = generateIcelandChunk(3, Math.floor(GRIMSVOTN.z / 96));
  let brown = 0;
  for (let i = 0; i < chunk.vertices.length; i += 3) {
    const [x, y, z] = chunk.vertices.subarray(i, i + 3);
    if (y > 112 && x > 250 && x < 365 && Math.abs(z - GRIMSVOTN.z) < 55) {
      assert.ok(chunk.colors[i] > chunk.colors[i + 1] && chunk.colors[i + 1] > chunk.colors[i + 2],
        'exposed crater rock is brown rather than cool gray');
      brown++;
    }
  }
  assert.ok(brown > 50);
  assert.equal(icelandSurfaceAt(GRIMSVOTN.x, GRIMSVOTN.z - GRIMSVOTN.radiusZ), 'rock');
  assert.equal(icelandSurfaceAt(GRIMSVOTN.x, GRIMSVOTN.z), 'ice', 'ice-filled caldera interior');
  assert.equal(icelandSurfaceAt(310, 198), 'ice', 'the previous exposed rim is now continuous snow');
  assert.equal(vatnajokullRouteAt(335, 270).blend, 0, 'the former overlook has no spur grading');
  assert.ok(Math.abs(icelandGlacierHeight(335, 270) - southernGlacier(335, 270).height) < 0.01,
    'natural ice replaces the removed overlook route');
  let northernEdge = -55;
  while (northernEdge < 232 && !icelandIceAt(GRIMSVOTN.x, northernEdge)) northernEdge += 0.5;
  assert.ok(Math.abs((232 - GRIMSVOTN.z) / (232 - northernEdge) - 0.4) < 0.01,
    'the crater moves north by forty percent of the former distance to the ice edge');
});

test('Vatnajökull cairns clear both lower road junctions without invisible colliders', () => {
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const scenery = buildIcelandScenery(world);
  const stone = new THREE.DodecahedronGeometry(1, 0);
  try {
    const cairns = scenery.group.getObjectByName('Vatnajökull · traverse cairns') as THREE.Mesh;
    const positions = cairns.geometry.getAttribute('position');
    const pairs = VATNAJOKULL_ROUTE.slice(1).reduce((sum, b, i) => {
      const a = VATNAJOKULL_ROUTE[i];
      return sum + Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 40);
    }, 0);
    assert.equal(positions.count, (pairs - 3) * 2 * 3 * stone.attributes.position.count,
      'one western pair and the final two eastern pairs are removed');
    world.step();
    for (const { segment, station, removed } of [
      { segment: 1, station: 1, removed: true },
      { segment: 1, station: 2, removed: false },
      { segment: VATNAJOKULL_ROUTE.length - 2, station: 2, removed: false },
      { segment: VATNAJOKULL_ROUTE.length - 1, station: 1, removed: true },
      { segment: VATNAJOKULL_ROUTE.length - 1, station: 2, removed: true },
    ]) for (const side of [-1, 1]) {
      const a = VATNAJOKULL_ROUTE[segment - 1], b = VATNAJOKULL_ROUTE[segment];
      const length = Math.hypot(b.x - a.x, b.z - a.z), count = Math.ceil(length / 40);
      const x = a.x + (b.x - a.x) * station / count + (b.z - a.z) / length * 12 * side;
      const z = a.z + (b.z - a.z) * station / count - (b.x - a.x) / length * 12 * side;
      let nearest = Infinity;
      for (let i = 0; i < positions.count; i++)
        nearest = Math.min(nearest, Math.hypot(positions.getX(i) - x, positions.getZ(i) - z));
      const ground = icelandSurfaceHeight(x, z);
      const hit = world.castRay(new RAPIER.Ray({ x, y: ground + 5, z }, { x: 0, y: -1, z: 0 }), 6, true);
      if (removed) {
        assert.ok(nearest > 2, 'no visible stone remains at a removed cairn');
        assert.ok(!hit || 5 - hit.timeOfImpact < 0.15, 'no invisible cairn collider remains');
      } else {
        assert.ok(nearest < 1, 'the next pair stays in place');
        assert.ok(hit && 5 - hit.timeOfImpact > 0.5, 'the next pair remains solid');
      }
    }
  } finally { stone.dispose(); scenery.dispose(); world.free(); }
});

test('coastal lowlands descend seaward from the Ring Road without generic mountains', () => {
  for (let i = 1; i < ICELAND_RING_ROAD.length; i++) {
    const a = ICELAND_RING_ROAD[i - 1], b = ICELAND_RING_ROAD[i];
    if (b.z > 450) continue; // Named south-coast cliffs and headlands are retained.
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    for (const distance of [12, 20, 35, 55, 80, 110]) {
      const x = b.x - dz / length * distance, z = b.z + dx / length * distance;
      const coast = ringRoadCoastAt(x, z);
      assert.ok(coast.seaward);
      assert.ok(icelandSurfaceHeight(x, z) <= Math.max(b.y, coast.height) + 1,
        `no mountain outside Route 1 at ${x},${z}`);
    }
  }
  for (const x of [-1, 1]) {
    let previous = 710;
    for (const z of [540, 570, 600, 630, 660]) {
      let edge = 0;
      for (let radius = 520; radius <= 720; radius++)
        if (icelandSurfaceHeight(x * radius, z) > 0) edge = radius;
      assert.ok(edge < previous - 2, `southern corner curves inland at ${x},${z}`);
      previous = edge;
    }
    assert.ok(icelandSurfaceHeight(x * 660, 640) < -5, 'old square corner is open sea');
    previous = 710;
    for (const z of [-400, -450, -500, -550, -600]) {
      let edge = 0;
      for (let radius = 440; radius <= 720; radius++)
        if (icelandSurfaceHeight(x * radius, z) > 0) edge = radius;
      assert.ok(edge < previous - 2, `northern corner curves inland at ${x},${z}`);
      previous = edge;
    }
    assert.ok(icelandSurfaceHeight(x * 660, -640) < -10, 'old northern square corner is open sea');
  }
  assert.ok(icelandSurfaceHeight(-220, 640) > 15, 'Reynisfjall remains above its beach');
  assert.ok(icelandSurfaceHeight(-5, 425) > 100, 'Lómagnúpur is not flattened');
  assert.ok(icelandSurfaceHeight(FALL.x, FALL.terrainLipZ) > 40, 'waterfall escarpment remains');
});

test('Vatnajökull covers a wider northern snowfield with solid sampled ice', () => {
  let area = 0;
  for (let z = -55; z < 530; z += 5) for (let x = 20; x < 600; x += 5)
    if (icelandIceAt(x, z)) area += 25;
  assert.ok(area > 165_000, `exposed ice area is enlarged: ${area} square metres`);
  for (const point of [{ x: 315, z: 40 }, { x: 100, z: 150 }, { x: 500, z: 150 }])
    assert.equal(icelandSurfaceAt(point.x, point.z), 'ice', 'new cap margins are exposed ice');
});

test('Vatnajökull sampled route and exposed rim match rendered and Rapier triangles', () => {
  const iceGeometry = buildIcelandGlacierGeometry(), material = new THREE.MeshStandardMaterial();
  const ice = new THREE.Mesh(iceGeometry, material); ice.updateMatrixWorld();
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  try {
    for (const point of [...VATNAJOKULL_ROUTE, { x: 335, z: 270 },
      { x: GRIMSVOTN.x, z: GRIMSVOTN.z - GRIMSVOTN.radiusZ }, GRIMSVOTN,
      { x: 500, z: 315 }, { x: 515, z: 330 }, { x: 525, z: 350 },
      { x: 315, z: 40 }, { x: 100, z: 150 }, { x: 500, z: 150 }, { x: 690, z: 400 }, { x: -650, z: 610 }]) {
      const chunk = generateIcelandChunk(Math.floor(point.x / 96), Math.floor(point.z / 96));
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(chunk.vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(chunk.indices, 1));
      const terrain = new THREE.Mesh(geometry, material); terrain.updateMatrixWorld();
      const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
      try {
        world.createCollider(RAPIER.ColliderDesc.trimesh(chunk.vertices, chunk.indices));
        world.createCollider(RAPIER.ColliderDesc.trimesh(Float32Array.from(iceGeometry.attributes.position.array),
          Uint32Array.from(iceGeometry.index!.array)));
        world.step(); ray.ray.origin.set(point.x, 180, point.z);
        const visible = ray.intersectObjects([terrain, ice])[0];
        const solid = world.castRay(new RAPIER.Ray({ x: point.x, y: 180, z: point.z }, { x: 0, y: -1, z: 0 }), 200, true);
        assert.ok(visible && solid);
        const height = icelandSurfaceHeight(point.x, point.z);
        assert.ok(Math.abs(visible.point.y - height) < 0.01, `visible route ${point.x},${point.z}`);
        assert.ok(Math.abs(180 - solid.timeOfImpact - height) < 0.01, `solid route ${point.x},${point.z}`);
      } finally { world.free(); geometry.dispose(); }
    }
  } finally { iceGeometry.dispose(); material.dispose(); }
});

for (const model of ['modern', 'classic'] as const) test(`${model} drives the Vatnajökull through passage both directions`, async () => {
  assert.equal(await drive(VATNAJOKULL_ROUTE, model), 0);
  assert.equal(await drive([...VATNAJOKULL_ROUTE].reverse(), model), 0);
});

test('Reynisfjara beach spur stays dry and its basalt forms sit on terrain or offshore', () => {
  for (const p of REYNIS_BEACH_PATH) {
    assert.equal(icelandWaterHeight(p.x, p.z), null);
    assert.ok(reynisBeachPathDistance(p.x, p.z) < 0.001);
    assert.ok(icelandSurfaceHeight(p.x, p.z) > 0);
  }
  const seen: THREE.Mesh[] = [];
  addReynisfjaraScenery((geometry, material, name) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.name = name; seen.push(mesh); return mesh;
  });
  assert.equal(seen.length, 2 + REYNIS_STACKS.length);
  for (const mesh of seen) {
    const position = mesh.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++)
      assert.ok(Number.isFinite(position.getX(i) + position.getY(i) + position.getZ(i)));
    mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose();
  }
  for (const stack of REYNIS_STACKS) assert.equal(icelandWaterHeight(stack.x, stack.z), 0);
});

test('Reynisfjara columns stay under the mountain and cave mouth has a dry floor and open arch', () => {
  const seen: THREE.Mesh[] = [];
  addReynisfjaraScenery((geometry, material, name) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.name = name; seen.push(mesh); return mesh;
  });
  const wall = seen.find(mesh => mesh.name.includes('column wall'))!;
  const positions = wall.geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    assert.ok(y < icelandSurfaceHeight(x, z - 3.5) + 2.0,
      `column at ${x},${z} should remain below the rock cap`);
  }
  for (const z of [650, 656, 662, 667]) {
    assert.ok(Math.abs(icelandSurfaceHeight(REYNIS_CAVE.x, z) - REYNIS_CAVE.floorY) < 1.5);
    assert.equal(icelandWaterHeight(REYNIS_CAVE.x, z), null);
  }
  const cave = seen.find(mesh => mesh.name.includes('sea cave'))!;
  cave.geometry.computeBoundingBox();
  assert.ok(cave.geometry.boundingBox!.max.y - REYNIS_CAVE.floorY > 15);
  for (const mesh of seen) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }
});

test('Reynisfjara has a level dry beach before a clipped shallow sea band', () => {
  for (const x of [-248, -220, -187]) {
    const heights = [683, 688, 693, 698].map(z => icelandSurfaceHeight(x, z));
    assert.ok(Math.max(...heights) - Math.min(...heights) < 0.5, `beach at ${x} should be nearly level`);
    for (const z of [683, 688, 693, 698]) assert.equal(icelandWaterHeight(x, z), null);
    const depth = -icelandSurfaceHeight(x, 719);
    assert.ok(depth > 0.1 && depth < 0.7, `shore water at ${x} should be driveable`);
    assert.ok(reynisShallowWaterAt(x, 719, depth));
    assert.ok(-icelandSurfaceHeight(x, 770) > 12, 'the ocean becomes deep farther out');
  }
  for (const p of REYNIS_SHORE_ROUTE) assert.equal(icelandWaterHeight(p.x, p.z), null);
  const geometry = buildReynisShallowGeometry();
  const positions = geometry.getAttribute('position'), colors = geometry.getAttribute('color');
  assert.ok(positions.count > 1000);
  assert.equal(colors.itemSize, 4);
  let transparent = 0;
  for (let i = 0; i < positions.count; i++) {
    assert.ok(icelandSurfaceHeight(positions.getX(i), positions.getZ(i)) < 0.02,
      'shore mesh must stop at the sampled beach bank');
    if (Math.abs(positions.getX(i) - REYNIS_SHALLOW_BOUNDS.x1) < 0.01) {
      const shared = icelandSeaTint(positions.getX(i), positions.getZ(i));
      assert.ok(Math.abs(colors.getW(i) - shared.alpha) < 1e-5, 'eastern handoff matches the shared shallow sea opacity');
      const sea = shared.color;
      assert.ok(Math.abs(colors.getX(i) - sea.r) < 1e-6);
      assert.ok(Math.abs(colors.getY(i) - sea.g) < 1e-6);
      assert.ok(Math.abs(colors.getZ(i) - sea.b) < 1e-6);
    }
    if (colors.getW(i) < 0.8) transparent++;
  }
  assert.ok(transparent > 100);
  geometry.dispose();
});

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
  for (const [cx, cz] of [[-6, 4], [-6, 5], [-6, 6], [-7, 7], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [1, 2],
    [2, -1], [5, 1], [6, 6], [-7, 6], [7, 3]]) {
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
      assert.ok(Math.abs(icelandBedHeight(point[0], point[2]) - point[1]) < 0.001);
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

async function drive(path: IcelandPoint[], model: 'modern' | 'classic', road = false, observe?: (car: Vehicle) => void) {
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
      world.step(); car.capture(); depth = Math.max(depth, car.waterDepth); observe?.(car);
      assert.ok(car.position.y > icelandSurfaceHeight(car.position.x, car.position.z) - 1);
    }
    assert.equal(next, path.length, `${model}: stopped at ${JSON.stringify(car.position)}`);
    return depth;
  } finally {
    runtime.dispose(); assert.equal(world.colliders.len(), vehicleColliders); world.free(); disposeScene(scene);
  }
}
test('Ring Road undulations are reduced by a quarter and bridge approach settling by thirty percent', () => {
  const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
  const points = ICELAND_RING_ROAD.filter(p => p.z === 530 && p.x >= -575 && p.x <= -490);
  assert.ok(points.length > 8);
  for (const p of points) {
    const distance = Math.max(0, Math.abs(p.x + 531) - 32), blend = smooth(distance / 18);
    const previousUndulation = 1.5 * (icelandNoise(p.x / 26 + 71, p.z / 31) - 0.5)
      + 0.65 * (icelandNoise(p.x / 8, p.z / 10 + 39) - 0.5);
    const previousSettling = 0.35 * Math.exp(-(((distance - 7) / 4) ** 2));
    assert.ok(Math.abs(p.y - (6.3 + (previousUndulation * 0.75 - previousSettling * 0.7) * blend)) < 1e-10);
  }
});

test('road verges sit below the asphalt and both bridges have real raised thresholds', () => {
  for (const side of [-1, 1]) {
    const center = icelandDrivingHeight(180, 610);
    const shoulder = icelandDrivingHeight(180, 610 + side * 7);
    assert.ok(center - shoulder > 0.24 && center - shoulder < 0.4, 'sampled verge has a noticeable, driveable drop');
  }
  for (const bridge of [{ x: -531, z: 530, y: 6.3, length: 64 }, JOKULSA_BRIDGE])
    for (const side of [-1, 1]) {
      const edge = bridge.x + side * bridge.length / 2;
      const approach = icelandDrivingHeight(edge + side * 0.1, bridge.z);
      const deck = icelandDrivingHeight(edge - side * 0.1, bridge.z);
      assert.ok(deck - approach > 0.14 && deck - approach < 0.23, 'bridge threshold retains the reduced physical height step');
      assert.equal(deck, bridge.y);
    }
});

for (const model of ['modern', 'classic'] as const) {
  test(`${model} suspension physically responds when crossing road verges and bridge thresholds both ways`, async () => {
    const crossings = [
      [{ x: 180, z: 597 }, { x: 180, z: 623 }],
      BRIDGE_PATH, JOKULSA_CROSSING,
    ];
    for (const path of crossings) for (const reverse of [false, true]) {
      let minimum = Infinity, maximum = -Infinity, verticalSpeed = 0;
      assert.equal(await drive(reverse ? [...path].reverse() : path, model, false, car => {
        const { x, z } = car.position;
        const atVerge = Math.abs(x - 180) < 2 && ringRoadAt(x, z).distance > 3 && ringRoadAt(x, z).distance < 8;
        const atBridge = [{ x: -531, z: 530, length: 64 }, JOKULSA_BRIDGE].some(bridge =>
          Math.abs(z - bridge.z) < 3 && Math.abs(Math.abs(x - bridge.x) - bridge.length / 2) < 4);
        if (!atVerge && !atBridge) return;
        for (let wheel = 0; wheel < 4; wheel++) {
          const length = car.controller.wheelSuspensionLength(wheel);
          if (length !== null) { minimum = Math.min(minimum, length); maximum = Math.max(maximum, length); }
        }
        verticalSpeed = Math.max(verticalSpeed, Math.abs(car.body.linvel().y));
      }), 0);
      assert.ok(maximum - minimum > 0.05, `suspension must react to the physical transition: ${maximum - minimum}`);
      assert.ok(verticalSpeed > 0.2, `the chassis must actually move vertically: ${verticalSpeed}`);
    }
  });
}

test('road markers match their solid geometry and stop ghosting through the actual car', async () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new IcelandStreamingRuntime(scene, world, new LocalIcelandTransport());
  try {
    const markers = scene.getObjectByName('Iceland · yellow road markers') as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4(), center = new THREE.Vector3();
    let selected = -1, distance = Infinity;
    for (let i = 0; i < markers.count; i++) {
      markers.getMatrixAt(i, matrix); center.setFromMatrixPosition(matrix);
      const d = Math.hypot(center.x - 180, center.z - 618);
      if (d < distance) { distance = d; selected = i; }
    }
    assert.ok(selected >= 0);
    markers.getMatrixAt(selected, matrix); center.setFromMatrixPosition(matrix);
    await runtime.ensureReady(center.x, center.z); world.step();
    const hit = world.castRay(new RAPIER.Ray({ x: center.x - 1, y: center.y, z: center.z }, { x: 1, y: 0, z: 0 }), 2, true);
    assert.ok(hit && hit.timeOfImpact > 0.9 && hit.timeOfImpact < 1, 'horizontal ray hits the visible narrow post, not a wide invisible blocker');
    const car = new Vehicle(scene, world, icelandSpawn({ x: center.x - 5, z: center.z }), 1.45, icelandSurfaceAt, icelandWaterHeight);
    car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2), true);
    let contacted = false;
    for (let tick = 0; tick < 600 && !contacted; tick++) {
      car.beforeStep({ steer: 0, forward: tick > 90 && car.speed < 3, reverse: false }, 1 / 60);
      world.step(); car.capture();
      world.contactPair(car.body.collider(0), hit.collider, manifold => { if (manifold.numContacts() > 0) contacted = true; });
    }
    assert.ok(contacted, 'the real chassis must physically contact the marker');
  } finally {
    runtime.dispose(); world.free(); disposeScene(scene);
  }
});

for (const model of ['modern', 'classic'] as const) {
  test(`${model} drives the Reynisfjara beach spur to the columns and returns`, async () => {
    assert.equal(await drive(REYNIS_BEACH_PATH, model), 0);
    assert.equal(await drive([...REYNIS_BEACH_PATH].reverse(), model), 0);
  });
  test(`${model} drives between the Reynisfjara columns and shallow sea and returns`, async () => {
    assert.equal(await drive(REYNIS_SHORE_ROUTE, model), 0);
    assert.equal(await drive([...REYNIS_SHORE_ROUTE].reverse(), model), 0);
  });
  test(`${model} drives the Skógá ford and bridge in both directions with actual wheels`, async () => {
    for (const reverse of [false, true]) {
      const ford = reverse ? [...FORD_PATH].reverse() : FORD_PATH;
      assert.ok(await drive(ford, model) > 0.1);
      assert.equal(await drive(reverse ? [...BRIDGE_PATH].reverse() : BRIDGE_PATH, model), 0);
    }
  });
}
test('Sólheimasandur wreck sits on dry sand off Route 1 and has finite open shell geometry', () => {
  const { x, y, z } = SOLHEIMASANDUR_WRECK;
  assert.ok(ringRoadAt(x, z).distance > 55);
  assert.equal(icelandSurfaceAt(x, z), 'sand');
  assert.equal(icelandWaterHeight(x, z), null);
  assert.ok(Math.abs(icelandSurfaceHeight(x, z) - y) < 0.1);
  for (const point of SOLHEIMASANDUR_APPROACH) {
    assert.equal(icelandWaterHeight(point.x, point.z), null);
    assert.ok(solheimasandurApproachDistance(point.x, point.z) < 0.001);
  }
  const scene = new THREE.Scene();
  addSolheimasandurWreck((geometry, material, name) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.name = name; scene.add(mesh);
  });
  assert.ok(scene.children.length >= 7);
  const bounds = new THREE.Box3().setFromObject(scene);
  assert.ok(bounds.min.y < y - 0.3 && bounds.min.y > y - 0.8, 'lower fuselage is embedded in sand');
  assert.ok(bounds.max.y < y + 6);
  assert.ok(bounds.max.x - bounds.min.x > 11 && bounds.max.z - bounds.min.z > 16);
  assert.ok(SOLHEIMASANDUR_BURIAL > 0.4);
  const tailplane = scene.children.find(child => child.name.endsWith('tailplane fragment')) as THREE.Mesh;
  assert.ok(tailplane);
  const local = tailplane.geometry.attributes.position;
  const rootZ: number[] = [];
  const unrotate = new THREE.Matrix4().makeRotationY(-SOLHEIMASANDUR_WRECK.turn);
  for (let i = 0; i < local.count; i++) {
    const p = new THREE.Vector3(local.getX(i) - x, local.getY(i) - y + SOLHEIMASANDUR_BURIAL,
      local.getZ(i) - z).applyMatrix4(unrotate);
    if (p.x > -0.8 && p.x < 0 && p.z < -7.5 && p.z > -9.3) rootZ.push(p.z);
  }
  assert.ok(Math.max(...rootZ) - Math.min(...rootZ) > 1.5,
    'rear stabilizer must join the fuselage along a broad root');
  assert.ok(Math.max(...rootZ) < -7.5, 'stabilizer root stays aft of the lower side opening');
  for (const child of scene.children) {
    const positions = (child as THREE.Mesh).geometry.attributes.position;
    assert.ok(positions.count > 0);
    for (let i = 0; i < positions.count; i++) assert.ok(Number.isFinite(positions.getX(i) + positions.getY(i) + positions.getZ(i)));
  }
  disposeScene(scene);
});
for (const model of ['modern', 'classic'] as const) {
  test(`${model} drives from Route 1 to the Sólheimasandur wreck and returns`, async () => {
    assert.equal(await drive(SOLHEIMASANDUR_APPROACH, model), 0);
    assert.equal(await drive([...SOLHEIMASANDUR_APPROACH].reverse(), model), 0);
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
  const { pavement, markings, gravel } = buildIcelandRoadGeometry();
  const edges = new Map<string, number>(), ids = pavement.index!.array;
  for (let i = 0; i < ids.length; i += 3) for (let j = 0; j < 3; j++) {
    const a = ids[i + j], b = ids[i + (j + 1) % 3], key = a < b ? `${a},${b}` : `${b},${a}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  }
  const p = pavement.attributes.position;
  for (const [key, count] of edges) if (count === 1) {
    const [a, b] = key.split(',').map(Number);
    const x = (p.getX(a) + p.getX(b)) / 2, z = (p.getZ(a) + p.getZ(b)) / 2;
    if (Math.hypot(p.getX(a) - p.getX(b), p.getZ(a) - p.getZ(b)) < 0.0002) continue;
    // A mitered outer corner can extend beyond the nominal five-metre offset.
    const atVerge = ringRoadAt(x, z).distance >= 5 - 0.06;
    const atDeck = [{ x: -531, z: 530, length: 64 }, JOKULSA_BRIDGE].some(bridge =>
      Math.abs(z - bridge.z) <= 6.001 && Math.abs(Math.abs(x - bridge.x) - bridge.length / 2) < 0.001
      || Math.abs(x - bridge.x) <= bridge.length / 2 + 0.001 && Math.abs(Math.abs(z - bridge.z) - 6) < 0.001);
    assert.ok(atVerge || atDeck, `only verges and raised deck seams may have open edges: ${x},${z}`);
  }
  assert.ok([...edges.values()].every(n => n === 1 || n === 2));
  pavement.dispose(); markings.dispose(); gravel.dispose();
});
test('Ring Road shoulders use cool dark gravel with a solid inner edge and feathered terrain join', () => {
  const { pavement, markings, gravel } = buildIcelandRoadGeometry();
  const p = gravel.attributes.position, color = gravel.attributes.color;
  assert.equal(color.itemSize, 4, 'standard RGBA colours blend with the ground beneath the shoulder');
  assert.ok(p.count > 0);
  let partial = 0, solid = 0, faded = 0;
  for (let i = 0; i < p.count; i++) {
    assert.ok(color.getX(i) < color.getY(i) && color.getY(i) < color.getZ(i), 'gravel stays cool gray, never brown');
    assert.ok(color.getZ(i) < 0.065, 'gravel stays dark');
    const alpha = color.getW(i);
    assert.ok(alpha >= 0 && alpha <= 1);
    if (alpha > 0 && alpha < 1) partial++;
    if (alpha === 1) solid++;
    if (alpha === 0) faded++;
    assert.ok(Math.abs(p.getY(i) - icelandDrivingHeight(p.getX(i), p.getZ(i)) - 0.018) < 0.001, 'shoulder stays fitted to the driving terrain');
  }
  assert.ok(solid > 100, 'inner edge is solid gravel beside the asphalt');
  assert.ok(faded > 100, 'outer edge reveals the unmodified local terrain');
  assert.ok(partial > p.count / 2, 'the transition occupies several bands, not just a thin fringe');
  pavement.dispose(); markings.dispose(); gravel.dispose();
});
test('asphalt, paint and gravel triangle interiors stay above the real terrain and bridge decks', () => {
  const { pavement, markings, gravel } = buildIcelandRoadGeometry();
  for (const [geometry, lift] of [[pavement, 0.035], [markings, 0.055], [gravel, 0.018]] as const) {
    const p = geometry.attributes.position, ids = geometry.index!.array;
    for (let i = 0; i < ids.length; i += 3) {
      const [a, b, c] = Array.from(ids.slice(i, i + 3));
      const x = (p.getX(a) + p.getX(b) + p.getX(c)) / 3;
      const y = (p.getY(a) + p.getY(b) + p.getY(c)) / 3;
      const z = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3;
      assert.ok(Math.abs(y - icelandDrivingHeight(x, z) - lift) < 0.002,
        `overlay triangle cuts through or floats above the collision surface at ${x},${z}`);
    }
    geometry.dispose();
  }
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
  // Expanded coast through the sandur; retain a bounded density for the larger footprint.
  assert.ok(count.stones > 300 && count.stones < 3500);
  assert.ok(count.shrubs > 200 && count.shrubs < 1600);
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


test('Lómagnúpur has a steep prow above a dry graded return route', () => {
  assert.ok(icelandSurfaceHeight(LOMAGNUPUR.x, 480) > 80);
  assert.ok(icelandSurfaceHeight(LOMAGNUPUR.x, 540) < 20);
  assert.ok(icelandSurfaceHeight(-25, 300) > 100, 'ridge continues into the highlands');
  const upperGrade = (icelandSurfaceHeight(-5, 492) - icelandSurfaceHeight(-5, 503)) / 11;
  const lowerGrade = (icelandSurfaceHeight(-5, 511) - icelandSurfaceHeight(-5, 535)) / 24;
  assert.ok(upperGrade > lowerGrade * 2, 'rock face is steeper than its gravel apron');
  for (let i = 1; i < LOMAGNUPUR_ROUTE.length; i++) {
    const a = LOMAGNUPUR_ROUTE[i - 1], b = LOMAGNUPUR_ROUTE[i];
    for (let step = 0; step <= 30; step++) {
      const t = step / 30, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      assert.equal(icelandWaterHeight(x, z), null);
      assert.ok(lomagnupurRouteDistance(x, z) < 0.01);
      assert.ok(Math.abs(icelandSurfaceHeight(x + 1, z) - icelandSurfaceHeight(x, z)) < 0.25);
      assert.ok(Math.abs(icelandSurfaceHeight(x, z + 1) - icelandSurfaceHeight(x, z)) < 0.25);
    }
  }
});
for (const model of ['modern', 'classic'] as const) {
  test(`${model} drives the Lómagnúpur cliff route both ways`, async () => {
    assert.equal(await drive(LOMAGNUPUR_ROUTE, model), 0);
    assert.equal(await drive([...LOMAGNUPUR_ROUTE].reverse(), model), 0);
  });
}


test('separate solid glacier roofs match sampling and calving walls reach below the water across the bay', () => {
  const geometry = buildIcelandGlacierGeometry(), p = geometry.attributes.position, index = geometry.index!;
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  mesh.updateMatrixWorld();
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.trimesh(Float32Array.from(p.array), Uint32Array.from(index.array)));
  world.step();
  const ray = new THREE.Raycaster(), hit = new THREE.Vector3();
  for (const x of [442, 453, 465, 477, 489, 501, 513, 524]) {
    ray.set(new THREE.Vector3(x, 0, 550), new THREE.Vector3(0, 0, -1));
    const hits = ray.intersectObject(mesh);
    assert.ok(hits.length > 0, `ice reaches the waterline at ${x}, not a bare terrain skirt`);
    assert.ok(hits[0].point.z > 480 && hits[0].point.z < 510);
    assert.ok(icelandBedHeight(x, hits[0].point.z + 0.5) < -2, 'water is deep immediately against the ice');
    const solid = world.castRay(new RAPIER.Ray({ x, y: 0, z: 550 }, { x: 0, y: 0, z: -1 }), 100, true);
    assert.ok(solid, 'the visible calving face is solid at the waterline');
    assert.ok(Math.abs(550 - solid.timeOfImpact - hits[0].point.z) < 0.002);
  }
  for (const [x, z] of [[154, 500], [480, 480], [315, 300], [440, 440]]) {
    ray.set(new THREE.Vector3(x, 160, z), new THREE.Vector3(0, -1, 0));
    hit.copy(ray.intersectObject(mesh)[0].point);
    assert.ok(Math.abs(hit.y - icelandSurfaceHeight(x, z)) < 0.002);
    assert.equal(icelandSurfaceAt(x, z), 'ice');
  }
  let walls = 0, buriedLandWallVertices = 0;
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    const area = (p.getX(b) - p.getX(a)) * (p.getZ(c) - p.getZ(a)) - (p.getZ(b) - p.getZ(a)) * (p.getX(c) - p.getX(a));
    if (Math.abs(area) < 1e-5) {
      walls++;
      for (const vertex of [a, b, c]) {
        const x = p.getX(vertex), z = p.getZ(vertex);
        if (x > 110 && x < 230 && z > 450) {
          assert.ok(p.getY(vertex) < icelandBedHeight(x, z) - 0.5,
            'the western land tongue closure is buried, not an exposed vertical basal band');
          buriedLandWallVertices++;
        }
      }
    }
    else {
      const x = (p.getX(a) + p.getX(b) + p.getX(c)) / 3, z = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3;
      assert.ok(Math.abs((p.getY(a) + p.getY(b) + p.getY(c)) / 3 - icelandGlacierHeight(x, z)) < 0.003);
    }
  }
  assert.ok(walls > 1000, 'both tongues and cap have actual ice sides');
  assert.ok(buriedLandWallVertices > 1000, 'check the entire land-ending front, not one contact point');
  world.free(); geometry.dispose(); (mesh.material as THREE.Material).dispose();
});

test('lagoon tongue joins the cap with a curved head instead of a rectangular northern ledge', () => {
  const heads = [500, 508, 516, 524, 528].map(x => {
    for (let z = 270; z <= 365; z += 0.5) if (icelandIceAt(x, z)) return z;
    assert.fail(`missing eastern glacier shoulder at ${x}`);
  });
  assert.ok(heads.at(-1)! - heads[0] > 28, 'outer flowlines begin progressively farther south');
  for (let i = 1; i < heads.length; i++)
    assert.ok(heads[i] - heads[i - 1] > 3, 'the head is not a single straight Z cutoff');
  for (const x of [510, 520, 530]) for (const z of [275, 280, 285, 290])
    assert.equal(icelandIceAt(x, z), false, 'no detached square shelf northeast of the cap');
  for (const [x, z] of [[500, 315], [515, 330], [525, 350]])
    assert.ok(icelandIceAt(x, z), 'a connected rounded shoulder remains below the cap');
});

test('both glacier tongues have irregular lateral profiles and ice traction down to their visible feet', () => {
  const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
  for (const side of [-1, 1]) for (const tongue of ['west', 'east']) {
    const widths: number[] = [];
    // Above this reach the tongues merge into the cap; there is no inner margin.
    for (const z of [420, 432, 445, 460, 475, 485]) {
      const centre = tongue === 'east' ? 455 + 25 * smooth((z - 320) / 170) : 220 - 66 * smooth((z - 300) / 215);
      let lo = 0, hi = 110;
      for (let i = 0; i < 30; i++) {
        const width = (lo + hi) / 2;
        if (southernGlacier(centre + side * width, z).weight >= GLACIER_MARGIN_WEIGHT) lo = width; else hi = width;
      }
      const width = (lo + hi) / 2;
      widths.push(width - (tongue === 'west' ? 65 - 23 * smooth((z - 300) / 215) : 69));
      const inside = centre + side * (width - 7), outside = centre + side * (width + 3);
      assert.equal(icelandSurfaceAt(inside, z), 'ice', `${tongue} ${side} has ice traction at its margin`);
      assert.notEqual(icelandSurfaceAt(outside, z), 'ice');
    }
    assert.ok(Math.max(...widths) - Math.min(...widths) > 2.5, `${tongue} ${side} is not a straight extrusion`);
  }
  assert.ok(icelandSurfaceHeight(395, 480) > 45, 'preserve the hill framing the eastern tongue');
  assert.ok(icelandSurfaceHeight(395, 480) > icelandSurfaceHeight(420, 480),
    'the glacier flows below the framing hill');
});

test('Jökulsárlón bridge crosses the outlet with open lagoon and glacier front upstream', () => {
  assert.ok(lagoonRadius(JOKULSA_BRIDGE.x, JOKULSA_BRIDGE.z) > 1.3);
  for (const z of [550, 600, 625, 650, 670, 690]) {
    assert.equal(icelandWaterHeight(500, z), 0);
    assert.ok(icelandSurfaceHeight(500, z) < -1, `continuous outlet at ${z}`);
  }
  assert.equal(icelandSurfaceAt(500, 650), 'asphalt');
  assert.equal(icelandDrivingHeight(500, 650), JOKULSA_BRIDGE.y);
  assert.ok(icelandSurfaceHeight(480, 480) > 25, 'glacier ends above the lagoon');
  assert.ok(southernGlacier(154, 500).weight > 0.8, 'a tongue lies beyond Lómagnúpur');
  for (const p of [...LAGOON_VIEW_ROUTE, ...GLACIER_VIEW_ROUTE]) assert.equal(icelandWaterHeight(p.x, p.z), null);
  const mesh = buildLagoonWater(), positions = mesh.getAttribute('position'), colors = mesh.getAttribute('color');
  assert.ok(positions.count > 1000);
  for (let i = 0; i < positions.count; i++) {
    assert.ok(icelandBedHeight(positions.getX(i), positions.getZ(i)) < 0.025);
    if (icelandBedHeight(positions.getX(i), positions.getZ(i)) < -2.5) assert.ok(colors.getW(i) > 0.99, 'deep lagoon hides submerged ice');
    if (positions.getZ(i) > LAGOON_WATER_BOUNDS.z1 - 0.01) assert.equal(colors.getW(i), 1);
  }
  mesh.dispose();
  const scene = new THREE.Scene();
  addLagoonScenery((g, m, name) => { const mesh = new THREE.Mesh(g, m); mesh.name = name; scene.add(mesh); return mesh; });
  const bergs = scene.children.filter(p => p.name.includes('iceberg')) as THREE.Mesh[];
  assert.ok(bergs.length >= 10);
  assert.equal(scene.children.filter(p => p.name.includes('outer stay cable')).length, 4);
  assert.ok(scene.children.filter(p => p.name.includes('beach ice')).length >= 4, 'stranded ice on beach');
  for (const berg of bergs) {
    berg.geometry.computeBoundingBox(); const centre = berg.geometry.boundingBox!.getCenter(new THREE.Vector3());
    assert.ok(lagoonRadius(centre.x, centre.z) < 0.9);
    assert.ok(icelandSurfaceHeight(centre.x, centre.z) < -4);
  }
  disposeScene(scene);
});
test('Jökulsá approaches stay straight beyond the anchors and every outer cable clears the road', () => {
  for (let x = 420; x <= 575; x += 1)
    assert.ok(ringRoadAt(x, 650).distance < 1e-6, 'the straight corridor extends past both cable anchorages');
  const scene = new THREE.Scene();
  addLagoonScenery((g, m, name) => { const mesh = new THREE.Mesh(g, m); mesh.name = name; scene.add(mesh); return mesh; });
  const stays = scene.children.filter(object => object.name.includes('outer stay cable')) as THREE.Mesh[];
  const anchors = scene.children.filter(object => object.name.includes('cable anchorage')) as THREE.Mesh[];
  assert.equal(stays.length, 4); assert.equal(anchors.length, 4);
  for (const object of [...stays, ...anchors]) {
    const p = object.geometry.attributes.position;
    for (let i = 0; i < p.count; i++)
      assert.ok(ringRoadAt(p.getX(i), p.getZ(i)).distance > 5.2, `${object.name} must stay outside the asphalt and car clearance`);
  }
  for (const point of JOKULSA_CROSSING) {
    assert.ok(ringRoadAt(point.x, point.z).distance < 1.8, 'the drive test follows the realigned eastern road');
    assert.ok(icelandDrivingHeight(point.x, point.z) > 0);
  }
  disposeScene(scene);
});
test('Jökulsárlón mixes translucent and opaque ice in both lagoon and beach groups', () => {
  const scene = new THREE.Scene();
  const solid = new Map<string, boolean>();
  addLagoonScenery((g, m, name, collidable) => {
    const mesh = new THREE.Mesh(g, m); mesh.name = name; scene.add(mesh);
    solid.set(name, !!collidable);
    return mesh;
  });
  for (const group of ['Jökulsárlón · iceberg ', 'Jökulsárlón · beach ice ']) {
    const meshes = scene.children.filter(object => object.name.startsWith(group)) as THREE.Mesh[];
    const clear = meshes.filter(mesh => (mesh.material as THREE.Material).transparent);
    assert.ok(clear.length >= 2 && clear.length < meshes.length, 'both clear and opaque ice remain visible');
    assert.ok(new Set(meshes.map(mesh => mesh.geometry.userData.iceProfile)).size >= 3, 'each group mixes distinct ice landforms');
    assert.ok(new Set(meshes.map(mesh => mesh.geometry.attributes.position.count)).size >= 3, 'ice does not repeat one facet layout');
    assert.ok(new Set(clear.map(mesh => (mesh.material as THREE.MeshPhysicalMaterial).opacity)).size >= 2, 'transparency varies independently per piece');
    assert.ok(new Set(clear.map(mesh => (mesh.material as THREE.MeshPhysicalMaterial).roughness)).size >= 2, 'clear and frosted faces are not repeated uniformly');
    const sizes = meshes.map(mesh => {
      mesh.geometry.computeBoundingBox();
      return mesh.geometry.boundingBox!.getSize(new THREE.Vector3());
    });
    const large = sizes.filter(size => size.x > (group.includes('iceberg') ? 20 : 4));
    assert.ok(large.length >= 1 && large.length < meshes.length / 2, 'a few pieces are substantially larger, not the whole field');
    if (group.includes('iceberg')) assert.ok(large.some(size => size.y > 5), 'large lagoon slabs also rise higher above the water');
    for (const mesh of clear) {
      const material = mesh.material as THREE.MeshPhysicalMaterial;
      assert.ok(material.isMeshPhysicalMaterial && !material.depthWrite);
      if (group.includes('beach ice')) {
        assert.ok(material.opacity >= 0.88 && material.opacity <= 0.95, 'shore ice retains its solid body over dark sand');
        assert.ok(material.transmission >= 0.35 && material.transmission <= 0.55);
        assert.ok(material.roughness >= 0.25 && material.roughness <= 0.4, 'shore ice has a frosted surface');
      } else {
        assert.ok(material.transmission > 0.6);
        assert.ok(material.opacity >= 0.48 && material.opacity <= 0.75);
      }
      assert.ok(material.thickness > 0 && material.ior === 1.31);
      assert.equal(mesh.renderOrder, 2, 'translucent ice renders after the transparent water');
    }
  }
  const east = scene.children.filter(object => object.name.startsWith('Jökulsárlón · beach ice ')
    && (object as THREE.Mesh).geometry.boundingBox!.getCenter(new THREE.Vector3()).x > 520) as THREE.Mesh[];
  assert.ok(east.length >= 4, 'several stranded pieces survive on the eastern beach');
  assert.ok(east.some(mesh => (mesh.material as THREE.Material).transparent)
    && east.some(mesh => !(mesh.material as THREE.Material).transparent), 'eastern ice has clear and opaque forms');
  for (let i = 0; i < east.length; i++) {
    const mesh = east[i], box = mesh.geometry.boundingBox!, centre = box.getCenter(new THREE.Vector3());
    const ground = icelandSurfaceHeight(centre.x, centre.z);
    assert.equal(solid.get(mesh.name), true, 'visible shore ice keeps its matching collider');
    assert.ok(ground >= -0.3 && ground <= 2.5 && box.min.y < ground + 0.1 && box.max.y > ground + 0.2,
      'eastern pieces are partly buried in the shallow beach');
    assert.ok(ringRoadAt(centre.x, centre.z).distance > 18, 'shore ice clears the Ring Road');
    for (let j = 0; j < i; j++) assert.ok(centre.distanceTo(east[j].geometry.boundingBox!.getCenter(new THREE.Vector3())) > 5,
      'eastern pieces remain distinct');
  }
  disposeScene(scene);
});
for (const model of ['modern', 'classic'] as const) {
  test(`${model} drives Jökulsárlón outlet bridge and both glacier viewpoints`, async () => {
    for (const path of [JOKULSA_CROSSING, LAGOON_VIEW_ROUTE, GLACIER_VIEW_ROUTE]) {
      assert.equal(await drive(path, model), 0);
      assert.equal(await drive([...path].reverse(), model), 0);
    }
  });
}

test('all Iceland coasts use light shallows without colouring the submerged outer apron', () => {
  const deep = new THREE.Color('#194451');
  for (const point of [(d: number) => [0, -d], (d: number) => [d, 200], (d: number) => [-d, 280], (d: number) => [200, d]]) {
    let light = false;
    for (let d = 640; d < 755; d += 0.5) {
      const [x, z] = point(d), depth = -icelandSurfaceHeight(x, z);
      if (depth > 0.15 && depth < 1) {
        const tint = icelandSeaTint(x, z);
        assert.ok(tint.color.g > deep.g + 0.1, 'shore must be lighter than the deep sea');
        light = true;
      }
    }
    assert.ok(light, 'each coast has a shallow colour transition');
  }
  for (const [x, z] of [[0, -830], [830, 200], [-830, 280], [200, 830]]) {
    const tint = icelandSeaTint(x, z);
    assert.equal(tint.alpha, 1);
    assert.ok(tint.color.equals(deep), 'outer apron must not form a pale offshore band');
  }
});

 test('Jökulsá outlet never raises the seabed into a rectangular shallow shelf', () => {
  for (const x of [480, 490, 500, 510, 520]) for (const z of [680, 690, 700, 709])
    assert.equal(lagoonCarve(x, z, -12), -12, 'channel must preserve deeper sea');
  assert.ok(icelandSurfaceHeight(500, 705) < -10, 'outlet reaches deep sea before its generator boundary');
  assert.ok(Math.abs(icelandSurfaceHeight(500, 709) - icelandSurfaceHeight(500, 711)) < 1,
    'no seabed step at the old rectangular end');
});
