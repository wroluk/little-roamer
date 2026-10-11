import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import RAPIER from '@dimforge/rapier3d-compat';
import { MARS_OUTER_CIRCUIT } from './mars-journeys';
import { driveMarsPath } from './mars-driving';
import { MARS_HABITAT_SPOKES } from '../src/game/mars-spoke-layout';
import { MARS_ROUTES } from '../src/game/mars-terrain';
import { MARS_MARKED_ROUTES } from '../src/game/mars-landmarks';

before(async () => { await RAPIER.init(); });
test('four Habitat spokes and the outer circuit join without gaps', () => {
  const courtyard = MARS_ROUTES.find(route => route.name === 'Habitat courtyard')!;
  for (const spoke of MARS_HABITAT_SPOKES) {
    assert.ok(courtyard.points.some(p => p.x === spoke.points[0].x && p.z === spoke.points[0].z));
    const end = spoke.points.at(-1)!;
    assert.ok(MARS_ROUTES.some(route => route !== spoke && route.points.some(p => p.x === end.x && p.z === end.z)));
    assert.ok(!MARS_MARKED_ROUTES.includes(spoke));
  }
  const start = MARS_OUTER_CIRCUIT[0], end = MARS_OUTER_CIRCUIT.at(-1)!;
  assert.ok(Math.hypot(start.x - end.x, start.z - end.z) < 0.001);
});
for (const reverse of [false, true]) test(`Scout completes the continuous outer circuit ${reverse ? 'counterclockwise' : 'clockwise'}`, async () => {
  const path = reverse ? [...MARS_OUTER_CIRCUIT].reverse() : MARS_OUTER_CIRCUIT;
  const length = path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - path[i].x, p.z - path[i].z), 0);
  assert.ok(length > 4000);
  const result = await driveMarsPath(path, Math.ceil(length / 3 * 60) + 5400);
  assert.equal(result.next, path.length, JSON.stringify(result));
  assert.ok(result.minHeight > -0.15, 'no fall through terrain at chunk or region transitions');
  console.log(JSON.stringify({ direction: reverse ? 'counterclockwise' : 'clockwise', metres: Math.round(length), ...result }));
});
