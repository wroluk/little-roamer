import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { Vehicle } from './vehicle';
import { surfaceHeight } from './terrain';

export function horizontalDragDirection(terrainDistance: number | null, vehicleDistance: number) {
  return terrainDistance !== null && terrainDistance < vehicleDistance ? -1 : 1;
}

export class FollowCamera {
  private heading = 0;
  private orbitYaw = 0;
  private orbitPitch = 0;
  private readonly forward = new THREE.Vector3(0, 0, -1);
  private readonly orbitDirection = new THREE.Vector3(0, 0, -1);
  private readonly target = new THREE.Vector3();
  private readonly origin = new THREE.Vector3();
  private readonly wanted = new THREE.Vector3();
  private readonly smoothed = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly escapeDirection = new THREE.Vector3();
  private readonly escapePosition = new THREE.Vector3();
  private readonly shape = new RAPIER.Ball(0.4);
  private readonly identity = { x: 0, y: 0, z: 0, w: 1 };
  private initialized = false;
  private feedbackTime = 0;
  private avoidingCabin = false;

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    readonly world: RAPIER.World,
    readonly vehicle: Vehicle,
    private readonly groundHeight = surfaceHeight,
  ) {}

  reset() { this.initialized = false; this.feedbackTime = 0; this.avoidingCabin = false; }

  orbit(yaw: number, pitch: number) {
    this.orbitYaw = Math.atan2(
      Math.sin(this.orbitYaw + yaw),
      Math.cos(this.orbitYaw + yaw),
    );
    this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch + pitch, -0.32, 0.62);
  }

  update(dt: number, showcase = false, feedback = 0) {
    this.feedbackTime += dt;
    const car = this.vehicle.model;
    this.forward.set(0, 0, -1).applyQuaternion(car.quaternion);
    if (Math.hypot(this.forward.x, this.forward.z) > 0.2) {
      const heading = Math.atan2(-this.forward.x, -this.forward.z);
      const delta = Math.atan2(Math.sin(heading - this.heading), Math.cos(heading - this.heading));
      this.heading += delta * (this.initialized ? 1 - Math.exp(-dt * 4) : 1);
    }
    this.forward.set(-Math.sin(this.heading), 0, -Math.cos(this.heading));
    this.target.copy(car.position).addScaledVector(this.forward, 1.4);
    this.target.y += 0.8;
    const portrait = this.camera.aspect < 1;
    const horizontalDistance = portrait ? 13.5 : 11.5;
    const height = portrait ? 8.5 : 7.3;
    const boomLength = Math.hypot(horizontalDistance, height);
    const pitch = Math.atan2(height, horizontalDistance) + this.orbitPitch;
    this.orbitDirection.set(
      -Math.sin(this.heading + this.orbitYaw),
      0,
      -Math.cos(this.heading + this.orbitYaw),
    );
    this.wanted.copy(car.position)
      .addScaledVector(this.orbitDirection, -Math.cos(pitch) * boomLength);
    this.wanted.y += Math.sin(pitch) * boomLength;
    if (showcase) {
      this.wanted.copy(car.position).add(new THREE.Vector3(12, 8, 13));
      this.target.copy(car.position).add(new THREE.Vector3(-5.5, 0.5, -2));
      if (portrait) this.target.copy(car.position).add(new THREE.Vector3(0, 0, -4));
    }
    if (!showcase && feedback > 0) {
      this.wanted.y += Math.sin(this.feedbackTime * 43) * feedback;
      this.wanted.addScaledVector(this.forward, Math.sin(this.feedbackTime * 29 + 0.8) * feedback * 0.35);
    }
    this.wanted.y = Math.max(this.wanted.y, this.groundHeight(this.wanted.x, this.wanted.z) + 1);
    if (!this.initialized) this.smoothed.copy(this.wanted);
    else this.smoothed.lerp(this.wanted, 1 - Math.exp(-5 * dt));
    this.initialized = true;

    // Sweep the camera's near-plane volume, not just its center ray. Apply after
    // smoothing so interpolation cannot carry the camera through a solid object.
    this.origin.copy(car.position);
    this.origin.y += 0.45;
    this.direction.subVectors(this.smoothed, this.origin);
    const distanceToCamera = this.direction.length();
    this.direction.normalize();
    const hit = this.world.castShape(this.origin, this.identity, this.direction, this.shape,
      0.1, distanceToCamera, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    const allowedDistance = hit ? Math.max(0, hit.time_of_impact - 0.12) : distanceToCamera;
    this.camera.position.copy(this.origin).addScaledVector(this.direction, allowedDistance);
    // A shortened boom must not become an accidental view from inside the cabin.
    // Try higher views on the requested side, then around it; every candidate is swept.
    this.avoidingCabin = allowedDistance < (this.avoidingCabin ? 5 : 3.5);
    if (this.avoidingCabin) {
      const azimuth = Math.atan2(this.direction.x, this.direction.z);
      let bestDistance = allowedDistance;
      this.escapePosition.copy(this.camera.position);
      search: for (const yaw of [0, Math.PI / 3, -Math.PI / 3, Math.PI]) {
        for (const elevation of [1.05, 1.32, Math.PI / 2]) {
          this.escapeDirection.set(Math.sin(azimuth + yaw) * Math.cos(elevation), Math.sin(elevation),
            Math.cos(azimuth + yaw) * Math.cos(elevation));
          const escapeHit = this.world.castShape(this.origin, this.identity, this.escapeDirection, this.shape,
            0.1, 7, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
          const clear = escapeHit ? Math.max(0, escapeHit.time_of_impact - 0.12) : 7;
          if (clear > bestDistance) {
            bestDistance = clear; this.escapePosition.copy(this.origin).addScaledVector(this.escapeDirection, clear);
          }
          if (clear >= 4) break search;
        }
      }
      this.camera.position.copy(this.escapePosition);
      this.target.copy(car.position); this.target.y += 0.45;
    }
    this.camera.lookAt(this.target);
  }
}
