// The Northern Reach streaming runtime: turns the pure chunk generator in `northern-terrain.ts`
// into a live, worker-backed, bounded-resource render/collision world around a moving vehicle.
//
// Design summary (see the integration notes returned alongside this file for the full contract):
//  - Chunk generation always happens through a `NorthernChunkTransport`, never inline on the
//    main thread, so a real deployment can offload it to a Web Worker while tests can inject a
//    synchronous, delayed, or failing in-process transport.
//  - A single render fetch per chunk backs both its terrain mesh AND (when within the smaller
//    collider ring) its RAPIER trimesh collider, built from the exact same typed arrays, so
//    visuals and collision can never disagree.
//  - Props are drawn through one global `THREE.InstancedMesh` per prop type (pooled, with a
//    swap-remove free list), never one draw call per chunk.
//  - Activation (turning a received chunk into THREE/RAPIER resources) is budgeted per call to
//    `update()` so a burst of newly streamed chunks doesn't spike a single frame.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { layeredRockGeometry, rockRampGeometry, weatheredArchGeometry, rockColliderMesh } from './northern-rocks';
import {
  isChunkInBounds, NORTHERN_CHUNK_SIZE, NORTHERN_PROP_TYPES, type NorthernChunk,
} from './northern-terrain';
import {
  handleNorthernChunkRequest, type NorthernChunkErrorMessage, type NorthernChunkRequest,
  type NorthernWorkerMessage,
} from './northern-worker';

const SOLID_PROPS = new Set<string>([
  'roadsideRock', 'snowRock', 'fordPost', 'valleySign', 'forestSign', 'coastStack',
  'coastLog', 'coastSign', 'passSign', 'graniteTor', 'emberSign', 'basaltColumn',
  'marshSign', 'timberSign', 'shoalSign', 'basinSign', 'trailLog', 'shoalBoulder',
  'windSign', 'terraceSign', 'weatheredArch', 'layeredRock', 'rockRamp',
]);

// ---------------------------------------------------------------------------
// Transport protocol: how chunk requests reach a generator and results come back.
// ---------------------------------------------------------------------------

/** Whatever can turn a (cx, cz) request into an eventual result or error message. */
export interface NorthernChunkTransport {
  requestChunk(cx: number, cz: number, requestId: number): void;
  onMessage(handler: (message: NorthernWorkerMessage) => void): void;
  dispose(): void;
}

/** The minimal worker surface `BrowserChunkTransport` needs — deliberately narrower than the
 *  full DOM `Worker` interface so tests can inject a plain fake object without a real `Worker`
 *  global (Node test runners have none), while a real `Worker` instance also satisfies it. */
export type BrowserWorkerLike = {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<NorthernWorkerMessage>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
};

/**
 * Real deployment transport: one dedicated worker running `northern-worker.ts`, chunk buffers
 * transferred (not copied) in both directions.
 *
 * The worker is created lazily through an injectable factory so this class can also be
 * exercised (e.g. protocol shape, dispose-terminates-worker) against a fake worker-like object
 * in environments without a real `Worker` global, such as Node test runners.
 */
export class BrowserChunkTransport implements NorthernChunkTransport {
  private readonly worker: BrowserWorkerLike;
  private handler: ((message: NorthernWorkerMessage) => void) | undefined;
  private disposed = false;
  /** (cx, cz) for every request posted to the worker that has not yet received a result or
   *  error message back — needed so a worker-level crash can be resolved into explicit,
   *  per-chunk error messages instead of leaving those requests silently hanging forever. */
  private readonly pending = new Map<number, { cx: number; cz: number }>();
  /** Set once the worker has crashed; from then on the transport is permanently unusable and
   *  synthesizes an immediate error for every request instead of posting to a dead worker. */
  private fatalError: string | undefined;

  constructor(workerFactory?: () => BrowserWorkerLike) {
    const factory = workerFactory ?? (() => new Worker(new URL('./northern-worker.ts', import.meta.url), { type: 'module' }) as unknown as BrowserWorkerLike);
    this.worker = factory();
    this.worker.onmessage = event => {
      if (this.disposed) return;
      this.pending.delete(event.data.requestId);
      this.handler?.(event.data);
    };
    this.worker.onerror = event => {
      const message = event?.message || 'Northern Reach chunk worker crashed (unrecoverable worker-level error).';
      this.failAllPending(message);
    };
  }

  /** True once a worker-level crash has been observed; the transport will not recover. */
  get isFatallyErrored(): boolean {
    return this.fatalError !== undefined;
  }

  /** The message from the worker-level crash that made this transport permanently unusable,
   *  if any — lets a caller/runtime surface the cause beyond the per-chunk error text. */
  get fatalErrorMessage(): string | undefined {
    return this.fatalError;
  }

  requestChunk(cx: number, cz: number, requestId: number): void {
    if (this.disposed) return;
    if (this.fatalError !== undefined) {
      // The worker is dead: never post to it again, and never leave this request hanging —
      // resolve it as an explicit error on the same tick so callers (e.g. `waitForIdle`,
      // `ensureReady`) cannot stall waiting on a transport that can no longer respond.
      this.deliverError(requestId, cx, cz, this.fatalError);
      return;
    }
    this.pending.set(requestId, { cx, cz });
    const request: NorthernChunkRequest = { type: 'generate', requestId, cx, cz };
    this.worker.postMessage(request);
  }

  onMessage(handler: (message: NorthernWorkerMessage) => void): void {
    this.handler = handler;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pending.clear();
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.terminate();
  }

  /** Resolves every request still outstanding at the moment of a worker-level crash into an
   *  explicit per-chunk error message, so nothing is ever silently swallowed or left to hang. */
  private failAllPending(message: string): void {
    if (this.disposed || this.fatalError !== undefined) return;
    this.fatalError = message;
    const outstanding = Array.from(this.pending.entries());
    this.pending.clear();
    for (const [requestId, { cx, cz }] of outstanding) this.deliverError(requestId, cx, cz, message);
  }

  private deliverError(requestId: number, cx: number, cz: number, message: string): void {
    if (this.disposed) return;
    const errorMessage: NorthernChunkErrorMessage = { type: 'error', requestId, cx, cz, message };
    this.handler?.(errorMessage);
  }
}

export type InProcessChunkTransportOptions = {
  /** Delivery timing. Omit entirely for synchronous delivery (the result/error is handed to the
   *  runtime before `requestChunk` returns — deterministic, no awaiting needed). Provide a
   *  number (including 0) to defer delivery via `setTimeout`, simulating real worker latency. */
  delayMs?: number;
  /** Return true to simulate a generation failure for this chunk (delivered as an error
   *  message, exactly like a real worker-side exception, rather than throwing synchronously). */
  shouldFail?: (cx: number, cz: number) => boolean;
};

/**
 * Injectable in-process transport for tests: runs `handleNorthernChunkRequest` directly (the
 * same pure logic the real worker uses) without any actual worker thread, so unit tests can
 * exercise the streaming runtime deterministically with synchronous, delayed, or failing
 * delivery — selected purely via `InProcessChunkTransportOptions`.
 */
export class InProcessChunkTransport implements NorthernChunkTransport {
  private handler: ((message: NorthernWorkerMessage) => void) | undefined;
  private disposed = false;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  readonly requestedChunks: { cx: number; cz: number; requestId: number }[] = [];

  constructor(private readonly options: InProcessChunkTransportOptions = {}) {}

  requestChunk(cx: number, cz: number, requestId: number): void {
    if (this.disposed) return;
    this.requestedChunks.push({ cx, cz, requestId });
    const deliver = () => {
      if (this.disposed) return;
      const request: NorthernChunkRequest = { type: 'generate', requestId, cx, cz };
      const message = this.options.shouldFail?.(cx, cz)
        ? { type: 'error' as const, requestId, cx, cz, message: `Simulated failure generating chunk (${cx}, ${cz}).` }
        : handleNorthernChunkRequest(request);
      this.handler?.(message);
    };
    if (this.options.delayMs === undefined) {
      deliver();
      return;
    }
    const timer = setTimeout(() => { this.timers.delete(timer); deliver(); }, Math.max(0, this.options.delayMs));
    this.timers.add(timer);
  }

  onMessage(handler: (message: NorthernWorkerMessage) => void): void {
    this.handler = handler;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  dispose(): void {
    this.disposed = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
}

// ---------------------------------------------------------------------------
// Streaming runtime
// ---------------------------------------------------------------------------

/** 5x5 chunks kept rendered around the vehicle (clipped to the apron near the world edge). */
export const NORTHERN_RENDER_RING_RADIUS = 2;
/** 3x3 chunks kept solid around the vehicle; always a subset of the render ring. */
export const NORTHERN_COLLIDER_RING_RADIUS = 1;
/** Per prop-type instanced pool capacity; sized with headroom over the densest observed 5x5 window. */
export const DEFAULT_PROP_POOL_CAPACITY = 4096;
/** How many freshly generated chunks get turned into real GPU/physics resources per `update()` call. */
export const DEFAULT_ACTIVATION_BUDGET_PER_UPDATE = 1;

export type NorthernStreamingOptions = {
  renderRadius?: number;
  colliderRadius?: number;
  propPoolCapacity?: number;
  activationBudgetPerUpdate?: number;
  onChunkError?: (cx: number, cz: number, message: string) => void;
};

export type NorthernStreamingStats = {
  /** Chunks currently carrying a live render mesh. */
  activeRender: number;
  /** Chunks currently carrying a live RAPIER collider. */
  activePhysics: number;
  /** In-flight requests plus generated-but-not-yet-activated results. */
  queued: number;
  /** Total render+water triangles currently drawn. */
  triangles: number;
  /** Number of live terrain and solid-prop RAPIER colliders. */
  colliderCount: number;
  /** Wall-clock duration of the most recent single-chunk activation, in milliseconds. */
  lastActivationMs: number;
};

type ChunkRecordState = 'pending' | 'ready' | 'error';

type ChunkRecord = {
  cx: number;
  cz: number;
  state: ChunkRecordState;
  requestId: number | undefined;
  chunk: NorthernChunk | undefined;
  mesh: THREE.Mesh | undefined;
  waterMesh: THREE.Mesh | undefined;
  collider: RAPIER.Collider | undefined;
  propColliders: RAPIER.Collider[];
  hasCollider: boolean;
  propHandles: { type: number; handle: number }[];
  errorMessage: string | undefined;
};

function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

function worldToChunk(coordinate: number): number {
  return Math.floor(coordinate / NORTHERN_CHUNK_SIZE);
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * A single global `THREE.InstancedMesh` for one prop type, with a swap-remove free list so
 * chunks can allocate/release individual instance slots in any order without ever needing a
 * per-chunk mesh or leaving disposed instances visible.
 */
class InstancedPropPool {
  readonly mesh: THREE.InstancedMesh;
  private activeCount = 0;
  private readonly handleToSlot = new Map<number, number>();
  private readonly slotToHandle: number[] = [];
  private nextHandle = 1;
  private readonly matrixScratch = new THREE.Matrix4();
  private readonly colorScratch = new THREE.Color();

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, private readonly capacity: number) {
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (this.mesh.instanceColor) this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
  }

  /** Returns a stable handle for later `free()`, or undefined if the pool is exhausted. */
  allocate(matrix: THREE.Matrix4, color: THREE.Color): number | undefined {
    if (this.activeCount >= this.capacity) return undefined;
    const slot = this.activeCount++;
    this.mesh.setMatrixAt(slot, matrix);
    this.mesh.setColorAt(slot, color);
    this.slotToHandle[slot] = this.nextHandle;
    this.handleToSlot.set(this.nextHandle, slot);
    this.mesh.count = this.activeCount;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    return this.nextHandle++;
  }

  free(handle: number): void {
    const slot = this.handleToSlot.get(handle);
    if (slot === undefined) return;
    const lastSlot = this.activeCount - 1;
    if (slot !== lastSlot) {
      this.mesh.getMatrixAt(lastSlot, this.matrixScratch);
      this.mesh.setMatrixAt(slot, this.matrixScratch);
      if (this.mesh.instanceColor) {
        this.mesh.getColorAt(lastSlot, this.colorScratch);
        this.mesh.setColorAt(slot, this.colorScratch);
      }
      const movedHandle = this.slotToHandle[lastSlot];
      this.slotToHandle[slot] = movedHandle;
      this.handleToSlot.set(movedHandle, slot);
    }
    this.handleToSlot.delete(handle);
    this.slotToHandle.length = lastSlot;
    this.activeCount--;
    this.mesh.count = this.activeCount;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  get count(): number {
    return this.activeCount;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.dispose();
    (Array.isArray(this.mesh.material) ? this.mesh.material : [this.mesh.material]).forEach(material => {
      if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
      material.dispose();
    });
  }
}

type PropTypeName = (typeof NORTHERN_PROP_TYPES)[number];

function willowGeometry(): THREE.BufferGeometry {
  const parts = [
    new THREE.CylinderGeometry(0.12, 0.22, 2.8, 6).translate(0, 1.4, 0).toNonIndexed(),
    new THREE.IcosahedronGeometry(1, 1).scale(1.5, 1.3, 1.3).translate(0, 3, 0),
    new THREE.IcosahedronGeometry(1, 0).scale(0.8, 1.5, 0.9).translate(-1, 2.3, 0),
    new THREE.IcosahedronGeometry(1, 0).scale(0.9, 1.3, 0.8).translate(1, 2.5, 0.3),
  ];
  parts.forEach((part, i) => {
    const color = new THREE.Color(i === 0 ? '#796447' : i === 1 ? '#709653' : '#588548');
    const colors = new Float32Array(part.getAttribute('position').count * 3);
    for (let j = 0; j < colors.length; j += 3) color.toArray(colors, j);
    part.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  });
  const merged = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  if (!merged) throw new Error('Could not create river valley willows.');
  return merged;
}

function forestPineGeometry(): THREE.BufferGeometry {
  const parts = [
    new THREE.CylinderGeometry(0.22, 0.35, 3.2, 6).translate(0, 1.6, 0).toNonIndexed(),
    new THREE.ConeGeometry(2.3, 4.2, 7).translate(0, 4, 0).toNonIndexed(),
    new THREE.ConeGeometry(1.7, 3.6, 7).translate(0, 6, 0).toNonIndexed(),
    new THREE.ConeGeometry(1, 2.4, 7).translate(0, 7.5, 0).toNonIndexed(),
  ];
  parts.forEach((part, i) => {
    const color = new THREE.Color(['#796447', '#386b4c', '#4c8055', '#71935f'][i]);
    const colors = new Float32Array(part.getAttribute('position').count * 3);
    for (let j = 0; j < colors.length; j += 3) color.toArray(colors, j);
    part.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  });
  const merged = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  if (!merged) throw new Error('Could not create Pine Hollow trees.');
  return merged;
}

const PROP_GEOMETRY_FACTORY: Record<PropTypeName, () => THREE.BufferGeometry> = {
  windSign: () => new THREE.BoxGeometry(5.4, 2.2, 0.2).translate(0, 3.2, 0),
  terraceSign: () => new THREE.BoxGeometry(5.4, 2.2, 0.2).translate(0, 3.2, 0),
  weatheredArch: weatheredArchGeometry,
  layeredRock: layeredRockGeometry,
  rockRamp: rockRampGeometry,
  timberSign: () => new THREE.BoxGeometry(5.4, 2.2, 0.2).translate(0, 3.2, 0),
  shoalSign: () => new THREE.BoxGeometry(5.4, 2.2, 0.2).translate(0, 3.2, 0),
  basinSign: () => new THREE.BoxGeometry(5.4, 2.2, 0.2).translate(0, 3.2, 0),
  trailLog: () => new THREE.CylinderGeometry(0.12, 0.14, 6, 8).rotateZ(Math.PI / 2).translate(0, 0.12, 0),
  shoalBoulder: () => new THREE.SphereGeometry(1, 12, 6).scale(3.6, 0.8, 4.2).translate(0, -0.4, 0),
  marshSign: () => new THREE.BoxGeometry(5.4, 2.2, 0.2).translate(0, 3.2, 0),
  emberSign: () => new THREE.BoxGeometry(5.4, 2.2, 0.2).translate(0, 3.2, 0),
  basaltColumn: () => new THREE.CylinderGeometry(1.2, 1.4, 10, 6).translate(0, 4.8, 0),
  passSign: () => new THREE.BoxGeometry(5.4, 2.2, 0.2).translate(0, 3.2, 0),
  graniteTor: () => new THREE.DodecahedronGeometry(1, 0).scale(3.2, 7, 2.6).translate(0, 6, 0),
  coastStack: () => new THREE.CylinderGeometry(1.1, 2.2, 10, 5).translate(0, 5, 0),
  coastLog: () => new THREE.CylinderGeometry(0.17, 0.23, 3.8, 7).rotateZ(Math.PI / 2).translate(0, 0.24, 0),
  coastSign: () => new THREE.BoxGeometry(5.4, 2.2, 0.2).translate(0, 3.2, 0),
  forestPine: forestPineGeometry,
  forestSign: () => new THREE.BoxGeometry(5.4, 2.2, 0.2).translate(0, 3.2, 0),
  willow: willowGeometry,
  riverRipple: () => new THREE.BoxGeometry(2.2, 0.012, 0.055),
  valleySign: () => new THREE.BoxGeometry(5.4, 2.2, 0.2).translate(0, 3.2, 0),
  fordPost: () => new THREE.CylinderGeometry(0.14, 0.14, 2.6, 6).translate(0, 1.3, 0),
  tree: () => new THREE.ConeGeometry(0.6, 2.4, 6),
  roadsideRock: () => new THREE.DodecahedronGeometry(0.8, 0),
  snowRock: () => new THREE.DodecahedronGeometry(0.9, 0),
  reed: () => new THREE.CylinderGeometry(0.04, 0.08, 1.6, 5),
  driftwood: () => new THREE.CylinderGeometry(0.12, 0.16, 1.8, 6),
  shrub: () => new THREE.IcosahedronGeometry(0.5, 0),
  volcanicSpike: () => new THREE.ConeGeometry(0.4, 2.8, 5),
};

const PROP_BASE_COLOR: Record<PropTypeName, string> = {
  windSign: '#ffffff', terraceSign: '#ffffff', weatheredArch: '#b3a58d', layeredRock: '#b38b63', rockRamp: '#bba07b',
  timberSign: '#ffffff', shoalSign: '#ffffff', basinSign: '#ffffff', trailLog: '#a08460', shoalBoulder: '#939a90',
  marshSign: '#ffffff',
  emberSign: '#ffffff', basaltColumn: '#6f6964',
  passSign: '#ffffff', graniteTor: '#9aa7ad',
  coastStack: '#747d78', coastLog: '#a18c72', coastSign: '#ffffff',
  forestPine: '#ffffff', forestSign: '#ffffff',
  willow: '#ffffff', riverRipple: '#c4eee2', valleySign: '#ffffff', fordPost: '#efbd59', tree: '#3f6b3a', roadsideRock: '#7c8079', snowRock: '#d7e6e2', reed: '#9aa85a',
  driftwood: '#8a715a', shrub: '#5c8a4d', volcanicSpike: '#4a3a37',
};

const SIGN_TEXT: Partial<Record<PropTypeName, [string, string, string]>> = {
  windSign: ['WINDSTONE RIDGE', 'STONE ARCH · ROLLING CREST', 'NORTH LOOKOUT · STONEGATE'],
  terraceSign: ['OCHRE TERRACES', 'ROCK RAMP · STONE SHELVES', 'WINDING DESCENT · MOUNTAIN ROAD'],
  timberSign: ['TIMBER RUN', 'FALLEN TRUNKS · FOREST GULLY', 'HILLSIDE BYPASS · COAST ROAD'],
  shoalSign: ['BOULDER SHOALS', 'SHALLOW ROCK RUN · SEA STACKS', 'DRY BEACH · WILLOW MARSH'],
  basinSign: ['STONEGATE BASIN', 'HIDDEN PASS · STONE GARDEN', 'INNER RIM · NORTH CROWN'],
  marshSign: ['WILLOW MARSH', 'HUMMOCK LOOP · HERON LOOKOUT', 'AMBER POSTS · REED FORD'],
  valleySign: ['RIVER VALLEY', 'AMBER POSTS · SHALLOW FORDS', 'RIDGE LOOP · STONE CAIRNS'],
  forestSign: ['PINE HOLLOW', 'RAVINE · ROCK SADDLE', 'LAKE LOOKOUT · COAST ROAD'],
  coastSign: ['FJORD COAST', 'CLIFFTOP TRAIL · PEBBLE COVE', 'BEACH LOOP · SEA STACKS'],
  passSign: ['HIGH PASS', 'TWIN PEAKS · NORTH LOOKOUT', 'BLUE HOLLOW · ICE AHEAD'],
  emberSign: ['EMBER BASIN', 'CALDERA CIRCUIT · ASH DESCENT', 'BASALT COLUMNS · OVERLOOK'],
};

function propMaterial(type: PropTypeName): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: PROP_BASE_COLOR[type], roughness: 0.9, flatShading: true });
  if (type === 'willow' || type === 'forestPine') material.vertexColors = true;
  const sign = SIGN_TEXT[type];
  if (!sign || typeof document === 'undefined') return material;
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return material;
  ctx.fillStyle = '#294842'; ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#efbd59'; ctx.lineWidth = 8; ctx.strokeRect(12, 12, 488, 232);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff0ce';
  ctx.font = 'bold 48px sans-serif'; ctx.fillText(sign[0], 256, 95);
  ctx.font = '24px sans-serif'; ctx.fillText(sign[1], 256, 155, 465);
  ctx.fillText(sign[2], 256, 200, 465);
  material.map = new THREE.CanvasTexture(canvas); material.map.colorSpace = THREE.SRGBColorSpace;
  return material;
}

function buildWaterGeometry(chunk: NorthernChunk): THREE.BufferGeometry | undefined {
  if (!chunk.waterVertices || !chunk.waterIndices || !chunk.waterColors) return undefined;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(chunk.waterVertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(chunk.waterIndices, 1));
  geometry.setAttribute('color', new THREE.BufferAttribute(chunk.waterColors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function setPropTransform(target: THREE.Object3D, chunk: NorthernChunk, index: number): void {
  const type = chunk.props.type[index];
  const scale = chunk.props.scale[index];
  const rockLift = type === 1 || type === 2 ? scale * 0.2 : 0;
  target.position.set(chunk.props.x[index], chunk.props.y[index] + rockLift, chunk.props.z[index]);
  target.rotation.set(0, chunk.props.rotationY[index], 0);
  target.scale.set(scale, scale, scale);
  target.updateMatrix();
}

function matchingConvexHull(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4): RAPIER.ColliderDesc {
  const position = geometry.getAttribute('position');
  const vertices = new Float32Array(position.count * 3);
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i).applyMatrix4(matrix).toArray(vertices, i * 3);
  }
  const desc = RAPIER.ColliderDesc.convexHull(vertices);
  if (!desc) throw new Error('Northern Reach: could not build a boulder collider.');
  return desc;
}

/**
 * Live, worker-backed streaming manager for the Northern Reach world: a deterministic 5x5
 * render ring and 3x3 collider ring around a moving point, non-blocking per-frame updates,
 * budgeted activation, globally pooled/instanced props, and bounded resource disposal.
 */
export class NorthernStreamingRuntime {
  private readonly renderRadius: number;
  private readonly colliderRadius: number;
  private readonly activationBudgetPerUpdate: number;
  private readonly propPools: InstancedPropPool[];
  private readonly terrainMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true });
  private readonly waterMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.88,
  });

  private readonly chunks = new Map<string, ChunkRecord>();
  private readonly pendingRequests = new Map<number, string>();
  private readonly readyQueue: string[] = [];
  private desiredRender = new Set<string>();
  private desiredCollider = new Set<string>();
  private nextRequestId = 1;
  private generation = 0;
  private initialized = false;
  private centerCx = 0;
  private centerCz = 0;
  private disposed = false;
  private lastActivationMs = 0;
  private readonly onChunkError: ((cx: number, cz: number, message: string) => void) | undefined;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly world: RAPIER.World,
    private readonly transport: NorthernChunkTransport,
    options: NorthernStreamingOptions = {},
  ) {
    this.renderRadius = options.renderRadius ?? NORTHERN_RENDER_RING_RADIUS;
    this.colliderRadius = options.colliderRadius ?? NORTHERN_COLLIDER_RING_RADIUS;
    if (this.colliderRadius > this.renderRadius) {
      throw new Error('Northern Reach streaming: colliderRadius cannot exceed renderRadius (colliders must stay within the rendered ring).');
    }
    this.activationBudgetPerUpdate = options.activationBudgetPerUpdate ?? DEFAULT_ACTIVATION_BUDGET_PER_UPDATE;
    if (this.activationBudgetPerUpdate < 1) {
      throw new Error('Northern Reach streaming: activationBudgetPerUpdate must be at least 1.');
    }
    this.onChunkError = options.onChunkError;
    const capacity = options.propPoolCapacity ?? DEFAULT_PROP_POOL_CAPACITY;
    this.propPools = NORTHERN_PROP_TYPES.map(typeName => new InstancedPropPool(
      PROP_GEOMETRY_FACTORY[typeName](),
      propMaterial(typeName),
      capacity,
    ));
    for (const pool of this.propPools) {
      pool.mesh.name = `Northern Reach · pooled ${NORTHERN_PROP_TYPES[this.propPools.indexOf(pool)]} instances`;
      pool.mesh.castShadow = NORTHERN_PROP_TYPES[this.propPools.indexOf(pool)] === 'forestPine';
      this.scene.add(pool.mesh);
    }
    this.transport.onMessage(message => this.handleMessage(message));
  }

  // -- Public lifecycle -----------------------------------------------------

  /** Sets the initial focus point and issues the first ring of requests. Non-blocking. */
  initialize(x: number, z: number): void {
    this.update(x, z);
  }

  /**
   * Recomputes the desired render/collider rings around the given world position and issues
   * any new requests (nearest first), unloads anything no longer needed, and spends this call's
   * activation budget on already-generated chunks. Safe to call every frame: when the vehicle
   * has not crossed into a new chunk and nothing is freshly generated, this allocates nothing.
   */
  update(x: number, z: number): void {
    if (this.disposed) return;
    const cx = worldToChunk(x);
    const cz = worldToChunk(z);
    const centerChanged = !this.initialized || cx !== this.centerCx || cz !== this.centerCz;
    if (centerChanged) {
      this.centerCx = cx;
      this.centerCz = cz;
      this.generation++;
      this.initialized = true;
      this.refreshDesiredChunks(cx, cz);
    }
    this.drainActivation(this.activationBudgetPerUpdate);
  }

  /**
   * Updates around (x, z) and resolves once every chunk in both rings is fully settled.
   *
   * This is the call a spawn or teleport must await before trusting the world beneath the
   * vehicle: it never resolves success-shaped over a broken result. It rejects if any chunk in
   * the collider neighbourhood around (x, z) (the target chunk plus every chunk within
   * `colliderRadius`) reported a generation error, or if — after fully settling — the target
   * point still has no live collider under it for any other reason. Callers must treat a
   * rejection as "do not place anything here": retry elsewhere, or surface the failure.
   */
  async ensureReady(x: number, z: number): Promise<void> {
    this.update(x, z);
    await this.waitForIdle();
    if (this.disposed) {
      throw new Error(`Northern Reach streaming: ensureReady(${x}, ${z}) aborted — the runtime was disposed before it settled.`);
    }
    const cx = worldToChunk(x);
    const cz = worldToChunk(z);
    const failures: string[] = [];
    for (let dz = -this.colliderRadius; dz <= this.colliderRadius; dz++) {
      for (let dx = -this.colliderRadius; dx <= this.colliderRadius; dx++) {
        const ncx = cx + dx;
        const ncz = cz + dz;
        if (!isChunkInBounds(ncx, ncz)) continue;
        const message = this.getChunkError(ncx, ncz);
        if (message !== undefined) failures.push(`(${ncx}, ${ncz}): ${message}`);
      }
    }
    if (failures.length > 0) {
      throw new Error(`Northern Reach streaming: ensureReady(${x}, ${z}) failed — the collider neighbourhood has generation errors: ${failures.join('; ')}`);
    }
    if (!this.isCollisionReadyAt(x, z)) {
      throw new Error(`Northern Reach streaming: ensureReady(${x}, ${z}) failed — the target chunk (${cx}, ${cz}) has no collision after settling.`);
    }
  }

  /** True when the chunk under (x, z) currently has a live collider (safe to drive on now). */
  isCollisionReadyAt(x: number, z: number): boolean {
    const record = this.chunks.get(chunkKey(worldToChunk(x), worldToChunk(z)));
    return !!record && record.hasCollider;
  }

  shrubBumpAt(x: number, z: number): number {
    const record = this.chunks.get(chunkKey(worldToChunk(x), worldToChunk(z)));
    if (!record?.chunk || !record.hasCollider) return 0;
    let amount = 0;
    for (let i = 0; i < record.chunk.props.count; i++) {
      if (record.chunk.props.type[i] !== 5) continue;
      const radius = record.chunk.props.scale[i] * 1.5;
      const distance = Math.hypot(
        x - record.chunk.props.x[i],
        z - record.chunk.props.z[i],
      );
      if (distance < radius) amount = Math.max(amount, 1 - distance / radius);
    }
    return amount;
  }

  /** Resolves once there is nothing in flight and nothing waiting to be activated. */
  async waitForIdle(): Promise<void> {
    while (!this.disposed && (this.pendingRequests.size > 0 || this.readyQueue.length > 0)) {
      if (this.readyQueue.length > 0) {
        this.drainActivation(this.readyQueue.length);
      } else {
        await sleep(0);
      }
    }
  }

  get stats(): NorthernStreamingStats {
    let activeRender = 0;
    let activePhysics = 0;
    let triangles = 0;
    for (const record of this.chunks.values()) {
      if (record.mesh && record.chunk) {
        activeRender++;
        triangles += record.chunk.indices.length / 3;
        if (record.waterMesh && record.chunk.waterIndices) triangles += record.chunk.waterIndices.length / 3;
      }
      if (record.hasCollider) activePhysics++;
    }
    return {
      activeRender,
      activePhysics,
      queued: this.pendingRequests.size + this.readyQueue.length,
      triangles,
      colliderCount: Array.from(this.chunks.values())
        .reduce((count, record) => count + Number(record.hasCollider) + record.propColliders.length, 0),
      lastActivationMs: this.lastActivationMs,
    };
  }

  /** Returns the last reported generation error for a chunk, if any. */
  getChunkError(cx: number, cz: number): string | undefined {
    return this.chunks.get(chunkKey(cx, cz))?.errorMessage;
  }

  /** Fully tears down every render/physics/prop resource and terminates the transport/worker. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const [key, record] of Array.from(this.chunks.entries())) {
      this.unloadChunk(key, record);
    }
    this.chunks.clear();
    this.pendingRequests.clear();
    this.readyQueue.length = 0;
    for (const pool of this.propPools) {
      this.scene.remove(pool.mesh);
      pool.dispose();
    }
    this.terrainMaterial.dispose();
    this.waterMaterial.dispose();
    this.transport.dispose();
  }

  // -- Internals --------------------------------------------------------------

  private refreshDesiredChunks(cx: number, cz: number): void {
    const render = new Set<string>();
    const collider = new Set<string>();
    for (let dz = -this.renderRadius; dz <= this.renderRadius; dz++) {
      for (let dx = -this.renderRadius; dx <= this.renderRadius; dx++) {
        const ccx = cx + dx;
        const ccz = cz + dz;
        if (!isChunkInBounds(ccx, ccz)) continue; // Clipped to the apron near the world edge.
        const key = chunkKey(ccx, ccz);
        render.add(key);
        if (Math.abs(dx) <= this.colliderRadius && Math.abs(dz) <= this.colliderRadius) collider.add(key);
      }
    }
    this.desiredRender = render;
    this.desiredCollider = collider;

    const toUnload: [string, ChunkRecord][] = [];
    for (const [key, record] of this.chunks) {
      if (!render.has(key)) toUnload.push([key, record]);
      else if (record.hasCollider && !collider.has(key)) this.removeChunkCollider(record);
    }
    for (const [key, record] of toUnload) this.unloadChunk(key, record);

    // Reuse already-fetched geometry for any resident chunk that now falls back inside the
    // (smaller) collider ring, without a further worker round-trip.
    for (const key of collider) {
      const record = this.chunks.get(key);
      if (record && record.state === 'ready' && !record.hasCollider && record.chunk) this.attachCollider(record);
    }

    const needed: { cx: number; cz: number; dist2: number }[] = [];
    for (const key of render) {
      if (this.chunks.has(key)) continue;
      const [ccx, ccz] = key.split(',').map(Number);
      needed.push({ cx: ccx, cz: ccz, dist2: (ccx - cx) ** 2 + (ccz - cz) ** 2 });
    }
    // Priority by distance: closest-to-vehicle chunks are requested (and therefore tend to
    // arrive and activate) first, so the ground directly around the vehicle is never the last
    // thing ready.
    needed.sort((a, b) => a.dist2 - b.dist2);
    for (const { cx: ccx, cz: ccz } of needed) this.requestChunk(ccx, ccz);
  }

  private requestChunk(cx: number, cz: number): void {
    const key = chunkKey(cx, cz);
    const requestId = this.nextRequestId++;
    const record: ChunkRecord = {
      cx, cz, state: 'pending', requestId, chunk: undefined, mesh: undefined, waterMesh: undefined,
      collider: undefined, propColliders: [], hasCollider: false, propHandles: [], errorMessage: undefined,
    };
    this.chunks.set(key, record);
    this.pendingRequests.set(requestId, key);
    this.transport.requestChunk(cx, cz, requestId);
  }

  private handleMessage(message: NorthernWorkerMessage): void {
    const key = this.pendingRequests.get(message.requestId);
    this.pendingRequests.delete(message.requestId);
    if (this.disposed || key === undefined) return; // Unknown, late, or post-dispose: safely ignored.
    const record = this.chunks.get(key);
    // The chunk may have been unloaded (no longer desired) or already re-requested with a new
    // id since this request was issued; either way this particular response is stale.
    if (!record || record.requestId !== message.requestId) return;
    if (message.type === 'error') {
      record.state = 'error';
      record.requestId = undefined;
      record.errorMessage = message.message;
      this.onChunkError?.(record.cx, record.cz, message.message);
      return;
    }
    record.state = 'ready';
    record.requestId = undefined;
    record.chunk = message.chunk;
    this.readyQueue.push(key);
  }

  private drainActivation(budget: number): void {
    let remaining = budget;
    while (remaining > 0 && this.readyQueue.length > 0) {
      const key = this.readyQueue.shift()!;
      const record = this.chunks.get(key);
      if (!record || record.state !== 'ready' || record.mesh) continue; // Gone or already active: free, no budget spent.
      if (!this.desiredRender.has(key)) continue; // No longer wanted: safely discarded, still free.
      this.activateChunk(record);
      remaining--;
    }
  }

  private activateChunk(record: ChunkRecord): void {
    const chunk = record.chunk;
    if (!chunk) return;
    const started = now();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(chunk.vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(chunk.indices, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(chunk.colors, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, this.terrainMaterial);
    mesh.name = `Northern Reach chunk (${chunk.cx}, ${chunk.cz})`;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    record.mesh = mesh;

    const waterGeometry = buildWaterGeometry(chunk);
    if (waterGeometry) {
      const waterMesh = new THREE.Mesh(waterGeometry, this.waterMaterial);
      waterMesh.name = `Northern Reach water (${chunk.cx}, ${chunk.cz})`;
      this.scene.add(waterMesh);
      record.waterMesh = waterMesh;
    }

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const propHandles: { type: number; handle: number }[] = [];
    for (let i = 0; i < chunk.props.count; i++) {
      const type = chunk.props.type[i];
      const pool = this.propPools[type];
      if (!pool) continue;
      setPropTransform(dummy, chunk, i);
      color.set(PROP_BASE_COLOR[NORTHERN_PROP_TYPES[type]]);
      const handle = pool.allocate(dummy.matrix, color);
      if (handle !== undefined) propHandles.push({ type, handle });
    }
    record.propHandles = propHandles;

    if (this.desiredCollider.has(chunkKey(chunk.cx, chunk.cz))) this.attachCollider(record);

    this.lastActivationMs = now() - started;
  }

  private attachCollider(record: ChunkRecord): void {
    if (!record.chunk || record.hasCollider) return;
    const desc = RAPIER.ColliderDesc.trimesh(record.chunk.vertices, record.chunk.indices).setFriction(0.9);
    record.collider = this.world.createCollider(desc);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < record.chunk.props.count; i++) {
      const type = record.chunk.props.type[i];
      if (type === 11) {
        const scale = record.chunk.props.scale[i];
        record.propColliders.push(this.world.createCollider(RAPIER.ColliderDesc.cylinder(1.6 * scale, 0.3 * scale)
          .setTranslation(record.chunk.props.x[i], record.chunk.props.y[i] + 1.6 * scale, record.chunk.props.z[i]).setFriction(0.9)));
        continue;
      }
      if (type === 9) {
        const scale = record.chunk.props.scale[i];
        record.propColliders.push(this.world.createCollider(RAPIER.ColliderDesc.cylinder(1.4 * scale, 0.2 * scale)
          .setTranslation(record.chunk.props.x[i], record.chunk.props.y[i] + 1.4 * scale, record.chunk.props.z[i]).setFriction(0.9)));
        continue;
      }
      if (!SOLID_PROPS.has(NORTHERN_PROP_TYPES[type])) continue;
      const geometry = this.propPools[type].mesh.geometry;
      setPropTransform(dummy, record.chunk, i);
      if (['weatheredArch', 'layeredRock', 'rockRamp'].includes(NORTHERN_PROP_TYPES[type])) {
        const mesh = rockColliderMesh(geometry, dummy.matrix);
        record.propColliders.push(this.world.createCollider(
          RAPIER.ColliderDesc.trimesh(mesh.vertices, mesh.indices).setFriction(0.9)));
        continue;
      }
      record.propColliders.push(this.world.createCollider(
        matchingConvexHull(geometry, dummy.matrix)
          .setFriction(0.9)
          .setRestitution(0.16),
      ));
    }
    record.hasCollider = true;
  }

  private removeChunkCollider(record: ChunkRecord): void {
    if (record.collider) {
      this.world.removeCollider(record.collider, true);
      record.collider = undefined;
    }
    for (const collider of record.propColliders) this.world.removeCollider(collider, true);
    record.propColliders = [];
    record.hasCollider = false;
  }

  private unloadChunk(key: string, record: ChunkRecord): void {
    this.chunks.delete(key);
    const queuedIndex = this.readyQueue.indexOf(key);
    if (queuedIndex !== -1) this.readyQueue.splice(queuedIndex, 1);
    this.removeChunkCollider(record);
    if (record.mesh) {
      this.scene.remove(record.mesh);
      record.mesh.geometry.dispose();
      record.mesh = undefined;
    }
    if (record.waterMesh) {
      this.scene.remove(record.waterMesh);
      record.waterMesh.geometry.dispose();
      record.waterMesh = undefined;
    }
    for (const { type, handle } of record.propHandles) this.propPools[type]?.free(handle);
    record.propHandles = [];
    // A still-pending in-flight request is deliberately left alone: the worker call is cheap
    // and pure, and `handleMessage` will discard its result because this record is now gone.
  }
}
