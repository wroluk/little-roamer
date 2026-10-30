import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { AreaRuntime } from './areas';
import { islandTerrainGeometry, islandWaterGeometry, ISLAND_HALF } from './island-terrain';
import { buildIslandScenery } from './island-scenery';
import { disposeScene } from './dispose';
import { BOUNDARY_COLLISION_GROUPS } from './collision-groups';

/** A finite pilot: all terrain stays resident, with no per-frame generation or pop-in. */
export class IslandRuntime implements AreaRuntime {
  private readonly group = new THREE.Group();
  private readonly colliders: RAPIER.Collider[] = [];
  private disposed = false;
  private triangles = 0;
  constructor(private readonly scene: THREE.Scene, private readonly world: RAPIER.World) {
    try {
      const terrainGeometry = islandTerrainGeometry();
      const terrain = new THREE.Mesh(terrainGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
      terrain.name = 'Island continuous terrain'; terrain.receiveShadow = true; this.group.add(terrain);
      const water = new THREE.Mesh(islandWaterGeometry(terrainGeometry),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.27, metalness: 0.05, transparent: true, opacity: 0.9 }));
      water.name = 'Island fitted sea'; this.group.add(water);
      const scenery = buildIslandScenery(); this.group.add(scenery.group);
      for (const mesh of [terrain, ...scenery.solids]) {
        const vertices = Float32Array.from(mesh.geometry.getAttribute('position').array);
        const source = mesh.geometry.getIndex();
        const indices = source ? Uint32Array.from(source.array) : Uint32Array.from({ length: vertices.length / 3 }, (_, i) => i);
        this.colliders.push(world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.95)));
      }
      // Guards are well offshore, behind deep-water recovery, and excluded from camera queries.
      for (const side of [-1, 1]) for (const axis of ['x', 'z'] as const) {
        const alongX = axis === 'x', edge = ISLAND_HALF - 6;
        this.colliders.push(world.createCollider(
          RAPIER.ColliderDesc.cuboid(alongX ? 0.5 : edge + 1, 60, alongX ? edge + 1 : 0.5)
            .setTranslation(alongX ? side * edge : 0, 20, alongX ? 0 : side * edge)
            .setCollisionGroups(BOUNDARY_COLLISION_GROUPS).setFriction(0),
        ));
      }
      this.group.traverse(object => {
        if (object instanceof THREE.Mesh) this.triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
      });
      scene.add(this.group);
    } catch (error) { this.dispose(); throw error; }
  }
  update(_x: number, _z: number) {}
  async ensureReady(x: number, z: number) {
    if (!this.isCollisionReadyAt(x, z)) throw new Error('Island destination is outside the loaded pilot');
  }
  isCollisionReadyAt(x: number, z: number) {
    return !this.disposed && Math.abs(x) < ISLAND_HALF && Math.abs(z) < ISLAND_HALF;
  }
  async waitForIdle() { if (this.disposed) throw new Error('Island pilot has been disposed'); }
  shrubBumpAt() { return 0; }
  get stats() {
    return { activeRender: this.disposed ? 0 : 1, activePhysics: this.disposed ? 0 : 1,
      queued: 0, triangles: this.triangles, colliderCount: this.colliders.length, lastActivationMs: 0 };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const collider of this.colliders) this.world.removeCollider(collider, true);
    this.colliders.length = 0; this.scene.remove(this.group);
    const owned = new THREE.Scene(); owned.add(this.group); disposeScene(owned);
  }
}
