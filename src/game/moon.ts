import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { generateMoonChunk, MOON_CHUNK, MOON_HALF, type MoonChunk } from './moon-terrain';
import { buildMoonScenery, buildMoonSky } from './moon-scenery';
import { disposeScene } from './dispose';
import type { AreaRuntime } from './areas';
import type { VehicleHandling } from './vehicle';
import { moonHollowGeometry } from './moon-hollow';
import { StaticSunlight } from './static-sunlight';
import { BOUNDARY_COLLISION_GROUPS } from './collision-groups';

export const MOON_GRAVITY = -3;
export const MOON_DRIVE_HALF = MOON_HALF - 6;
export const MOON_SUN_OFFSET: [number, number, number] = [-38, 28, 15];
export const MOON_HANDLING: VehicleHandling = {
  acceleration: 0.38, speed: 0.46, steering: 0.78, suspension: 0.3, damping: 0.65,
};

/** The compact pilot is always rendered; only its 3×3 collision core moves. */
export class MoonRuntime implements AreaRuntime {
  private readonly group = new THREE.Group();
  private readonly chunks = new Map<string, MoonChunk>();
  private readonly colliders = new Map<string, RAPIER.Collider>();
  private readonly sceneryColliders: RAPIER.Collider[] = [];
  private disposed = false;
  private centre = '';
  private activationMs = 0;
  private triangleCount = 0;
  private sunlight?: StaticSunlight;
  constructor(private readonly scene: THREE.Scene, private readonly world: RAPIER.World) {
    this.group.name = 'Moon pilot';
    const geometries: THREE.BufferGeometry[] = [];
    try {
      for (let cz = -12; cz < 12; cz++) for (let cx = -12; cx < 12; cx++) {
        const fine = cx >= -4 && cx < 4 && cz >= -4 && cz < 4;
        const chunk = generateMoonChunk(cx, cz, !fine);
        if (fine) this.chunks.set(`${cx},${cz}`, chunk);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(chunk.vertices, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(chunk.normals, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(chunk.colors, 3));
        geometry.setIndex(new THREE.BufferAttribute(chunk.indices, 1));
        geometries.push(geometry); this.triangleCount += chunk.indices.length / 3;
      }
      const geometry = mergeGeometries(geometries);
      if (!geometry) throw new Error('Moon terrain batching failed');
      const terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
      terrain.name = 'Moon continuous landscape'; terrain.receiveShadow = true; this.group.add(terrain);
      const scenery = buildMoonScenery();
      this.group.add(scenery.group, buildMoonSky());
      const roof = moonHollowGeometry();
      try { this.sunlight = new StaticSunlight([roof], new THREE.Vector3(...MOON_SUN_OFFSET), 0.2); }
      finally { roof.dispose(); }
      this.shade(this.group);
      scenery.group.traverse(object => {
        if (!(object instanceof THREE.Mesh) || !['Moon solid rocks', 'Moon hollow roof', 'Moon discovery solids'].includes(object.name)) return;
        const positions = object.geometry.getAttribute('position').array;
        const vertices = Float32Array.from(positions);
        const indices = Uint32Array.from({ length: vertices.length / 3 }, (_, i) => i);
        this.sceneryColliders.push(this.world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.9)));
      });
      for (const solid of scenery.solids) this.sceneryColliders.push(this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(solid.hx, solid.hy, solid.hz).setTranslation(solid.x, solid.y, solid.z).setFriction(0.9),
      ));
      // Keep the rover on solid terrain without changing the visible mountain perimeter.
      for (const side of [-1, 1]) for (const axis of ['x', 'z'] as const) {
        const alongX = axis === 'x';
        this.sceneryColliders.push(this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(alongX ? 0.5 : MOON_DRIVE_HALF + 1, 128, alongX ? MOON_DRIVE_HALF + 1 : 0.5)
            .setTranslation(alongX ? side * (MOON_DRIVE_HALF + 0.5) : 0, 64,
              alongX ? 0 : side * (MOON_DRIVE_HALF + 0.5))
            .setFriction(0).setRestitution(0).setCollisionGroups(BOUNDARY_COLLISION_GROUPS),
        ));
      }
      this.scene.add(this.group);
    } catch (error) {
      this.dispose(); throw error;
    } finally {
      for (const geometry of geometries) geometry.dispose();
    }
  }
  shade(object: THREE.Object3D) { this.sunlight?.applyTo(object); }
  update(x: number, z: number) {
    if (this.disposed) return;
    const cx = Math.floor(x / MOON_CHUNK), cz = Math.floor(z / MOON_CHUNK), centre = `${cx},${cz}`;
    if (centre === this.centre) return;
    const start = performance.now(), desired = new Set<string>();
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const key = `${cx + dx},${cz + dz}`, chunk = this.chunks.get(key);
      if (!chunk) continue;
      desired.add(key);
      if (!this.colliders.has(key)) this.colliders.set(key, this.world.createCollider(
        RAPIER.ColliderDesc.trimesh(chunk.vertices, chunk.indices).setFriction(0.9),
      ));
    }
    for (const [key, collider] of this.colliders) if (!desired.has(key)) {
      this.world.removeCollider(collider, true); this.colliders.delete(key);
    }
    this.centre = centre; this.activationMs = performance.now() - start;
  }
  async ensureReady(x: number, z: number) {
    if (this.disposed) throw new Error('Moon pilot has been disposed');
    this.update(x, z);
    if (!this.isCollisionReadyAt(x, z)) throw new Error('Moon destination is outside the pilot');
  }
  async waitForIdle() { if (this.disposed) throw new Error('Moon pilot has been disposed'); }
  isCollisionReadyAt(x: number, z: number) { return this.colliders.has(`${Math.floor(x / MOON_CHUNK)},${Math.floor(z / MOON_CHUNK)}`); }
  shrubBumpAt() { return 0; }
  get stats() {
    return { activeRender: this.chunks.size, activePhysics: this.colliders.size, queued: 0,
      triangles: this.triangleCount, colliderCount: this.colliders.size + this.sceneryColliders.length,
      lastActivationMs: this.activationMs };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const collider of [...this.colliders.values(), ...this.sceneryColliders]) this.world.removeCollider(collider, true);
    this.colliders.clear(); this.sceneryColliders.length = 0; this.chunks.clear();
    this.scene.remove(this.group);
    this.sunlight?.dispose();
    const owned = new THREE.Scene(); owned.add(this.group); disposeScene(owned);
  }
}
