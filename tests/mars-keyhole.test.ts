import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { keyholeArchGeometry } from '../src/game/mars-keyhole-landmarks';
import { KEYHOLE_ARCH, KEYHOLE_ARCHES, KEYHOLE_CREST, KEYHOLE_ROUTES, KEYHOLE_START } from '../src/game/mars-keyhole-layout';
import { IRON_EXIT } from '../src/game/mars-iron-layout';
import { marsSurfaceHeight, nearestMarsStart } from '../src/game/mars-terrain';
import { driveMarsPath } from './mars-driving';

before(async () => { await RAPIER.init(); });

test('Keyhole arch has an open car passage, solid piers and a solid roof', () => {
  const geometry = keyholeArchGeometry(), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  try {
    for (const x of [-6, 0, 6]) for (const y of [1, 3, 6]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x, KEYHOLE_ARCH.y + y, 500), new THREE.Vector3(0, 0, 1), 0, 60);
      assert.equal(ray.intersectObject(mesh).length, 0, 'no collider-shaped wall across the opening');
    }
    for (const x of [-58, 58]) {
      assert.ok(new THREE.Raycaster(new THREE.Vector3(x, 70, 530), new THREE.Vector3(0, -1, 0)).intersectObject(mesh).length);
    }
    assert.ok(new THREE.Raycaster(new THREE.Vector3(0, 70, 530), new THREE.Vector3(0, -1, 0)).intersectObject(mesh).length);
    assert.ok(geometry.getAttribute('position').count / 3 < 2500, 'bounded mesh including horizontal strata cuts');
  } finally { geometry.dispose(); material.dispose(); }
});
test('companion arch has an open aperture and the main crest is thin and asymmetric', () => {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const main = new THREE.Mesh(keyholeArchGeometry(), material), secondary = new THREE.Mesh(keyholeArchGeometry(1), material);
  try {
    const arch = KEYHOLE_ARCHES[1];
    const direction = new THREE.Vector3(Math.sin(arch.turn), 0, Math.cos(arch.turn));
    const origin = new THREE.Vector3(arch.x, 11, arch.z).addScaledVector(direction, -20);
    assert.equal(new THREE.Raycaster(origin, direction, 0, 40).intersectObject(secondary).length, 0);
    const hits = new THREE.Raycaster(new THREE.Vector3(0, 70, 530), new THREE.Vector3(0, -1, 0)).intersectObject(main);
    assert.ok(hits[0].point.y - hits.at(-1)!.point.y < 6, 'slender natural bridge rather than a massive gate');
    assert.notEqual(KEYHOLE_CREST[0].y, KEYHOLE_CREST.at(-1)!.y);
  } finally { main.geometry.dispose(); secondary.geometry.dispose(); material.dispose(); }
});
for (const reverse of [false, true]) test(`Scout crosses natural Keyhole crest ${reverse ? 'westbound' : 'eastbound'}`, async () => {
  const path = [{ x: -96, z: 530, y: 18 }, ...KEYHOLE_CREST, { x: 99, z: 536, y: 15.3 }];
  if (reverse) path.reverse();
  const result = await driveMarsPath(path, 5400);
  assert.equal(result.next, path.length, JSON.stringify(result));
  assert.ok(result.minHeight > -0.15);
});
for (const reverse of [false, true]) test(`Scout passes below companion arch ${reverse ? 'reverse' : 'forward'}`, async () => {
  const arch = KEYHOLE_ARCHES[1];
  const path = [-18, 0, 18].map(d => ({ x: arch.x + d * Math.sin(arch.turn), z: arch.z + d * Math.cos(arch.turn), y: 8 }));
  if (reverse) path.reverse();
  const result = await driveMarsPath(path, 3000);
  assert.equal(result.next, path.length, JSON.stringify(result));
  assert.ok(result.minHeight > -0.15);
});
test('Keyhole connects to Iron and its roads remain broad and graded', () => {
  assert.deepEqual(KEYHOLE_ROUTES[0].points[0], IRON_EXIT);
  assert.equal(nearestMarsStart(KEYHOLE_START.x, KEYHOLE_START.z).id, 'keyhole-badlands');
  for (const route of KEYHOLE_ROUTES) for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let step = 0; step <= length; step += 2) {
      const x = a.x + (b.x - a.x) * step / length, z = a.z + (b.z - a.z) * step / length;
      for (const offset of [-4, 0, 4]) {
        const px = x + (b.z - a.z) / length * offset, pz = z - (b.x - a.x) / length * offset;
        assert.ok(Math.abs(marsSurfaceHeight(px, pz) - marsSurfaceHeight(px + (b.x - a.x) / length, pz + (b.z - a.z) / length)) < 0.34, route.name);
      }
    }
  }
});
