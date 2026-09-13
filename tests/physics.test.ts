import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicle } from '../src/game/vehicle';
import { FollowCamera } from '../src/game/camera';
import { RAMPS, surfaceHeight, START, terrainSamples, WORLD_HALF } from '../src/game/terrain';
import { rampGeometry } from '../src/game/world';
import type { DriveInput } from '../src/game/driving';

before(async () => { await RAPIER.init(); });
const idle = { steer: 0, forward: false, reverse: false };
const forward = { ...idle, forward: true };

function simulation() {
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const scene = new THREE.Scene();
  const { vertices, indices } = terrainSamples();
  world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.9));
  const vehicle = new Vehicle(scene, world);
  const tick = (count: number, input: DriveInput = idle) => {
    for (let i = 0; i < count; i++) {
      vehicle.beforeStep(input, 1 / 60);
      world.step();
      vehicle.capture();
    }
    vehicle.syncVisuals(1);
  };
  tick(120);
  return { world, vehicle, tick };
}

test('four driven wheels settle, accelerate, steer right, coast, and reset', () => {
  const { world, vehicle, tick } = simulation();
  try {
    assert.equal(vehicle.contactCount(), 4);
    assert.ok(vehicle.position.y > 0.6 && vehicle.position.y < 0.9);
    tick(120, forward);
    assert.ok(vehicle.position.z < START.z - 8);
    assert.ok(vehicle.speed > 6);
    for (let i = 0; i < 4; i++) assert.notEqual(vehicle.controller.wheelEngineForce(i), 0);
    const initial = vehicle.speed;
    tick(50);
    assert.ok(vehicle.speed < initial);
    vehicle.reset();
    tick(90);
    tick(180, { ...forward, steer: 0.6 });
    assert.ok(vehicle.position.x > 4, `Right steering moved x=${vehicle.position.x}`);
    vehicle.reset();
    assert.deepEqual({ ...vehicle.body.translation() }, START);
    assert.deepEqual({ ...vehicle.body.linvel() }, { x: 0, y: 0, z: 0 });
    assert.deepEqual({ ...vehicle.body.angvel() }, { x: 0, y: 0, z: 0 });
    assert.equal(vehicle.body.rotation().w, 1);
  } finally { world.free(); }
});

test('opposite pedal stops forward travel before reversing, both pedals hold', () => {
  const { world, vehicle, tick } = simulation();
  try {
    tick(100, forward);
    const before = vehicle.speed;
    tick(1, { ...idle, reverse: true });
    assert.equal(Math.abs(vehicle.controller.wheelEngineForce(0)!), 0);
    assert.ok(vehicle.speed < before);
    tick(140, { ...idle, reverse: true });
    assert.ok(vehicle.speed < -3);
    tick(90, { ...forward, reverse: true });
    assert.ok(Math.abs(vehicle.speed) < 0.3);
  } finally { world.free(); }
});

test('rendered triangle interpolation exactly matches physical terrain ray hits', () => {
  const { world } = simulation();
  try {
    for (const [x, z] of [[-30.2, -28.4], [15.7, 18.2], [0, 22], [40.1, -20.3], [-61.3, 60.7]]) {
      const hit = world.castRay(new RAPIER.Ray({ x, y: 30, z }, { x: 0, y: -1, z: 0 }),
        40, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
      assert.ok(hit);
      assert.ok(Math.abs(30 - hit.timeOfImpact - surfaceHeight(x, z)) < 0.0001);
    }
  } finally { world.free(); }
});

test('wide ramp lifts the actual raycast vehicle above the ground', () => {
  const { world, vehicle, tick } = simulation();
  try {
    const geo = rampGeometry(10, 12, 3);
    const desc = RAPIER.ColliderDesc.convexHull(new Float32Array(geo.getAttribute('position').array));
    assert.ok(desc);
    world.createCollider(desc.setTranslation(0, 0, 9).setFriction(0.9));
    let highest = 0;
    for (let i = 0; i < 210; i++) {
      tick(1, forward);
      highest = Math.max(highest, vehicle.position.y);
    }
    assert.ok(highest > 3.4, `Ramp max chassis height ${highest}`);
    assert.ok(vehicle.position.z < 4);
    assert.ok(Number.isFinite(vehicle.position.y));
    geo.dispose();
  } finally { world.free(); }
});

test('all three authored ramps are accessible at their actual world placements', () => {
  for (const ramp of RAMPS) {
    const { world, vehicle, tick } = simulation();
    try {
      const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ramp.angle);
      const geo = rampGeometry(ramp.width, ramp.length, ramp.height);
      const desc = RAPIER.ColliderDesc.convexHull(new Float32Array(geo.getAttribute('position').array));
      assert.ok(desc);
      const base = surfaceHeight(ramp.x, ramp.z) - 0.025;
      world.createCollider(desc.setRotation(rotation).setTranslation(ramp.x, base, ramp.z).setFriction(0.9));
      const start = new THREE.Vector3(0, 0, ramp.length / 2 + 6).applyQuaternion(rotation)
        .add(new THREE.Vector3(ramp.x, 0, ramp.z));
      start.y = surfaceHeight(start.x, start.z) + 1.1;
      vehicle.body.setTranslation(start, true);
      vehicle.body.setRotation(rotation, true);
      vehicle.capture();
      tick(100);
      let highest = 0;
      let cleared = false;
      for (let i = 0; i < 380; i++) {
        tick(1, forward);
        highest = Math.max(highest, vehicle.position.y);
        const local = vehicle.position.clone().sub(new THREE.Vector3(ramp.x, 0, ramp.z))
          .applyQuaternion(rotation.clone().invert());
        if (local.z < -ramp.length / 2 - 2) { cleared = true; break; }
      }
      assert.ok(cleared, `Ramp at ${ramp.x}, ${ramp.z} was not cleared`);
      assert.ok(highest > base + ramp.height, `Ramp at ${ramp.x}, ${ramp.z} was not climbed`);
      geo.dispose();
    } finally { world.free(); }
  }
});

test('solid boundary stops the car within the terrain limits', () => {
  const { world, vehicle, tick } = simulation();
  try {
    world.createCollider(RAPIER.ColliderDesc.cuboid(75, 5.5, 1).setTranslation(0, 3.5, -WORLD_HALF));
    tick(800, forward);
    assert.ok(vehicle.position.z > -74);
    assert.ok(vehicle.position.y > -1);
  } finally { world.free(); }
});

test('horizontal speed caps prevent runaway descent while retaining vertical motion', () => {
  const { world, vehicle } = simulation();
  try {
    vehicle.body.setLinvel({ x: 2, y: -4, z: -25 }, true);
    vehicle.capture();
    let velocity = vehicle.body.linvel();
    assert.ok(Math.hypot(velocity.x, velocity.z) <= 15.00001);
    assert.equal(velocity.y, -4);
    vehicle.body.setLinvel({ x: 2, y: -4, z: 15 }, true);
    vehicle.capture();
    velocity = vehicle.body.linvel();
    assert.ok(Math.hypot(velocity.x, velocity.z) <= 7.00001);
    assert.equal(velocity.y, -4);
  } finally { world.free(); }
});

test('vehicle reset honors its current exploration area instead of the original valley spawn', () => {
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  try {
    const spawn = { x: 150, y: 5, z: 190 };
    const vehicle = new Vehicle(new THREE.Scene(), world, spawn);
    vehicle.body.setTranslation({ x: 120, y: 2, z: 120 }, true);
    vehicle.body.setLinvel({ x: 2, y: 0, z: -3 }, true);
    vehicle.reset();
    assert.deepEqual({ ...vehicle.body.translation() }, spawn);
    assert.deepEqual({ ...vehicle.body.linvel() }, { x: 0, y: 0, z: 0 });
  } finally { world.free(); }
});

test('camera sphere sweep shortens the boom before an obstruction and stays level', () => {
  const { world, vehicle, tick } = simulation();
  try {
    const camera = new THREE.PerspectiveCamera(48, 1.5, 0.15, 250);
    const follow = new FollowCamera(camera, world, vehicle);
    follow.update(1 / 60);
    const unobstructed = camera.position.distanceTo(vehicle.position);
    world.createCollider(RAPIER.ColliderDesc.cuboid(5, 5, 0.5).setTranslation(0, 3, 28));
    tick(1);
    follow.update(1 / 60);
    assert.ok(camera.position.z < 27.5);
    assert.ok(camera.position.distanceTo(vehicle.position) < unobstructed - 3);
    assert.deepEqual(camera.up.toArray(), [0, 1, 0]);
    assert.ok(camera.position.y > surfaceHeight(camera.position.x, camera.position.z));
  } finally { world.free(); }
});

test('manual camera orbit circles the vehicle and clamps vertical travel', () => {
  const { world, vehicle } = simulation();
  try {
    const camera = new THREE.PerspectiveCamera(48, 1.5, 0.15, 250);
    const follow = new FollowCamera(camera, world, vehicle);
    follow.update(1 / 60);
    const initial = camera.position.clone();
    follow.orbit(Math.PI / 2, 0);
    for (let i = 0; i < 90; i++) follow.update(1 / 60);
    assert.ok(Math.abs(camera.position.x - initial.x) > 8);
    assert.ok(camera.position.distanceTo(vehicle.position) < 16);

    const sideHeight = camera.position.y;
    follow.orbit(0, 10);
    for (let i = 0; i < 90; i++) follow.update(1 / 60);
    assert.ok(camera.position.y > sideHeight + 3);
    assert.ok(camera.position.distanceTo(vehicle.position) < 16);
    assert.deepEqual(camera.up.toArray(), [0, 1, 0]);
  } finally { world.free(); }
});

test('terrain camera feedback is visible but remains within its collision-safe bound', () => {
  const { world, vehicle, tick } = simulation();
  try {
    const steadyCamera = new THREE.PerspectiveCamera(48, 1.5, 0.15, 250);
    const roughCamera = new THREE.PerspectiveCamera(48, 1.5, 0.15, 250);
    const steady = new FollowCamera(steadyCamera, world, vehicle);
    const rough = new FollowCamera(roughCamera, world, vehicle);
    steady.update(1 / 60);
    rough.update(1 / 60);
    let maximumOffset = 0;
    for (let i = 0; i < 120; i++) {
      tick(1, forward);
      steady.update(1 / 60, false, 0);
      rough.update(1 / 60, false, 0.1);
      maximumOffset = Math.max(maximumOffset, steadyCamera.position.distanceTo(roughCamera.position));
    }
    assert.ok(maximumOffset > 0.01, `camera feedback offset=${maximumOffset}`);
    assert.ok(maximumOffset <= 0.12, `camera feedback exceeded bound: ${maximumOffset}`);
    assert.deepEqual(roughCamera.up.toArray(), [0, 1, 0]);
    assert.ok(roughCamera.position.y > surfaceHeight(roughCamera.position.x, roughCamera.position.z));
  } finally { world.free(); }
});
