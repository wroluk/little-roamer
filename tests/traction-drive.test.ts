import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { DriveResponse, driveForces } from '../src/game/driving';
import { WheelDrive, tyreImpulse, WHEEL_INERTIA } from '../src/game/wheel-drive';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';
import { surfaceGripAt, SURFACES } from '../src/game/surfaces';

before(async () => { await RAPIER.init(); });

const forward = { steer: 0, forward: true, reverse: false };
const reverse = { steer: 0, forward: false, reverse: true };
const coast = { steer: 0, forward: false, reverse: false };

test('existing boolean throttle builds progressively and a short tap delivers less torque', () => {
  const drive = new DriveResponse();
  const first = drive.step(forward, 0, 1 / 60).engine;
  let last = first;
  for (let i = 0; i < 60; i++) {
    const next = drive.step(forward, 0, 1 / 60).engine;
    assert.ok(next > last && next < 190);
    last = next;
  }
  assert.ok(first > 0 && first < 30);
  assert.ok(last > 185);
  assert.equal(drive.step(coast, 0, 1 / 60).engine, 0);
  assert.ok(drive.step(forward, 0, 1 / 60).engine < 30);
});

test('a held hill-start command does not change itself into a brake during rollback', () => {
  const drive = new DriveResponse();
  drive.step(forward, 0, 1 / 60);
  for (let i = 0; i < 120; i++) {
    const force = drive.step(forward, -1.5, 1 / 60);
    assert.ok(force.engine > 0);
    assert.equal(force.brake, 0);
  }
  assert.deepEqual(drive.step(reverse, 5, 1 / 60), { engine: 0, brake: 18 });
  assert.deepEqual(drive.step(reverse, 0.5, 1 / 60), { engine: 0, brake: 18 });
  assert.ok(drive.step(reverse, 0, 1 / 60).engine < 0);
  assert.ok(drive.step(reverse, 1.5, 1 / 60).engine < 0);
  drive.reset();
  assert.equal(drive.throttle, 0);
  assert.deepEqual(drive.step(forward, -5, 1 / 60), { engine: 0, brake: 18 });
});

test('both pedals brake immediately and response is independent of fixed-step subdivision', () => {
  const a = new DriveResponse(), b = new DriveResponse();
  for (let i = 0; i < 30; i++) a.step(forward, 0, 1 / 60);
  for (let i = 0; i < 60; i++) b.step(forward, 0, 1 / 120);
  assert.ok(Math.abs(a.throttle - b.throttle) < 1e-12);
  assert.deepEqual(a.step({ ...forward, reverse: true }, 5, 1 / 60), { engine: 0, brake: 22 });
  assert.equal(a.throttle, 0);
});

test('a loaded rolling wheel balances motor torque and ground reaction without artificial spin', () => {
  const wheel = new WheelDrive(), radius = 0.48, mass = 24, dt = 1 / 60;
  let speed = 0;
  for (let i = 0; i < 120; i++) {
    const impulse = wheel.prepare(190, speed, radius, mass, 20, true, dt);
    speed += impulse / mass;
    wheel.finish(impulse, radius);
    assert.ok(Math.abs(wheel.angularSpeed * radius - speed) < 1e-10);
  }
});

test('unloaded and airborne wheels turn motor torque into angular momentum, not ground force', () => {
  const loaded = new WheelDrive(), unloaded = new WheelDrive(), airborne = new WheelDrive();
  const full = loaded.prepare(190, 0, 0.48, 24, 20, true, 1 / 60);
  const light = unloaded.prepare(190, 0, 0.48, 24, 0.3, true, 1 / 60);
  const air = airborne.prepare(190, 0, 0.48, 24, 0, false, 1 / 60);
  loaded.finish(full, 0.48); unloaded.finish(light, 0.48); airborne.finish(air, 0.48);
  assert.equal(air, 0);
  assert.ok(full > light);
  assert.ok(airborne.angularSpeed > unloaded.angularSpeed && unloaded.angularSpeed > loaded.angularSpeed);
  assert.ok(Math.abs(airborne.angularSpeed * WHEEL_INERTIA - 190 * 0.48 / 60) < 1e-12);
});

test('mixed grip saturates independently and recovery spends available contact impulse', () => {
  const ice = new WheelDrive(), dirt = new WheelDrive();
  const a = ice.prepare(190, 0, 0.48, 24, 0.5, true, 1 / 60);
  const b = dirt.prepare(190, 0, 0.48, 24, 20, true, 1 / 60);
  ice.finish(a, 0.48); dirt.finish(b, 0.48);
  assert.ok(ice.angularSpeed > dirt.angularSpeed * 5);
  const before = ice.angularSpeed;
  const recovery = ice.prepare(0, b / 24, 0.48, 24, 20, true, 1 / 60);
  ice.finish(recovery, 0.48);
  assert.ok(ice.angularSpeed < before);
  assert.ok(recovery > 0);
});

test('lift-off returns wheel momentum through limited contact without snapping to rolling speed', () => {
  const wheel = new WheelDrive(), radius = 0.48, mass = 24;
  wheel.angularSpeed = 30;
  let speed = 2;
  const momentum = wheel.angularSpeed * WHEEL_INERTIA + speed * mass * radius;
  for (let i = 0; i < 10; i++) {
    const before = wheel.angularSpeed;
    const impulse = wheel.prepare(0, speed, radius, mass, 0.25, true, 1 / 60);
    speed += impulse / mass;
    wheel.finish(impulse, radius);
    assert.ok(wheel.angularSpeed < before && wheel.angularSpeed * radius > speed);
    assert.ok(Math.abs(wheel.angularSpeed * WHEEL_INERTIA + speed * mass * radius - momentum) < 1e-10);
  }
  assert.ok(speed > 2);
});

test('brake torque can lock a sliding wheel and dissipates energy without reversing it', () => {
  const wheel = new WheelDrive(), radius = 0.48, mass = 24;
  let speed = 8;
  wheel.angularSpeed = speed / radius;
  const energy = () => mass * speed * speed / 2 + WHEEL_INERTIA * wheel.angularSpeed ** 2 / 2;
  let before = energy();
  for (let i = 0; i < 10; i++) {
    const impulse = wheel.prepare(0, speed, radius, mass, 0.5, true, 1 / 60, 10);
    speed += impulse / mass;
    wheel.finish(impulse, radius);
    assert.ok(energy() < before);
    assert.ok(wheel.angularSpeed >= 0);
    before = energy();
  }
  assert.equal(wheel.angularSpeed, 0);
  assert.ok(speed > 7 && speed < 8);
  const impulse = wheel.prepare(0, 0, radius, mass, 10, true, 1 / 60, 10);
  wheel.finish(impulse, radius);
  assert.equal(wheel.angularSpeed, 0);
  assert.equal(Math.abs(impulse), 0);
});

test('acceleration, braking and cornering share the same bounded contact ellipse', () => {
  for (const forward of [-20, 0, 20]) {
    for (const side of [-20, 0, 20]) {
      const result = tyreImpulse(forward, side, 5, 0.6);
      assert.ok(Math.hypot(result.forward * 0.5, result.side) <= 3 + 1e-12);
      const air = tyreImpulse(forward, side, 0, 0.6);
      assert.equal(Math.abs(air.forward) + Math.abs(air.side), 0);
    }
  }
  assert.ok(tyreImpulse(20, 20, 5, 0.6).forward < tyreImpulse(20, 0, 5, 0.6).forward);
});

test('a lower lateral capacity shares drive and brake effort without reducing straight-line traction', () => {
  for (const forward of [-30, 0, 30]) {
    for (const side of [-30, 0, 30]) {
      const result = tyreImpulse(forward, side, 5, 2.4, 1.25);
      assert.ok(Math.hypot(result.forward / 24, result.side / 6.25) <= 1 + 1e-12);
      const air = tyreImpulse(forward, side, 0, 2.4, 1.25);
      assert.equal(Math.abs(air.forward) + Math.abs(air.side), 0);
    }
  }
  assert.deepEqual(tyreImpulse(20, 0, 5, 2.4, 1.25), { forward: 20, side: 0 });
  assert.equal(tyreImpulse(20, 20, 5, 2.4, 1.25).forward, tyreImpulse(20, 20, 5, 2.4).forward);
  assert.ok(tyreImpulse(20, 20, 5, 2.4, 1.25).side < tyreImpulse(20, 20, 5, 2.4).side);
  assert.deepEqual(tyreImpulse(0, 0, 5, 0), { forward: 0, side: 0 });
});

test('sand grip patches are bounded, smooth, positional and leave every other material unchanged', () => {
  let minimum = Infinity, maximum = -Infinity, total = 0, count = 0;
  for (let x = -30; x <= 30; x += 0.5) for (let z = -30; z <= 30; z += 0.5) {
    const grip = surfaceGripAt('sand', x, z);
    assert.ok(grip >= 0.9 && grip <= 1.1, `sand grip=${grip} at ${x},${z}`);
    assert.equal(grip, surfaceGripAt('sand', x, z));
    minimum = Math.min(minimum, grip); maximum = Math.max(maximum, grip);
    total += grip; count++;
  }
  assert.ok(minimum < 0.92 && maximum > 1.08, `patch range=${minimum}..${maximum}`);
  assert.ok(Math.abs(total / count - 1) < 0.01, `mean grip=${total / count}`);
  for (let edge = -8; edge <= 8; edge += 2) {
    for (const z of [-3.1, 0, 7.3]) {
      assert.ok(Math.abs(surfaceGripAt('sand', edge - 1e-6, z)
        - surfaceGripAt('sand', edge + 1e-6, z)) < 1e-6);
      assert.ok(Math.abs(surfaceGripAt('sand', z, edge - 1e-6)
        - surfaceGripAt('sand', z, edge + 1e-6)) < 1e-6);
    }
  }
  for (const { id } of Object.values(SURFACES)) if (id !== 'sand') {
    assert.equal(surfaceGripAt(id, -234.5, 678.9), 1);
    assert.equal(surfaceGripAt(id, 0, 0), 1);
  }
});

test('playful ice reaches 40-48 degrees and recovers while coasting after countersteer', () => {
  const run = (surface: 'dirt' | 'ice', direction: number) => {
    const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    world.createCollider(RAPIER.ColliderDesc.cuboid(200, 0.1, 200));
    const car = new Vehicle(scene, world, { x: 38, y: 1.2, z: 52 }, 1.45, () => surface);
    const facing = new THREE.Vector3();
    const tick = (steer: number, powered: boolean) => {
      car.beforeStep({ steer, forward: powered, reverse: false }, 1 / 60); world.step(); car.capture();
    };
    const sample = () => {
      facing.set(0, 0, -1).applyQuaternion(car.rotation);
      const v = car.body.linvel();
      const side = Math.abs(v.x * facing.z - v.z * facing.x);
      const along = Math.abs(v.x * facing.x + v.z * facing.z);
      return {
        angle: Math.atan2(side, along) * 180 / Math.PI, side, speed: car.speed,
        upright: 1 - 2 * (car.rotation.x ** 2 + car.rotation.z ** 2), contacts: car.contactCount(),
      };
    };
    try {
      for (let i = 0; i < 100; i++) tick(0, false);
      for (let i = 0; i < 600 && car.speed < 10; i++) tick(0, true);
      assert.ok(car.speed >= 10 && car.speed < 10.5, `${surface}: entry=${car.speed}`);
      let peakAngle = 0, peakSide = 0;
      for (let i = 0; i < 99; i++) {
        tick(i < 54 ? direction : -direction, i < 54);
        const s = sample();
        peakAngle = Math.max(peakAngle, s.angle); peakSide = Math.max(peakSide, s.side);
        assert.ok(s.contacts >= 2 && s.upright > 0.8);
      }
      const counterEnd = car.position.clone();
      for (let i = 0; i < 90; i++) tick(0, false);
      const recovered = sample();
      assert.ok(recovered.angle < 3 && recovered.side < 0.5,
        `${surface}: residual slide=${JSON.stringify(recovered)}`);
      assert.ok(recovered.speed > (surface === 'ice' ? 3 : 4) && car.position.distanceTo(counterEnd) > 5,
        `${surface}: recovery must retain forward motion, not merely stop`);
      assert.ok(recovered.contacts >= 2 && recovered.upright > 0.8);
      return { peakAngle, peakSide };
    } finally { world.free(); disposeScene(scene); }
  };
  for (const direction of [-1, 1]) {
    const dirt = run('dirt', direction), ice = run('ice', direction);
    assert.ok(ice.peakAngle >= 40 && ice.peakAngle <= 48 && ice.peakAngle > dirt.peakAngle * 4,
      `direction=${direction}: ice=${ice.peakAngle}°, dirt=${dirt.peakAngle}°`);
    assert.ok(ice.peakSide > 5.5 && ice.peakSide > dirt.peakSide * 3,
      `direction=${direction}: ice=${ice.peakSide} m/s, dirt=${dirt.peakSide} m/s`);
  }
});

test('ice and glass turn response leaves slow, gentle, uphill and other surfaces balanced', () => {
  const run = (surface: 'ice' | 'mars-glass' | 'sand' | 'dirt', speed: number, steer: number, grade = 0) => {
    const world = new RAPIER.World({ x: 0, y: -18, z: 0 }), scene = new THREE.Scene();
    const angle = grade * Math.PI / 180;
    world.createCollider(RAPIER.ColliderDesc.cuboid(200, 0.1, 200)
      .setRotation({ x: Math.sin(angle / 2), y: 0, z: 0, w: Math.cos(angle / 2) }));
    const car = new Vehicle(scene, world, { x: 0, y: 1.2, z: 0 }, 1.45, () => surface);
    try {
      for (let i = 0; i < 100; i++) {
        car.beforeStep(coast, 1 / 60); world.step(); car.capture();
      }
      assert.equal(car.contactCount(), 4);
      car.body.setLinvel(new THREE.Vector3(0, 0, -speed).applyQuaternion(car.rotation), true);
      car.capture();
      const previous = car.wheelTelemetry.map((wheel, i) => ({
        load: wheel.load, spring: car.controller.wheelSuspensionForce(i) ?? 0,
      }));
      car.beforeStep({ steer, forward: true, reverse: false }, 1 / 60);
      for (const [i, wheel] of car.wheelTelemetry.entries()) {
        const base = 0.85 * car.terrainWheels[i].surface.lateralGrip;
        const rearResponse = SURFACES[surface].rearTurnResponse;
        const active = rearResponse !== undefined && speed === 10 && steer === 1 && grade === 0;
        const expected = base * (active ? i < 2 ? 1.75 : rearResponse : 1);
        assert.ok(Math.abs((car.controller.wheelSideFrictionStiffness(i) ?? 0) - expected) < 1e-6,
          `${surface}/${speed}/${steer}/${grade}: unexpected axle response for wheel ${i}`);
        const expectedLongitudinal = wheel.longitudinalFriction
          * (previous[i].spring > 0 ? previous[i].load / previous[i].spring : 1);
        assert.ok(Math.abs((car.controller.wheelFrictionSlip(i) ?? 0) - expectedLongitudinal) < 1e-5,
          `wheel ${i}: lateral retune changed the longitudinal budget`);
      }
    } finally { world.free(); disposeScene(scene); }
  };
  run('ice', 2, 1);
  run('ice', 10, 0.15);
  run('ice', 10, 1, 25);
  run('ice', 10, 1);
  run('mars-glass', 2, 1);
  run('mars-glass', 10, 0.15);
  run('mars-glass', 10, 1, 25);
  run('mars-glass', 10, 1);
  run('dirt', 10, 1);
  run('sand', 10, 1);
});

test('real sand patches desynchronise loaded rotors within the same contact budget and replay exactly', () => {
  const run = () => {
    const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    const angle = 20 * Math.PI / 180;
    world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.1, 100)
      .setRotation({ x: Math.sin(angle / 2), y: 0, z: 0, w: Math.cos(angle / 2) }));
    const car = new Vehicle(scene, world, { x: 0, y: 1.2, z: 0 }, 1.6, () => 'sand');
    let peakRpmDifference = 0;
    const samples = [];
    try {
      for (let step = 0; step < 180; step++) {
        const expected = car.wheelTelemetry.map((wheel, i) => {
          const point = car.controller.wheelContactPoint(i);
          const grip = wheel.grounded && point ? surfaceGripAt('sand', point.x, point.z) : null;
          const spring = car.controller.wheelSuspensionForce(i) ?? 0;
          return { grip, nativeScale: spring > 0 ? wheel.load / spring : 1 };
        });
        car.beforeStep(forward, 1 / 60); world.step(); car.capture();
        const wheels = car.wheelTelemetry;
        for (const [i, wheel] of wheels.entries()) {
          assert.ok(wheel.gripMultiplier >= 0.9 && wheel.gripMultiplier <= 1.1);
          if (expected[i].grip !== null) assert.equal(wheel.gripMultiplier, expected[i].grip);
          assert.ok(Math.abs((car.controller.wheelFrictionSlip(i) ?? 0)
            - wheel.longitudinalFriction * expected[i].nativeScale) < 1e-5,
          `wheel ${i}: native and final grip budgets differ`);
          if (wheel.load > 0) {
            const normalImpulse = wheel.load / 60;
            const utilization = Math.hypot(wheel.forwardImpulse / (2 * normalImpulse * wheel.longitudinalFriction),
              wheel.sideImpulse / (normalImpulse * wheel.lateralFriction));
            assert.ok(utilization <= 1 + 1e-10, `wheel ${i}: contact utilization=${utilization}`);
          } else assert.equal(Math.abs(wheel.forwardImpulse) + Math.abs(wheel.sideImpulse), 0);
        }
        if (step > 30 && wheels.every(wheel => wheel.grounded)) {
          const rpm = wheels.map(wheel => wheel.angularSpeed * 60 / (2 * Math.PI));
          peakRpmDifference = Math.max(peakRpmDifference, Math.max(...rpm) - Math.min(...rpm));
        }
        if (step % 15 === 0) samples.push({
          position: car.position.toArray(),
          wheels: wheels.map(wheel => [wheel.gripMultiplier, wheel.angularSpeed, wheel.forwardImpulse, wheel.sideImpulse]),
        });
      }
      assert.ok(peakRpmDifference > 30, `loaded wheel RPM difference=${peakRpmDifference}`);
      car.reset({ x: 0, y: 30, z: 0 });
      assert.ok(car.wheelTelemetry.every(wheel => wheel.gripMultiplier === 1));
      return samples;
    } finally { world.free(); disposeScene(scene); }
  };
  assert.deepEqual(run(), run());
});

test('fast dirt and sand turns wash wide under power and recover steering after lift-off', () => {
  for (const surface of ['dirt', 'sand'] as const) {
    for (const steer of [-1, 1]) {
      const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
      world.createCollider(RAPIER.ColliderDesc.cuboid(200, 0.1, 200).setTranslation(0, -0.1, 0));
      const car = new Vehicle(scene, world, { x: 0, y: 1.2, z: 0 }, 1.45, () => surface);
      const tick = (input: typeof forward) => {
        car.beforeStep(input, 1 / 60); world.step(); car.capture();
      };
      try {
        for (let i = 0; i < 100; i++) tick(coast);
        car.body.setLinvel({ x: 0, y: 0, z: -12 }, true);
        car.capture();
        const powered: number[] = [], released: number[] = [], frontGrip: number[] = [];
        for (let i = 0; i < 150; i++) {
          tick({ ...forward, steer, forward: i < 90 });
          const rollingYaw = Math.abs(car.speed * Math.tan(car.controller.wheelSteering(0)!) / 2.02);
          const gain = Math.abs(car.body.angvel().y) / rollingYaw;
          if (i >= 60 && i < 90) powered.push(gain);
          if (i >= 110 && i < 140) {
            assert.ok(car.speed > 2);
            released.push(gain);
          }
          for (const [index, wheel] of car.wheelTelemetry.entries()) {
            if (wheel.load === 0) {
              assert.equal(Math.abs(wheel.forwardImpulse) + Math.abs(wheel.sideImpulse), 0);
            } else {
              const friction = wheel.longitudinalFriction;
              assert.equal(friction,
                2.4 * car.terrainWheels[index].surface.longitudinalGrip * wheel.gripMultiplier);
              const normalImpulse = wheel.load / 60;
              const utilization = Math.hypot(wheel.forwardImpulse / (2 * normalImpulse * friction),
                wheel.sideImpulse / (normalImpulse * wheel.lateralFriction));
              assert.ok(utilization <= 1 + 1e-10, `${surface}/${steer}/${index}: contact utilization=${utilization}`);
              if (index < 2 && i >= 60 && i < 90) {
                frontGrip.push(wheel.lateralFriction);
              }
            }
          }
        }
        const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
        const underPower = average(powered), afterRelease = average(released);
        assert.ok(average(frontGrip) < 1.4, `${surface}/${steer}: sliding front grip=${average(frontGrip)}`);
        assert.ok(underPower > 0.3 && underPower < 0.72, `${surface}/${steer}: powered yaw gain=${underPower}`);
        assert.ok(afterRelease > underPower + 0.15 && afterRelease < 1.1,
          `${surface}/${steer}: lift-off yaw gain=${afterRelease}, powered=${underPower}`);
        for (let i = 0; i < 120; i++) tick(coast);
        assert.ok(Math.abs(car.body.angvel().y) < 0.05);
        assert.ok(car.wheelTelemetry.every(wheel => Math.abs(wheel.lateralSpeed) < 0.1));
        assert.equal(car.contactCount(), 4);
        assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(car.rotation).y > 0.95);
      } finally { world.free(); disposeScene(scene); }
    }
  }
});

test('shaft braking removes angular momentum without making an airborne wheel reverse by itself', () => {
  const wheel = new WheelDrive();
  wheel.angularSpeed = 25;
  wheel.brake(2);
  assert.ok(Math.abs(wheel.angularSpeed * WHEEL_INERTIA - (25 * WHEEL_INERTIA - 2)) < 1e-12);
  wheel.brake(100);
  assert.equal(wheel.angularSpeed, 0);
});

test('wheel-weight support replaces spring load without increasing total weight or changing free fall', () => {
  for (const gravity of [18, 3.7]) {
    const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -gravity, z: 0 });
    world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.1, 100).setTranslation(0, -0.1, 0));
    const car = new Vehicle(scene, world, { x: 0, y: 1.2, z: 0 }, 1, () => 'dirt');
    const tick = () => {
      car.beforeStep(coast, 1 / 60); world.step(); car.capture();
    };
    try {
      for (let i = 0; i < 360; i++) tick();
      const weight = car.body.mass() * gravity;
      const wheelWeight = 4 * WHEEL_INERTIA / 0.48 ** 2 * gravity;
      const total = car.wheelTelemetry.reduce((sum, wheel) => sum + wheel.load, 0);
      const springs = [0, 1, 2, 3].reduce((sum, i) => sum + (car.controller.wheelSuspensionForce(i) ?? 0), 0);
      assert.equal(car.contactCount(), 4);
      assert.ok(Math.abs(total - weight) < weight * 0.01,
        `gravity=${gravity}: total normal load=${total}, weight=${weight}`);
      assert.ok(Math.abs(springs - (weight - wheelWeight)) < weight * 0.01,
        `gravity=${gravity}: spring load=${springs}, expected=${weight - wheelWeight}`);
      car.reset({ x: 0, y: 30, z: 0 });
      const falling = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(20, 30, 0).setLinearDamping(car.body.linearDamping()));
      falling.setAdditionalMass(car.body.mass(), true);
      for (let i = 0; i < 30; i++) {
        tick();
        assert.ok(car.wheelTelemetry.every(wheel => !wheel.grounded && wheel.load === 0
          && wheel.forwardImpulse === 0 && wheel.sideImpulse === 0));
        assert.ok(Math.abs(car.body.linvel().y - falling.linvel().y) < 1e-4,
          `gravity=${gravity}: airborne support changed free fall`);
      }
    } finally { world.free(); disposeScene(scene); }
  }
});

test('real mixed-surface wheels spin independently and lifting the car removes all tyre impulses', () => {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const angle = 25 * Math.PI / 180;
  world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.1, 100)
    .setRotation({ x: Math.sin(angle / 2), y: 0, z: 0, w: Math.cos(angle / 2) }));
  const car = new Vehicle(scene, world, { x: 0, y: 1.2, z: 0 }, 1.6,
    x => x < 0 ? 'sand' : 'dirt');
  const tick = () => {
    car.beforeStep(forward, 1 / 60); world.step(); car.capture();
  };
  try {
    let splitSpin = 0;
    for (let i = 0; i < 120; i++) {
      tick();
      const wheels = car.wheelTelemetry;
      if (car.contactCount() === 4) {
        splitSpin = Math.max(splitSpin,
          (wheels[0].slipRatio + wheels[2].slipRatio - wheels[1].slipRatio - wheels[3].slipRatio) / 2);
      }
    }
    assert.ok(splitSpin > 0.2, `left/right slip difference=${splitSpin}`);
    const shaftSpeeds = car.wheelTelemetry.map(wheel => wheel.angularSpeed);
    const liftBrake = driveForces(coast, car.speed).brake;
    car.beforeStep(coast, 1 / 60); world.step(); car.capture();
    for (let i = 0; i < 4; i++) {
      const wheel = car.wheelTelemetry[i];
      const reacted = shaftSpeeds[i] + wheel.forwardImpulse * 0.48 / WHEEL_INERTIA;
      const surface = car.terrainWheels[i].surface;
      const brake = (surface.rollingBrake + liftBrake * surface.brakeEffect) * 0.48
        * (1 + 4 * WHEEL_INERTIA / (0.48 ** 2 * car.body.mass())) / WHEEL_INERTIA;
      const expected = Math.sign(reacted) * Math.max(0, Math.abs(reacted) - brake);
      assert.ok(Math.abs(wheel.angularSpeed - expected) < 1e-9,
        `lift-off wheel ${i}: rotor=${wheel.angularSpeed}, torque/reaction=${expected}`);
      assert.equal(car.controller.wheelEngineForce(i), 0);
    }
    car.reset({ x: 0, y: 30, z: 0 });
    for (let i = 0; i < 20; i++) {
      tick();
      assert.equal(car.contactCount(), 0);
      assert.ok(car.wheelTelemetry.every(wheel => wheel.load === 0
        && wheel.forwardImpulse === 0 && wheel.sideImpulse === 0 && wheel.slipRatio === 0));
    }
    assert.ok(car.wheelTelemetry.every(wheel => wheel.angularSpeed > 2));
    assert.ok(Math.hypot(car.body.linvel().x, car.body.linvel().z) < 1e-6);
  } finally { world.free(); disposeScene(scene); }
});
