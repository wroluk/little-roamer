import * as THREE from 'three';
import type { Vehicle } from './vehicle';
import type { DriveInput } from './driving';
import type { SurfaceId } from './surfaces';

export const TRACK_CAPACITY = 256;
const WAKE_CAPACITY = 24;
const QUAD = [0, 1, 2, 2, 1, 3];
const TRACK_LIFE = 18;
const WAKE_LIFE = 0.75;
const ACCELERATION_WINDOW = 1.2;
type TrackSurface = Extract<SurfaceId, 'dirt' | 'mud' | 'ash' | 'sand'>;
type TrackMode = 'steady' | 'accelerating' | 'turning' | 'braking';
type Mark = { x: number; z: number; y: number; angle: number; length: number; life: number; surface: TrackSurface; emphasis: number; mode: TrackMode };
const TRACK_STYLES: Record<TrackSurface, { color: [number, number, number]; alpha: number; halfWidth: number }> = {
  dirt: { color: [0.24, 0.19, 0.13], alpha: 0.045, halfWidth: 0.125 },
  mud: { color: [0.16, 0.13, 0.1], alpha: 0.07, halfWidth: 0.14 },
  ash: { color: [0.02, 0.028, 0.032], alpha: 0.06, halfWidth: 0.13 },
  sand: { color: [0.42, 0.35, 0.24], alpha: 0.05, halfWidth: 0.13 },
};
const isTrackSurface = (id: SurfaceId): id is TrackSurface => id === 'dirt' || id === 'mud' || id === 'ash' || id === 'sand';

/** Bounded, transient ground marks. No physics changes or per-frame allocations. */
export class GroundEffects {
  private readonly tracks: Mark[] = Array.from({ length: TRACK_CAPACITY }, () => ({ x: 0, z: 0, y: 0, angle: 0, length: 0, life: 0, surface: 'dirt', emphasis: 0, mode: 'steady' }));
  private readonly wakes: Mark[] = Array.from({ length: WAKE_CAPACITY }, () => ({ x: 0, z: 0, y: 0, angle: 0, length: 0, life: 0, surface: 'dirt', emphasis: 0, mode: 'steady' }));
  private readonly last = Array.from({ length: 4 }, () => new THREE.Vector3());
  private readonly lastWater = Array.from({ length: 4 }, () => new THREE.Vector3());
  private readonly trackSpacing = [2.4, 3.1, 2.8, 3.6];
  private readonly connected = [false, false, false, false];
  private readonly wet = [false, false, false, false];
  private lastSpeed = 0;
  private hasSpeed = false;
  private lastDriveDirection = 0;
  private accelerationWindow = 0;
  private nextTrack = 0;
  private nextWake = 0;
  private readonly trackMesh = this.createMesh(TRACK_CAPACITY * 12);
  private readonly wakeMesh = this.createMesh(WAKE_CAPACITY * 6);

  constructor(private readonly scene: THREE.Scene, private readonly heightAt: (x: number, z: number) => number,
    private readonly waterAt: (x: number, z: number) => number | null) {
    // Water is transparent; draw the faint wake marks after its meshes.
    this.wakeMesh.renderOrder = 2;
    scene.add(this.trackMesh, this.wakeMesh);
  }

  get trackCount() { return this.tracks.reduce((n, mark) => n + Number(mark.life > 0), 0); }
  get rippleCount() { return this.wakes.reduce((n, mark) => n + Number(mark.life > 0), 0); }

  private createMesh(vertices: number) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vertices * 4), 4).setUsage(THREE.DynamicDrawUsage));
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    mesh.frustumCulled = false;
    mesh.visible = false;
    return mesh;
  }

  clear() {
    for (const mark of this.tracks) mark.life = 0;
    for (const mark of this.wakes) mark.life = 0;
    this.connected.fill(false); this.wet.fill(false);
    this.trackSpacing.splice(0, 4, 2.4, 3.1, 2.8, 3.6);
    this.hasSpeed = false;
    this.lastDriveDirection = 0;
    this.accelerationWindow = 0;
    this.trackMesh.visible = this.wakeMesh.visible = false;
  }

  update(dt: number, vehicle: Vehicle, input: DriveInput = { steer: 0, forward: false, reverse: false }, trackDensity = 1) {
    const speed = vehicle.speed;
    const acceleration = this.hasSpeed ? (speed - this.lastSpeed) / Math.max(dt, 1 / 120) : 0;
    this.lastSpeed = speed;
    this.hasSpeed = true;
    const driveDirection = Number(input.forward) - Number(input.reverse);
    this.accelerationWindow = driveDirection !== 0 && driveDirection !== this.lastDriveDirection
      ? ACCELERATION_WINDOW : Math.max(0, this.accelerationWindow - dt);
    this.lastDriveDirection = driveDirection;
    const braking = (input.forward && input.reverse)
      || (speed > 0.7 && input.reverse) || (speed < -0.7 && input.forward);
    const accelerating = this.accelerationWindow > 0
      && ((input.forward && acceleration > 0.5) || (input.reverse && acceleration < -0.5));
    const mode: TrackMode = braking ? 'braking' : Math.abs(input.steer) > 0.2 ? 'turning'
      : accelerating ? 'accelerating' : 'steady';
    const emphasis = mode === 'steady' ? 0 : 1;
    for (const mark of this.tracks) mark.life = Math.max(0, mark.life - dt);
    for (const mark of this.wakes) mark.life = Math.max(0, mark.life - dt);
    vehicle.terrainWheels.forEach((wheel, i) => {
      const p = wheel.position;
      const surface = wheel.surface.id;
      const trackable = trackDensity > 0 && wheel.grounded && isTrackSurface(surface);
      if (trackable) {
        const previous = this.last[i];
        const distance = Math.hypot(p.x - previous.x, p.z - previous.z);
        const spacing = (mode === 'steady' ? this.trackSpacing[i] : 0.65) / Math.max(trackDensity, 0.01);
        if (this.connected[i] && distance >= spacing && distance < 8) {
          const mark = this.tracks[this.nextTrack++ % TRACK_CAPACITY];
          const jitter = Math.sin(this.nextTrack * 9.37 + i * 2.7) * 0.045;
          const variation = 0.5 + 0.5 * Math.sin(this.nextTrack * 4.73 + i * 2.11);
          const angle = Math.atan2(p.x - previous.x, p.z - previous.z);
          Object.assign(mark, { x: p.x + Math.cos(angle) * jitter, z: p.z - Math.sin(angle) * jitter,
            angle, length: 0.45 + variation * 0.55 + emphasis * 0.42,
            life: TRACK_LIFE, surface: surface as TrackSurface, emphasis, mode });
          this.trackSpacing[i] = 2.2 + (0.5 + 0.5 * Math.sin(this.nextTrack * 5.37 + i * 1.7)) * 1.9;
          previous.copy(p);
          this.writeTrack(mark, (this.nextTrack - 1) % TRACK_CAPACITY);
        } else if (!this.connected[i] || distance >= 8) previous.copy(p);
      }
      this.connected[i] = trackable;
      const water = wheel.grounded && wheel.surface.id === 'water' ? this.waterAt(p.x, p.z) : null;
      const previousWater = this.lastWater[i];
      const travel = Math.hypot(p.x - previousWater.x, p.z - previousWater.z);
      const trailingWheel = vehicle.speed >= 0 ? i >= 2 : i < 2;
      if (water !== null && this.wet[i] && trailingWheel && Math.abs(vehicle.speed) > 0.8
        && travel >= 1.1 && travel < 5) {
        const mark = this.wakes[this.nextWake++ % WAKE_CAPACITY];
        Object.assign(mark, { x: p.x, z: p.z, y: water + 0.09,
          angle: Math.atan2(p.x - previousWater.x, p.z - previousWater.z),
          length: 1.45 + Math.min(0.4, Math.abs(vehicle.speed) * 0.07), life: WAKE_LIFE });
        this.writeWake(mark, (this.nextWake - 1) % WAKE_CAPACITY);
        previousWater.copy(p);
      } else if (!this.wet[i] || water === null || travel >= 5 || Math.abs(vehicle.speed) <= 0.8) {
        previousWater.copy(p);
      }
      this.wet[i] = water !== null;
    });
    const hasTracks = this.trackCount > 0;
    this.trackMesh.visible = hasTracks;
    if (hasTracks) {
      const colors = this.trackMesh.geometry.getAttribute('color') as THREE.BufferAttribute;
      this.tracks.forEach((mark, i) => {
        const style = TRACK_STYLES[mark.surface];
        const alpha = style.alpha * (mark.mode === 'steady' ? 0.4 : 2.15) * Math.min(1, mark.life / 3);
        for (let v = 0; v < 12; v++) {
          const section = Math.floor(v / 6) + (QUAD[v % 6] < 2 ? 0 : 1);
          colors.setW(i * 12 + v, alpha * (section === 1 ? 1 : section === 0 ? 0.3 : 0.25));
        }
      });
      colors.needsUpdate = true;
    }
    this.wakeMesh.visible = this.rippleCount > 0;
    if (this.wakeMesh.visible) this.fadeWakes();
  }

  private writeTrack(mark: Mark, slot: number) {
    const positions = this.trackMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.trackMesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sin = Math.sin(mark.angle), cos = Math.cos(mark.angle);
    const style = TRACK_STYLES[mark.surface];
    for (let v = 0; v < 12; v++) {
      const corner = QUAD[v % 6];
      const section = Math.floor(v / 6) + (corner < 2 ? 0 : 1);
      const across = (corner % 2 ? 1 : -1) * style.halfWidth * (section === 1 ? 1 : section === 0 ? 0.65 : 0.55);
      const along = (section - 1) * mark.length / 2;
      const x = mark.x + across * cos + along * sin, z = mark.z - across * sin + along * cos;
      positions.setXYZ(slot * 12 + v, x, this.heightAt(x, z) + 0.025, z);
      colors.setXYZW(slot * 12 + v, ...style.color, 0);
    }
    positions.needsUpdate = true;
  }

  private writeWake(mark: Mark, slot: number) {
    const positions = this.wakeMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.wakeMesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    const forwardX = Math.sin(mark.angle), forwardZ = Math.cos(mark.angle);
    const sideX = forwardZ, sideZ = -forwardX;
    for (let side = 0; side < 2; side++) {
      const sign = side ? 1 : -1;
      const startX = mark.x - forwardX * 0.12 + sideX * sign * 0.08;
      const startZ = mark.z - forwardZ * 0.12 + sideZ * sign * 0.08;
      const endX = mark.x - forwardX * mark.length + sideX * sign * 0.5;
      const endZ = mark.z - forwardZ * mark.length + sideZ * sign * 0.5;
      const vx = endX - startX, vz = endZ - startZ;
      const widthX = -vz / Math.hypot(vx, vz) * 0.033;
      const widthZ = vx / Math.hypot(vx, vz) * 0.033;
      const offset = slot * 6 + side * 3;
      positions.setXYZ(offset, startX, mark.y, startZ);
      positions.setXYZ(offset + 1, endX + widthX, mark.y, endZ + widthZ);
      positions.setXYZ(offset + 2, endX - widthX, mark.y, endZ - widthZ);
      for (let v = 0; v < 3; v++) colors.setXYZW(offset + v, 0.8, 0.94, 0.95, 0);
    }
    positions.needsUpdate = true;
  }

  private fadeWakes() {
    const colors = this.wakeMesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    this.wakes.forEach((mark, i) => {
      const alpha = 0.15 * Math.max(0, mark.life / WAKE_LIFE);
      for (let v = 0; v < 6; v++) colors.setW(i * 6 + v, v % 3 === 0 ? alpha : alpha * 0.55);
    });
    colors.needsUpdate = true;
  }

  dispose() {
    for (const mesh of [this.trackMesh, this.wakeMesh]) {
      this.scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose();
    }
  }
}
