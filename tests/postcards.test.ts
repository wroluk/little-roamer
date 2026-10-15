import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POSTCARDS, POSTCARD_STORAGE_KEY, PostcardTracker, readPostcardRecords } from '../src/game/postcards';
import { LAVA_TUBES, TUBES_START, tubePoint } from '../src/game/mars-tubes-layout';

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
