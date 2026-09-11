import * as THREE from 'three';
import type { SurfaceId } from './surfaces';
import type { Vehicle, WheelTerrainState } from './vehicle';

const PARTICLE_COUNT = 72;
type Particle = {
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  remaining: number;
  lifetime: number;
  size: number;
  gravity: number;
};

export class TerrainEffects {
  private readonly particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
    position: new THREE.Vector3(), velocity: new THREE.Vector3(),
    remaining: 0, lifetime: 1, size: 0, gravity: 0,
  }));
  private readonly mesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.09, 0),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.82 }),
    PARTICLE_COUNT,
  );
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly colors = {
    dirt: new THREE.Color('#d7ae72'), grass: new THREE.Color('#91ad67'),
    ash: new THREE.Color('#3f4849'), lava: new THREE.Color('#242c2d'),
    moss: new THREE.Color('#7f995d'), ice: new THREE.Color('#c5edf2'),
    water: new THREE.Color('#bcebed'),
  } satisfies Record<SurfaceId, THREE.Color>;
  private readonly emitDebt = [0, 0, 0, 0];
  private next = 0;
  private randomState = 0x51f15e;
  private reduced = false;
  private activeCount = 0;

  constructor(private readonly scene: THREE.Scene, private readonly waterHeight: (x: number, z: number) => number | null) {
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
    for (const particle of this.particles) particle.remaining = 0;
    this.emitDebt.fill(0);
    this.activeCount = 0;
    this.mesh.visible = false;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }

  update(dt: number, vehicle: Vehicle) {
    if (!this.reduced) {
      for (let i = 0; i < vehicle.terrainWheels.length; i++) {
        const wheel = vehicle.terrainWheels[i];
        const waterY = wheel.surface.id === 'water'
          ? this.waterHeight(wheel.position.x, wheel.position.z)
          : null;
        const depthScale = waterY === null ? 1
          : 0.45 + Math.max(0, Math.min(1, (waterY - wheel.position.y) / 0.45)) * 0.8;
        const rate = wheel.surface.particleRate * wheel.intensity * depthScale * 15;
        this.emitDebt[i] = Math.min(2, this.emitDebt[i] + dt * rate);
        while (this.emitDebt[i] >= 1) {
          this.emit(wheel, vehicle, i);
          this.emitDebt[i]--;
        }
      }
    }

    this.activeCount = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      particle.remaining = Math.max(0, particle.remaining - dt);
      if (particle.remaining > 0) {
        this.activeCount++;
        particle.velocity.y -= particle.gravity * dt;
        particle.position.addScaledVector(particle.velocity, dt);
        this.dummy.position.copy(particle.position);
        const age = particle.remaining / particle.lifetime;
        this.dummy.scale.setScalar(particle.size * Math.min(1, age * 4));
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
    const waterY = surface.id === 'water' ? this.waterHeight(wheel.position.x, wheel.position.z) : null;
    particle.position.set(wheel.position.x, waterY ?? wheel.position.y + 0.08, wheel.position.z);
    const lateral = wheelIndex % 2 ? 1 : -1;
    const jitter = this.random() - 0.5;
    const bodyVelocity = vehicle.body.linvel();
    const lateralX = -vehicle.forward.z * lateral;
    const lateralZ = vehicle.forward.x * lateral;
    particle.velocity.set(
      bodyVelocity.x * 0.12 + lateralX * (0.45 + this.random() * 0.8),
      this.verticalVelocity(surface.id) + this.random() * 0.55,
      bodyVelocity.z * 0.12 + lateralZ * (0.45 + this.random() * 0.8) + jitter * 0.35,
    );
    particle.lifetime = surface.id === 'ash' ? 0.72 : surface.id === 'water' ? 0.48 : 0.55;
    particle.remaining = particle.lifetime;
    particle.size = surface.id === 'ash' ? 1.4 : surface.id === 'water' ? 0.78 : 0.9;
    particle.gravity = surface.id === 'water' || surface.id === 'lava' ? 7 : 2.4;
    this.mesh.setColorAt(particleIndex, this.colors[surface.id]);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  private verticalVelocity(surface: SurfaceId) {
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
