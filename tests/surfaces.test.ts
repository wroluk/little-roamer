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
  assert.equal(SURFACES.water.speed, SURFACES.dirt.speed);
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
  const ice = maneuver('ice');
  assert.ok(ice.brakeDistance > dirt.brakeDistance * 1.25,
    `braking dirt=${dirt.brakeDistance}, ice=${ice.brakeDistance}`);
  assert.ok(ice.brakeTicks > dirt.brakeTicks,
    `braking ticks dirt=${dirt.brakeTicks}, ice=${ice.brakeTicks}`);
  assert.ok(ice.heading < dirt.heading * 0.75,
    `heading dirt=${dirt.heading}, ice=${ice.heading}; offsets dirt=${dirt.turnOffset}, ice=${ice.turnOffset}`);
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
