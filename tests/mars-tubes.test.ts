import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { LAVA_TUBES, tubePoint } from '../src/game/mars-tubes-layout';
import { lavaTubeGeometry, tubeFloorRubble, tubeFloorRockGeometry, tubeRimRockGeometry } from '../src/game/mars-tubes-landmarks';
import { marsSurfaceHeight } from '../src/game/mars-terrain';
import { driveMarsPath } from './mars-driving';

before(async () => { await RAPIER.init(); });
test('floor rubble is deterministic, embedded and no higher than 24 cm', () => {
  for (const tube of LAVA_TUBES) {
    const stones = tubeFloorRubble(tube);
    assert.ok(stones.length > 30);
    assert.deepEqual(stones, tubeFloorRubble(tube));
    for (const stone of stones) {
      const geometry = tubeFloorRockGeometry(stone), positions = geometry.getAttribute('position');
      let low = Infinity, high = -Infinity;
      for (let i = 0; i < positions.count; i++) {
        const h = positions.getY(i) - marsSurfaceHeight(positions.getX(i), positions.getZ(i));
        low = Math.min(low, h); high = Math.max(high, h);
      }
      assert.ok(low < 0 && high > 0.1 && high < 0.24);
      geometry.dispose();
    }
  }
});
test('roof rim rocks have supported, embedded bases on the actual roof mesh', () => {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  try {
    for (const tube of LAVA_TUBES) {
      const mesh = new THREE.Mesh(lavaTubeGeometry(tube), material);
      for (const z of [tube.south, ...tube.skylights, tube.north]) for (const side of [-1, 1]) for (const dz of [-6, 0, 6]) {
        const rim = tubeRimRockGeometry(tube, z, side, dz); if (!rim) continue;
        const positions = rim.geometry.getAttribute('position');
        for (let i = 0; i < 9; i++) {
          const a = new THREE.Vector3().fromBufferAttribute(positions, i);
          const b = new THREE.Vector3().fromBufferAttribute(positions, (i + 1) % 9);
          for (let step = 0; step <= 4; step++) {
            const p = a.clone().lerp(b, step / 4);
            const hits = new THREE.Raycaster(new THREE.Vector3(p.x, 60, p.z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh);
            assert.ok(hits.length, `unsupported rim at ${p.x},${p.z}`);
            assert.ok(p.y <= hits[0].point.y, 'base must be buried in the rendered roof');
          }
        }
        rim.geometry.dispose();
      }
      mesh.geometry.dispose();
    }
  } finally { material.dispose(); }
});
const underground = [-365, -381, -397].map(z => tubePoint(LAVA_TUBES[0], z));
const rooftop = [-398, -411, -430, -458].map(x => ({ x, z: -430, y: 21 }));
const junction = [tubePoint(LAVA_TUBES[0], -456), { x: -456, z: -456, y: 6 }, tubePoint(LAVA_TUBES[1], -456)];
const smallRubble = [-484, -496, -509].map(z => tubePoint(LAVA_TUBES[1], z));
for (const [name, points] of [['collapse rubble', underground], ['roof crossing', rooftop], ['collapsed junction', junction], ['small western rubble', smallRubble]] as const) {
  for (const reverse of [false, true]) test(`Scout drives ${name} ${reverse ? 'reverse' : 'forward'}`, async () => {
    const path = reverse ? [...points].reverse() : [...points];
    const result = await driveMarsPath(path, 3600);
    assert.equal(result.next, path.length, JSON.stringify(result));
    assert.ok(result.minHeight > -0.15);
  });
}
