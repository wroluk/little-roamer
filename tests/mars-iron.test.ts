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

test('Iron crests have narrow solid roofs rather than sunken gaps between twin peaks', () => {
  const material = new THREE.MeshBasicMaterial();
  try {
    for (const fin of IRON_FINS) {
      const geometry = ironFinGeometry(fin), mesh = new THREE.Mesh(geometry, material);
      try {
        for (const k of [1, 2, 3]) {
          const t = k / 4, c = Math.cos(fin.yaw), s = Math.sin(fin.yaw);
          const lean = Math.sin(t * 5 + fin.seed) * 1.2, along = (t - 0.5) * fin.length;
          const x = fin.x + lean * c + along * s, z = fin.z - lean * s + along * c;
          const width = fin.width * (0.65 + Math.sin(t * Math.PI) * 0.35) * 0.08;
          const ground = (marsSurfaceHeight(x - width * c, z + width * s)
            + marsSurfaceHeight(x + width * c, z - width * s)) / 2;
          const height = ground + fin.height * ([0.43, 0.82, 0.9, 0.76, 0.5][k] + 0.12 * Math.sin(fin.seed * 2.3 + k * 1.7));
          const ray = new THREE.Raycaster(new THREE.Vector3(x, height + 100, z), new THREE.Vector3(0, -1, 0));
          const hit = ray.intersectObject(mesh)[0];
          assert.ok(hit && Math.abs(hit.point.y - height) < 0.001, `solid crest at section ${k} of fin ${fin.seed}`);
        }
      } finally { geometry.dispose(); }
    }
  } finally { material.dispose(); }
});
