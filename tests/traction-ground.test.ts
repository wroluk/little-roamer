import assert from 'node:assert/strict';
import { test, before } from 'node:test';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';
import { tractionHeight, tractionMesh, TRACTION_RAMPS, createTractionGround } from '../src/game/traction-ground';

before(async () => { await RAPIER.init(); });
test('proving ground has measured grades, level run-ups and triangle-exact collision', () => {
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 }), mesh = tractionMesh();
  world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices, mesh.indices)); world.step();
  try {
    for (const ramp of TRACTION_RAMPS) {
      assert.equal(tractionHeight(ramp.x, -12), 0);
      const grade = (tractionHeight(ramp.x, -44) - tractionHeight(ramp.x, -26)) / 18;
      assert.ok(Math.abs(Math.atan(grade) * 180 / Math.PI - ramp.degrees) < 0.001);
      for (let z = -24; z >= -48; z--) {
        const x = ramp.x + 15 - (-z - 8) * Math.tan(0.65);
        for (const offset of [-1.2, 1.2]) {
          assert.ok(Math.abs(tractionHeight(x + offset, z)
            - (-z - 24) * Math.tan(ramp.degrees * Math.PI / 180)) < 0.00001,
          `${ramp.id} oblique wheel envelope left the measured grade at ${x}, ${z}`);
        }
      }
    }
    for (const [x, z] of [[-80.3, -33.2], [-39.7, -25.8], [81.2, -38.7], [39.5, 28.5]]) {
      const hit = world.castRay(new RAPIER.Ray({ x, y: 40, z }, { x: 0, y: -1, z: 0 }), 60, true);
      assert.ok(hit); assert.ok(Math.abs(40 - hit.timeOfImpact - tractionHeight(x, z)) < 0.0001);
    }
  } finally { world.free(); }
});
test('traverse has a measured cross-grade and an isolated small wheel bump', () => {
  const grade = (tractionHeight(88, -30) - tractionHeight(76, -30)) / 12;
  assert.ok(Math.abs(Math.atan(grade) * 180 / Math.PI - 15) < 0.001);
  const bump = tractionHeight(81, -38) - (81 - 65) * Math.tan(15 * Math.PI / 180);
  assert.ok(bump > 0.33 && bump < 0.35);
  assert.ok(tractionHeight(83, -38) - (83 - 65) * Math.tan(15 * Math.PI / 180) < 0.01);
});
test('the existing traverse lets ice keep sliding while mud damps the same slow approach', () => {
  const mesh = tractionMesh();
  const run = (surface: 'ice' | 'mud') => {
    const world = new RAPIER.World({ x: 0, y: -18, z: 0 }), scene = new THREE.Scene();
    const lab = createTractionGround('traverse', surface);
    world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices, mesh.indices).setFriction(0.9));
    const car = new Vehicle(scene, world, lab.area.spawn, lab.area.climbingPower, lab.area.surfaceAt);
    const step = (forward: boolean) => {
      car.beforeStep({ forward, reverse: false, steer: 0 }, 1 / 60); world.step(); car.capture();
    };
    try {
      for (let i = 0; i < 100; i++) step(false);
      let lightWheelAtBump = false;
      const check = () => {
        assert.ok(car.position.x > 70 && car.position.x < 90
          && car.position.z > -55 && car.position.z < -20, 'trial left the measured cross-slope');
        assert.ok(car.contactCount() >= 2);
        assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(car.rotation).y > 0.85);
      };
      for (let i = 0; i < 900 && car.position.z > -41; i++) {
        step(car.speed < 3); check();
        if (car.position.z < -36 && car.position.z > -40) {
          const loads = car.wheelTelemetry.map(wheel => wheel.load);
          lightWheelAtBump ||= Math.min(...loads) < Math.max(...loads) * 0.6;
        }
      }
      assert.ok(car.position.z <= -41, `${surface}: slow approach did not finish`);
      assert.ok(car.speed > 2.5 && car.speed < 3.5);
      assert.ok(lightWheelAtBump, `${surface}: no measured wheel unloading near the bump`);
      const entry = car.position.clone();
      for (let i = 0; i < 240; i++) { step(false); check(); }
      assert.ok(car.wheelSurfaces.every(id => id === surface));
      return {
        sideTravel: entry.x - car.position.x, alongTravel: entry.z - car.position.z,
        sideSpeed: -car.body.linvel().x,
      };
    } finally { world.free(); disposeScene(scene); }
  };
  const ice = run('ice'), mud = run('mud');
  assert.ok(ice.sideTravel > 1 && ice.sideTravel > mud.sideTravel * 2,
    `down-slope drift: ${JSON.stringify({ ice, mud })}`);
  assert.ok(ice.alongTravel > 3 && ice.alongTravel > mud.alongTravel * 5);
  assert.ok(mud.alongTravel < 1 && mud.sideTravel < 1.2);
  assert.ok(ice.sideSpeed > 0.3 && mud.sideSpeed > 0 && mud.sideSpeed < 0.3,
    'mud damps the slide but is not falsely pinned against gravity');
});
test('surface swaps keep geometry and split wheel classification independent', () => {
  const lab = createTractionGround('split', 'mud');
  const before = tractionMesh();
  assert.equal(lab.area.surfaceAt(-37, 30), 'ice');
  assert.equal(lab.area.surfaceAt(-35, 30), 'mud');
  lab.setSurface('sand'); lab.setSurface('rock', true);
  assert.equal(lab.area.surfaceAt(-37, 30), 'rock');
  assert.equal(lab.area.surfaceAt(-35, 30), 'sand');
  assert.deepEqual(tractionMesh(), before);
  assert.throws(() => lab.setSurface('unknown'), /Unknown traction/);
  const dust = createTractionGround('grade-25', 'mars-dust');
  assert.equal(dust.area.surfaceAt(0, -30), 'mars-dust');
  dust.setSurface('regolith');
  assert.equal(dust.area.surfaceAt(0, -30), 'regolith');
  assert.deepEqual(tractionMesh(), before);
});

test('telemetry reports visual wheel rotation and contact load without mutating physics', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.1, 100).setTranslation(0, -0.1, 0));
  const car = new Vehicle(scene, world, { x: 0, y: 1.2, z: 20 });
  const step = (forward: boolean) => {
    car.beforeStep({ forward, reverse: false, steer: 0 }, 1 / 60); world.step(); car.capture(); car.syncVisuals(1);
  };
  try {
    for (let i = 0; i < 100; i++) step(false);
    for (let i = 0; i < 120; i++) step(true);
    const angles = car.tires.map(t => t.rotation.x); step(true);
    const velocity = { ...car.body.linvel() }, position = { ...car.body.translation() };
    const wheels = car.wheelTelemetry;
    for (let i = 0; i < 4; i++) {
      assert.ok(wheels[i].grounded && wheels[i].load > 0);
      assert.ok(Math.abs(wheels[i].visualRpm
        + (car.tires[i].rotation.x - angles[i]) * 60 * 60 / (2 * Math.PI)) < 0.00001);
    }
    assert.deepEqual({ ...car.body.linvel() }, velocity);
    assert.deepEqual({ ...car.body.translation() }, position);
    car.reset();
    assert.ok(car.wheelTelemetry.every(wheel => wheel.visualRpm === 0 && wheel.slipRatio === 0));
  } finally { world.free(); disposeScene(scene); }
});
