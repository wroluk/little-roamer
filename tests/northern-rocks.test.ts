import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { weatheredArchGeometry, rockColliderMesh } from '../src/game/northern-rocks';

test('weathered arch physics preserves the passage, pillars and overhead stone', async () => {
  await RAPIER.init();
  const geometry = weatheredArchGeometry();
  const mesh = rockColliderMesh(geometry, new THREE.Matrix4());
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  try {
    world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices, mesh.indices));
    world.step();
    for (const x of [-2, 0, 2]) {
      assert.equal(world.castRay(new RAPIER.Ray({ x, y: 2, z: 20 }, { x: 0, y: 0, z: -1 }), 40, true), null);
    }
    assert.ok(world.castRay(new RAPIER.Ray({ x: 9, y: 2, z: 20 }, { x: 0, y: 0, z: -1 }), 40, true));
    const roof = world.castRay(new RAPIER.Ray({ x: 0, y: 2, z: 0 }, { x: 0, y: 1, z: 0 }), 20, true);
    assert.ok(roof && roof.timeOfImpact > 4 && roof.timeOfImpact < 6);
  } finally { geometry.dispose(); world.free(); }
});
