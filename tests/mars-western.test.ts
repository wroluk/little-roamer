import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { DELTA_ROUTES, DELTA_START, DELTA_EXIT, DELTA_LOOKOUT } from '../src/game/mars-delta-layout';
import { DUNES_ROUTES, DUNES_START, DUNES_EXIT, DUNES_LOOKOUT } from '../src/game/mars-dunes-layout';
import { TUBES_ROUTES, TUBES_START, TUBES_LOOKOUT, LAVA_TUBES, tubeCentreX } from '../src/game/mars-tubes-layout';
import { KEYHOLE_EXIT } from '../src/game/mars-keyhole-layout';
import { lavaTubeGeometry } from '../src/game/mars-tubes-landmarks';
import { marsSurfaceHeight, marsSurfaceAt, nearestMarsStart, generateMarsChunk, marsColor } from '../src/game/mars-terrain';
import { buildMarsDecor, MARS_MARKED_ROUTES } from '../src/game/mars-landmarks';

test('western-region connections join and each reset resolves to its own region', () => {
  assert.deepEqual(DELTA_ROUTES[0].points[0], KEYHOLE_EXIT);
  assert.deepEqual(DUNES_ROUTES[0].points[0], DELTA_EXIT);
  assert.deepEqual(TUBES_ROUTES[0].points[0], DUNES_EXIT);
  assert.deepEqual(TUBES_ROUTES.at(-1)!.points.at(-1), { x: -75, z: -195, y: 26 });
  for (const [id, p] of [['fossil-delta', DELTA_START], ['rust-dunes', DUNES_START], ['lava-tubes', TUBES_START]] as const) {
    assert.equal(nearestMarsStart(p.x, p.z).id, id);
    for (const dx of [-3, 0, 3]) for (const dz of [-3, 0, 3]) assert.ok(Math.abs(marsSurfaceHeight(p.x + dx, p.z + dz) - p.y) < 0.1);
  }
  assert.ok(MARS_MARKED_ROUTES.every(route => !/Delta|Dunes|Tubes/.test(route.name)));
});

test('Delta branches rejoin and the sediment shelf rises above the channels', () => {
  assert.deepEqual(DELTA_ROUTES[1].points.at(-1), DELTA_ROUTES[2].points.at(-1));
  assert.deepEqual(DELTA_ROUTES[1].points.at(-1), DELTA_ROUTES[3].points.at(-1));
  assert.ok(marsSurfaceHeight(DELTA_LOOKOUT.x, DELTA_LOOKOUT.z) - marsSurfaceHeight(-430, 440) > 15);
});

test('Delta ground retains the default rusty Mars palette on channels and shelves', () => {
  for (const { x, z } of [DELTA_START, DELTA_LOOKOUT, { x: -428, z: 434 }, { x: -455, z: 400 }, { x: -480, z: 450 }]) {
    const [r, g, b] = marsColor(x, z, marsSurfaceHeight(x, z));
    const color = new THREE.Color().setRGB(r, g, b).convertLinearToSRGB();
    // Base channel differences are 0.32 and 0.09; pale paths alter them by -0.015 and +0.03.
    assert.ok(color.r - color.g > 0.304 && color.r - color.g < 0.321, `rust-red ground at ${x},${z}`);
    assert.ok(color.g - color.b > 0.089 && color.g - color.b < 0.121, `default sand balance at ${x},${z}`);
  }
});

test('Dunes retain a loose raised crest and firm bedrock alternative', () => {
  assert.equal(marsSurfaceAt(DUNES_LOOKOUT.x, DUNES_LOOKOUT.z), 'mars-dust');
  assert.equal(marsSurfaceAt(-655, 20), 'rock');
  assert.ok(marsSurfaceHeight(DUNES_LOOKOUT.x, DUNES_LOOKOUT.z) - marsSurfaceHeight(-472, 12) > 15);
});

test('Lava Tubes have staggered buried passages, thin solid roofs and repeated open skylights', () => {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const meshes = LAVA_TUBES.map(tube => new THREE.Mesh(lavaTubeGeometry(tube), material));
  try {
    assert.ok(LAVA_TUBES[0].south > LAVA_TUBES[1].south + 30);
    for (const tube of LAVA_TUBES) {
      assert.ok(tube.south - tube.north > 200);
      assert.equal(new THREE.Raycaster(new THREE.Vector3(tube.x, 10, tube.south + 5),
        new THREE.Vector3(0, 0, -1), 0, tube.south - tube.north + 10).intersectObjects(meshes).length, 0);
      for (const z of tube.skylights) {
        assert.equal(new THREE.Raycaster(new THREE.Vector3(tubeCentreX(tube, z), 70, z),
          new THREE.Vector3(0, -1, 0)).intersectObjects(meshes).length, 0);
      }
      const z = tube.south - 15, x = tubeCentreX(tube, z);
      const hits = new THREE.Raycaster(new THREE.Vector3(x, 70, z), new THREE.Vector3(0, -1, 0)).intersectObjects(meshes);
      assert.ok(hits.length >= 2);
      const top = hits[0].point.y, bottom = hits.at(-1)!.point.y;
      assert.ok(top - bottom > 0.8 && top - bottom < 1.8, 'thin basalt crust');
      assert.ok(bottom - marsSurfaceHeight(x, z) > 9, 'room for car and camera');
      assert.ok(Math.abs(top - marsSurfaceHeight(x + 28, z)) < 5, 'roof is part of the surrounding lava field');
    }
    assert.equal(new THREE.Raycaster(new THREE.Vector3(-430, 10, -456), new THREE.Vector3(-1, 0, 0), 0, 58).intersectObjects(meshes).length, 0);
    assert.ok(marsSurfaceHeight(TUBES_LOOKOUT.x, TUBES_LOOKOUT.z) > 20);
  } finally { meshes.forEach(mesh => mesh.geometry.dispose()); material.dispose(); }
});

test('tube roofs have identical geometry across streaming owners without duplicate spans', () => {
  for (const tube of LAVA_TUBES) {
    const whole = lavaTubeGeometry(tube);
    const expected = Array.from(whole.getAttribute('position').array).sort((a, b) => a - b);
    const actual: number[] = [];
    for (const cx of [-6, -5]) for (const cz of [-7, -6, -5, -4]) {
      const chunk = lavaTubeGeometry(tube, cx, cz);
      actual.push(...chunk.getAttribute('position').array); chunk.dispose();
    }
    assert.deepEqual(actual.sort((a, b) => a - b), expected);
    whole.dispose();
  }
});

test('western terrain agrees with collision samples and landmarks stay within mesh budgets', () => {
  for (const [cx, cz] of [[-5, 4], [-6, 0], ...[-6, -5].flatMap(cx => [-7, -6, -5, -4].map(cz => [cx, cz]))]) {
    const chunk = generateMarsChunk(cx, cz);
    for (let i = 0; i < chunk.indices.length; i += 111) {
      const ids = [0, 1, 2].map(j => chunk.indices[i + j] * 3);
      const mean = (axis: number) => ids.reduce((v, id) => v + chunk.vertices[id + axis], 0) / 3;
      assert.ok(Math.abs(marsSurfaceHeight(mean(0), mean(2)) - mean(1)) < 0.0002);
    }
    const decor = buildMarsDecor(cx, cz);
    try {
      const triangles = decor.solids.reduce((count, solid) => count + solid.indices.length / 3, 0);
      assert.ok(triangles < 5000);
      for (const solid of decor.solids) assert.ok(solid.vertices.every(Number.isFinite));
    } finally { decor.dispose(); }
  }
});
