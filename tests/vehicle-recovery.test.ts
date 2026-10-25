import assert from 'node:assert/strict';
import { before, test, type TestContext } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicle, VEHICLE_MODELS } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';
import { FollowCamera } from '../src/game/camera';

before(async () => { await RAPIER.init(); });

function fixture(t: TestContext, options: { ground?: boolean; water?: number; slope?: number; gravity?: number } = {}) {
  const scene = new THREE.Scene();
  const world = new RAPIER.World({ x: 0, y: options.gravity ?? -18, z: 0 });
  if (options.ground !== false) {
    world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.25, 20).setTranslation(8, -0.25, -6)
      .setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), options.slope ?? 0)));
  }
  const car = new Vehicle(scene, world, { x: 8, y: 1, z: -6 }, 1,
    () => options.water === undefined ? 'dirt' : 'water', () => options.water ?? null);
  world.step();
  t.after(() => { world.free(); disposeScene(scene); });
  return { car, world };
}

function overturn(car: Vehicle, roll = Math.PI / 2, heading = 0.7, y = 0.85) {
  const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading)
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
  car.body.setTranslation({ x: 8, y, z: -6 }, true);
  car.body.setRotation(rotation, true);
  car.capture();
}

function step(car: Vehicle, ticks: number, forward = false) {
  for (let i = 0; i < ticks; i++) {
    car.beforeStep({ steer: 0, forward, reverse: false }, 1 / 60);
    car.world.step();
    car.capture();
  }
}

function assertUnchanged(car: Vehicle) {
  const position = { ...car.body.translation() }, rotation = { ...car.body.rotation() };
  const velocity = { ...car.body.linvel() }, angularVelocity = { ...car.body.angvel() };
  assert.equal(car.tryRight(), false);
  assert.deepEqual({ ...car.body.translation() }, position);
  assert.deepEqual({ ...car.body.rotation() }, rotation);
  assert.deepEqual({ ...car.body.linvel() }, velocity);
  assert.deepEqual({ ...car.body.angvel() }, angularVelocity);
}

for (const model of VEHICLE_MODELS) {
  test(`${model}: both sides and roof recover in place, keep heading and can drive away`, t => {
    const { car } = fixture(t);
    car.setModel(model);
    for (const roll of [Math.PI / 2, -Math.PI / 2, Math.PI]) {
      const heading = roll > 0 ? 0.7 : -2.4;
      overturn(car, roll, heading);
      car.body.setLinvel({ x: 1, y: -0.5, z: 0.5 }, true);
      car.body.setAngvel({ x: 0.3, y: 0.2, z: 0.4 }, true);
      car.body.addForce({ x: 100, y: 0, z: 100 }, true);
      car.body.addTorque({ x: 50, y: 0, z: 50 }, true);
      assert.equal(car.tryRight(), true);
      assert.equal(car.position.x, 8);
      assert.equal(car.position.z, -6);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(car.rotation);
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(car.rotation);
      assert.ok(up.y > 0.999);
      assert.ok(Math.abs(forward.x + Math.sin(heading)) < 1e-6);
      assert.ok(Math.abs(forward.z + Math.cos(heading)) < 1e-6);
      assert.deepEqual({ ...car.body.linvel() }, { x: 0, y: 0, z: 0 });
      assert.deepEqual({ ...car.body.angvel() }, { x: 0, y: 0, z: 0 });
      assert.deepEqual({ ...car.body.userForce() }, { x: 0, y: 0, z: 0 });
      assert.deepEqual({ ...car.body.userTorque() }, { x: 0, y: 0, z: 0 });
      assert.deepEqual(car.previousPosition, car.position);
      assert.deepEqual(car.previousRotation, car.rotation);
      step(car, 90);
      assert.equal(car.contactCount(), 4);
      assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(car.rotation).y > 0.98);
      const parked = car.position.clone();
      step(car, 120, true);
      assert.ok(car.position.distanceTo(parked) > 3, 'recovered car drives normally');
    }
  });
}

test('upright cars and ordinary driving lean fall through to regional reset without mutation', t => {
  const { car } = fixture(t);
  for (const roll of [0, 0.5, 1]) {
    overturn(car, roll);
    assertUnchanged(car);
  }
});

test('righting never runs automatically while resting on the roof', t => {
  const { car } = fixture(t);
  overturn(car, Math.PI, 0, 1.1);
  step(car, 120);
  assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(car.rotation).y < -0.9);
});

test('deep water is rejected from ground probes even before wheel water state updates', t => {
  const { car } = fixture(t, { water: 1.2 });
  overturn(car);
  assert.equal(car.waterDepth, 0);
  assertUnchanged(car);
});

test('a shallow ford still allows safe local righting', t => {
  const { car } = fixture(t, { water: 0.35 });
  overturn(car);
  assert.equal(car.tryRight(), true);
  step(car, 90);
  assert.equal(car.contactCount(), 4);
});

test('missing ground, a deep drop and partial wheel support reject local recovery', t => {
  for (const ground of ['none', 'drop', 'partial'] as const) {
    const { car, world } = fixture(t, { ground: false });
    if (ground === 'drop') world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.25, 20).setTranslation(8, -4, -6));
    if (ground === 'partial') world.createCollider(RAPIER.ColliderDesc.cuboid(0.4, 0.25, 20).setTranslation(8, -0.25, -6));
    world.step();
    overturn(car);
    assertUnchanged(car);
  }
});

test('nearby obstacles and low ceilings reject righting, but a high roof does not', t => {
  for (const obstacle of ['boulder', 'ceiling', 'high-roof', 'dynamic'] as const) {
    const { car, world } = fixture(t);
    const collider = obstacle === 'boulder' || obstacle === 'dynamic'
      ? RAPIER.ColliderDesc.ball(0.3).setTranslation(8, 1.4, -6)
      : RAPIER.ColliderDesc.cuboid(5, 0.1, 5).setTranslation(8, obstacle === 'ceiling' ? 2 : 4, -6);
    const body = obstacle === 'dynamic' ? world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setGravityScale(0)) : undefined;
    world.createCollider(collider, body);
    world.step();
    overturn(car);
    if (obstacle === 'high-roof') assert.equal(car.tryRight(), true);
    else assertUnchanged(car);
  }
});

test('wheel space is checked as well as the cabin', t => {
  const { car, world } = fixture(t);
  const wheel = new THREE.Vector3(-0.91, 0, -1.02)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.7);
  world.createCollider(RAPIER.ColliderDesc.ball(0.2).setTranslation(8 + wheel.x + 0.4, 0.35, -6 + wheel.z));
  world.step();
  overturn(car);
  assertUnchanged(car);
});

test('local probing cannot lift the car through a low bridge deck', t => {
  const { car, world } = fixture(t);
  world.createCollider(RAPIER.ColliderDesc.cuboid(5, 0.1, 5).setTranslation(8, 0.95, -6));
  world.step();
  overturn(car);
  assertUnchanged(car);
});

test('sensors are neither support nor an obstruction', t => {
  const { car, world } = fixture(t);
  world.createCollider(RAPIER.ColliderDesc.cuboid(5, 0.1, 5).setTranslation(8, 1.5, -6).setSensor(true));
  world.step();
  overturn(car);
  assert.equal(car.tryRight(), true);
  const unsupported = fixture(t, { ground: false });
  unsupported.world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.25, 20).setTranslation(8, -0.25, -6).setSensor(true));
  unsupported.world.step();
  overturn(unsupported.car);
  assertUnchanged(unsupported.car);
});

test('gentle slopes recover and settle; steep slopes use the regional fallback', t => {
  const gentle = fixture(t, { slope: 0.25 });
  overturn(gentle.car, Math.PI / 2, 0);
  assert.equal(gentle.car.tryRight(), true);
  step(gentle.car, 120);
  assert.ok(gentle.car.contactCount() >= 2);
  assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(gentle.car.rotation).y > 0.9);
  const steep = fixture(t, { slope: Math.PI / 4 });
  overturn(steep.car);
  assertUnchanged(steep.car);
});

test('low-gravity recovery settles without changing location or heading', t => {
  const { car } = fixture(t, { gravity: -1.62 });
  overturn(car, Math.PI, -1.2, 1);
  assert.equal(car.tryRight(), true);
  step(car, 180);
  assert.equal(car.contactCount(), 4);
  assert.ok(Math.hypot(car.position.x - 8, car.position.z + 6) < 0.1);
  assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(car.rotation).y > 0.99);
});

test('near-vertical recovery has a stable heading on either side of vertical', t => {
  const { car } = fixture(t);
  const heading = -1.2;
  for (const pitch of [80, 89, 90, 91, 100, -80, -90, -100]) {
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch * Math.PI / 180));
    car.body.setTranslation({ x: 8, y: 1.5, z: -6 }, true);
    car.body.setRotation(rotation, true);
    car.capture();
    assert.equal(car.tryRight(), true, `${pitch} degrees`);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(car.rotation);
    assert.ok(Math.abs(forward.x + Math.sin(heading)) < 1e-6);
    assert.ok(Math.abs(forward.z + Math.cos(heading)) < 1e-6);
  }
});

test('light recovery keeps the actual camera side and orbit elevation, even when heading changes', t => {
  const { car } = fixture(t);
  const camera = new THREE.PerspectiveCamera(48, 4 / 3, 0.1, 900);
  const follow = new FollowCamera(camera, car.world, car, () => 0);
  for (const pitch of [Math.PI / 2, Math.PI * 0.55, Math.PI]) {
    car.reset({ x: 8, y: 0.85, z: -6 });
    follow.reset();
    follow.orbit(0.9, -0.2);
    follow.update(1 / 60);
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    car.body.setTranslation({ x: 8, y: 1.5, z: -6 }, true);
    car.body.setRotation(rotation, true);
    car.capture();
    car.syncVisuals(1);
    follow.update(1 / 60);
    const position = camera.position.clone(), view = camera.quaternion.clone();
    const before = camera.position.clone().sub(car.position).setY(0).normalize();
    assert.equal(car.tryRight(), true);
    follow.preserveView();
    assert.deepEqual(camera.position, position, 'no camera teleport during recovery');
    assert.deepEqual(camera.quaternion.toArray(), view.toArray(), 'no camera rotation during recovery');
    for (let i = 0; i < 120; i++) {
      step(car, 1);
      car.syncVisuals(1);
      follow.update(1 / 60);
    }
    const after = camera.position.clone().sub(car.position).setY(0).normalize();
    assert.ok(before.dot(after) > 0.999, 'camera does not orbit around to the opposite side afterwards');
    assert.ok(camera.getWorldDirection(new THREE.Vector3())
      .dot(new THREE.Vector3(0, 0, -1).applyQuaternion(view)) > 0.94, 'view stays in the same direction');
  }
});
