import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { dishBowlGeometry } from '../src/game/mars-dish-landmarks';
import { DISH_START, DISH_SITE, DISH_ROUTES, DISH_RELAYS } from '../src/game/mars-dish-layout';
import { marsSurfaceHeight, nearestMarsStart, marsSurfaceAt, marsTrailSample } from '../src/game/mars-terrain';

test('Dish receiver is a closed concave shell with outward faces and a clear cavity', () => {
  const geometry = dishBowlGeometry(), positions = geometry.getAttribute('position'), indices = geometry.index!;
  const edges = new Map<string, number>();
  for (let i = 0; i < indices.count; i += 3) {
    const vertices = [0, 1, 2].map(j => indices.getX(i + j));
    const [a, b, c] = vertices.map(j => new THREE.Vector3().fromBufferAttribute(positions, j));
    assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).length() > 1e-6, 'no degenerate panels');
    for (let j = 0; j < 3; j++) {
      const key = [vertices[j], vertices[(j + 1) % 3]].sort((a, b) => a - b).join(',');
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  assert.ok([...edges.values()].every(count => count === 2), 'shell has no open or overlapping seams');
  const material = new THREE.MeshBasicMaterial(), mesh = new THREE.Mesh(geometry, material);
  for (const radius of [0.2, 8.5, 15.3]) {
    const front = new THREE.Raycaster(new THREE.Vector3(radius, 20, 0), new THREE.Vector3(0, -1, 0)).intersectObject(mesh)[0];
    const back = new THREE.Raycaster(new THREE.Vector3(radius, -5, 0), new THREE.Vector3(0, 1, 0)).intersectObject(mesh)[0];
    assert.ok(front && back, 'front and rear faces both point outward');
    assert.ok(Math.abs(front.point.y - 5.5 * (radius / 17) ** 2) < 0.025, 'ray reaches the concave surface, not a flat lid');
    assert.ok(Math.abs(front.point.y - back.point.y - 0.32) < 1e-5);
  }
  geometry.dispose(); material.dispose();
});

test('Dish terrace, saddle reset and rough ledge match the authored region', () => {
  for (let x = -10; x <= 10; x += 2) for (let z = -10; z <= 10; z += 2)
    assert.ok(Math.abs(marsSurfaceHeight(DISH_SITE.x + x, DISH_SITE.z + z) - DISH_SITE.y) < 0.1, 'dish feet stand on a level terrace');
  assert.equal(nearestMarsStart(DISH_SITE.x, DISH_SITE.z).id, 'dish-ridge');
  assert.ok(Math.abs(marsSurfaceHeight(DISH_START.x, DISH_START.z) - DISH_START.y) < 0.1);
  const ledge = DISH_ROUTES.find(route => route.name === 'Dish eastern ledge')!;
  assert.equal(marsSurfaceAt(ledge.points[3].x, ledge.points[3].z), 'rock');
});

test('relay foundations sit on level terrain clear of the summit road', () => {
  for (const mast of DISH_RELAYS) {
    const centre = marsSurfaceHeight(mast.x, mast.z), road = marsTrailSample(mast.x, mast.z);
    assert.ok(road.distance > road.halfWidth + 2, 'mast and brace anchors stay off the road');
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      assert.ok(Math.abs(marsSurfaceHeight(mast.x + 1.8 * Math.cos(a), mast.z + 1.8 * Math.sin(a)) - centre) < 0.15,
        'the entire foundation footprint is level without a tall plinth');
    }
  }
});
