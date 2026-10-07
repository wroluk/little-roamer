import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NORTHERN_STARTS, nearestNorthernStart, regionalSpawn } from '../src/game/regional-starts';
import { sampledHeightAt, waterHeightAt } from '../src/game/northern-terrain';

test('every regional start is unique, dry, and selects itself', () => {
  assert.equal(new Set(NORTHERN_STARTS.map(s => s.id)).size, NORTHERN_STARTS.length);
  for (const start of NORTHERN_STARTS) {
    const spawn = regionalSpawn(start);
    assert.equal(nearestNorthernStart(spawn.x, spawn.z), start);
    assert.equal(waterHeightAt(spawn.x, spawn.z), null, start.name);
    assert.equal(spawn.y, sampledHeightAt(spawn.x, spawn.z) + 1.25);
  }
});

test('coastal mishaps recover regionally and distance selection is stable', () => {
  assert.equal(nearestNorthernStart(-720, 400).id, 'fjord-coast');
  for (let x = -740; x < 740; x += 73) for (let z = -740; z < 740; z += 71) {
    const sorted = [...NORTHERN_STARTS].sort((a, b) => Math.hypot(x-a.position.x,z-a.position.z)-Math.hypot(x-b.position.x,z-b.position.z));
    assert.equal(nearestNorthernStart(x, z), sorted[0]);
  }
  // Find a Voronoi boundary midpoint and verify repeatability at an equal-distance boundary.
  const a = NORTHERN_STARTS.find(s => s.id === 'river-valley')!;
  const b = NORTHERN_STARTS.find(s => s.id === 'willow-marsh')!;
  const x = (a.position.x+b.position.x)/2, z = (a.position.z+b.position.z)/2;
  assert.equal(nearestNorthernStart(x,z), a);
});
