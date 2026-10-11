import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { marsSpawn, marsSurfaceAt, marsSurfaceHeight, type MarsPoint } from '../src/game/mars-terrain';
import { LocalMarsTransport, MarsStreamingRuntime } from '../src/game/mars-streaming';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';

export async function driveMarsPath(path: MarsPoint[], maxTicks = 14000, startSurfaceHeight?: number) {
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  const runtime = new MarsStreamingRuntime(scene, world, new LocalMarsTransport());
  let vehicleColliderCount = 0;
  try {
    await runtime.ensureReady(path[0].x, path[0].z); world.step();
    const spawn = marsSpawn(path[0]);
    if (startSurfaceHeight !== undefined) spawn.y = startSurfaceHeight + 1.25;
    const car = new Vehicle(scene, world, spawn, 1.45, marsSurfaceAt, () => null, undefined, 'mars-scout');
    vehicleColliderCount = world.colliders.len() - runtime.stats.colliderCount;
    car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0),
      Math.atan2(-(path[1].x - path[0].x), -(path[1].z - path[0].z))), true);
    let next = 1, minHeight = Infinity, peakColliders = 0, peakActivationMs = 0, ticks = 0;
    for (; ticks < maxTicks && next < path.length; ticks++) {
      const target = path[next], dx = target.x - car.position.x, dz = target.z - car.position.z;
      if (Math.hypot(dx, dz) < 3.5) { next++; continue; }
      runtime.update(car.position.x, car.position.z);
      if (runtime.stats.queued) await runtime.waitForIdle();
      const stats = runtime.stats;
      assert.ok(stats.activeRender <= 25 && stats.activePhysics <= 9);
      peakColliders = Math.max(peakColliders, stats.colliderCount);
      peakActivationMs = Math.max(peakActivationMs, stats.lastActivationMs);
      const f = new THREE.Vector3(0, 0, -1).applyQuaternion(car.body.rotation());
      const desired = Math.atan2(dx, -dz), heading = Math.atan2(f.x, -f.z);
      const error = Math.atan2(Math.sin(desired - heading), Math.cos(desired - heading));
      car.beforeStep({ steer: Math.max(-1, Math.min(1, error * 2)), forward: ticks > 90 && Math.abs(car.speed) < 6, reverse: false }, 1 / 60);
      world.step(); car.capture();
      minHeight = Math.min(minHeight, car.position.y - marsSurfaceHeight(car.position.x, car.position.z));
    }
    return { next, minHeight, position: { x: car.position.x, z: car.position.z }, contacts: car.contactCount(),
      peakColliders, peakActivationMs, simulatedSeconds: ticks / 60 };
  } finally {
    runtime.dispose();
    assert.equal(world.colliders.len(), vehicleColliderCount, 'only vehicle colliders remain after streaming disposal');
    world.free(); disposeScene(scene);
  }
}
