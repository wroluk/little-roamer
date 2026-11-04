import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { Area, AreaRuntime } from './areas';
import { disposeScene } from './dispose';
import { BOUNDARY_COLLISION_GROUPS } from './collision-groups';
import { buildDemoScenery } from './location-demo-scenery';
import {
  DEMOS, DEMO_IDS, DEMO_HALF, demoSpawn, demoHeading, demoDrivingHeight, demoSurfaceAt, demoWaterHeight,
  demoTerrainGeometry, demoWaterGeometry, type DemoId,
  demoColor,
} from './location-demo-terrain';

export class LocationDemoRuntime implements AreaRuntime {
  private readonly group = new THREE.Group();
  private readonly colliders: RAPIER.Collider[] = [];
  private disposed = false;
  private triangles = 0;
  constructor(private readonly id: DemoId, private readonly scene: THREE.Scene, private readonly world: RAPIER.World) {
    try {
      const geometry = demoTerrainGeometry(id);
      const terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
      terrain.name = `${id} terrain`; terrain.receiveShadow = true; this.group.add(terrain);
      if (id === 'autumn-woods') {
        const waterMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, transparent: true, opacity: 0.88 });
        const water = new THREE.Mesh(demoWaterGeometry(geometry), waterMaterial);
        water.name = `${id} fitted water`; this.group.add(water);
        if (id === 'autumn-woods') {
          const source = new THREE.Mesh(demoWaterGeometry(geometry, 3.8, [55, -60, 96, -50]), waterMaterial);
          source.name = 'Copper Falls upstream'; this.group.add(source);
        }
      }
      const scenery = buildDemoScenery(id); this.group.add(scenery.group);
      for (const mesh of [terrain, ...scenery.solids]) {
        const vertices = Float32Array.from(mesh.geometry.getAttribute('position').array), source = mesh.geometry.index;
        const indices = source ? Uint32Array.from(source.array) : Uint32Array.from({ length: vertices.length / 3 }, (_, i) => i);
        this.colliders.push(world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.95)));
      }
      for (const side of [-1, 1]) for (const axis of ['x', 'z'] as const) {
        const alongX = axis === 'x', edge = DEMO_HALF - 6;
        this.colliders.push(world.createCollider(RAPIER.ColliderDesc.cuboid(alongX ? 0.5 : edge + 1, 70, alongX ? edge + 1 : 0.5)
          .setTranslation(alongX ? side * edge : 0, 25, alongX ? 0 : side * edge)
          .setCollisionGroups(BOUNDARY_COLLISION_GROUPS).setFriction(0)));
      }
      this.group.traverse(object => {
        if (object instanceof THREE.Mesh) this.triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
      });
      scene.add(this.group);
    } catch (error) { this.dispose(); throw error; }
  }
  update(_x: number, _z: number) {}
  async ensureReady(x: number, z: number) {
    if (!this.isCollisionReadyAt(x, z)) throw new Error(`${this.id}: destination is outside the loaded pilot`);
  }
  isCollisionReadyAt(x: number, z: number) {
    return !this.disposed && Math.abs(x) < DEMO_HALF && Math.abs(z) < DEMO_HALF;
  }
  async waitForIdle() { if (this.disposed) throw new Error(`${this.id}: pilot has been disposed`); }
  shrubBumpAt() { return 0; }
  get stats() {
    return { activeRender: this.disposed ? 0 : 1, activePhysics: this.disposed ? 0 : 1, queued: 0,
      triangles: this.triangles, colliderCount: this.colliders.length, lastActivationMs: 0 };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const collider of this.colliders) this.world.removeCollider(collider, true);
    this.colliders.length = 0; this.scene.remove(this.group);
    const owned = new THREE.Scene(); owned.add(this.group); disposeScene(owned);
  }
}

function demoArea(id: DemoId, i: number): Area {
  const demo = DEMOS[id];
  return {
    id, name: demo.name, label: `${String(i + 9).padStart(2, '0')} / COMPARISON PILOT`,
    tagline: demo.subtitle, description: demo.description, hint: demo.hint,
    welcomeEyebrow: `${demo.name.toUpperCase()} / SMALL PILOT`, welcomeTitle: demo.subtitle,
    readyMessage: `${demo.name} is ready. Try the loop in either direction.`,
    get spawn() { return demoSpawn(id); }, spawnHeading: demoHeading(id), half: DEMO_HALF, climbingPower: 1.45,
    ambientLight: '#e8eee0', ambientIntensity: 1.55, sunIntensity: 2.6,
    groundLight: demo.ground, sunlight: demo.sun, sky: demo.sky, fogNear: 155, fogFar: 600,
    surfaceHeight: (x, z) => demoDrivingHeight(id, x, z), surfaceAt: (x, z) => demoSurfaceAt(id, x, z),
    waterHeight: (x, z) => demoWaterHeight(id, x, z),
    particleColors: { dirt: (x, z) => demoColor(id, x, z).getStyle(), rock: (x, z) => demoColor(id, x, z).getStyle(),
      sand: (x, z) => demoColor(id, x, z).getStyle(), water: '#a0c4c4' },
    build: (scene, world) => new LocationDemoRuntime(id, scene, world),
  };
}
export const DEMO_AREAS = Object.fromEntries(DEMO_IDS.map((id, i) => [id, demoArea(id, i)])) as Record<DemoId, Area>;
