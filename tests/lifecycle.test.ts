import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { disposeScene } from '../src/game/dispose';

test('area cleanup disposes shared geometry, material, texture, and instance data exactly once', () => {
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry();
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const instances = new THREE.InstancedMesh(geometry, material, 3);
  scene.add(new THREE.Mesh(geometry, material), instances);
  const disposals = { geometry: 0, material: 0, texture: 0, instances: 0 };
  geometry.addEventListener('dispose', () => disposals.geometry++);
  material.addEventListener('dispose', () => disposals.material++);
  texture.addEventListener('dispose', () => disposals.texture++);
  instances.addEventListener('dispose', () => disposals.instances++);
  disposeScene(scene);
  assert.deepEqual(disposals, { geometry: 1, material: 1, texture: 1, instances: 1 });
  assert.equal(scene.children.length, 0);
});
