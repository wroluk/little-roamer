import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  buildMoonDiscoveries, MOON_DISCOVERY_APPROACHES, MOON_LANDING_SITE, MOON_SURVEY_ROVER, moonDiscoveryClearance,
} from '../src/game/moon-discoveries';
import { MOON_ROUTES, MOON_STARTS, moonSurfaceHeight, moonTrailSample } from '../src/game/moon-terrain';
import { POSTCARDS, PostcardTracker, readPostcardRecords } from '../src/game/postcards';
import { disposeScene } from '../src/game/dispose';
import { MoonRuntime } from '../src/game/moon';

before(async () => { await RAPIER.init(); });

test('two widely separated discoveries stay off ordinary lunar routes and regional starts', () => {
  assert.ok(Math.hypot(MOON_LANDING_SITE.x - MOON_SURVEY_ROVER.x, MOON_LANDING_SITE.z - MOON_SURVEY_ROVER.z) > 250);
  for (const site of [MOON_LANDING_SITE, MOON_SURVEY_ROVER]) {
    assert.ok(moonTrailSample(site.x, site.z).distance > 40);
    assert.equal(moonDiscoveryClearance(site.x, site.z), true);
  }
  for (const route of MOON_ROUTES) {
    const found = new Set<string>(), first = route.points[0], tracker = new PostcardTracker(found, first.x, first.z);
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
      for (let j = 1; j <= steps; j++)
        tracker.update('moon', a.x + (b.x - a.x) * j / steps, a.z + (b.z - a.z) * j / steps);
    }
    assert.equal(POSTCARDS.some(card => card.secret && found.has(card.id)), false, route.name);
  }
  for (const start of MOON_STARTS) for (const site of [MOON_LANDING_SITE, MOON_SURVEY_ROVER])
    assert.ok(Math.hypot(start.position.x - site.x, start.position.z - site.z) > site.radius + 20);
});

test('natural discovery approaches retain bounded grades across the actual driving width', () => {
  for (const { points } of MOON_DISCOVERY_APPROACHES) for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z;
    const length = Math.hypot(dx, dz), steps = Math.ceil(length);
    for (const offset of [-2, 0, 2]) for (let j = 0; j < steps; j++) {
      const x = a.x + dx * j / steps - dz / length * offset;
      const z = a.z + dz * j / steps + dx / length * offset;
      const grade = Math.abs(moonSurfaceHeight(x + dx / steps, z + dz / steps) - moonSurfaceHeight(x, z)) / (length / steps);
      const limit = points === MOON_DISCOVERY_APPROACHES[0].points ? 0.65 : 0.45;
      assert.ok(grade < limit, `approach grade ${grade} at ${x},${z}`);
    }
  }
});

test('lunar discoveries require real close travel, persist and never repeat or unlock another world', () => {
  for (const card of POSTCARDS.filter(card => card.area === 'moon' && card.secret)) {
    const found = new Set<string>(), tracker = new PostcardTracker(found, 0, 0);
    assert.deepEqual(tracker.update('moon', card.x, card.z), [], 'teleport cannot discover');
    tracker.reset(card.x + card.radius + 20, card.z);
    for (let x = card.x + card.radius + 19; x > card.x + card.radius; x--)
      assert.deepEqual(tracker.update('moon', x, card.z), [], 'passing outside the small zone');
    assert.deepEqual(tracker.update('moon', card.x + card.radius, card.z).map(c => c.id), [card.id]);
    assert.deepEqual(tracker.update('moon', card.x + card.radius - 1, card.z), []);
    const records = [{ id: card.id, discoveredAt: '2026-10-25T12:00:00.000Z' }];
    assert.deepEqual(readPostcardRecords({ getItem: () => JSON.stringify(records) }), records);
    const other = new PostcardTracker(new Set(), card.x, card.z);
    assert.deepEqual(other.update('mars', card.x + 9, card.z), []);
  }
});

test('scenic postcards keep separated zones and retain the exploration gate', () => {
  const cards = POSTCARDS.filter(card => card.area === 'moon');
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++)
    for (const a of [cards[i], ...(cards[i].visitZones ?? [])])
      for (const b of [cards[j], ...(cards[j].visitZones ?? [])])
        assert.ok(Math.hypot(a.x - b.x, a.z - b.z) - a.radius - b.radius > 100,
          'postcard zones must stay separate from neighbouring discoveries');
  for (const card of cards.filter(card => !card.secret)) {
    if (card.id !== 'sea-turned-to-stone')
      assert.ok(card.radius <= 12 && !card.visitZones, 'other scenic triggers remain narrow viewpoints');
    assert.equal(card.note.split('.').filter(sentence => sentence.trim()).length, 2);
    const found = new Set<string>(), tracker = new PostcardTracker(found, 0, 0);
    assert.deepEqual(tracker.update('moon', card.x, card.z), [], 'teleport cannot discover a scenic card');
    assert.deepEqual(tracker.update('moon', card.x + 4, card.z), [], 'short movement cannot discover');
    assert.deepEqual(tracker.update('moon', card.x + 8, card.z).map(card => card.id), [card.id]);
    assert.deepEqual(tracker.update('moon', card.x, card.z), [], 'already found');
    const outside = new PostcardTracker(new Set(), card.x - 20, card.z + card.radius + 1);
    for (let x = card.x - 19; x <= card.x + 20; x++)
      assert.deepEqual(outside.update('moon', x, card.z + card.radius + 1), [], 'passing outside cannot unlock');
    const records = [{ id: card.id, discoveredAt: '2026-10-25T12:00:00.000Z' }];
    assert.deepEqual(readPostcardRecords({ getItem: () => JSON.stringify(records) }), records);
  }
  const bypass = MOON_ROUTES.find(route => route.name === 'Skylight Hollow surface bypass')!;
  const found = new Set<string>(), first = bypass.points[0], tracker = new PostcardTracker(found, first.x, first.z);
  for (let i = 1; i < bypass.points.length; i++) {
    const a = bypass.points[i - 1], b = bypass.points[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
    for (let j = 1; j <= steps; j++) tracker.update('moon', a.x + (b.x - a.x) * j / steps, a.z + (b.z - a.z) * j / steps);
  }
  assert.equal(found.has('window-into-darkness'), false, 'the surface bypass is not the interior viewpoint');
});

test('Basalt Sea covers the central flat plain without swallowing the outer approaches', () => {
  const card = POSTCARDS.find(card => card.id === 'sea-turned-to-stone')!;
  const zones = [card, ...(card.visitZones ?? [])];
  assert.deepEqual(zones.map(({ x, z, radius }) => ({ x, z, radius })), [
    { x: 65, z: 235, radius: 28 }, { x: 25, z: 235, radius: 28 }, { x: 105, z: 235, radius: 28 },
  ]);
  const covered = (x: number, z: number) => zones.some(zone => Math.hypot(x - zone.x, z - zone.z) <= zone.radius);
  for (let x = 15; x <= 115; x += 5) for (let z = 218; z <= 252; z += 2)
    assert.ok(covered(x, z), `flat plain missed at ${x},${z}`);
  for (const p of [{ x: -15, z: 235 }, { x: 145, z: 235 }, { x: 65, z: 190 }, { x: 65, z: 285 }])
    assert.equal(covered(p.x, p.z), false, `outer approach included at ${p.x},${p.z}`);
  for (const xs of [[-35, -25, -15], [165, 155, 145]]) {
    const found = new Set<string>(), tracker = new PostcardTracker(found, xs[0], 235);
    for (const x of xs.slice(1)) tracker.update('moon', x, 235);
    assert.deepEqual([...found], [], 'driving through a removed outer centre cannot discover');
  }
  for (const reverse of [false, true]) {
    const found = new Set<string>(), xs = Array.from({ length: 53 }, (_, i) => -65 + i * 5);
    if (reverse) xs.reverse();
    const tracker = new PostcardTracker(found, xs[0], 235);
    for (const x of xs.slice(1)) tracker.update('moon', x, 235);
    assert.deepEqual([...found], [card.id], 'the broad flat crossing discovers only Basalt Sea');
  }
});

test('Moon reference map shows every exact trigger circle and each postcard has a captured image', () => {
  const svg = readFileSync(new URL('../artifacts/moon/postcard-trigger-map.svg', import.meta.url), 'utf8');
  const views: { name: string; position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number }; fov?: number }[] = JSON.parse(
    readFileSync(new URL('../artifacts/moon/discoveries/capture-views.json', import.meta.url), 'utf8'));
  const cards = POSTCARDS.filter(card => card.area === 'moon');
  assert.equal([...svg.matchAll(/data-postcard="/g)].length, 5);
  for (const card of cards) {
    const group = svg.match(new RegExp(`<g data-postcard="${card.id}">([\\s\\S]*?)</g>`))?.[1];
    assert.ok(group, `${card.id} map ring`);
    const circles = [...group.matchAll(/<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/g)];
    const zones = [card, ...(card.visitZones ?? [])];
    assert.equal(circles.length, zones.length + 1, 'all trigger rings plus the offset badge');
    const scale = 900 / 768;
    zones.forEach((zone, i) => {
      for (const [actual, expected] of [
        [Number(circles[i][1]), 500 + zone.x * scale], [Number(circles[i][2]), 620 + zone.z * scale],
        [Number(circles[i][3]), zone.radius * scale],
      ]) assert.ok(Math.abs(actual - expected) <= 0.006, `${card.id} exact map geometry`);
    });
    const jpeg = readFileSync(new URL(`../public/${card.image.slice(2)}`, import.meta.url));
    assert.equal(jpeg.readUInt16BE(0), 0xffd8, `${card.id} real JPEG`);
    const source = readFileSync(new URL(`../artifacts/moon/discoveries/${card.id}.png`, import.meta.url));
    assert.equal(source.readUInt32BE(16), 800); assert.equal(source.readUInt32BE(20), 600);
    if (!card.secret) {
      const view = views.find(view => view.name === card.id);
      assert.ok(view);
      if (card.id === 'window-into-darkness') {
        const requested = JSON.parse(readFileSync(new URL(
          '../artifacts/moon/discoveries/window-photo-view.json', import.meta.url), 'utf8'));
        assert.deepEqual({ position: view.position, target: view.target, fov: view.fov }, requested.camera,
          'preserve the user-selected photo independently of the discovery trigger');
      } else assert.ok(Math.hypot(view.position.x - card.x, view.position.z - card.z) <= card.radius,
        `${card.id} photograph must be taken within its viewpoint trigger`);
    }
  }
});

test('discovery hardware is immutable, material-batched, bounded and fully disposable', () => {
  const scene = new THREE.Scene(), group = buildMoonDiscoveries(), other = buildMoonDiscoveries();
  scene.add(group, other);
  let triangles = 0, released = 0;
  group.children.forEach((object, i) => {
    assert.ok(object instanceof THREE.Mesh);
    assert.ok(object.material instanceof THREE.MeshStandardMaterial || object.material instanceof THREE.MeshBasicMaterial);
    const geometry = object.geometry, reference = (other.children[i] as THREE.Mesh).geometry;
    assert.equal(geometry.index, null);
    assert.deepEqual(geometry.getAttribute('position').array, reference.getAttribute('position').array);
    assert.ok([...geometry.getAttribute('position').array].every(Number.isFinite));
    triangles += geometry.getAttribute('position').count / 3;
    geometry.addEventListener('dispose', () => released++);
    object.material.addEventListener('dispose', () => released++);
  });
  assert.ok(group.children.length <= 8);
  assert.ok(triangles < 4_000, `${triangles} discovery triangles`);
  disposeScene(scene);
  assert.equal(released, group.children.length * 2);
});

test('survey tracks use soft translucent driving stamps, not solid lit ribbons', () => {
  const scene = new THREE.Scene(), group = buildMoonDiscoveries(); scene.add(group);
  try {
    const tracks = group.getObjectByName('Moon survey tracks');
    assert.ok(tracks instanceof THREE.Mesh && tracks.material instanceof THREE.MeshBasicMaterial);
    assert.equal(tracks.material.transparent, true);
    assert.equal(tracks.material.depthWrite, false);
    assert.equal(tracks.castShadow, false);
    assert.equal(tracks.receiveShadow, false);
    const positions = tracks.geometry.getAttribute('position'), colors = tracks.geometry.getAttribute('color');
    assert.equal(positions.count, 32 * 12);
    assert.equal(colors.itemSize, 4);
    for (let i = 0; i < positions.count; i++) {
      assert.ok(Math.abs(positions.getY(i) - moonSurfaceHeight(positions.getX(i), positions.getZ(i)) - 0.025) < 0.00001);
      assert.ok(colors.getW(i) >= 0.044 && colors.getW(i) <= 0.181);
    }
    assert.ok(Math.abs(colors.getW(2) - 0.18) < 0.000001, 'stronger authored tracks retain visible centre opacity');
    assert.ok(colors.getW(0) < colors.getW(2), 'stamp ends fade instead of showing hard rectangular edges');
    const note = POSTCARDS.find(card => card.id === 'stranded-surveyor')!.note;
    assert.ok(note.includes('Before Earthview Base') && note.includes('Silver Rille'));
    assert.equal(note.split('.').filter(sentence => sentence.trim()).length, 2);
  } finally { disposeScene(scene); }
});

test('landing pads bury their whole footprint and visible hardware has exact runtime collision', async () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -3, z: 0 });
  const runtime = new MoonRuntime(scene, world);
  try {
    await runtime.ensureReady(MOON_LANDING_SITE.x, MOON_LANDING_SITE.z);
    world.step(); scene.updateMatrixWorld(true);
    const discovery = scene.getObjectByName('Moon discoveries')!;
    const down = new THREE.Vector3(0, -1, 0), ray = new THREE.Raycaster();
    const terrain = scene.getObjectByName('Moon continuous landscape')!;
    for (const [site, view] of [
      [MOON_LANDING_SITE, { x: 75, z: 105 }], [MOON_SURVEY_ROVER, { x: 250, z: 140 }],
    ] as const) {
      const eye = new THREE.Vector3(view.x, moonSurfaceHeight(view.x, view.z) + 2.8, view.z);
      const target = new THREE.Vector3(site.x, moonSurfaceHeight(site.x, site.z) + 5, site.z);
      ray.set(eye, target.clone().sub(eye).normalize());
      const first = ray.intersectObject(terrain)[0];
      assert.ok(first && first.distance < eye.distanceTo(target), 'ordinary route terrain screens the discovery');
    }
    for (const site of [MOON_LANDING_SITE, MOON_SURVEY_ROVER]) {
      for (const dx of [-1, 0, 1]) {
        const origin = new THREE.Vector3(site.x + dx, 100, site.z);
        ray.set(origin, down);
        const visible = ray.intersectObject(discovery, true)[0];
        assert.ok(visible, 'hardware must exist above each site');
        const physical = world.castRay(new RAPIER.Ray(origin, down), 100, true);
        assert.ok(physical);
        assert.ok(Math.abs((100 - physical.timeOfImpact) - visible.point.y) < 0.001, 'visible/collision agreement');
      }
    }
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI / 4 + i * Math.PI / 2;
      const x = MOON_LANDING_SITE.x + Math.cos(angle) * 5.3, z = MOON_LANDING_SITE.z + Math.sin(angle) * 5.3;
      for (let a = 0; a < 12; a++) {
        const px = x + Math.cos(a / 12 * Math.PI * 2) * 0.5, pz = z + Math.sin(a / 12 * Math.PI * 2) * 0.5;
        const ground = moonSurfaceHeight(px, pz);
        ray.set(new THREE.Vector3(px, ground + 1, pz), down);
        const top = ray.intersectObject(discovery, true)[0];
        assert.ok(top && top.point.y > ground, 'pad top clears the terrain across its footprint');
        ray.set(new THREE.Vector3(px, ground - 1, pz), down.clone().negate());
        const bottom = ray.intersectObject(discovery, true)[0];
        assert.ok(bottom && bottom.point.y < ground, 'pad bottom remains buried');
      }
    }
    runtime.dispose();
    assert.equal(world.colliders.len(), 0);
  } finally { runtime.dispose(); world.free(); disposeScene(scene); }
});
