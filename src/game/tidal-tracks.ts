import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { Area, AreaRuntime } from './areas';
import { disposeScene } from './dispose';
import { BOUNDARY_COLLISION_GROUPS } from './collision-groups';
import { buildTidalScenery } from './tidal-scenery';
import { StaticSunlight } from './static-sunlight';
import { demoPathSample, type DemoPoint } from './location-demo-terrain';
import {
  TIDAL_HALF, TIDAL_BOUNDS, TIDAL_STARTS, TIDAL_ROUTE, SEABIRD_CLIMB, PEBBLE_DESCENT, HEATHER_CUT, CLIFF_WADE,
  tidalGroundHeight, tidalSpawn, tidalSurfaceAt, tidalWaterHeight,
  tidalTerrainGeometry, tidalWaterGeometry, tidalColor, type TidalStart,
} from './tidal-terrain';

type ChallengeRide = { entry: TidalStart; exit: TidalStart; points: readonly DemoPoint[]; gateRadius?: number };
export const TIDAL_SUN_OFFSET: [number, number, number] = [-25, 45, 20];
// Include the safe shore approaches, but not the final crossing obstacles.
const restingRadius = (start: TidalStart) =>
  start.id === 'harbor-cove' ? 55 : start.id === 'saltgrass-landing' ? 18
    : ['pebble-cove', 'heather-cut', 'west-overlook', 'west-beach', 'north-cove'].includes(start.id) ? 12 : 4.5;
const homeStarts = [TIDAL_STARTS[0], ...TIDAL_STARTS.slice(8)];
const RIDES: readonly ChallengeRide[] = [
  { entry: TIDAL_STARTS[0], exit: TIDAL_STARTS[3], points: TIDAL_ROUTE.slice(0, 19), gateRadius: 7 },
  { entry: TIDAL_STARTS[3], exit: TIDAL_STARTS[4], points: TIDAL_ROUTE.slice(19) },
  { entry: TIDAL_STARTS[4], exit: TIDAL_STARTS[6], points: SEABIRD_CLIMB },
  { entry: TIDAL_STARTS[3], exit: TIDAL_STARTS[0], points: TIDAL_ROUTE.slice(2, 20).reverse(), gateRadius: 7 },
  { entry: TIDAL_STARTS[4], exit: TIDAL_STARTS[3], points: TIDAL_ROUTE.slice(19).reverse() },
  { entry: TIDAL_STARTS[6], exit: TIDAL_STARTS[4], points: [...SEABIRD_CLIMB].reverse() },
  { entry: TIDAL_STARTS[4], exit: TIDAL_STARTS[7], points: PEBBLE_DESCENT },
  { entry: TIDAL_STARTS[7], exit: TIDAL_STARTS[4], points: [...PEBBLE_DESCENT].reverse() },
  { entry: TIDAL_STARTS[10], exit: TIDAL_STARTS[11], points: HEATHER_CUT },
  { entry: TIDAL_STARTS[11], exit: TIDAL_STARTS[10], points: [...HEATHER_CUT].reverse() },
  { entry: TIDAL_STARTS[12], exit: TIDAL_STARTS[13], points: CLIFF_WADE },
  { entry: TIDAL_STARTS[13], exit: TIDAL_STARTS[12], points: [...CLIFF_WADE].reverse() },
];

export class TidalTracksRuntime implements AreaRuntime {
  declare readonly animate?: AreaRuntime['animate'];
  private sunlight?: StaticSunlight;
  private readonly group = new THREE.Group();
  private readonly colliders: RAPIER.Collider[] = [];
  private disposed = false;
  private triangles = 0;
  private checkpoint: TidalStart = TIDAL_STARTS[0];
  private readonly arrivals = new Set<TidalStart['id']>();
  private attempt: { ride: ChallengeRide; next: number } | null = null;
  constructor(private readonly scene: THREE.Scene, private readonly world: RAPIER.World) {
    try {
      const geometry = tidalTerrainGeometry();
      const terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }));
      terrain.name = 'Island Tracks continuous bed'; terrain.castShadow = true; terrain.receiveShadow = true; this.group.add(terrain);
      const water = new THREE.Mesh(tidalWaterGeometry(geometry), new THREE.MeshStandardMaterial({
        vertexColors: true, transparent: true, roughness: 0.22, metalness: 0.03,
      }));
      water.name = 'Island Tracks fitted sea'; this.group.add(water);
      const scenery = buildTidalScenery(); this.group.add(scenery.group);
      const roof = scenery.solids.find(mesh => mesh.name === 'Pebble Cove basalt cave');
      if (!roof) throw new Error('Island Tracks cave sunlight requires its physical roof');
      roof.castShadow = false;
      this.sunlight = new StaticSunlight([roof.geometry], new THREE.Vector3(...TIDAL_SUN_OFFSET), 0.2);
      this.shade(this.group);
      for (const mesh of [terrain, ...scenery.solids]) {
        const vertices = Float32Array.from(mesh.geometry.getAttribute('position').array), source = mesh.geometry.index;
        const indices = source ? Uint32Array.from(source.array) : Uint32Array.from({ length: vertices.length / 3 }, (_, i) => i);
        this.colliders.push(world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.95)));
      }
      const [minX, minZ, maxX, maxZ] = TIDAL_BOUNDS;
      for (const axis of ['x', 'z'] as const) for (const edge of axis === 'x' ? [minX + 6, maxX - 6] : [minZ + 6, maxZ - 6]) {
        const alongX = axis === 'x';
        this.colliders.push(world.createCollider(RAPIER.ColliderDesc.cuboid(alongX ? 0.5 : (maxX - minX) / 2, 65,
          alongX ? (maxZ - minZ) / 2 : 0.5)
          .setTranslation(alongX ? edge : (minX + maxX) / 2, 20, alongX ? (minZ + maxZ) / 2 : edge)
          .setCollisionGroups(BOUNDARY_COLLISION_GROUPS).setFriction(0)));
      }
      this.group.traverse(object => {
        if (object instanceof THREE.Mesh) this.triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
      });
      scene.add(this.group);
    } catch (error) { this.dispose(); throw error; }
  }
  shade(object: THREE.Object3D) {
    if (!this.sunlight) throw new Error('Island Tracks static sunlight is not initialized');
    this.sunlight.applyTo(object);
  }
  get recoveryStart() { return this.checkpoint; }
  get completedArrivals(): ReadonlySet<TidalStart['id']> { return this.arrivals; }
  beginAt(x: number, z: number) {
    const start = TIDAL_STARTS.find(start => Math.hypot(x - start.position.x, z - start.position.z) < 0.01);
    if (!start) throw new Error('Island Tracks inspection entry must be a named starting place');
    this.attempt = null;
    if (homeStarts.some(home => home.id === start.id) || RIDES.some(ride => ride.entry.id === start.id)) {
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
    // Home-island cruising has safe destinations, not an ordered obstacle challenge.
    if (!this.attempt && homeStarts.some(start => start.id === this.checkpoint.id)) {
      const arrival = homeStarts.find(start => near(start.position, start.id === 'whales-back' ? 6 : 12));
      if (arrival) this.checkpoint = arrival;
    }
    if (inRestArea(this.checkpoint)) {
      this.attempt = null;
      return;
    }
    if (!this.attempt) {
      let candidate: { ride: ChallengeRide; next: number; distance: number } | null = null;
      for (const ride of RIDES) {
        if (ride.entry.id !== this.checkpoint.id) continue;
        // The safe shore approach is not a new crossing attempt until the car leaves it.
        const next = ride.points.findIndex((point, index) => index > 0
          && Math.hypot(point.x - ride.entry.position.x, point.z - ride.entry.position.z) >= restingRadius(ride.entry));
        if (next < 0) throw new Error(`Island Tracks challenge never leaves its departure: ${ride.entry.id}`);
        const distance = demoPathSample(ride.points.slice(next - 1, next + 1), x, z).distance;
        if (distance >= (ride.gateRadius ?? 4.5)) continue;
        if (!candidate || distance < candidate.distance) candidate = { ride, next, distance };
      }
      if (candidate) {
        const { ride, next } = candidate, [a, b] = ride.points;
        this.checkpoint = { ...ride.entry, heading: Math.atan2(-(b.x - a.x), -(b.z - a.z)) };
        this.attempt = { ride, next };
      }
      if (!this.attempt) return;
    }
    const attempt = this.attempt;
    while (attempt.next < attempt.ride.points.length) {
      const finalCoveArrival = attempt.ride.exit.id === 'pebble-cove' && attempt.next === attempt.ride.points.length - 1;
      if (!near(attempt.ride.points[attempt.next], finalCoveArrival ? restingRadius(attempt.ride.exit) : attempt.ride.gateRadius)) break;
      attempt.next++;
    }
    if (attempt.next === attempt.ride.points.length && inRestArea(attempt.ride.exit)) {
      this.arrivals.add(attempt.ride.exit.id);
      this.checkpoint = attempt.ride.exit;
      this.attempt = null;
    }
  }
  update(_x: number, _z: number) {}
  async ensureReady(x: number, z: number) {
    if (!this.isCollisionReadyAt(x, z)) throw new Error('Island Tracks destination is outside the loaded crossing');
  }
  isCollisionReadyAt(x: number, z: number) {
    return !this.disposed && x > TIDAL_BOUNDS[0] && x < TIDAL_BOUNDS[2] && z > TIDAL_BOUNDS[1] && z < TIDAL_BOUNDS[3];
  }
  async waitForIdle() { if (this.disposed) throw new Error('Island Tracks has been disposed'); }
  shrubBumpAt() { return 0; }
  get stats() {
    return { activeRender: this.disposed ? 0 : 1, activePhysics: this.disposed ? 0 : 1, queued: 0,
      triangles: this.triangles, colliderCount: this.colliders.length, lastActivationMs: 0 };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.sunlight?.dispose();
    for (const collider of this.colliders) this.world.removeCollider(collider, true);
    this.colliders.length = 0; this.scene.remove(this.group);
    const owned = new THREE.Scene(); owned.add(this.group); disposeScene(owned);
  }
}

export const TIDAL_AREA: Area = {
  id: 'island-tracks', name: 'Island Tracks', label: '13 / ISLAND TRACKS',
  tagline: 'Meadows, coves & crossings.',
  description: "Roam the broad grassy mainland, its farmstead and sheltered grove. Visit the headland's Western Beacon and sandy West Beach, play in the shallows or thread the optional cliff-foot water trail between outcrops. Heather Cut, Whale's Back and the rocky eastern island offer more demanding lines.",
  hint: "Explore the mainland first. Pale water is shallow; dark blue is deep.",
  welcomeEyebrow: 'ISLAND TRACKS / HARBOR COVE', welcomeTitle: 'Take the long way round.',
  readyMessage: 'Harbor Cove is ready. Follow the mainland loop, or explore the grassy hills at your own pace.',
  get spawn() { return tidalSpawn(); }, spawnHeading: TIDAL_STARTS[0].heading, half: TIDAL_HALF, climbingPower: 1.45,
  ambientLight: '#e5eee4', groundLight: '#72806b', sunlight: '#ffefd3', sky: '#b7d3d9',
  sunOffset: TIDAL_SUN_OFFSET,
  fogNear: 220, fogFar: 850, ambientIntensity: 1.6, sunIntensity: 2.5, viewDistance: 1600,
  surfaceHeight: tidalGroundHeight, surfaceAt: tidalSurfaceAt, waterHeight: tidalWaterHeight,
  particleColors: { rock: (x, z) => tidalColor(x, z).getStyle(), dirt: '#b4ab86', sand: '#b6b396', water: '#a8d1c9' },
  build: (scene, world) => new TidalTracksRuntime(scene, world),
};
