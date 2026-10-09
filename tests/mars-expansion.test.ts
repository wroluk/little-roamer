import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MARS_HALF, MARS_MIN_CHUNK, MARS_MAX_CHUNK, glassfallPosition, marsScreenHeight } from '../src/game/mars-layout';
import { MARS_ROUTES, MARS_STARTS, marsSurfaceHeight, generateMarsChunk, marsTrailSample } from '../src/game/mars-terrain';
import { DISH_SITE, DISH_ROUTES } from '../src/game/mars-dish-layout';
import { GLASSFALL_SCAR, GLASSFALL_ROUTES, GLASSFALL_SOUTH } from '../src/game/mars-glassfall-layout';
import { IRON_FINS, IRON_ROUTES } from '../src/game/mars-iron-layout';

test('expanded Mars has a 1536 m footprint and exact terrain sampling throughout its apron', () => {
  assert.equal(MARS_HALF * 2, 1536);
  assert.equal(MARS_MIN_CHUNK, -9); assert.equal(MARS_MAX_CHUNK, 8);
  for (const [cx, cz] of [[-9, -9], [8, 8], [7, -7], [5, 4]]) {
    const chunk = generateMarsChunk(cx, cz);
    assert.ok(chunk.vertices.every(Number.isFinite));
    for (let i = 0; i < chunk.indices.length; i += 303) {
      const indices = [0, 1, 2].map(j => chunk.indices[i + j] * 3);
      const mean = (offset: number) => indices.reduce((sum, index) => sum + chunk.vertices[index + offset], 0) / 3;
      assert.ok(Math.abs(marsSurfaceHeight(mean(0), mean(2)) - mean(1)) < 0.0002);
    }
  }
  assert.throws(() => generateMarsChunk(9, 0), /outside apron/);
  assert.throws(() => generateMarsChunk(-10, 0), /outside apron/);
  for (const start of MARS_STARTS) assert.ok(Math.max(Math.abs(start.position.x), Math.abs(start.position.z)) < MARS_HALF - 100);
});

test('the eastern journey has separated destinations and connected, human-scale roads', () => {
  const anvil = IRON_FINS.find(fin => fin.seed === 6)!;
  assert.ok(Math.hypot(DISH_SITE.x - GLASSFALL_SCAR.x, DISH_SITE.z - GLASSFALL_SCAR.z) > 400);
  assert.ok(Math.hypot(anvil.x - GLASSFALL_SCAR.x, anvil.z - GLASSFALL_SCAR.z) > 450);
  assert.deepEqual(DISH_ROUTES[5].points.at(-1), GLASSFALL_ROUTES[0].points[0]);
  assert.deepEqual(GLASSFALL_ROUTES[4].points.at(-1), IRON_ROUTES[0].points[0]);
  for (const route of [GLASSFALL_ROUTES[0], IRON_ROUTES[0]]) {
    const length = route.points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - route.points[i].x, p.z - route.points[i].z), 0);
    assert.ok(length > 290, `${route.name} needs a real journey`);
  }
  for (const route of MARS_ROUTES) assert.ok((route.halfWidth ?? 5.5) <= 5.5, 'roads are not uniformly enlarged with terrain');
  for (const fin of IRON_FINS.filter(fin => fin.seed >= 21)) {
    const road = marsTrailSample(fin.x, fin.z);
    assert.ok(road.distance > road.halfWidth + fin.length / 2 + fin.width, 'transition clues stay clear of the road');
  }
});

function obstruction(from: { x: number; z: number }, to: { x: number; z: number }, targetHeight: number) {
  const eye = marsSurfaceHeight(from.x, from.z) + 3, target = marsSurfaceHeight(to.x, to.z) + targetHeight;
  let highest = -Infinity;
  for (let i = 1; i < 200; i++) {
    const t = i / 200;
    highest = Math.max(highest, marsSurfaceHeight(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t)
      - (eye + (target - eye) * t));
  }
  return highest;
}

test('Glassfall has an open low approach while Iron retains its screened reveal', () => {
  const fan = glassfallPosition({ x: 217, z: 36 }), anvil = IRON_FINS.find(fin => fin.seed === 6)!;
  for (let x = 380; x <= 630; x += 10) for (let z = -270; z <= 175; z += 10) {
    assert.equal(marsScreenHeight(x, z), 0, 'no added screening mountains beside the glass plain');
  }
  assert.ok(obstruction({ x: 549, z: -218 }, fan, 1) < 0, 'Glassfall opens up along its low approach');
  assert.ok(obstruction(GLASSFALL_SOUTH, anvil, 35) > 10, 'the next region is not visible from the glass exit');
  assert.ok(obstruction({ x: 374, z: 315 }, anvil, 35) < 0, 'Split Anvil emerges after the western bend');
  for (const fin of IRON_FINS.filter(fin => fin.seed >= 21)) {
    const dx = Math.sin(fin.yaw) * fin.length / 2, dz = Math.cos(fin.yaw) * fin.length / 2;
    const slope = Math.abs(marsSurfaceHeight(fin.x + dx, fin.z + dz) - marsSurfaceHeight(fin.x - dx, fin.z - dz)) / fin.length;
    assert.ok(slope < 0.15, 'small approach fins sit on gentle ground, not mountain faces');
  }
});
