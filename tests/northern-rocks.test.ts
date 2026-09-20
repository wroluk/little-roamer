import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { ADVENTURE_PROPS } from '../src/game/northern-adventures';
import { generateNorthernChunk, NORTHERN_CHUNK_SIZE } from '../src/game/northern-terrain';
import { collectChunkTransferables } from '../src/game/northern-worker';
import {
  coastStackGeometry, graniteTorGeometry, layeredRockGeometry, weatheredArchGeometry, rockColliderMesh,
} from '../src/game/northern-rocks';

test('large rock families provide three genuinely distinct mesh variants', () => {
  for (const factory of [coastStackGeometry, graniteTorGeometry, layeredRockGeometry]) {
    const geometries = [0, 1, 2].map(factory);
    const signatures = geometries.map(geometry => {
      const position = geometry.getAttribute('position');
      return JSON.stringify(Array.from(position.array));
    });
    assert.equal(new Set(signatures).size, 3);
    geometries.forEach(geometry => geometry.dispose());
  }
});

test('Stonegate landmarks retain unique authored meshes through chunk generation and transfer', () => {
  const landmarks = ADVENTURE_PROPS.filter(prop => prop.kind === 'graniteTor');
  assert.equal(landmarks.length, 5);
  assert.equal(new Set(landmarks.map(prop => prop.variant)).size, 5);
  for (const prop of landmarks) {
    assert.ok(prop.variant !== undefined && prop.variant >= 3);
    const chunk = generateNorthernChunk(Math.floor(prop.x / NORTHERN_CHUNK_SIZE), Math.floor(prop.z / NORTHERN_CHUNK_SIZE));
    const index = Array.from(chunk.props.x).findIndex((x, i) => x === Math.fround(prop.x) && chunk.props.z[i] === Math.fround(prop.z));
    assert.ok(index >= 0);
    assert.equal(chunk.props.variant[index], prop.variant);
    assert.ok(collectChunkTransferables(chunk).includes(chunk.props.variant.buffer as ArrayBuffer));
    const geometry = graniteTorGeometry(prop.variant);
    const collider = rockColliderMesh(geometry, new THREE.Matrix4());
    assert.deepEqual(collider.vertices, geometry.getAttribute('position').array);
    geometry.dispose();
  }
});

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
