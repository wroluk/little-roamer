import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { Area, AreaRuntime } from './areas';
import { disposeScene } from './dispose';
import { BOUNDARY_COLLISION_GROUPS } from './collision-groups';
import { buildTidalScenery } from './tidal-scenery';
import { demoPathSample, type DemoPoint } from './location-demo-terrain';
import {
  TIDAL_HALF, TIDAL_STARTS, TIDAL_ROUTE, SEABIRD_CLIMB, tidalGroundHeight, tidalSpawn, tidalSurfaceAt, tidalWaterHeight,
  tidalTerrainGeometry, tidalWaterGeometry, tidalColor, type TidalStart,
} from './tidal-terrain';

type ChallengeRide = { entry: TidalStart; exit: TidalStart; points: readonly DemoPoint[]; gateRadius?: number };
// Include the safe shore approaches, but not the final crossing obstacles.
const restingRadius = (start: TidalStart) =>
  start.id === 'harbor-cove' ? 55 : start.id === 'saltgrass-landing' ? 18 : 4.5;
const RIDES: readonly ChallengeRide[] = [
  { entry: TIDAL_STARTS[0], exit: TIDAL_STARTS[3], points: TIDAL_ROUTE.slice(0, 19), gateRadius: 7 },
  { entry: TIDAL_STARTS[3], exit: TIDAL_STARTS[4], points: TIDAL_ROUTE.slice(19) },
  { entry: TIDAL_STARTS[4], exit: TIDAL_STARTS[6], points: SEABIRD_CLIMB },
  { entry: TIDAL_STARTS[3], exit: TIDAL_STARTS[0], points: TIDAL_ROUTE.slice(2, 20).reverse(), gateRadius: 7 },
  { entry: TIDAL_STARTS[4], exit: TIDAL_STARTS[3], points: TIDAL_ROUTE.slice(19).reverse() },
  { entry: TIDAL_STARTS[6], exit: TIDAL_STARTS[4], points: [...SEABIRD_CLIMB].reverse() },
];

export class TidalTracksRuntime implements AreaRuntime {
  declare readonly shade?: AreaRuntime['shade'];
  declare readonly animate?: AreaRuntime['animate'];
  private readonly group = new THREE.Group();
  private readonly colliders: RAPIER.Collider[] = [];
  private disposed = false;
  private triangles = 0;
  private checkpoint: TidalStart = TIDAL_STARTS[0];
  private attempt: { ride: ChallengeRide; next: number } | null = null;
  constructor(private readonly scene: THREE.Scene, private readonly world: RAPIER.World) {
    try {
      const geometry = tidalTerrainGeometry();
      const terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }));
      terrain.name = 'Island Tracks continuous bed'; terrain.receiveShadow = true; this.group.add(terrain);
      const water = new THREE.Mesh(tidalWaterGeometry(geometry), new THREE.MeshStandardMaterial({
        vertexColors: true, transparent: true, roughness: 0.22, metalness: 0.03,
      }));
      water.name = 'Island Tracks fitted sea'; this.group.add(water);
      const scenery = buildTidalScenery(); this.group.add(scenery.group);
      for (const mesh of [terrain, ...scenery.solids]) {
        const vertices = Float32Array.from(mesh.geometry.getAttribute('position').array), source = mesh.geometry.index;
        const indices = source ? Uint32Array.from(source.array) : Uint32Array.from({ length: vertices.length / 3 }, (_, i) => i);
        this.colliders.push(world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.95)));
      }
      for (const side of [-1, 1]) for (const axis of ['x', 'z'] as const) {
        const alongX = axis === 'x', edge = TIDAL_HALF - 6;
        this.colliders.push(world.createCollider(RAPIER.ColliderDesc.cuboid(alongX ? 0.5 : edge + 1, 65, alongX ? edge + 1 : 0.5)
          .setTranslation(alongX ? side * edge : 0, 20, alongX ? 0 : side * edge)
          .setCollisionGroups(BOUNDARY_COLLISION_GROUPS).setFriction(0)));
      }
      this.group.traverse(object => {
        if (object instanceof THREE.Mesh) this.triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
      });
      scene.add(this.group);
    } catch (error) { this.dispose(); throw error; }
  }
  get recoveryStart() { return this.checkpoint; }
  beginAt(x: number, z: number) {
    const start = TIDAL_STARTS.find(start => Math.hypot(x - start.position.x, z - start.position.z) < 0.01);
    if (!start) throw new Error('Island Tracks inspection entry must be a named starting place');
    this.attempt = null;
    if (RIDES.some(ride => ride.entry.id === start.id)) {
      this.checkpoint = start;
      return;
    }
    // Explicit development entries may inspect a partial ride, but Reset still retries the whole challenge.
    const ride = RIDES.find(ride => ride.points.includes(start.position));
    if (!ride) throw new Error(`Island Tracks starting place has no challenge: ${start.id}`);
    this.checkpoint = ride.entry;
    this.attempt = { ride, next: ride.points.indexOf(start.position) + 1 };
  }
  restart() {
    this.attempt = null;
    return this.checkpoint;
  }
  visit(x: number, z: number) {
    const near = (point: { x: number; z: number }, radius = 4.5) => Math.hypot(x - point.x, z - point.z) < radius;
    const inRestArea = (start: TidalStart) => near(start.position, restingRadius(start)) && tidalGroundHeight(x, z) > 0.6;
    if (inRestArea(this.checkpoint)) {
      this.attempt = null;
      return;
    }
    if (!this.attempt) {
      for (const ride of RIDES) {
        if (ride.entry.id !== this.checkpoint.id) continue;
        // The safe shore approach is not a new crossing attempt until the car leaves it.
        const next = ride.points.findIndex((point, index) => index > 0
          && Math.hypot(point.x - ride.entry.position.x, point.z - ride.entry.position.z) >= restingRadius(ride.entry));
        if (next < 0) throw new Error(`Island Tracks challenge never leaves its departure: ${ride.entry.id}`);
        if (demoPathSample(ride.points.slice(next - 1, next + 1), x, z).distance >= (ride.gateRadius ?? 4.5)) continue;
        const [a, b] = ride.points;
        this.checkpoint = { ...ride.entry, heading: Math.atan2(-(b.x - a.x), -(b.z - a.z)) };
        this.attempt = { ride, next };
        break;
      }
      if (!this.attempt) return;
    }
    const attempt = this.attempt;
    while (attempt.next < attempt.ride.points.length && near(attempt.ride.points[attempt.next], attempt.ride.gateRadius)) attempt.next++;
    if (attempt.next === attempt.ride.points.length && inRestArea(attempt.ride.exit)) {
      this.checkpoint = attempt.ride.exit;
      this.attempt = null;
    }
  }
  update(_x: number, _z: number) {}
  async ensureReady(x: number, z: number) {
    if (!this.isCollisionReadyAt(x, z)) throw new Error('Island Tracks destination is outside the loaded crossing');
  }
  isCollisionReadyAt(x: number, z: number) { return !this.disposed && Math.abs(x) < TIDAL_HALF && Math.abs(z) < TIDAL_HALF; }
  async waitForIdle() { if (this.disposed) throw new Error('Island Tracks has been disposed'); }
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

export const TIDAL_AREA: Area = {
  id: 'tidal-islands', name: 'Island Tracks — Rock Passage', label: '14 / FRESH ISLAND TRACKS SLICE',
  tagline: 'The other shore is earned.',
  description: 'Two grassy islands, a broken basalt passage and three shallow sea channels. Beyond the 30 m lookout, Seabird Climb winds over rock steps and exposed ledges to a 67 m summit.',
  hint: 'Follow cairns across the shallow basalt passage to earn Saltgrass Landing on the other island. The inland approach leads to Windward Lookout, then Seabird Climb: rock steps, narrow ledges, Wind Notch and the high summit. Pale water is shallow; dark blue is deep. Reset restarts the current challenge, even after a roll; a completed crossing is kept.',
  welcomeEyebrow: 'ISLAND TRACKS / ROCK PASSAGE', welcomeTitle: 'Beyond the shallows.',
  readyMessage: 'Harbor Cove is ready. The far shore is a driving adventure, not a bridge.',
  get spawn() { return tidalSpawn(); }, spawnHeading: TIDAL_STARTS[0].heading, half: TIDAL_HALF, climbingPower: 1.45,
  ambientLight: '#e5eee4', groundLight: '#72806b', sunlight: '#ffefd3', sky: '#b7d3d9',
  fogNear: 220, fogFar: 850, ambientIntensity: 1.6, sunIntensity: 2.5, viewDistance: 1600,
  surfaceHeight: tidalGroundHeight, surfaceAt: tidalSurfaceAt, waterHeight: tidalWaterHeight,
  particleColors: { rock: (x, z) => tidalColor(x, z).getStyle(), dirt: '#b4ab86', sand: '#b6b396', water: '#a8d1c9' },
  build: (scene, world) => new TidalTracksRuntime(scene, world),
};
