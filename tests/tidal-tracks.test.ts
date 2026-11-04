import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { AREAS, isAreaId } from '../src/game/areas';
import { TidalTracksRuntime } from '../src/game/tidal-tracks';
import {
  TIDAL_ROUTE, TIDAL_STARTS, TIDAL_CHANNELS, SEABIRD_CLIMB, PEBBLE_DESCENT, PEBBLE_CAVE, tidalGroundHeight, tidalWaterHeight,
  tidalTerrainGeometry, tidalWaterGeometry, tidalSurfaceAt, tidalSpawn, tidalRouteSample,
} from '../src/game/tidal-terrain';
import { TIDAL_STEPS, SEABIRD_STEPS, PEBBLE_STEPS, tidalStepGeometry } from '../src/game/tidal-scenery';
import { Vehicle, type VehicleModelId } from '../src/game/vehicle';
import { FollowCamera } from '../src/game/camera';
import { SCENERY_QUERY_GROUPS } from '../src/game/collision-groups';
import { disposeScene } from '../src/game/dispose';
import { DEMO_IDS, demoPathSample } from '../src/game/location-demo-terrain';

before(async () => { await RAPIER.init(); });
test('development pilots defer terrain-backed starts until their world is selected', () => {
  for (const id of ['island-tracks', 'island', ...DEMO_IDS] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(AREAS[id], 'spawn');
    assert.equal(typeof descriptor?.get, 'function', `${id} must not generate its bed during unrelated startup`);
    assert.equal(descriptor?.value, undefined);
  }
});
test('fresh Island Tracks has dry level resting places, real wet channels and no causeway bypass', () => {
  assert.equal(isAreaId('island-tracks'), true, 'Pages preview must accept the canonical direct link');
  assert.equal(isAreaId('tidal-islands'), false, 'retired intermediate ID is not a second world');
  assert.equal(AREAS['island-tracks'].id, 'island-tracks');
  assert.equal(AREAS['island-tracks'].name, 'Island Tracks');
  assert.ok(!Object.hasOwn(AREAS, 'tidal-islands'));
  assert.ok(!DEMO_IDS.some(id => (id as string) === 'island-tracks'), 'no old causeway comparison at the canonical ID');
  assert.equal(AREAS['island-tracks'].gravity, undefined);
  assert.equal(AREAS['island-tracks'].handling, undefined);
  for (const start of TIDAL_STARTS) for (const dx of [-3, 0, 3]) for (const dz of [-3, 0, 3]) {
    assert.ok(Math.abs(tidalGroundHeight(start.position.x + dx, start.position.z + dz) - start.position.y) < 0.01);
    assert.equal(tidalWaterHeight(start.position.x + dx, start.position.z + dz), null);
  }
  for (const channel of TIDAL_CHANNELS) {
    const x = (channel[0].x + channel[1].x) / 2, z = (channel[0].z + channel[1].z) / 2;
    assert.ok(tidalGroundHeight(x, z) < -0.2 && tidalGroundHeight(x, z) > -0.4);
    assert.equal(tidalSurfaceAt(x, z), 'water');
  }
  // The straight old-pilot causeway line and wide ocean detours cannot replace this passage.
  for (const z of [-75, 65, 95]) for (const x of [-35, 10, 55])
    assert.ok(tidalGroundHeight(x, z) < -2, `${x},${z} must remain deep sea`);
  assert.ok(tidalGroundHeight(0, 15) < -2);
  assert.ok(tidalGroundHeight(143, -23) > 24);
});

test('exact terrain, fitted sea, obstacle grounding and bounded resource ownership agree', async () => {
  const terrain = tidalTerrainGeometry(), water = tidalWaterGeometry(terrain);
  try {
    const p = terrain.getAttribute('position'), indices = terrain.getIndex()!;
    for (let i = 0; i < indices.count; i += 102) {
      const ids = [0, 1, 2].map(k => indices.getX(i + k));
      const x = ids.reduce((s, n) => s + p.getX(n), 0) / 3, z = ids.reduce((s, n) => s + p.getZ(n), 0) / 3;
      const y = ids.reduce((s, n) => s + p.getY(n), 0) / 3;
      assert.ok(Math.abs(tidalGroundHeight(x, z) - y) < 0.00002);
    }
    const w = water.getAttribute('position');
    const colors = water.getAttribute('color');
    assert.equal(colors.itemSize, 4, 'clear shallow water and opaque deep sea avoid offshore sky/bed seams');
    assert.ok(Array.from({ length: colors.count }, (_, i) => colors.getW(i)).some(alpha => alpha < 0.65));
    assert.ok(Array.from({ length: colors.count }, (_, i) => colors.getW(i)).some(alpha => alpha === 1));
    let shore = 0;
    for (let i = 0; i < w.count; i += 3) {
      const x = w.getX(i), z = w.getZ(i);
      assert.ok(Math.abs(w.getY(i) - 0.018) < 0.000001, 'conservative shore clipping must not lower the visible sea');
      if (Math.abs(x) > 200 || Math.abs(z) > 200) continue;
      const height = tidalGroundHeight(x, z);
      assert.ok(height < 0.00003, `water over dry ground at ${x},${z}: ${height}`);
      if (Math.abs(height + 0.001) < 0.00003) shore++;
    }
    assert.ok(shore > 100);
    for (const step of [...TIDAL_STEPS, ...SEABIRD_STEPS]) {
      const geometry = tidalStepGeometry(step), p = geometry.getAttribute('position');
      try {
        const lifts = Array.from({ length: p.count }, (_, i) => p.getY(i) - tidalGroundHeight(p.getX(i), p.getZ(i)));
        assert.ok(Math.min(...lifts) < -0.1 && Math.max(...lifts) > (SEABIRD_STEPS.includes(step) ? 0.3 : 0.35));
      } finally { geometry.dispose(); }
    }
  } finally { terrain.dispose(); water.dispose(); }
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new TidalTracksRuntime(scene, world);
  const mast = scene.getObjectByName('Lookout mast');
  assert.ok(mast instanceof THREE.Mesh);
  const mastVertices = mast.geometry.getAttribute('position');
  const mastFoot = Math.min(...Array.from({ length: mastVertices.count }, (_, i) => mastVertices.getY(i)));
  for (let i = 0; i < mastVertices.count; i++) if (mastVertices.getY(i) < mastFoot + 0.001)
    assert.ok(mastVertices.getY(i) <= tidalGroundHeight(mastVertices.getX(i), mastVertices.getZ(i)),
      'the whole lookout mast footprint must be grounded on the sloping shoulder');
  const sentinel = scene.getObjectByName('Summit sentinel');
  assert.ok(sentinel instanceof THREE.Mesh);
  const sentinelVertices = sentinel.geometry.getAttribute('position');
  for (let i = 0; i < sentinelVertices.count; i++)
    assert.ok(tidalRouteSample(sentinelVertices.getX(i), sentinelVertices.getZ(i)).distance > 8,
      'the summit landmark must clear the approach and the whole turning envelope');
  const stats = runtime.stats;
  assert.ok(stats.triangles < 280_000); assert.equal(stats.colliderCount, 19);
  console.log('Island Tracks resources', JSON.stringify(stats));
  assert.equal(runtime.recoveryStart.id, 'harbor-cove');
  runtime.update(90, -10); assert.equal(runtime.recoveryStart.id, 'harbor-cove', 'no forward reset shortcut');
  await runtime.ensureReady(110, 8); runtime.update(110, 8);
  assert.equal(runtime.recoveryStart.id, 'harbor-cove', 'photo/loading targets cannot unlock forward recovery');
  runtime.visit(-10, 6); assert.equal(runtime.recoveryStart.id, 'harbor-cove', 'rest stops are not retry checkpoints');
  runtime.visit(70, 30); assert.equal(runtime.recoveryStart.id, 'harbor-cove', 'retain the challenge departure');
  await runtime.ensureReady(137, -151); runtime.update(137, -151);
  assert.equal(runtime.recoveryStart.id, 'harbor-cove', 'summit photo/loading targets cannot unlock the climb');
  runtime.dispose(); runtime.dispose();
  assert.equal(world.colliders.len(), 0); assert.equal(scene.children.length, 0); world.free();
});

test('named inspection entries retry the full challenge rather than an intermediate shelf', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new TidalTracksRuntime(scene, world);
  try {
    const expected = ['harbor-cove', 'harbor-cove', 'harbor-cove', 'saltgrass-landing',
      'windward-lookout', 'windward-lookout', 'seabird-summit', 'pebble-cove'];
    for (const [i, start] of TIDAL_STARTS.entries()) {
      runtime.beginAt(start.position.x, start.position.z);
      assert.equal(runtime.recoveryStart.id, expected[i], start.id);
      assert.equal(runtime.restart().id, expected[i], start.id);
    }
    assert.throws(() => runtime.beginAt(20, 70), /named starting place/);
  } finally { runtime.dispose(); world.free(); }
});

for (const [name, points, entry, exit] of [
  ['Rock Passage outward', TIDAL_ROUTE.slice(0, 19), 'harbor-cove', 'saltgrass-landing'],
  ['Rock Passage return', TIDAL_ROUTE.slice(2, 20).reverse(), 'saltgrass-landing', 'harbor-cove'],
  ['Lookout approach outward', TIDAL_ROUTE.slice(19), 'saltgrass-landing', 'windward-lookout'],
  ['Lookout approach return', TIDAL_ROUTE.slice(19).reverse(), 'windward-lookout', 'saltgrass-landing'],
  ['Seabird ascent', SEABIRD_CLIMB, 'windward-lookout', 'seabird-summit'],
  ['Seabird descent', [...SEABIRD_CLIMB].reverse(), 'seabird-summit', 'windward-lookout'],
  ['Pebble Cove descent', PEBBLE_DESCENT, 'windward-lookout', 'pebble-cove'],
  ['Pebble Cove return', [...PEBBLE_DESCENT].reverse(), 'pebble-cove', 'windward-lookout'],
] as const) {
  test(`${name}: only ordered completion changes the departure; backing up and retrying cannot skip`, () => {
    const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    const runtime = new TidalTracksRuntime(scene, world);
    const visit = (point: { x: number; z: number }) => runtime.visit(point.x, point.z);
    try {
      runtime.beginAt(points[0].x, points[0].z);
      for (const point of [...points].reverse()) {
        visit(point);
        assert.equal(runtime.recoveryStart.id, entry, 'an exit reached out of order must not become a departure');
      }
      runtime.restart();
      const middle = Math.floor(points.length / 2);
      for (const point of points.slice(0, middle)) {
        visit(point);
        assert.equal(runtime.recoveryStart.id, entry, 'intermediate rest stops must not advance recovery');
      }
      const a = points[0], b = points[1];
      assert.ok(Math.abs(runtime.recoveryStart.heading - Math.atan2(-(b.x - a.x), -(b.z - a.z))) < 0.00001,
        'retry faces the direction of this attempt, not the regional default heading');
      const end = points.at(-1)!;
      visit(end);
      assert.equal(runtime.recoveryStart.id, entry, 'falling or cutting ahead to the exit must not complete the challenge');
      runtime.restart();
      for (const point of points.slice(middle)) visit(point);
      assert.equal(runtime.recoveryStart.id, entry, 'Reset must discard partial route progress');
      for (const point of points.slice(0, middle)) visit(point);
      visit(points[0]);
      for (const point of points.slice(middle)) visit(point);
      assert.equal(runtime.recoveryStart.id, entry, 'returning to the departure also abandons partial progress');
      runtime.restart();
      for (const [index, point] of points.entries()) {
        visit(point);
        if (index > 2 && index < points.length - 1) visit(points[index - 1]);
        assert.equal(runtime.recoveryStart.id, index === points.length - 1 ? exit : entry,
          'reversing to line up a wheel must not flip the attempt direction');
      }
      assert.equal(runtime.restart().id, exit, 'the completed endpoint can start the next attempt');
    } finally { runtime.dispose(); world.free(); }
  });
}

test('the earned far shore survives Reset on arrival and after the first inland left turn, but not before the landing rib', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new TidalTracksRuntime(scene, world);
  const visit = (point: { x: number; z: number }) => runtime.visit(point.x, point.z);
  try {
    for (const point of TIDAL_ROUTE.slice(0, 18)) visit(point);
    visit(TIDAL_STEPS[3]);
    assert.equal(runtime.recoveryStart.id, 'harbor-cove', 'the last dry-land obstacle still belongs to the crossing');
    runtime.visit(92, -1.75);
    assert.equal(runtime.recoveryStart.id, 'harbor-cove', 'near the arrival gate is not enough before reaching the safe shore');
    visit(TIDAL_ROUTE[18]);
    assert.equal(runtime.restart().id, 'saltgrass-landing', 'arrival completes the crossing before the inland road');
    for (const point of TIDAL_ROUTE.slice(19, 22)) visit(point);
    assert.equal(runtime.restart().id, 'saltgrass-landing', 'the first left turn cannot undo the earned island');
    for (const point of TIDAL_ROUTE.slice(22)) visit(point);
    assert.equal(runtime.recoveryStart.id, 'saltgrass-landing', 'retry discards only the unfinished lookout approach');
    for (const point of TIDAL_ROUTE.slice(19)) visit(point);
    assert.equal(runtime.recoveryStart.id, 'windward-lookout', 'the separately completed approach starts Seabird Climb');
  } finally { runtime.dispose(); world.free(); }
});

test('crossing progress covers the supported road width rather than demanding invisible precision gates', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new TidalTracksRuntime(scene, world);
  try {
    for (const point of TIDAL_ROUTE.slice(0, 19)) runtime.visit(point.x, point.z + 5);
    assert.equal(runtime.recoveryStart.id, 'saltgrass-landing');
    runtime.restart();
    for (const point of TIDAL_ROUTE.slice(2, 20).reverse()) runtime.visit(point.x, point.z + 5);
    assert.equal(runtime.recoveryStart.id, 'harbor-cove');
  } finally { runtime.dispose(); world.free(); }
});

test('Seabird Climb connects the accepted lookout to a real high summit and supported exposed ledge', () => {
  assert.deepEqual(SEABIRD_CLIMB[0], TIDAL_ROUTE.at(-1));
  assert.equal(SEABIRD_CLIMB.at(-1)!.y, 67);
  for (const point of SEABIRD_CLIMB) {
    assert.ok(Math.abs(tidalGroundHeight(point.x, point.z) - point.y) < 0.1);
    assert.equal(tidalWaterHeight(point.x, point.z), null);
  }
  const x = 112, z = -91, bed = tidalGroundHeight(x, z);
  for (const dx of [-1.2, 0, 1.2])
    assert.ok(Math.abs(tidalGroundHeight(x + dx, z) - bed) < 0.5, 'the ledge supports the whole wheel footprint');
  assert.ok(bed - tidalGroundHeight(x - 7, z) > 15, 'the seaward side must have a real cliff, not a wide plain');
  const summit = SEABIRD_CLIMB.at(-1)!;
  for (const dx of [-7, 0, 7]) for (const dz of [-7, 0, 7])
    assert.ok(Math.abs(tidalGroundHeight(summit.x + dx, summit.z + dz) - 67) < 0.01);
});

test('Pebble Cove has a dry supported descent, a resting shelf and a turning pad after the final obstacle', () => {
  assert.deepEqual(PEBBLE_DESCENT[0], TIDAL_ROUTE.at(-1));
  const length = PEBBLE_DESCENT.slice(1).reduce((sum, point, i) =>
    sum + Math.hypot(point.x - PEBBLE_DESCENT[i].x, point.z - PEBBLE_DESCENT[i].z), 0);
  assert.ok(length >= 150 && length <= 220, `actual route length ${length}`);
  assert.equal(PEBBLE_DESCENT[0].y - PEBBLE_DESCENT.at(-1)!.y, 26);
  for (let i = 1; i < PEBBLE_DESCENT.length; i++) {
    const a = PEBBLE_DESCENT[i - 1], b = PEBBLE_DESCENT[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let t = 0; t <= 1; t += 0.1) for (const side of [-1.4, 0, 1.4]) {
      const x = a.x + (b.x - a.x) * t + (b.z - a.z) / length * side;
      const z = a.z + (b.z - a.z) * t - (b.x - a.x) / length * side;
      assert.equal(tidalWaterHeight(x, z), null, `dry supported wheel line ${x},${z}`);
      assert.ok(Math.abs(tidalGroundHeight(x, z) - tidalGroundHeight(
        a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) < 0.35);
    }
  }
  const shore = PEBBLE_DESCENT.at(-1)!;
  for (const dx of [-7, 0, 7]) for (const dz of [-7, 0, 7])
    assert.ok(Math.abs(tidalGroundHeight(shore.x + dx, shore.z + dz) - 4) < 0.01);
  const finalStone = PEBBLE_STEPS.at(-1)!;
  assert.ok(Math.hypot(finalStone.x - shore.x, finalStone.z - shore.z) > finalStone.radius + 4.5,
    'safe arrival is beyond the last physical threshold');
  assert.equal(tidalWaterHeight(126, 91), 0, 'cove opens onto the actual fitted sea');
});

test('Pebble Cove cave is solid above a true lower floor, with matched visible ceiling and open daylight mouths', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new TidalTracksRuntime(scene, world);
  try {
    world.step(); scene.updateMatrixWorld(true);
    const roof = scene.getObjectByName('Pebble Cove basalt cave');
    assert.ok(roof instanceof THREE.Mesh);
    const { entry, exit } = PEBBLE_CAVE;
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) for (const side of [-2, 0, 2]) {
      const x = entry.x + (exit.x - entry.x) * t + side / Math.SQRT2;
      const z = entry.z + (exit.z - entry.z) * t + side / Math.SQRT2;
      const floor = tidalGroundHeight(x, z), origin = { x, y: floor + 1, z };
      assert.equal(tidalSurfaceAt(x, z), 'rock'); assert.equal(tidalWaterHeight(x, z), null);
      assert.equal(tidalSpawn({ x, z }).y, floor + 1.2, 'inspection must use the floor, not the roof');
      const physical = world.castRay(new RAPIER.Ray(origin, { x: 0, y: 1, z: 0 }), 30, true);
      const visible = new THREE.Raycaster(new THREE.Vector3(x, floor + 1, z), new THREE.Vector3(0, 1, 0)).intersectObject(roof);
      assert.ok(physical && physical.timeOfImpact > 7 && physical.timeOfImpact < 10, 'true room above the car/camera');
      assert.ok(visible.length && Math.abs(visible[0].distance - physical.timeOfImpact) < 0.001);
    }
    for (const point of [PEBBLE_DESCENT[9], PEBBLE_DESCENT[11]]) {
      const ray = new RAPIER.Ray({ ...point, y: tidalGroundHeight(point.x, point.z) + 1 }, { x: 0, y: 1, z: 0 });
      assert.equal(world.castRay(ray, 30, true), null, 'both cave approaches remain open to daylight');
    }
    for (const name of ['Ravine boulders', 'Cove pebbles']) {
      const mesh = scene.getObjectByName(name); assert.ok(mesh instanceof THREE.Mesh);
      const positions = mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++)
        assert.ok(tidalRouteSample(positions.getX(i), positions.getZ(i)).distance > 3.2,
          `${name} must not hide a route-width trap`);
    }
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
});

test('Pebble Cove shallows have a broad wheel-deep bed, a dry approach and a bounded seaward edge', () => {
  for (let x = 116; x <= 136; x += 2) for (let z = 90; z <= 100; z += 2) {
    assert.ok(Math.abs(tidalGroundHeight(x, z) + 0.32) < 0.001, `shallow bed ${x},${z}`);
    assert.equal(tidalWaterHeight(x, z), 0);
    assert.equal(tidalSurfaceAt(x, z), 'water');
  }
  for (let z = 78; z < 90; z += 0.5) {
    const grade = Math.abs(tidalGroundHeight(126, z + 0.5) - tidalGroundHeight(126, z)) / 0.5;
    assert.ok(grade < 0.7, `supported beach ramp at ${z}: ${grade}`);
  }
  assert.equal(tidalGroundHeight(126, 66), 4, 'keep the dry arrival and retry pad');
  for (const [x, z] of [[100, 98], [154, 98], [126, 115]])
    assert.ok(tidalGroundHeight(x, z) < -3, 'the small cove shelf must not become an offshore bypass');
});

test('cave skirts enter the hill and the lookout props stand on a level supported shoulder', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new TidalTracksRuntime(scene, world);
  try {
    const mast = scene.getObjectByName('Lookout mast');
    assert.ok(mast instanceof THREE.Mesh);
    mast.geometry.computeBoundingBox();
    const centre = mast.geometry.boundingBox!.getCenter(new THREE.Vector3());
    const support = [-0.5, 0, 0.5].flatMap(dx => [-0.5, 0, 0.5]
      .map(dz => tidalGroundHeight(centre.x + dx, centre.z + dz)));
    assert.ok(Math.max(...support) - Math.min(...support) < 0.1, 'a buried foot on a cliff is not a supported mast');
    assert.ok(tidalRouteSample(centre.x, centre.z).distance > 4);
    const roof = scene.getObjectByName('Pebble Cove basalt cave');
    assert.ok(roof instanceof THREE.Mesh);
    const positions = roof.geometry.getAttribute('position'), normals = roof.geometry.getAttribute('normal');
    let skirt = 0;
    for (let i = 0; i < positions.count; i += 3) {
      if (normals.getY(i) > -0.05) continue;
      const x = (positions.getX(i) + positions.getX(i + 1) + positions.getX(i + 2)) / 3;
      const z = (positions.getZ(i) + positions.getZ(i + 1) + positions.getZ(i + 2)) / 3;
      const across = Math.abs((x - PEBBLE_CAVE.entry.x + z - PEBBLE_CAVE.entry.z) / Math.SQRT2);
      if (across < PEBBLE_CAVE.opening + 1) continue;
      for (const [a, b, c] of [[1 / 3, 1 / 3, 1 / 3], [0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5]]) {
        const px = positions.getX(i) * a + positions.getX(i + 1) * b + positions.getX(i + 2) * c;
        const py = positions.getY(i) * a + positions.getY(i + 1) * b + positions.getY(i + 2) * c;
        const pz = positions.getZ(i) * a + positions.getZ(i + 1) * b + positions.getZ(i + 2) * c;
        assert.ok(py < tidalGroundHeight(px, pz) - 0.5, `roof shelf protrudes from hillside at ${px},${pz}`);
      }
      skirt++;
    }
    assert.ok(skirt > 30);
    const terrain = scene.getObjectByName('Island Tracks continuous bed');
    assert.ok(terrain instanceof THREE.Mesh && terrain.castShadow, 'ground must occlude buried scenery, not let it cast orphan shadows');
  } finally { runtime.dispose(); world.free(); }
});

test('Island Tracks applies permanent sunlight to its terrain, scenery and swapped cars and disposes it', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new TidalTracksRuntime(scene, world);
  const material = new THREE.MeshStandardMaterial(), original = material.onBeforeCompile;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
  try {
    for (const name of ['Island Tracks continuous bed', 'Pebble Cove basalt cave', 'Ravine stone steps']) {
      const object = scene.getObjectByName(name);
      assert.ok(object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial);
      assert.ok(object.material.onBeforeCompile.toString().includes('staticSunDepth'), `${name} needs permanent shading`);
    }
    runtime.shade(mesh);
    assert.ok(material.onBeforeCompile.toString().includes('staticSunDepth'));
    runtime.dispose();
    assert.equal(material.onBeforeCompile, original, 'world disposal restores the car material before a new world');
    assert.throws(() => runtime.shade(mesh), /disposed/);
  } finally { runtime.dispose(); material.dispose(); mesh.geometry.dispose(); world.free(); }
});

test('the cove cannot be reached across dry land or shallow sea without entering the descent', () => {
  const queue = [{ x: 110, z: 8 }], visited = new Set(['110,8']);
  const entrance = PEBBLE_DESCENT.slice(0, 3);
  for (let next = 0; next < queue.length; next++) {
    const point = queue[next], height = tidalGroundHeight(point.x, point.z);
    assert.ok(Math.hypot(point.x - 126, point.z - 66) > 5,
      'a traversable cross-country corridor bypasses the intended descent');
    for (const dx of [-2, 0, 2]) for (const dz of [-2, 0, 2]) {
      if (!dx && !dz) continue;
      const x = point.x + dx, z = point.z + dz, key = `${x},${z}`;
      if (Math.abs(x) > 192 || Math.abs(z) > 192 || visited.has(key)) continue;
      if (demoPathSample(entrance, x, z).distance < 8) continue;
      const bed = tidalGroundHeight(x, z);
      if (bed < -0.5 || Math.abs(bed - height) > Math.hypot(dx, dz)) continue;
      visited.add(key); queue.push({ x, z });
    }
  }
  assert.ok(queue.length > 200, 'search the connected island rather than just the reported straight line');
});

for (const model of ['classic', 'modern'] as const) for (const [name, a, b] of [
  ['reported landing shortcut', { x: 110, z: 8 }, { x: 126, z: 66 }],
  ['western shoreline shortcut', { x: 104, z: 22 }, { x: 112, z: 66 }],
  ['lower cave approach shortcut', { x: 146, z: 4 }, { x: 176, z: 30 }],
] as const)
  test(`${model}: a real car cannot drive the ${name}`, () => {
    const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    const runtime = new TidalTracksRuntime(scene, world);
    try {
      runtime.beginAt(110, 8); world.step();
      const car = new Vehicle(scene, world, tidalSpawn(a), 1.45, tidalSurfaceAt, tidalWaterHeight, undefined, model);
      car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0),
        Math.atan2(-(b.x - a.x), -(b.z - a.z))), true);
      for (let tick = 0; tick < 2400; tick++) {
        const dx = b.x - car.position.x, dz = b.z - car.position.z;
        assert.ok(Math.hypot(dx, dz) > 4, `${model} reached ${name}`);
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(car.body.rotation());
        const angle = Math.atan2(dx, -dz) - Math.atan2(forward.x, -forward.z);
        const error = Math.atan2(Math.sin(angle), Math.cos(angle));
        car.beforeStep({ steer: error > 0.06 ? 1 : error < -0.06 ? -1 : 0,
          forward: tick > 90, reverse: false }, 1 / 60);
        world.step(); car.capture();
        if (car.contactCount() >= 2) runtime.visit(car.position.x, car.position.z);
      }
      assert.equal(runtime.recoveryStart.id, 'saltgrass-landing');
    } finally { runtime.dispose(); world.free(); disposeScene(scene); }
  });

test('the lookout junction cannot advance Pebble Cove by visiting Seabird, falling to the cove or inspecting the roof', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new TidalTracksRuntime(scene, world);
  const visit = (point: { x: number; z: number }) => runtime.visit(point.x, point.z);
  try {
    runtime.beginAt(PEBBLE_DESCENT[0].x, PEBBLE_DESCENT[0].z);
    for (const point of SEABIRD_CLIMB.slice(0, 5)) visit(point);
    for (const point of PEBBLE_DESCENT.slice(1)) visit(point);
    assert.equal(runtime.recoveryStart.id, 'windward-lookout', 'wrong branch must not count as cove progress');
    runtime.restart();
    for (const point of PEBBLE_DESCENT.slice(0, 5)) visit(point);
    for (const point of SEABIRD_CLIMB.slice(1)) visit(point);
    assert.equal(runtime.recoveryStart.id, 'windward-lookout', 'cove entry cannot complete Seabird');
    runtime.restart();
    visit(PEBBLE_DESCENT.at(-1)!);
    assert.equal(runtime.recoveryStart.id, 'windward-lookout', 'unearned cove/fall is not a checkpoint');
    for (const point of PEBBLE_DESCENT.slice(0, -2)) visit(point);
    visit(PEBBLE_STEPS.at(-1)!);
    assert.equal(runtime.recoveryStart.id, 'windward-lookout');
    for (const point of PEBBLE_DESCENT.slice(-2)) visit(point);
    assert.equal(runtime.restart().id, 'pebble-cove');
    runtime.update(164, 42); assert.equal(runtime.recoveryStart.id, 'pebble-cove');
    for (const point of [...PEBBLE_DESCENT].reverse()) visit(point);
    assert.equal(runtime.restart().id, 'windward-lookout', 'the earned lookout starts either new branch independently');
    for (const point of SEABIRD_CLIMB) visit(point);
    assert.equal(runtime.recoveryStart.id, 'seabird-summit');
  } finally { runtime.dispose(); world.free(); }
});

test('entering the safe cove pad earns the uphill departure without visiting its exact centre', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new TidalTracksRuntime(scene, world);
  try {
    runtime.beginAt(144, -53);
    for (const point of PEBBLE_DESCENT.slice(0, -2)) runtime.visit(point.x, point.z);
    const threshold = PEBBLE_STEPS.at(-1)!;
    runtime.visit(threshold.x, threshold.z);
    assert.equal(runtime.recoveryStart.id, 'windward-lookout', 'the last stone must still be completed');
    runtime.visit(140, 66);
    runtime.visit(137, 68);
    assert.equal(tidalGroundHeight(137, 68), 4, 'a real arrival on the flat cove pad');
    assert.equal(runtime.recoveryStart.id, 'pebble-cove', 'the cove is an area, not an invisible point to touch');
    for (const point of [...PEBBLE_DESCENT].reverse().slice(1, 10)) runtime.visit(point.x, point.z);
    runtime.visit(187, -38);
    assert.equal(runtime.restart().id, 'pebble-cove', 'falling two-thirds up must retry from the actual departure');
  } finally { runtime.dispose(); world.free(); }
});

test('wind-bent trees have varied green foliage and solid branches outside the driving envelope', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new TidalTracksRuntime(scene, world);
  try {
    world.step(); scene.updateMatrixWorld(true);
    const trunks = scene.getObjectByName('Wind-bent trunks'), crowns = scene.getObjectByName('Wind-bent crowns');
    assert.ok(trunks instanceof THREE.Mesh && crowns instanceof THREE.Mesh);
    const colors = crowns.geometry.getAttribute('color'), greens = new Set<string>();
    for (let i = 0; i < colors.count; i++) {
      assert.ok(colors.getY(i) > colors.getX(i) * 1.3 && colors.getY(i) > colors.getZ(i) * 1.4,
        'foliage must be distinctly green, not the muted stone palette');
      greens.add(`${colors.getX(i)},${colors.getY(i)},${colors.getZ(i)}`);
    }
    assert.equal(greens.size, 3);
    for (const mesh of [trunks, crowns]) {
      const vertices = mesh.geometry.getAttribute('position');
      for (let i = 0; i < vertices.count; i++)
        assert.ok(tidalRouteSample(vertices.getX(i), vertices.getZ(i)).distance > 4.2,
          `${mesh.name} intrudes into the driving envelope`);
    }
    const vertices = trunks.geometry.getAttribute('position'), normals = trunks.geometry.getAttribute('normal');
    let roots = 0;
    for (let i = 0; i < vertices.count; i += 3) {
      if (normals.getY(i) > -0.97) continue;
      const x = (vertices.getX(i) + vertices.getX(i + 1) + vertices.getX(i + 2)) / 3;
      const z = (vertices.getZ(i) + vertices.getZ(i + 1) + vertices.getZ(i + 2)) / 3;
      const support = [-2.5, 0, 2.5].flatMap(dx => [-2.5, 0, 2.5].map(dz => tidalGroundHeight(x + dx, z + dz)));
      assert.ok(Math.max(...support) - Math.min(...support) < 3.2, 'trees need a supported patch, not a trunk buried in a cliff');
      roots++;
    }
    assert.ok(roots > 5);
    let checked = 0;
    for (let i = 0; i < vertices.count; i += 3) {
      if (normals.getY(i) < 0.25) continue;
      const x = (vertices.getX(i) + vertices.getX(i + 1) + vertices.getX(i + 2)) / 3;
      const y = (vertices.getY(i) + vertices.getY(i + 1) + vertices.getY(i + 2)) / 3;
      const z = (vertices.getZ(i) + vertices.getZ(i + 1) + vertices.getZ(i + 2)) / 3;
      if (y < tidalGroundHeight(x, z) + 1) continue;
      const origin = new THREE.Vector3(x, y + 1, z), down = new THREE.Vector3(0, -1, 0);
      const visible = new THREE.Raycaster(origin, down).intersectObject(trunks)[0];
      const solid = world.castRay(new RAPIER.Ray(origin, down), 2, true);
      assert.ok(visible && solid);
      assert.ok(Math.abs(visible.distance - solid.timeOfImpact) < 0.0001, 'branch collision must match its rendered surface');
      checked++;
    }
    assert.ok(checked > 25, 'check branch faces throughout the forest');
    assert.equal(runtime.stats.colliderCount, 19, 'branches reuse the owned trunk collider');
  } finally { runtime.dispose(); world.free(); }
});

test('every exposed cairn stone has collision matching its visible surface', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new TidalTracksRuntime(scene, world);
  try {
    world.step(); scene.updateMatrixWorld(true);
    const cairns = scene.getObjectByName('Route cairns');
    assert.ok(cairns instanceof THREE.Mesh);
    const positions = cairns.geometry.getAttribute('position'), normals = cairns.geometry.getAttribute('normal');
    const down = new THREE.Vector3(0, -1, 0);
    let checked = 0;
    for (let i = 0; i < positions.count; i += 3) {
      if (normals.getY(i) < 0.2) continue;
      const x = (positions.getX(i) + positions.getX(i + 1) + positions.getX(i + 2)) / 3;
      const z = (positions.getZ(i) + positions.getZ(i + 1) + positions.getZ(i + 2)) / 3;
      if (z < -65) assert.ok(tidalRouteSample(x, z).distance > 2.5,
        'cliff cairns must clear incoming and outgoing ledges, not just their local segment');
      const bed = tidalGroundHeight(x, z), origin = new THREE.Vector3(x, bed + 3, z);
      const visible = new THREE.Raycaster(origin, down).intersectObject(cairns)[0];
      assert.ok(visible, 'an upward-facing stone must be visible from above');
      if (visible.point.y < bed + 0.05) continue;
      const solid = world.castRay(new RAPIER.Ray(origin, down), 4, true);
      assert.ok(solid, 'visible cairn stone must have a physical surface');
      assert.ok(Math.abs(solid.timeOfImpact - visible.distance) < 0.0001,
        `cairn collision must match the stone at ${x},${z}`);
      checked++;
    }
    assert.ok(checked > 50, 'check exposed faces across the entire cairn batch');
  } finally { runtime.dispose(); world.free(); }
});

async function drive(path: readonly { x: number; z: number }[], model: VehicleModelId, speed: number, keyboard = false,
  checkCamera = false) {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new TidalTracksRuntime(scene, world);
  try {
    const start = TIDAL_STARTS.find(start => Math.hypot(path[0].x - start.position.x, path[0].z - start.position.z) < 0.01);
    if (start) runtime.beginAt(start.position.x, start.position.z);
    world.step();
    const car = new Vehicle(scene, world, tidalSpawn(path[0]), 1.45, tidalSurfaceAt, tidalWaterHeight, undefined, model);
    const camera = new THREE.PerspectiveCamera(60, 4 / 3, 0.1, 1600);
    const follow = checkCamera ? new FollowCamera(camera, world, car, tidalGroundHeight, undefined, tidalWaterHeight) : null;
    car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0),
      Math.atan2(-(path[1].x - path[0].x), -(path[1].z - path[0].z))), true);
    let next = 1, water = 0, lift = 0, spread = 0, minimumUp = 1, air = 0, peakAir = 0;
    let low = Infinity, high = -Infinity, suspensionDifference = 0;
    const wetChannels = new Set<number>();
    for (let tick = 0; tick < 24000 && next < path.length; tick++) {
      const target = path[next], dx = target.x - car.position.x, dz = target.z - car.position.z;
      if (Math.hypot(dx, dz) < 2) { next++; continue; }
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(car.body.rotation());
      const angle = Math.atan2(dx, -dz) - Math.atan2(forward.x, -forward.z);
      const error = Math.atan2(Math.sin(angle), Math.cos(angle));
      if (car.contactCount() >= 2) runtime.visit(car.position.x, car.position.z);
      const steer = keyboard ? (error > 0.06 ? 1 : error < -0.06 ? -1 : 0) : Math.max(-1, Math.min(1, error * 2));
      car.beforeStep({ steer, reverse: false,
        forward: tick > 90 && Math.abs(car.speed) < (Math.abs(error) > (keyboard ? 0.5 : 0.45)
          ? Math.min(speed, keyboard ? 2.8 : 2) : speed) }, 1 / 60);
      world.step(); car.capture();
      if (follow) {
        car.syncVisuals(1); follow.update(1 / 60);
        assert.equal(world.intersectionWithShape(camera.position, camera.quaternion, new RAPIER.Ball(0.3),
          RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, SCENERY_QUERY_GROUPS), null,
        `camera entered scenery at ${camera.position.toArray()}`);
      }
      if (tick <= 90) continue;
      low = Math.min(low, car.position.y); high = Math.max(high, car.position.y);
      const suspension = Array.from({ length: 4 }, (_, i) => car.controller.wheelSuspensionLength(i) ?? 0);
      suspensionDifference = Math.max(suspensionDifference, Math.max(...suspension) - Math.min(...suspension));
      water = Math.max(water, car.waterDepth);
      minimumUp = Math.min(minimumUp, new THREE.Vector3(0, 1, 0).applyQuaternion(car.body.rotation()).y);
      air = car.contactCount() === 0 ? air + 1 : 0; peakAir = Math.max(peakAir, air);
      const heights: number[] = [];
      for (let wheel = 0; wheel < 4; wheel++) {
        const contact = car.controller.wheelContactPoint(wheel);
        if (contact && car.controller.wheelIsInContact(wheel)) heights.push(contact.y - tidalGroundHeight(contact.x, contact.z));
      }
      lift = Math.max(lift, ...heights);
      if (heights.length >= 2) spread = Math.max(spread, Math.max(...heights) - Math.min(...heights));
      if (car.waterDepth > 0.12) TIDAL_CHANNELS.forEach((channel, index) => {
        if (Math.hypot(car.position.x - (channel[0].x + channel[1].x) / 2,
          car.position.z - (channel[0].z + channel[1].z) / 2) < 7) wetChannels.add(index);
      });
      assert.ok(minimumUp > 0.65, `${model} tipped at ${JSON.stringify(car.position)}`);
      assert.ok(water < 0.6, `${model} left the shallow line at ${JSON.stringify(car.position)}; depth ${water}`);
    }
    if (next !== path.length) {
      const contacts: object[] = [];
      for (let bodyCollider = 0; bodyCollider < car.body.numColliders(); bodyCollider++)
        world.contactPairsWith(car.body.collider(bodyCollider), collider => world.contactPair(car.body.collider(bodyCollider), collider, manifold => {
          if (manifold.numSolverContacts()) contacts.push({ bodyCollider, collider: collider.handle, normal: manifold.normal(),
            points: Array.from({ length: manifold.numSolverContacts() }, (_, i) => manifold.solverContactPoint(i)) });
        }));
      assert.fail(`${model} stalled before ${next}: ${JSON.stringify({ position: car.position, speed: car.speed,
        rotation: car.body.rotation(), contacts,
        wheels: Array.from({ length: 4 }, (_, i) => ({ point: car.controller.wheelContactPoint(i),
          normal: car.controller.wheelContactNormal(i) })) })}`);
    }
    assert.ok(peakAir < 35, `unexpected flight: ${peakAir}`);
    return { water, lift, spread, low, high, suspensionDifference,
      wetChannels: wetChannels.size, checkpoint: runtime.recoveryStart.id };
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
}
for (const model of ['classic', 'modern'] as const) for (const reverse of [false, true])
  test(`${model}: keyboard steering completes the connected Seabird ${reverse ? 'descent' : 'ascent'}`, async () => {
    const path = [...TIDAL_ROUTE.slice(19), ...SEABIRD_CLIMB.slice(1)];
    const result = await drive(reverse ? [...path].reverse() : path, model, 2.5, true);
    assert.ok(result.lift > 0.1 && result.spread > 0.08 && result.suspensionDifference > 0.04, JSON.stringify(result));
    assert.ok(result.low < 8 && result.high > 67, JSON.stringify(result));
    assert.equal(result.water, 0);
    assert.equal(result.checkpoint, reverse ? 'saltgrass-landing' : 'seabird-summit');
  });
for (const model of ['classic', 'modern'] as const) for (const reverse of [false, true])
  for (const keyboard of [false, true])
    test(`${model}: Pebble Cove ${reverse ? 'return climb' : 'descent'} with ${keyboard ? 'keyboard' : 'analog'} steering`, async () => {
      const result = await drive(reverse ? [...PEBBLE_DESCENT].reverse() : PEBBLE_DESCENT, model, 2.5, keyboard, true);
      assert.equal(result.water, 0);
      assert.ok(result.low < 5 && result.high > 30, JSON.stringify(result));
      assert.ok(result.lift > 0.1 && result.spread > 0.08 && result.suspensionDifference > 0.04, JSON.stringify(result));
      assert.equal(result.checkpoint, reverse ? 'windward-lookout' : 'pebble-cove');
    });
for (const model of ['classic', 'modern'] as const) for (const keyboard of [false, true])
  test(`${model}: Pebble Cove shallow-water loop and dry return with ${keyboard ? 'keyboard' : 'analog'} steering`, async () => {
    const path = [PEBBLE_DESCENT.at(-1)!, { x: 126, z: 78 }, { x: 126, z: 88 },
      { x: 126, z: 96 }, { x: 132, z: 100 }, { x: 138, z: 96 }, { x: 138, z: 90 },
      { x: 132, z: 84 }, { x: 126, z: 78 }, PEBBLE_DESCENT.at(-1)!];
    const result = await drive(path, model, 2.3, keyboard, true);
    assert.ok(result.water > 0.15 && result.water < 0.5, JSON.stringify(result));
    assert.equal(result.checkpoint, 'pebble-cove', 'playing in the shallows must retain the earned cove');
  });
for (const model of ['classic', 'modern'] as const) for (const reverse of [false, true])
  test(`${model}: the crossing is complete at the earned shore, before driving inland ${reverse ? 'return' : 'outward'}`, async () => {
    const path = reverse ? TIDAL_ROUTE.slice(2, 20).reverse()
      : [...TIDAL_ROUTE.slice(0, 19), { x: 97, z: 0.2 }];
    const result = await drive(path, model, 2.7, true);
    assert.equal(result.wetChannels, 3, JSON.stringify(result));
    assert.ok(result.lift > 0.1 && result.spread > 0.08 && result.suspensionDifference > 0.04, JSON.stringify(result));
    assert.equal(result.checkpoint, reverse ? 'harbor-cove' : 'saltgrass-landing');
  });
for (const model of ['classic', 'modern'] as const) for (const reverse of [false, true])
  test(`${model}: complete fresh island journey ${reverse ? 'reverse' : 'forward'} with all wet channels and real steps`, async () => {
    const result = await drive(reverse ? [...TIDAL_ROUTE].reverse() : TIDAL_ROUTE, model, 2.7);
    assert.equal(result.wetChannels, 3, JSON.stringify(result));
    assert.ok(result.lift > 0.1 && result.spread > 0.08, JSON.stringify(result));
    assert.equal(result.checkpoint, reverse ? 'harbor-cove' : 'windward-lookout');
  });
for (const model of ['classic', 'modern'] as const) for (const reverse of [false, true])
  test(`${model}: Seabird Climb ${reverse ? 'descent' : 'ascent'} with real stone steps and safe ledges`, async () => {
    const result = await drive(reverse ? [...SEABIRD_CLIMB].reverse() : SEABIRD_CLIMB, model, 2.5);
    assert.ok(result.low < 32 && result.high > 67, JSON.stringify(result));
    assert.ok(result.lift > 0.1 && result.spread > 0.08 && result.suspensionDifference > 0.04, JSON.stringify(result));
    assert.equal(result.water, 0);
    assert.equal(result.checkpoint, reverse ? 'windward-lookout' : 'seabird-summit');
  });
for (const model of ['classic', 'modern'] as const)
  test(`${model}: turns around on the actual Windward Lookout pad`, async () => {
    const lookout = TIDAL_ROUTE.at(-1)!;
    const path = Array.from({ length: 9 }, (_, i) => ({
      x: lookout.x + Math.cos(i * Math.PI / 4) * 5.5,
      z: lookout.z + Math.sin(i * Math.PI / 4) * 5.5,
    }));
    await drive(path, model, 2.3);
  });
for (const model of ['classic', 'modern'] as const)
  test(`${model}: turns around on the actual Pebble Cove pad`, async () => {
    const shore = PEBBLE_DESCENT.at(-1)!;
    const path = Array.from({ length: 9 }, (_, i) => ({
      x: shore.x + Math.cos(i * Math.PI / 4) * 5.5,
      z: shore.z + Math.sin(i * Math.PI / 4) * 5.5,
    }));
    await drive(path, model, 2.3);
  });
for (const model of ['classic', 'modern'] as const)
  test(`${model}: turns around on the actual Seabird Summit pad`, async () => {
    const summit = SEABIRD_CLIMB.at(-1)!;
    const path = Array.from({ length: 9 }, (_, i) => ({
      x: summit.x + Math.cos(i * Math.PI / 4) * 5.5,
      z: summit.z + Math.sin(i * Math.PI / 4) * 5.5,
    }));
    await drive(path, model, 2.3);
  });
for (const step of [...TIDAL_STEPS, ...SEABIRD_STEPS, ...PEBBLE_STEPS]) for (const reverse of [false, true])
  test(`${step.name}: actual wheel climb ${reverse ? 'reverse' : 'forward'}`, async () => {
    const dx = -Math.sin(step.heading), dz = -Math.cos(step.heading);
    const path = [-7, 7].map(distance => ({ x: step.x + dx * distance, z: step.z + dz * distance }));
    // The shelf rib's uphill face uses the same controlled approach as the complete return drive.
    const speed = reverse ? (step.name === 'Resting shelf exit rib' ? 2.5 : 2.2)
      : step.name === 'Split Saddle slab' ? 4 : step.name === 'Landing rib' ? 3.2 : 2.2;
    const result = await drive(reverse ? path.reverse() : path, 'modern', speed);
    assert.ok(result.lift > 0.1 && result.spread > 0.08, JSON.stringify(result));
  });
