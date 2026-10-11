import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';

test('Modern bonnet and sloping cabin expose their exterior faces on both sides', async () => {
  await RAPIER.init();
  const scene = new THREE.Scene();
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  try {
    const vehicle = new Vehicle(scene, world, { x: 0, y: 0, z: 0 });
    scene.updateMatrixWorld(true);
    const hit = (origin: number[], direction: number[]) => {
      const hits = new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction))
        .intersectObject(vehicle.bodyVisual, true);
      assert.ok(hits.length, 'Exterior must be visible using ordinary front-face culling');
      return hits[0];
    };
    for (const x of [-0.4, 0, 0.4]) {
      const bonnet = hit([x, 2, -0.9], [0, -1, 0]);
      assert.ok(bonnet.point.y > 0.60 && bonnet.point.y < 0.65, 'Hit crowned bonnet, not chassis below');
      assert.ok(bonnet.face!.normal.y > 0.9);
    }
    for (const side of [-1, 1]) {
      const beltline = hit([side * 2, 0.44, 0.4], [-side, 0, 0]);
      assert.ok(Math.abs(beltline.point.x) > 0.8, 'Cabin and chassis must meet without a gap');
      const window = hit([side * 2, 0.9, 0], [-side, 0, 0]);
      assert.ok(Math.abs(window.point.x) > 0.68 && Math.abs(window.point.x) < 0.70);
      assert.ok(window.face!.normal.x * side > 0.9, 'Side glass must face outward');
      const material = (window.object as THREE.Mesh).material as THREE.MeshStandardMaterial;
      assert.equal(material.color.getHexString(), '315e66');
    }
    const windshield = hit([0, 0.9, -3], [0, 0, 1]);
    assert.ok(windshield.point.z < -0.3 && windshield.point.z > -0.33);
    assert.ok(windshield.face!.normal.z < -0.8);
  } finally {
    disposeScene(scene);
    world.free();
  }
});
