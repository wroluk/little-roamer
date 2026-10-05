import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { valleySurfaceAt } from '../src/game/terrain';
import {
  FORDS, GLACIER, highlandsSurfaceAt, highlandsSurfaceHeight, VOLCANOES,
} from '../src/game/highlands';
import { SURFACES, type SurfaceId } from '../src/game/surfaces';
import { northernSurfaceAt } from '../src/game/northern-terrain';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';

before(async () => { await RAPIER.init(); });

function flatDrive(surface: SurfaceId) {
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.1, 100).setTranslation(0, -0.1, 0));
  const scene = new THREE.Scene();
  const vehicle = new Vehicle(
    scene, world, { x: 0, y: 1.2, z: 20 }, 1, () => surface,
    () => surface === 'water' ? 0.35 : null,
  );
  const tick = (count: number, forward: boolean) => {
    for (let i = 0; i < count; i++) {
      vehicle.beforeStep({ steer: 0, forward, reverse: false }, 1 / 60);
      world.step();
      vehicle.capture();
    }
  };
  tick(100, false);
  tick(180, true);
  const poweredSpeed = Math.abs(vehicle.speed);
  tick(120, false);
  const coastSpeed = Math.abs(vehicle.speed);
  world.free();
  disposeScene(scene);
  return { poweredSpeed, coastSpeed };
}

function surfaceVehicle(
  surfaceAt: (x: number, z: number) => SurfaceId,
  waterHeight: (x: number, z: number) => number | null = () => null,
) {
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.1, 100).setTranslation(0, -0.1, 0));
  const scene = new THREE.Scene();
  const vehicle = new Vehicle(scene, world, { x: 0, y: 1.2, z: 20 }, 1, surfaceAt, waterHeight);
  const tick = (count: number, input = { steer: 0, forward: false, reverse: false }) => {
    for (let i = 0; i < count; i++) {
      vehicle.beforeStep(input, 1 / 60);
      world.step();
      vehicle.capture();
    }
  };
  tick(100);
  return { world, scene, vehicle, tick };
}

function slopeRun(surface: SurfaceId, degrees: number, heading = 0) {
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const angle = degrees * Math.PI / 180;
  world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.1, 100)
    .setRotation({ x: Math.sin(angle / 2), y: 0, z: 0, w: Math.cos(angle / 2) })
    .setFriction(0.9));
  const scene = new THREE.Scene();
  const vehicle = new Vehicle(scene, world, { x: 0, y: 1.2, z: 0 }, 1.6, () => surface);
  vehicle.body.setRotation(new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0), heading), true);
  vehicle.capture();
  try {
    let peakSlip = 0;
    let peakIntensity = 0;
    for (let step = 0; step < 240; step++) {
      vehicle.beforeStep({ steer: 0, forward: true, reverse: false }, 1 / 60);
      world.step();
      vehicle.capture();
      peakSlip = Math.max(peakSlip, vehicle.terrainWheels[0].slip);
      peakIntensity = Math.max(peakIntensity, vehicle.terrainWheels[0].intensity);
    }
    vehicle.syncVisuals(1);
    return {
      progress: -vehicle.position.z,
      extraWheelSpin: vehicle.tires[0].rotation.x - (vehicle.controller.wheelRotation(0) ?? 0),
      peakSlip, peakIntensity,
    };
  } finally { world.free(); disposeScene(scene); }
}

const slopeProgress = (surface: SurfaceId, degrees: number, heading = 0) =>
  slopeRun(surface, degrees, heading).progress;

function maneuver(surface: SurfaceId) {
  const braking = surfaceVehicle(() => surface);
  braking.tick(120, { steer: 0, forward: true, reverse: false });
  const brakeStart = braking.vehicle.position.clone();
  let brakeTicks = 0;
  while (Math.abs(braking.vehicle.speed) > 0.5 && brakeTicks++ < 180) {
    braking.tick(1, { steer: 0, forward: false, reverse: true });
  }
  const brakeDistance = braking.vehicle.position.distanceTo(brakeStart);
  braking.world.free();
  disposeScene(braking.scene);

  const turning = surfaceVehicle(() => surface);
  turning.tick(90, { steer: 0.75, forward: true, reverse: false });
  const turnOffset = Math.abs(turning.vehicle.position.x);
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(turning.vehicle.body.rotation());
  const heading = Math.abs(Math.atan2(-direction.x, -direction.z));
  turning.world.free();
  disposeScene(turning.scene);
  return { brakeDistance, brakeTicks, turnOffset, heading };
}

test('surface maps match visible terrain regions', () => {
  assert.equal(valleySurfaceAt(0, 22), 'dirt');
  assert.equal(valleySurfaceAt(65, 65), 'grass');
  for (const ford of FORDS) assert.equal(highlandsSurfaceAt(ford.x, ford.z), 'water');
  assert.equal(highlandsSurfaceAt(GLACIER.x, GLACIER.z), 'ice');
  assert.equal(highlandsSurfaceAt(220, -10), 'ash');
  const volcano = VOLCANOES[0];
  let lavaPoint: [number, number] | undefined;
  let mossPoint: [number, number] | undefined;
  for (let z = volcano.z; z < 40; z += 2) {
    for (let x = volcano.x - 40; x < volcano.x + 40; x += 2) {
      const surface = highlandsSurfaceAt(x, z);
      if (surface === 'lava') lavaPoint = [x, z];
      if (surface === 'moss') mossPoint = [x, z];
    }
  }
  assert.ok(lavaPoint, 'visible lava flow should classify as rough lava');
  assert.ok(mossPoint, 'visible moss patch should classify as springy moss');
  assert.ok(highlandsSurfaceHeight(GLACIER.x, GLACIER.z) > 30);
  assert.equal(northernSurfaceAt(-317, -91), 'mud');
  assert.equal(northernSurfaceAt(-208, -18), 'mud');
  assert.equal(northernSurfaceAt(-293, -445), 'rock');
});

test('loose ash and water reduce speed while rough lava slows coasting', () => {
  const dirt = flatDrive('dirt');
  const ash = flatDrive('ash');
  const lava = flatDrive('lava');
  const water = flatDrive('water');
  assert.ok(dirt.poweredSpeed > ash.poweredSpeed + 2, `${dirt.poweredSpeed} vs ${ash.poweredSpeed}`);
  assert.ok(ash.poweredSpeed > water.poweredSpeed + 1, `${ash.poweredSpeed} vs ${water.poweredSpeed}`);
  assert.ok(dirt.coastSpeed > lava.coastSpeed + 3, `${dirt.coastSpeed} vs ${lava.coastSpeed}`);
});

test('rock carries momentum while mud asks for a steadier approach', () => {
  const rock = flatDrive('rock');
  const mud = flatDrive('mud');
  assert.ok(rock.poweredSpeed > mud.poweredSpeed + 2,
    `powered rock=${rock.poweredSpeed}, mud=${mud.poweredSpeed}`);
  assert.ok(rock.coastSpeed > mud.coastSpeed + 1,
    `coasting rock=${rock.coastSpeed}, mud=${mud.coastSpeed}`);
});

test('flat-surface ride texture moves both axles and rocks the body, with rock rougher than sand', () => {
  const travel = (surface: SurfaceId, reverse = false) => {
    const { world, scene, vehicle, tick } = surfaceVehicle(() => surface);
    const low = [Infinity, Infinity, Infinity, Infinity];
    const high = [-Infinity, -Infinity, -Infinity, -Infinity];
    let bodyMotion = 0;
    try {
      for (let step = 0; step < 170; step++) {
        tick(1, { steer: 0, forward: !reverse, reverse });
        vehicle.syncVisuals(1);
        if (step < 20) continue;
        bodyMotion = Math.max(bodyMotion, Math.abs(vehicle.bodyVisual.position.y),
          Math.abs(vehicle.bodyVisual.rotation.x) * 2, Math.abs(vehicle.bodyVisual.rotation.z) * 2);
        for (let wheel = 0; wheel < 4; wheel++) {
          const height = vehicle.wheels[wheel].position.y;
          low[wheel] = Math.min(low[wheel], height);
          high[wheel] = Math.max(high[wheel], height);
        }
      }
      return { wheels: low.map((value, wheel) => high[wheel] - value), bodyMotion };
    } finally { world.free(); disposeScene(scene); }
  };
  const rock = travel('rock');
  const grass = travel('grass');
  const reverseGrass = travel('grass', true);
  const sand = travel('sand');
  assert.ok(Math.min(...rock.wheels) > Math.max(...sand.wheels) * 1.3,
    `rock travel=${rock.wheels}, sand travel=${sand.wheels}`);
  assert.ok(Math.min(...grass.wheels) > Math.max(...sand.wheels) * 1.1,
    `grass travel=${grass.wheels}, sand travel=${sand.wheels}`);
  assert.ok(Math.min(...grass.wheels) > 0.03, `grass wheels=${grass.wheels}`);
  assert.ok(grass.bodyMotion > 0.008, `grass body motion=${grass.bodyMotion}`);
  assert.ok(Math.min(...reverseGrass.wheels) > 0.025,
    `reverse grass wheels=${reverseGrass.wheels}`);
  assert.ok(reverseGrass.bodyMotion > 0.008,
    `reverse grass body motion=${reverseGrass.bodyMotion}`);
});

test('surface profiles express distinct traction, resistance, and steering', () => {
  assert.ok(SURFACES.ice.lateralGrip < SURFACES.ash.lateralGrip);
  assert.ok(SURFACES.ice.brakeEffect < SURFACES.ash.brakeEffect);
  assert.ok(SURFACES.ash.longitudinalGrip < SURFACES.grass.longitudinalGrip);
  assert.ok(SURFACES.ice.steering < SURFACES.grass.steering);
  assert.ok(SURFACES.water.drag > SURFACES.lava.drag);
  assert.ok(SURFACES.lava.rollingBrake > SURFACES.moss.rollingBrake);
  assert.ok(SURFACES.lava.roughness > SURFACES.moss.roughness);
  assert.ok(SURFACES.water.roughness > SURFACES.moss.roughness);
  assert.ok(SURFACES.moss.roughness > SURFACES.ash.roughness);
  assert.ok(SURFACES.grass.roughness > SURFACES.ash.roughness);
  assert.ok(SURFACES.grass.roughness > SURFACES.dirt.roughness);
  assert.ok(SURFACES.rock.roughness > SURFACES.grass.roughness);
  assert.ok(SURFACES.grass.roughness > SURFACES.sand.roughness);
  assert.ok(SURFACES.dirt.roughness > 0.01);
  assert.ok(SURFACES.water.speed < SURFACES.ash.speed / 2);
  assert.ok(SURFACES.water.drag > SURFACES.ash.drag * 4);
  assert.ok(SURFACES.water.power < SURFACES.ash.power);
  assert.ok(SURFACES.snow.lateralGrip > SURFACES.ice.lateralGrip);
  assert.equal(SURFACES.snow.speed, SURFACES.dirt.speed);
  assert.ok(SURFACES.mud.drag > SURFACES.sand.drag);
  assert.ok(SURFACES.mud.power < SURFACES.sand.power);
  assert.ok(SURFACES.rock.roughness > SURFACES.snow.roughness);
  assert.ok(SURFACES.rock.longitudinalGrip > SURFACES.mud.longitudinalGrip);
});

test('each grounded wheel classifies its own surface and aggregate handling blends', () => {
  let left: SurfaceId = 'ice';
  const { world, scene, vehicle, tick } = surfaceVehicle((x) => x < 0 ? left : 'dirt');
  try {
    assert.deepEqual(vehicle.wheelSurfaces, ['ice', 'dirt', 'ice', 'dirt']);
    assert.ok(vehicle.terrainHandling.steering > SURFACES.ice.steering);
    assert.ok(vehicle.terrainHandling.steering < SURFACES.dirt.steering);
    left = 'ash';
    const before = vehicle.terrainHandling.drag;
    tick(1);
    assert.ok(vehicle.terrainHandling.drag > before);
    assert.ok(vehicle.terrainHandling.drag < (SURFACES.ash.drag + SURFACES.dirt.drag) / 2);
    tick(90);
    assert.ok(Math.abs(vehicle.terrainHandling.drag - SURFACES.ash.drag / 2) < 0.02);
  } finally {
    world.free();
    disposeScene(scene);
  }
});

test('ice visibly lengthens braking and widens the turning path', () => {
  const dirt = maneuver('dirt');
  const snow = maneuver('snow');
  const ice = maneuver('ice');
  assert.ok(snow.heading < dirt.heading * 0.9,
    `heading dirt=${dirt.heading}, snow=${snow.heading}`);
  assert.ok(ice.brakeDistance > dirt.brakeDistance * 1.25,
    `braking dirt=${dirt.brakeDistance}, ice=${ice.brakeDistance}`);
  assert.ok(ice.brakeTicks > dirt.brakeTicks,
    `braking ticks dirt=${dirt.brakeTicks}, ice=${ice.brakeTicks}`);
  assert.ok(ice.heading < dirt.heading * 0.75,
    `heading dirt=${dirt.heading}, ice=${ice.heading}; offsets dirt=${dirt.turnOffset}, ice=${ice.turnOffset}`);
});

test('snow and ice take longer to stop from the same speed', () => {
  const stoppingDistance = (surface: SurfaceId) => {
    const { world, scene, vehicle, tick } = surfaceVehicle(() => surface);
    try {
      vehicle.body.setLinvel({ x: 0, y: 0, z: -8 }, true);
      vehicle.capture();
      const start = vehicle.position.clone();
      let steps = 0;
      while (Math.abs(vehicle.speed) > 0.5 && steps++ < 180) {
        tick(1, { steer: 0, forward: false, reverse: true });
      }
      return vehicle.position.distanceTo(start);
    } finally { world.free(); disposeScene(scene); }
  };
  const dirt = stoppingDistance('dirt');
  const snow = stoppingDistance('snow');
  const ice = stoppingDistance('ice');
  assert.ok(snow > dirt * 1.1, `dirt=${dirt}, snow=${snow}`);
  assert.ok(ice > snow * 1.1, `snow=${snow}, ice=${ice}`);
});

test('snow and ice climb a steep grade more slowly than bare ground', () => {
  const dirtSteep = slopeProgress('dirt', 25);
  const snowSteep = slopeProgress('snow', 25);
  const iceSteep = slopeProgress('ice', 25);
  const snowGentle = slopeProgress('snow', 10);
  const iceGentle = slopeProgress('ice', 10);
  assert.ok(dirtSteep > 5, `dirt 25°=${dirtSteep}`);
  assert.ok(dirtSteep > snowSteep + 5 && dirtSteep > iceSteep + 5,
    `dirt 25°=${dirtSteep}, snow 25°=${snowSteep}, ice 25°=${iceSteep}`);
  assert.ok(snowGentle > 5 && iceGentle > 5,
    `snow 10°=${snowGentle}, ice 10°=${iceGentle}`);
});

test('loose surfaces stop a straight steep climb but reward a gentler or angled line', () => {
  for (const surface of ['sand', 'mud', 'ash'] as const) {
    const straight = slopeProgress(surface, 25);
    const angled = slopeProgress(surface, 25, 0.65);
    const gentle = slopeProgress(surface, 20);
    assert.ok(straight < 2, `${surface} straight 25° climb=${straight}`);
    assert.ok(angled > straight + 4, `${surface} angled 25°=${angled}, straight=${straight}`);
    assert.ok(gentle > 2, `${surface} gentle 20° climb=${gentle}`);
  }
  assert.ok(slopeProgress('dirt', 25) > 20);
  assert.ok(slopeProgress('rock', 25) > 20);
});

test('loose uphill wheels visibly spin and kick up terrain while the car stalls', () => {
  for (const surface of ['sand', 'mud', 'ash'] as const) {
    const run = slopeRun(surface, 25);
    assert.ok(run.progress < 2, `${surface} climbed ${run.progress} m`);
    assert.ok(run.peakSlip > 0.2, `${surface} peak slip=${run.peakSlip}`);
    assert.ok(run.extraWheelSpin < -8,
      `${surface} visible wheel spin beyond ground rolling=${run.extraWheelSpin}`);
    assert.ok(run.peakIntensity > 0.3,
      `${surface} particle intensity=${run.peakIntensity}`);
  }
  assert.ok(Math.abs(slopeRun('dirt', 25).extraWheelSpin) < 2);
  assert.ok(Math.abs(slopeRun('sand', 0).extraWheelSpin) < 2);
});

test('coasting downhill keeps ice moving while sand and mud absorb momentum', () => {
  const coast = (surface: SurfaceId) => {
    const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    const angle = 12 * Math.PI / 180;
    world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.1, 100)
      .setRotation({ x: Math.sin(angle / 2), y: 0, z: 0, w: Math.cos(angle / 2) }));
    const scene = new THREE.Scene();
    const vehicle = new Vehicle(scene, world, { x: 0, y: 1.2, z: 0 }, 1.45, () => surface);
    vehicle.body.setRotation(new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0), Math.PI), true);
    vehicle.capture();
    try {
      for (let i = 0; i < 90; i++) {
        vehicle.beforeStep({ steer: 0, forward: false, reverse: false }, 1 / 60);
        world.step(); vehicle.capture();
      }
      vehicle.body.setLinvel({ x: 0, y: 0, z: 8 }, true);
      vehicle.capture();
      const start = vehicle.position.z;
      for (let i = 0; i < 180; i++) {
        vehicle.beforeStep({ steer: 0, forward: false, reverse: false }, 1 / 60);
        world.step(); vehicle.capture();
      }
      return vehicle.position.z - start;
    } finally { world.free(); disposeScene(scene); }
  };
  const ice = coast('ice');
  const dirt = coast('dirt');
  const sand = coast('sand');
  const mud = coast('mud');
  assert.ok(ice > dirt + 2, `ice=${ice}, dirt=${dirt}`);
  assert.ok(ice > sand * 4, `ice=${ice}, sand=${sand}`);
  assert.ok(mud < sand, `mud=${mud}, sand=${sand}`);
});

test('a sudden steering reversal sends the ice car sideways without flipping it', () => {
  const turn = (surface: SurfaceId) => {
    const { world, scene, vehicle, tick } = surfaceVehicle(() => surface);
    try {
      vehicle.body.setLinvel({ x: 0, y: 0, z: -10 }, true);
      vehicle.capture();
      let peakSlip = 0;
      for (let i = 0; i < 120; i++) {
        tick(1, { steer: i < 45 ? 1 : -1, forward: true, reverse: false });
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(vehicle.rotation);
        const velocity = vehicle.body.linvel();
        const sideways = Math.abs(velocity.x * forward.z - velocity.z * forward.x);
        const along = Math.abs(velocity.x * forward.x + velocity.z * forward.z);
        peakSlip = Math.max(peakSlip, Math.atan2(sideways, along) * 180 / Math.PI);
      }
      for (let i = 0; i < 120; i++) {
        tick(1, { steer: 0, forward: true, reverse: false });
      }
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(vehicle.rotation);
      const velocity = vehicle.body.linvel();
      const sideways = Math.abs(velocity.x * forward.z - velocity.z * forward.x);
      const along = Math.abs(velocity.x * forward.x + velocity.z * forward.z);
      const recoveredSlip = Math.atan2(sideways, along) * 180 / Math.PI;
      const upright = new THREE.Vector3(0, 1, 0).applyQuaternion(vehicle.rotation).y;
      return { peakSlip, recoveredSlip, upright, contacts: vehicle.contactCount() };
    } finally { world.free(); disposeScene(scene); }
  };
  const dirt = turn('dirt');
  const ice = turn('ice');
  assert.ok(ice.peakSlip > 10 && ice.peakSlip > dirt.peakSlip * 1.7,
    `ice slip=${ice.peakSlip}°, dirt slip=${dirt.peakSlip}°`);
  assert.ok(ice.recoveredSlip < 3, `ice kept sliding after steering straight: ${ice.recoveredSlip}°`);
  assert.ok(ice.upright > 0.8 && ice.contacts >= 2,
    `ice upright=${ice.upright}, contacts=${ice.contacts}`);
});

test('deeper water produces stronger blended drag than shallow water', () => {
  const shallow = surfaceVehicle(() => 'water', () => 0.08);
  const deep = surfaceVehicle(() => 'water', () => 0.45);
  try {
    shallow.tick(45);
    deep.tick(45);
    assert.ok(deep.vehicle.terrainHandling.drag > shallow.vehicle.terrainHandling.drag + 0.25,
      `drag shallow=${shallow.vehicle.terrainHandling.drag}, deep=${deep.vehicle.terrainHandling.drag}`);
  } finally {
    shallow.world.free();
    deep.world.free();
    disposeScene(shallow.scene);
    disposeScene(deep.scene);
  }
});

test('one-metre water stalls forward progress while ford-depth water remains passable', () => {
  const ford = surfaceVehicle(() => 'water', () => 0.4);
  const deep = surfaceVehicle(() => 'water', () => 1.05);
  try {
    const fordStart = ford.vehicle.position.z;
    const deepStart = deep.vehicle.position.z;
    ford.tick(360, { steer: 0, forward: true, reverse: false });
    deep.tick(360, { steer: 0, forward: true, reverse: false });
    const fordProgress = fordStart - ford.vehicle.position.z;
    const deepProgress = deepStart - deep.vehicle.position.z;
    assert.ok(fordProgress > 8, `ford progress=${fordProgress}`);
    assert.ok(deepProgress < 0.5, `deep-water progress=${deepProgress}`);
    assert.ok(deep.vehicle.waterDepth >= 0.95);
    assert.ok(deep.vehicle.terrainHandling.drag > ford.vehicle.terrainHandling.drag * 4);
  } finally {
    ford.world.free();
    deep.world.free();
    disposeScene(ford.scene);
    disposeScene(deep.scene);
  }
});
