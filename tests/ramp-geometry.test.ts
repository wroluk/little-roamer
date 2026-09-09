import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { rampGeometry } from '../src/game/world';
import { RAMPS } from '../src/game/terrain';

test('every ramp face points outward and is visible from outside with front-face rendering', () => {
  for (const ramp of RAMPS) {
    const geometry = rampGeometry(ramp.width, ramp.length, ramp.height);
    const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
    const mesh = new THREE.Mesh(geometry, material);
    const positions = geometry.getAttribute('position');
    const indices = geometry.getIndex()!;
    const center = new THREE.Vector3();
    const point = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) center.add(point.fromBufferAttribute(positions, i));
    center.divideScalar(positions.count);
    const triangle = new THREE.Triangle();
    const normal = new THREE.Vector3();
    const midpoint = new THREE.Vector3();
    try {
      for (let i = 0; i < indices.count; i += 3) {
        triangle.a.fromBufferAttribute(positions, indices.getX(i));
        triangle.b.fromBufferAttribute(positions, indices.getX(i + 1));
        triangle.c.fromBufferAttribute(positions, indices.getX(i + 2));
        triangle.getNormal(normal);
        triangle.getMidpoint(midpoint);
        assert.ok(normal.dot(point.subVectors(midpoint, center)) > 0,
          `Ramp ${ramp.x},${ramp.z} triangle ${i / 3} faces inward`);
        const origin = midpoint.clone().addScaledVector(normal, 0.5);
        const ray = new THREE.Raycaster(origin, normal.clone().negate(), 0, 1);
        const hits = ray.intersectObject(mesh);
        assert.ok(hits.length > 0, `Ramp triangle ${i / 3} is culled from outside`);
        assert.ok(Math.abs(hits[0].distance - 0.5) < 0.00001);
      }
    } finally {
      geometry.dispose();
      material.dispose();
    }
  }
});
