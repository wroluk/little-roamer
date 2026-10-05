import * as THREE from 'three';
import type { SurfaceId } from './surfaces';
import type { Vehicle, WheelTerrainState } from './vehicle';

const PARTICLE_COUNT = 72;
const TRACK_COUNT = 256;
const TRACK_LIFETIME = 6;
type Particle = {
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  remaining: number;
  lifetime: number;
  size: number;
  gravity: number;
};
type Track = {
  readonly matrix: THREE.Matrix4;
  surface: 'sand' | 'mud';
  remaining: number;
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
  private readonly tracks: Track[] = Array.from({ length: TRACK_COUNT }, () => ({
    matrix: new THREE.Matrix4(), surface: 'sand', remaining: 0,
  }));
  private readonly trackMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.52, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, side: THREE.DoubleSide }),
    TRACK_COUNT,
  );
  private readonly lastTrackPosition = Array.from({ length: 4 }, () => new THREE.Vector3());
  private readonly hasLastTrack = [false, false, false, false];
  private readonly lastTrackSurface: ('sand' | 'mud')[] = ['sand', 'sand', 'sand', 'sand'];
  private readonly trackDirection = new THREE.Vector3();
  private readonly trackRight = new THREE.Vector3();
  private readonly trackUp = new THREE.Vector3();
  private readonly trackColor = new THREE.Color();
  private readonly sandTrack = new THREE.Color('#756247');
  private readonly sandGround = new THREE.Color('#bca77e');
  private readonly mudTrack = new THREE.Color('#332b22');
  private readonly mudGround = new THREE.Color('#665744');
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly colors = {
    dirt: new THREE.Color('#d7ae72'), grass: new THREE.Color('#91ad67'),
    ash: new THREE.Color('#3f4849'), lava: new THREE.Color('#242c2d'),
    moss: new THREE.Color('#7f995d'), ice: new THREE.Color('#c5edf2'),
    water: new THREE.Color('#bcebed'), snow: new THREE.Color('#e8f4ef'),
    mud: new THREE.Color('#665744'), rock: new THREE.Color('#7b8582'),
    sand: new THREE.Color('#bca77e'),
  } satisfies Record<SurfaceId, THREE.Color>;
  private readonly emitDebt = [0, 0, 0, 0];
  private next = 0;
  private nextTrack = 0;
  private randomState = 0x51f15e;
  private reduced = false;
  private activeCount = 0;
  private activeTrackCount = 0;

  constructor(private readonly scene: THREE.Scene, private readonly waterHeight: (x: number, z: number) => number | null) {
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < PARTICLE_COUNT; i++) this.mesh.setColorAt(i, this.color.set(0xffffff));
    if (this.mesh.instanceColor) this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.mesh);
    this.trackMesh.frustumCulled = false;
    this.trackMesh.visible = false;
    this.trackMesh.count = 0;
    this.trackMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.trackMesh);
  }

  get count() { return this.activeCount; }
  get capacity() { return PARTICLE_COUNT; }
  get trackCount() { return this.activeTrackCount; }
  get trackCapacity() { return TRACK_COUNT; }
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
    for (const track of this.tracks) track.remaining = 0;
    this.hasLastTrack.fill(false);
    this.activeTrackCount = 0;
    this.trackMesh.count = 0;
    this.trackMesh.visible = false;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.scene.remove(this.trackMesh);
    this.trackMesh.dispose();
    this.trackMesh.geometry.dispose();
    this.trackMesh.material.dispose();
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
    this.updateTracks(dt, vehicle);
  }

  private updateTracks(dt: number, vehicle: Vehicle) {
    if (this.reduced) return;
    const trailingAxle = vehicle.speed < -0.5 ? 0 : 2;
    for (let i = 0; i < 4; i++) {
      const wheel = vehicle.terrainWheels[i];
      const surface = wheel.surface.id;
      if (i < trailingAxle || i >= trailingAxle + 2 || !wheel.grounded
        || (surface !== 'sand' && surface !== 'mud') || Math.abs(vehicle.speed) < 1.5) {
        this.hasLastTrack[i] = false;
        continue;
      }
      const previous = this.lastTrackPosition[i];
      const dx = wheel.position.x - previous.x;
      const dz = wheel.position.z - previous.z;
      const distance = Math.hypot(dx, dz);
      if (this.hasLastTrack[i] && this.lastTrackSurface[i] === surface
        && distance >= 0.55 && distance < 2 && Math.abs(wheel.position.y - previous.y) < 1) {
        this.addTrack(previous, wheel.position, surface);
      }
      if (!this.hasLastTrack[i] || distance >= 0.55 || this.lastTrackSurface[i] !== surface) {
        previous.copy(wheel.position);
      }
      this.hasLastTrack[i] = true;
      this.lastTrackSurface[i] = surface;
    }

    let active = 0;
    for (const track of this.tracks) {
      track.remaining = Math.max(0, track.remaining - dt);
      if (track.remaining === 0) continue;
      this.trackMesh.setMatrixAt(active, track.matrix);
      this.trackColor.copy(track.surface === 'sand' ? this.sandTrack : this.mudTrack)
        .lerp(track.surface === 'sand' ? this.sandGround : this.mudGround,
          1 - track.remaining / TRACK_LIFETIME);
      this.trackMesh.setColorAt(active, this.trackColor);
      active++;
    }
    this.activeTrackCount = active;
    this.trackMesh.count = active;
    this.trackMesh.visible = active > 0;
    if (active > 0) {
      this.trackMesh.instanceMatrix.needsUpdate = true;
      if (this.trackMesh.instanceColor) this.trackMesh.instanceColor.needsUpdate = true;
    }
  }

  private addTrack(start: THREE.Vector3, end: THREE.Vector3, surface: 'sand' | 'mud') {
    const track = this.tracks[this.nextTrack++ % TRACK_COUNT];
    this.trackDirection.subVectors(end, start).normalize();
    this.trackRight.set(this.trackDirection.z, 0, -this.trackDirection.x).normalize();
    this.trackUp.crossVectors(this.trackDirection, this.trackRight).normalize();
    const length = Math.hypot(end.x - start.x, end.z - start.z);
    track.matrix.makeBasis(this.trackRight, this.trackUp, this.trackDirection)
      .scale(new THREE.Vector3(0.23, 1, length + 0.16))
      .setPosition((start.x + end.x) / 2, (start.y + end.y) / 2 + 0.045, (start.z + end.z) / 2);
    track.surface = surface;
    track.remaining = TRACK_LIFETIME;
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
