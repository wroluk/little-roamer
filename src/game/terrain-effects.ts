import * as THREE from 'three';
import { GroundEffects } from './ground-effects';
import type { DriveInput } from './driving';
import type { SurfaceId } from './surfaces';
import { WHEEL_RADIUS, type Vehicle, type WheelTerrainState } from './vehicle';
import { MOON_GRAVITY } from './moon';

const PARTICLE_COUNT = 72;
const PARTICLE_RADIUS = 0.09;
const TYRE_RADIUS = WHEEL_RADIUS + 0.02;
const TYRE_HALF_WIDTH = 0.24;
const UP = new THREE.Vector3(0, 1, 0);
const WHEELSPIN_SPRAY: Partial<Record<SurfaceId, number>> = {
  sand: 1, ash: 0.8, 'mars-dust': 1, dirt: 0.35, regolith: 0.35, 'lunar-regolith': 1,
};
export type ParticleColors = Partial<Record<SurfaceId, string | ((x: number, z: number) => string)>>;
type Particle = {
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  remaining: number;
  lifetime: number;
  size: number;
  gravity: number;
  spray: number;
  clearance: number;
  radius: number;
};

export class TerrainEffects {
  private readonly particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
    position: new THREE.Vector3(), velocity: new THREE.Vector3(),
    remaining: 0, lifetime: 1, size: 0, gravity: 0, spray: 0, clearance: 0, radius: 0,
  }));
  private readonly mesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(PARTICLE_RADIUS, 0),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.82 }),
    PARTICLE_COUNT,
  );
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly tyres = Array.from({ length: 4 }, () => ({
    centre: new THREE.Vector3(), axis: new THREE.Vector3(), forward: new THREE.Vector3(),
    side: new THREE.Vector3(), normal: new THREE.Vector3(),
  }));
  private readonly tyreRotation = new THREE.Quaternion();
  private readonly relative = new THREE.Vector3();
  private readonly travel = new THREE.Vector3();
  private readonly previousParticlePosition = new THREE.Vector3();
  private readonly colors = {
    asphalt: new THREE.Color('#727775'),
    dirt: new THREE.Color('#d7ae72'), grass: new THREE.Color('#91ad67'),
    ash: new THREE.Color('#3f4849'), lava: new THREE.Color('#242c2d'),
    moss: new THREE.Color('#7f995d'), ice: new THREE.Color('#c5edf2'),
    water: new THREE.Color('#bcebed'), snow: new THREE.Color('#e8f4ef'),
    mud: new THREE.Color('#665744'), rock: new THREE.Color('#7b8582'),
    sand: new THREE.Color('#bca77e'), regolith: new THREE.Color('#bf7857'), 'mars-dust': new THREE.Color('#ae573d'), 'mars-glass': new THREE.Color('#596060'),
    'lunar-regolith': new THREE.Color('#a6a6a0'),
  } satisfies Record<SurfaceId, THREE.Color>;
  private readonly emitDebt = [0, 0, 0, 0];
  private next = 0;
  private randomState = 0x51f15e;
  private reduced = false;
  private activeCount = 0;

  readonly ground: GroundEffects;

  constructor(private readonly scene: THREE.Scene, private readonly waterHeight: (x: number, z: number) => number | null,
    heightAt: (x: number, z: number) => number = () => 0, private readonly particleColors: ParticleColors = {}) {
    for (const id of Object.keys(particleColors) as SurfaceId[]) {
      const color = particleColors[id];
      if (typeof color === 'string') this.colors[id].set(color);
    }
    this.ground = new GroundEffects(scene, heightAt, waterHeight);
    this.mesh.name = 'terrain-particles';
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < PARTICLE_COUNT; i++) this.mesh.setColorAt(i, this.color.set(0xffffff));
    if (this.mesh.instanceColor) this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.mesh);
  }

  get count() { return this.activeCount; }
  get capacity() { return PARTICLE_COUNT; }
  get usesInstanceColors() {
    return this.mesh.instanceColor !== null
      && !(this.mesh.material as THREE.MeshBasicMaterial).vertexColors;
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced;
    if (reduced) this.clear();
  }

  clear() {
    this.ground.clear();
    for (const particle of this.particles) particle.remaining = 0;
    this.emitDebt.fill(0);
    this.activeCount = 0;
    this.mesh.visible = false;
  }

  dispose() {
    this.ground.dispose();
    this.scene.remove(this.mesh);
    this.mesh.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }

  update(dt: number, vehicle: Vehicle, input: DriveInput = { steer: 0, forward: false, reverse: false }) {
    this.ground.update(dt, vehicle, input, this.reduced ? 0.65 : 1);
    for (let i = 0; i < this.tyres.length; i++) {
      const tyre = this.tyres[i], wheel = vehicle.wheels[i];
      wheel.getWorldPosition(tyre.centre);
      wheel.getWorldQuaternion(this.tyreRotation);
      tyre.axis.set(1, 0, 0).applyQuaternion(this.tyreRotation);
      tyre.normal.copy(vehicle.controller.wheelContactNormal(i) ?? UP);
      tyre.forward.crossVectors(tyre.normal, tyre.axis);
      if (tyre.forward.lengthSq() < 1e-8) tyre.forward.set(0, 0, -1).applyQuaternion(this.tyreRotation);
      tyre.forward.normalize();
      tyre.side.crossVectors(tyre.forward, tyre.normal).normalize();
    }
    for (let i = 0; i < vehicle.terrainWheels.length; i++) {
      const wheel = vehicle.terrainWheels[i];
      if (!wheel.grounded) {
        this.emitDebt[i] = 0;
        continue;
      }
      const waterY = wheel.surface.id === 'water'
        ? this.waterHeight(wheel.position.x, wheel.position.z)
        : null;
      const depthScale = waterY === null ? 1
        : 0.45 + Math.max(0, Math.min(1, (waterY - wheel.position.y) / 0.45)) * 0.8;
      const spray = this.wheelspinSpray(wheel);
      const rate = wheel.surface.particleRate * wheel.intensity * depthScale
        * (this.reduced ? 8 : 15) * (1 + spray * 4);
      this.emitDebt[i] = Math.min(2, this.emitDebt[i] + dt * rate);
      while (this.emitDebt[i] >= 1) {
        this.emit(wheel, vehicle, i);
        this.emitDebt[i]--;
      }
    }

    this.activeCount = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const newborn = particle.clearance > 0 && particle.remaining === particle.lifetime;
      particle.remaining = Math.max(0, particle.remaining - dt);
      if (particle.remaining > 0 && !newborn) {
        particle.velocity.y -= particle.gravity * dt;
        this.previousParticlePosition.copy(particle.position);
        particle.position.addScaledVector(particle.velocity, dt);
        if (particle.clearance > 0 && this.clipsTyre(this.previousParticlePosition, particle.position, particle.radius)) {
          particle.remaining = 0;
        }
      }
      if (particle.remaining > 0) {
        this.activeCount++;
        this.dummy.position.copy(particle.position);
        const age = particle.remaining / particle.lifetime;
        if (particle.clearance > 0) {
          particle.radius = Math.min(particle.clearance, Math.max(0, this.tyreClearance(particle.position) - 0.003));
        }
        const growth = particle.clearance > 0 ? particle.radius / particle.clearance : 1;
        const size = particle.size * Math.min(1, age * 4) * growth;
        this.dummy.rotation.set(0, particle.spray > 0 ? Math.atan2(particle.velocity.x, particle.velocity.z) : 0, 0);
        this.dummy.scale.set(size * (1 - particle.spray * 0.4), size * (1 - particle.spray * 0.55),
          size * (1 + particle.spray * 0.35));
      } else {
        this.dummy.scale.setScalar(0);
      }
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = this.activeCount > 0;
  }

  private emit(wheel: WheelTerrainState, vehicle: Vehicle, wheelIndex: number) {
    const particleIndex = this.next++ % this.particles.length;
    const particle = this.particles[particleIndex];
    const surface = wheel.surface;
    const lunar = surface.id === 'lunar-regolith';
    const granular = WHEELSPIN_SPRAY[surface.id] !== undefined;
    const tyre = this.tyres[wheelIndex];
    const forward = granular ? tyre.forward : vehicle.forward;
    const waterY = surface.id === 'water' ? this.waterHeight(wheel.position.x, wheel.position.z) : null;
    particle.position.set(wheel.position.x, waterY ?? wheel.position.y + 0.08, wheel.position.z);
    const lateral = wheelIndex % 2 ? 1 : -1;
    const jitter = this.random() - 0.5;
    const bodyVelocity = vehicle.body.linvel();
    const lateralX = -vehicle.forward.z * lateral;
    const lateralZ = vehicle.forward.x * lateral;
    const sideways = 0.45 + this.random() * 0.8;
    const rise = this.verticalVelocity(surface.id) + this.random() * 0.55;
    const spread = 0.45 + this.random() * 0.8;
    if (granular) {
      particle.position.copy(wheel.position).addScaledVector(tyre.normal, 0.08);
      particle.velocity.set(bodyVelocity.x * 0.12, 0, bodyVelocity.z * 0.12)
        .addScaledVector(tyre.side, lateral * sideways)
        .addScaledVector(tyre.normal, rise)
        .addScaledVector(forward, -jitter * spread * 0.35);
    } else {
      particle.velocity.set(bodyVelocity.x * 0.12 + lateralX * sideways, rise,
        bodyVelocity.z * 0.12 + lateralZ * spread + jitter * 0.35);
    }
    particle.velocity.addScaledVector(forward, -THREE.MathUtils.clamp(wheel.slipSpeed, -6, 6) * 0.18);
    particle.lifetime = lunar ? 1.1 : surface.id === 'ash' ? 0.72 : surface.id === 'water' ? 0.48 : 0.55;
    particle.remaining = particle.lifetime;
    particle.size = lunar ? 0.55 : surface.id === 'ash' ? 1.4 : surface.id === 'water' ? 0.78 : 0.9;
    particle.gravity = lunar ? Math.abs(MOON_GRAVITY) : surface.id === 'water' || surface.id === 'lava' ? 7 : 2.4;
    const spray = this.wheelspinSpray(wheel);
    particle.spray = spray;
    if (spray > 0) {
      // Real rim/contact slip throws a low granular fan, not a speed-based dust cloud.
      particle.velocity.addScaledVector(forward, -Math.sign(wheel.slipSpeed) * spray * (2 + this.random() * 2));
      particle.velocity.addScaledVector(tyre.normal, spray * (lunar ? 0.6 + this.random() * 0.35 : 1 + this.random() * 0.8));
      particle.size += spray * (lunar ? 0.35 + this.random() * 0.3 : 0.6 + this.random() * 0.6);
      particle.lifetime += spray * 0.2;
      particle.remaining = particle.lifetime;
      if (!lunar) particle.gravity += spray * 5.6;
    }
    particle.clearance = granular ? PARTICLE_RADIUS * particle.size * (1 + spray * 0.35) : 0;
    particle.radius = granular ? Math.min(0.012, particle.clearance) : 0;
    if (granular) {
      const direction = -(Math.abs(wheel.slipSpeed) > 0.7 ? Math.sign(wheel.slipSpeed) : Math.sign(vehicle.speed) || 1);
      const radius = TYRE_RADIUS + particle.radius + 0.003;
      this.relative.crossVectors(tyre.axis, forward).normalize();
      // Small grains begin against the lower tread and grow only into free space.
      particle.position.copy(tyre.centre)
        .addScaledVector(this.relative, -Math.cos(0.4) * radius)
        .addScaledVector(forward, direction * Math.sin(0.4) * radius);
      this.relative.subVectors(particle.position, tyre.centre);
      this.relative.addScaledVector(tyre.axis, -this.relative.dot(tyre.axis));
      const inward = particle.velocity.dot(this.relative);
      if (inward < 0) particle.velocity.addScaledVector(this.relative, -inward / this.relative.lengthSq());
    }
    const palette = this.particleColors[surface.id];
    if (typeof palette === 'function') this.color.set(palette(wheel.position.x, wheel.position.z));
    else this.color.copy(this.colors[surface.id]);
    if (spray > 0) this.color.multiplyScalar(0.65 + this.random() * 0.3);
    this.mesh.setColorAt(particleIndex, this.color);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  private tyreClearance(position: THREE.Vector3) {
    let clearance = Infinity;
    for (const tyre of this.tyres) {
      this.relative.subVectors(position, tyre.centre);
      const axial = this.relative.dot(tyre.axis);
      const radialGap = Math.sqrt(Math.max(0, this.relative.lengthSq() - axial * axial)) - TYRE_RADIUS;
      const axialGap = Math.abs(axial) - TYRE_HALF_WIDTH;
      clearance = Math.min(clearance, Math.max(radialGap, axialGap));
    }
    return clearance;
  }

  private clipsTyre(from: THREE.Vector3, to: THREE.Vector3, clearance: number) {
    this.travel.subVectors(to, from);
    for (const tyre of this.tyres) {
      this.relative.subVectors(from, tyre.centre);
      const axial = this.relative.dot(tyre.axis), axialTravel = this.travel.dot(tyre.axis);
      const halfWidth = TYRE_HALF_WIDTH + clearance;
      let first = 0, last = 1;
      if (Math.abs(axialTravel) < 1e-8) {
        if (Math.abs(axial) > halfWidth) continue;
      } else {
        const a = (-halfWidth - axial) / axialTravel, b = (halfWidth - axial) / axialTravel;
        first = Math.max(0, Math.min(a, b)); last = Math.min(1, Math.max(a, b));
        if (first > last) continue;
      }
      const radialTravelSq = Math.max(0, this.travel.lengthSq() - axialTravel * axialTravel);
      const dot = this.relative.dot(this.travel) - axial * axialTravel;
      const t = radialTravelSq > 1e-8 ? THREE.MathUtils.clamp(-dot / radialTravelSq, first, last) : first;
      const radialSq = this.relative.lengthSq() - axial * axial + 2 * t * dot + t * t * radialTravelSq;
      // Sweep a conservative tread envelope; do not let an old grain cross another tyre.
      if (radialSq < (TYRE_RADIUS + clearance) ** 2) return true;
    }
    return false;
  }

  private wheelspinSpray(wheel: WheelTerrainState) {
    return (WHEELSPIN_SPRAY[wheel.surface.id] ?? 0)
      * THREE.MathUtils.clamp((Math.abs(wheel.slipSpeed) - 0.7) / 3, 0, 1)
      * THREE.MathUtils.clamp((wheel.slip - 0.15) / 0.45, 0, 1);
  }

  private verticalVelocity(surface: SurfaceId) {
    if (surface === 'lunar-regolith') return 0.35;
    if (surface === 'water') return 1.7;
    if (surface === 'lava') return 1.1;
    if (surface === 'moss' || surface === 'grass') return 0.75;
    return 0.5;
  }

  private random() {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }
}
