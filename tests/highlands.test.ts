import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  FORDS, GLACIER_ASCENT, VOLCANO_ASCENT, HIGHLANDS_HALF, HIGHLANDS_START,
  highlandsSamples, highlandsSurfaceHeight, highlandsWaterHeight, riverCenter,
} from '../src/game/highlands';
import { Vehicle } from '../src/game/vehicle';
import { FollowCamera } from '../src/game/camera';
import { WORLD_HALF } from '../src/game/terrain';
import { disposeScene } from '../src/game/dispose';
import { AREAS } from '../src/game/areas';

before(async () => { await RAPIER.init(); });
const terrain = highlandsSamples();
const idle = { steer: 0, forward: false, reverse: false };

function simulation(spawn = HIGHLANDS_START, heading = 0) {
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.trimesh(terrain.vertices, terrain.indices).setFriction(0.9));
  const scene = new THREE.Scene();
  const vehicle = new Vehicle(scene, world, spawn, AREAS.highlands.climbingPower);
  vehicle.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading), true);
  vehicle.capture();
  const tick = (count: number, forward = false) => {
    for (let i = 0; i < count; i++) {
      vehicle.beforeStep({ ...idle, forward }, 1 / 60);
      world.step();
      vehicle.capture();
    }
    vehicle.syncVisuals(1);
  };
  tick(90);
  return { world, scene, vehicle, tick };
}

test('Iceland is at least nine times the valley area and spawns on safe dry land', () => {
  assert.ok((HIGHLANDS_HALF / WORLD_HALF) ** 2 >= 9);
  assert.equal(highlandsWaterHeight(HIGHLANDS_START.x, HIGHLANDS_START.z), null);
  const { world, scene, vehicle } = simulation();
  try {
    assert.equal(vehicle.contactCount(), 4);
    assert.ok(Math.abs(vehicle.position.x - HIGHLANDS_START.x) < 0.5);
    assert.ok(Math.abs(vehicle.position.z - HIGHLANDS_START.z) < 0.5);
  } finally { world.free(); disposeScene(scene); }
});

test('Iceland rendered triangles, raycast ground heights, and submerged ford beds agree', () => {
  const { world, scene } = simulation();
  try {
    const locations = [[0, 0], [-131.3, -101.7], [100.4, -140.2], [210.1, 151.2],
      ...FORDS.map(ford => [ford.x, ford.z])];
    for (const [x, z] of locations) {
      const hit = world.castRay(new RAPIER.Ray({ x, y: 200, z }, { x: 0, y: -1, z: 0 }),
        240, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
      assert.ok(hit);
      assert.ok(Math.abs(200 - hit.timeOfImpact - highlandsSurfaceHeight(x, z)) < 0.0001);
    }
    for (const ford of FORDS) {
      const water = highlandsWaterHeight(ford.x, ford.z);
      assert.notEqual(water, null);
      const depth = water! - highlandsSurfaceHeight(ford.x, ford.z);
      assert.ok(depth > 0.08 && depth < 0.7, `${ford.name}: water depth ${depth}`);
    }
  } finally { world.free(); disposeScene(scene); }
});

test('river has deep pools away from consistently shallow marked fords', () => {
  let deepest = 0;
  for (let x = -220; x <= 220; x += 4) {
    const z = riverCenter(x);
    const water = highlandsWaterHeight(x, z);
    assert.notEqual(water, null);
    deepest = Math.max(deepest, water! - highlandsSurfaceHeight(x, z));
  }
  assert.ok(deepest > 1.2, `deepest unmarked river pool was ${deepest}`);
  for (const ford of FORDS) {
    const depth = ford.waterY - highlandsSurfaceHeight(ford.x, ford.z);
    assert.ok(depth > 0.08 && depth < 0.7, `${ford.name}: ford depth ${depth}`);
  }
});

test('four-wheel vehicle crosses every ford in both directions with a level, unobstructed camera', () => {
  for (const ford of FORDS) {
    for (const direction of [1, -1]) {
      const heading = ford.heading + (direction === -1 ? Math.PI : 0);
      const x = ford.x + Math.sin(heading) * ford.length / 2;
      const z = ford.z + Math.cos(heading) * ford.length / 2;
      const { world, scene, vehicle, tick } = simulation({ x, y: highlandsSurfaceHeight(x, z) + 1.2, z }, heading);
      try {
        const camera = new THREE.PerspectiveCamera(48, 1.5, 0.15, 900);
        const follow = new FollowCamera(camera, world, vehicle, highlandsSurfaceHeight, true);
        let waterContacts = 0;
        let crossed = false;
        for (let step = 0; step < 900; step++) {
          tick(1, true);
          follow.update(1 / 60);
          const water = highlandsWaterHeight(vehicle.position.x, vehicle.position.z);
          if (water !== null && vehicle.position.y - 0.65 < water) waterContacts++;
          assert.ok(camera.position.y > highlandsSurfaceHeight(camera.position.x, camera.position.z));
          const local = Math.sin(heading) * (vehicle.position.x - ford.x)
            + Math.cos(heading) * (vehicle.position.z - ford.z);
          if (local < -ford.length / 2) { crossed = true; break; }
        }
        assert.ok(crossed, `${ford.name} direction ${direction} did not cross`);
        assert.ok(waterContacts > 0, `${ford.name} never contacted water`);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(vehicle.rotation);
        assert.ok(up.y > 0.8, `${ford.name} tipped the vehicle`);
      } finally { world.free(); disposeScene(scene); }
    }
  }
});

test('glacier and volcano slopes are actually climbable, not just scenery', () => {
  for (const route of [GLACIER_ASCENT, VOLCANO_ASCENT]) {
    const { world, scene, vehicle, tick } = simulation({
      x: route.x, y: highlandsSurfaceHeight(route.x, route.z) + 1.25, z: route.z,
    }, route.heading);
    try {
      const startY = vehicle.position.y;
      let reached = false;
      for (let i = 0; i < 1200; i++) {
        tick(1, true);
        if (route.z - vehicle.position.z >= route.length) { reached = true; break; }
      }
      assert.ok(reached, `Ascent starting ${route.x},${route.z} could not be completed`);
      assert.ok(vehicle.position.y > startY + 20);
      assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(vehicle.rotation).y > 0.8);
    } finally { world.free(); disposeScene(scene); }
  }
});
