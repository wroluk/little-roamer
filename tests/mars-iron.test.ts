import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { IRON_FINS, IRON_START } from '../src/game/mars-iron-layout';
import { ironFinGeometry } from '../src/game/mars-iron-landmarks';
import { marsSurfaceHeight, nearestMarsStart } from '../src/game/mars-terrain';

test('Iron fins have closed outward-facing geometry and buried sediment feet', () => {
  for (const fin of IRON_FINS) {
    const geometry = ironFinGeometry(fin), p = geometry.getAttribute('position');
    const edges = new Map<string, number>(); let volume = 0, buried = 0;
    const key = (v: THREE.Vector3) => v.toArray().map(n => n.toFixed(4)).join(',');
    for (let i = 0; i < p.count; i += 3) {
      const [a, b, c] = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(p, i + j));
      assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).length() > 0.00001, `nondegenerate fin ${fin.seed}`);
      volume += a.dot(b.clone().cross(c)) / 6;
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const edge = [key(u), key(v)].sort().join('|'); edges.set(edge, (edges.get(edge) ?? 0) + 1);
      }
      for (const v of [a, b, c]) if (v.y < marsSurfaceHeight(v.x, v.z) - 0.5) buried++;
    }
    assert.ok(volume > 0, `outward winding fin ${fin.seed}`);
    assert.ok(buried >= 10); assert.ok([...edges.values()].every(n => n === 2), `closed fin ${fin.seed}`);
    geometry.dispose();
  }
  assert.equal(nearestMarsStart(IRON_START.x, IRON_START.z).id, 'iron-maze');
});
