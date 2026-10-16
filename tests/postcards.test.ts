import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POSTCARDS, POSTCARD_STORAGE_KEY, PostcardTracker, readPostcardRecords } from '../src/game/postcards';
import { LAVA_TUBES, TUBES_START, tubePoint } from '../src/game/mars-tubes-layout';
import { wreckPoint } from '../src/game/mars-wreck-layout';
import { DELTA_ROUTES } from '../src/game/mars-delta-layout';
import { DUNES_ROUTES } from '../src/game/mars-dunes-layout';
import { ADVENTURE_REGIONS } from '../src/game/northern-adventures';
import { VALLEY_TRAIL } from '../src/game/northern-valley';
import { FOREST_TRAILS } from '../src/game/northern-forest';
import { COAST_TRAILS } from '../src/game/northern-coast';
import { PASS_TRAILS } from '../src/game/northern-pass';
import { EMBER_TRAILS } from '../src/game/northern-ember';
import { MARSH_TRAILS } from '../src/game/northern-marsh';
import { inletCenterX } from '../src/game/northern-watershed';

function drivePath(tracker: PostcardTracker, area: 'mars' | 'northern-reach', points: readonly { x: number; z: number }[]) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 5);
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      tracker.update(area, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
    }
  }
}

test('journal covers every named region and keeps the two discoveries separate', () => {
  assert.equal(POSTCARDS.filter(card => card.area === 'northern-reach').length, 17);
  assert.equal(POSTCARDS.filter(card => card.area === 'mars').length, 10);
  assert.deepEqual(POSTCARDS.filter(card => card.secret).map(card => card.id), ['stone-circle', 'shuttle-wreck']);
  assert.equal(new Set(POSTCARDS.map(card => card.id)).size, POSTCARDS.length);
  assert.ok(POSTCARDS.every(card => card.note && card.image.endsWith(`${card.id}.jpg`)));
});

test('driving into Pine Hollows reveals its postcard after leaving the Northern start', () => {
  const found = new Set<string>();
  const tracker = new PostcardTracker(found, 24, 560);
  for (const [x, z] of [[16, 552], [8, 544], [0, 536], [-8, 528]]) tracker.update('northern-reach', x, z);
  assert.equal(found.has('pine-hollows'), true);
});

test('Northern Reach postcards unlock on every authored trail in either direction', () => {
  const routes = [
    ...ADVENTURE_REGIONS.map(region => ({ id: region.id, trails: region.trails })),
    { id: 'river-valley', trails: [{ name: 'Valley trail', points: VALLEY_TRAIL }] },
    { id: 'pine-hollows', trails: FOREST_TRAILS },
    { id: 'fjord-coast', trails: COAST_TRAILS },
    { id: 'high-pass', trails: PASS_TRAILS },
    { id: 'ember-basin', trails: EMBER_TRAILS },
    { id: 'willow-marsh', trails: MARSH_TRAILS },
  ];
  for (const region of routes) for (const trail of region.trails) for (const reverse of [false, true]) {
    const points = reverse ? [...trail.points].reverse() : trail.points;
    const found = new Set<string>();
    drivePath(new PostcardTracker(found, points[0].x, points[0].z), 'northern-reach', points);
    assert.ok(found.has(region.id), `${region.id} missed on ${trail.name} ${reverse ? 'reverse' : 'forward'}`);
  }
});

test('Alder River unlocks on separate upstream bank stretches, not one fixed spot', () => {
  for (const [near, far] of [[-140, -210], [-260, -330], [-370, -440], [-470, -540]]) {
    for (const reverse of [false, true]) {
      const zs = Array.from({ length: Math.abs(far - near) / 5 + 1 }, (_, i) => near + Math.sign(far - near) * i * 5);
      const points = (reverse ? zs.reverse() : zs).map(z => ({ x: inletCenterX(z) + 42, z }));
      const found = new Set<string>();
      drivePath(new PostcardTracker(found, points[0].x, points[0].z), 'northern-reach', points);
      assert.ok(found.has('alder-river'), `missed river bank ${near} to ${far} ${reverse ? 'reverse' : 'forward'}`);
    }
  }
});

test('saved visits retain only unique known cards with valid dates', () => {
  const valid = { id: 'river-valley', discoveredAt: '2026-10-14T12:00:00.000Z' };
  const storage = { getItem: (key: string) => key === POSTCARD_STORAGE_KEY
    ? JSON.stringify([valid, valid, { id: 'unknown', discoveredAt: valid.discoveredAt },
      { id: 'shuttle-wreck', discoveredAt: 'not a date' }]) : null };
  assert.deepEqual(readPostcardRecords(storage), [valid]);
  assert.deepEqual(readPostcardRecords({ getItem: () => '{' }), []);
});

test('a moving pass unlocks once after exploration, without a dwell time or speed condition', () => {
  const card = POSTCARDS.find(item => item.id === 'river-valley')!;
  const found = new Set<string>();
  const tracker = new PostcardTracker(found, card.x - 100, card.z);
  assert.deepEqual(tracker.update(card.area, card.x - 95, card.z), []);
  assert.deepEqual(tracker.update(card.area, card.x - 70, card.z).map(item => item.id), [card.id]);
  assert.deepEqual(tracker.update(card.area, card.x - 60, card.z), []);
  assert.equal(found.has(card.id), true);
});

test('spawn, reset and teleport do not count as discovering a secret', () => {
  const card = POSTCARDS.find(item => item.id === 'stone-circle')!;
  const found = new Set<string>();
  const tracker = new PostcardTracker(found, card.x, card.z);
  assert.deepEqual(tracker.update(card.area, card.x + 4, card.z), []);
  tracker.reset(card.x, card.z);
  assert.deepEqual(tracker.update(card.area, card.x + 7, card.z), []);
  assert.deepEqual(tracker.update(card.area, card.x + 8, card.z).map(item => item.id), [card.id]);
  const other = new PostcardTracker(new Set(), 0, 0);
  assert.deepEqual(other.update(card.area, card.x, card.z), []);
  assert.deepEqual(other.update('valley', card.x + 9, card.z), []);
});

test('Lava Tubes unlock in either passage or on the surface bypass', () => {
  const card = POSTCARDS.find(item => item.id === 'lava-tubes')!;
  const routes = [
    (z: number) => tubePoint(LAVA_TUBES[0], z).x,
    (z: number) => tubePoint(LAVA_TUBES[1], z).x,
    () => -536,
  ];
  for (const xAt of routes) {
    const found = new Set<string>();
    const tracker = new PostcardTracker(found, xAt(-560), -560);
    for (let z = -550; z <= -420; z += 10) tracker.update('mars', xAt(z), z);
    assert.equal(found.has(card.id), true, `no postcard along x=${xAt(-500)}`);
  }
  const found = new Set<string>();
  const tracker = new PostcardTracker(found, TUBES_START.x, TUBES_START.z);
  for (let z = TUBES_START.z - 10; z >= TUBES_START.z - 40; z -= 10) {
    tracker.update('mars', TUBES_START.x, z);
  }
  assert.equal(found.has(card.id), false, 'spawning at the southern regional start is not a visit yet');
});

test('Fossil Delta and Rust Dunes unlock on a first pass along each through route', () => {
  for (const [id, routes] of [
    ['fossil-delta', DELTA_ROUTES.slice(1, 4)],
    ['rust-dunes', DUNES_ROUTES.slice(1, 4)],
  ] as const) for (const route of routes) for (const reverse of [false, true]) {
    const points = reverse ? [...route.points].reverse() : route.points;
    const found = new Set<string>();
    const tracker = new PostcardTracker(found, points[0].x, points[0].z);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 5);
      for (let step = 1; step <= steps; step++) {
        const t = step / steps;
        tracker.update('mars', a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
      }
    }
    assert.ok(found.has(id), `${id} missed on ${route.name} ${reverse ? 'reverse' : 'forward'}`);
  }
});

test('a drive past the shuttle flank unlocks it while the connector stays outside', () => {
  const card = POSTCARDS.find(item => item.id === 'shuttle-wreck')!;
  const start = wreckPoint(-72, 75), found = new Set<string>();
  const flank = new PostcardTracker(found, start.x, start.z);
  for (let v = 70; v >= 5; v -= 5) {
    const p = wreckPoint(-72, v);
    flank.update('mars', p.x, p.z);
  }
  assert.equal(found.has(card.id), true, 'the visible western flank should count as a visit');
  const connectorFound = new Set<string>(), connector = new PostcardTracker(connectorFound, -515, 239);
  for (let x = -525; x >= -605; x -= 5) connector.update('mars', x, 239);
  assert.equal(connectorFound.has(card.id), false, 'a main connector pass remains undiscovered');
});
