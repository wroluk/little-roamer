import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';
import { createTractionGround, tractionMesh, tractionHeight, TRACTION_STARTS } from '../src/game/traction-ground';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

await RAPIER.init();
const trials = [];
const scenarios = [
  ...['pad', 'grade-20', 'grade-25', 'split', 'traverse'].map(id => ({
    id, start: TRACTION_STARTS.find(s => s.id === id)!, heading: 0, speed: 0, drive: true,
  })),
  { id: 'ice-mud-coast', start: TRACTION_STARTS.find(s => s.id === 'pad')!, heading: 0, speed: 8, drive: false },
  { id: 'same-speed-brake', start: TRACTION_STARTS.find(s => s.id === 'pad')!, heading: 0, speed: 8, drive: false },
  { id: 'traverse-coast', start: TRACTION_STARTS.find(s => s.id === 'traverse')!, heading: 0, speed: 0, drive: false },
  { id: 'hill-start', start: { x: 0, z: -35 }, heading: 0, speed: 0, drive: true },
  { id: 'oblique-hill-start', start: { x: 0, z: -35 }, heading: 0.65, speed: 0, drive: true },
  { id: 'reverse', start: TRACTION_STARTS.find(s => s.id === 'pad')!, heading: 0, speed: 0, drive: true },
];
for (const surface of ['dirt', 'sand', 'mud', 'ice'] as const) {
  for (const scenario of scenarios) {
    const { id, start } = scenario;
    const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    const scene = new THREE.Scene(), mesh = tractionMesh();
    world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices, mesh.indices));
    const lab = createTractionGround(null, surface);
    const car = new Vehicle(scene, world,
      { x: start.x, y: tractionHeight(start.x, start.z) + 1.2, z: start.z },
      lab.area.climbingPower, lab.area.surfaceAt);
    car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), scenario.heading), true);
    car.capture();
    const step = (forward: boolean, steer = 0, reverse = false) => {
      car.beforeStep({ forward, reverse, steer }, 1 / 60); world.step(); car.capture();
    };
    try {
      for (let i = 0; i < 100; i++) step(false);
      if (scenario.speed) {
        car.body.setLinvel({ x: 0, y: 0, z: -scenario.speed }, true); car.capture();
      }
      const origin = car.position.clone();
      let peakSide = 0, peakSlip = 0, minContacts = 4;
      const wheelSlip = [0, 0, 0, 0];
      const minimumLoad = [Infinity, Infinity, Infinity, Infinity];
      const turningSamples = [];
      let peakVisualRpm = 0;
      let steps = 0;
      for (let i = 0; i < 240; i++) {
        if (id === 'same-speed-brake' && i > 0 && Math.abs(car.speed) < 0.5) break;
        if (id === 'traverse' && car.position.z < -58) break;
        const steer = id === 'pad' ? (i > 90 && i < 150 ? 1 : i >= 150 && i < 210 ? -1 : 0) : 0;
        step(scenario.drive && id !== 'reverse', steer,
          id === 'same-speed-brake' || id === 'reverse');
        steps++;
        const v = car.body.linvel();
        peakSide = Math.max(peakSide, Math.abs(v.x * car.forward.z - v.z * car.forward.x));
        minContacts = Math.min(minContacts, car.contactCount());
        car.terrainWheels.forEach((w, j) => { wheelSlip[j] = Math.max(wheelSlip[j], w.slip); });
        car.wheelTelemetry.forEach((w, j) => {
          minimumLoad[j] = Math.min(minimumLoad[j], w.load);
          peakVisualRpm = Math.max(peakVisualRpm, Math.abs(w.visualRpm));
        });
        peakSlip = Math.max(peakSlip, ...wheelSlip);
        if (id === 'pad' && i % 10 === 0) {
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(car.rotation);
          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(car.rotation);
          turningSamples.push({
            time: steps / 60, steer, steeringAngle: car.controller.wheelSteering(0),
            position: car.position.toArray(), speed: car.speed,
            heading: Math.atan2(-forward.x, -forward.z), yawRate: car.body.angvel().y,
            sideSpeed: v.x * right.x + v.y * right.y + v.z * right.z,
            wheels: car.wheelTelemetry.map((wheel, index) => ({
              grounded: wheel.grounded, load: wheel.load,
              rollingSpeed: wheel.grounded
                ? wheel.angularSpeed * car.controller.wheelRadius(index)! - wheel.slipSpeed : null,
              lateralSpeed: wheel.grounded ? wheel.lateralSpeed : null,
              lateralFriction: wheel.lateralFriction,
              gripMultiplier: wheel.gripMultiplier,
              longitudinalFriction: wheel.longitudinalFriction,
              slipSpeed: wheel.slipSpeed,
              // Express reactions in the game's forward/right wheel frame.
              forwardImpulse: -wheel.forwardImpulse, sideImpulse: -wheel.sideImpulse,
            })),
          });
        }
      }
      trials.push({ surface, start: id, progress: origin.z - car.position.z,
        origin: origin.toArray(), finish: car.position.toArray(), heading: scenario.heading,
        displacement: car.position.distanceTo(origin), speed: car.speed, peakSide, peakSlip,
        wheelSlip, minContacts, minimumLoad, peakVisualRpm, steps,
        ...(id === 'pad' ? { turningSamples } : {}) });
    } finally { world.free(); disposeScene(scene); }
  }
}
console.log(JSON.stringify({
  model: 'per-wheel-drive-brake-lateral-playful-ice-v7',
  slipMeasurement: 'absolute rim/contact speed difference divided by max(1, abs(rim speed), abs(contact speed))',
  vehicleSourceSha256: createHash('sha256').update(readFileSync(new URL('../src/game/vehicle.ts', import.meta.url))).digest('hex'),
  drivingSourceSha256: createHash('sha256').update(readFileSync(new URL('../src/game/driving.ts', import.meta.url))).digest('hex'),
  wheelDriveSourceSha256: createHash('sha256').update(readFileSync(new URL('../src/game/wheel-drive.ts', import.meta.url))).digest('hex'),
  groundSourceSha256: createHash('sha256').update(readFileSync(new URL('../src/game/traction-ground.ts', import.meta.url))).digest('hex'),
  surfacesSourceSha256: createHash('sha256').update(readFileSync(new URL('../src/game/surfaces.ts', import.meta.url))).digest('hex'),
  noiseSourceSha256: createHash('sha256').update(readFileSync(new URL('../src/game/iceland-noise.ts', import.meta.url))).digest('hex'),
  timestep: 1 / 60, settleSteps: 100, driveSteps: 240, trials,
}, null, 2));
