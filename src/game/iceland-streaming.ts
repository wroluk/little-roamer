import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { generateIcelandChunk, type IcelandChunk, ICELAND_MIN_CHUNK, ICELAND_MAX_CHUNK } from './iceland-terrain';
import { buildIcelandScenery } from './iceland-scenery';
import type { NorthernStreamingStats } from './northern-streaming';

export interface IcelandTransport { generate(cx: number, cz: number): Promise<IcelandChunk>; dispose(): void }
export class IcelandWorkerTransport implements IcelandTransport {
  private worker = new Worker(new URL('./iceland-worker.ts', import.meta.url), { type: 'module' });
  private pending = new Map<number, { resolve: (chunk: IcelandChunk) => void; reject: (error: Error) => void }>();
  private id = 0;
  private error?: Error;
  constructor() {
    this.worker.onmessage = (event: MessageEvent<{ id: number; chunk?: IcelandChunk; error?: string }>) => {
      const p = this.pending.get(event.data.id); this.pending.delete(event.data.id);
      if (event.data.chunk) p?.resolve(event.data.chunk); else p?.reject(new Error(event.data.error ?? 'Invalid Iceland worker response'));
    };
    this.worker.onerror = event => { event.preventDefault(); this.fail(new Error(event.message || 'Iceland terrain worker failed')); };
    this.worker.onmessageerror = () => this.fail(new Error('Iceland terrain response could not be read'));
  }
  private fail(error: Error) { this.error = error; for (const p of this.pending.values()) p.reject(error); this.pending.clear(); }
  generate(cx: number, cz: number): Promise<IcelandChunk> {
    if (this.error) return Promise.reject(this.error);
    return new Promise((resolve, reject) => { const id = ++this.id; this.pending.set(id, { resolve, reject }); this.worker.postMessage({ id, cx, cz }); });
  }
  dispose() { this.fail(new Error('Iceland worker disposed')); this.worker.terminate(); }
}
export class LocalIcelandTransport implements IcelandTransport {
  private disposed = false;
  async generate(cx: number, cz: number) { if (this.disposed) throw new Error('Iceland transport disposed'); return generateIcelandChunk(cx, cz); }
  dispose() { this.disposed = true; }
}
type Entry = { cx: number; cz: number; chunk?: IcelandChunk; mesh?: THREE.Mesh; collider?: RAPIER.Collider; error?: Error };
const key = (cx: number, cz: number) => `${cx},${cz}`;
function geometry(chunk: IcelandChunk) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(chunk.vertices, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(chunk.normals, 3));
  g.setAttribute('color', new THREE.BufferAttribute(chunk.colors, 3));
  g.setIndex(new THREE.BufferAttribute(chunk.indices, 1)); return g;
}

/** Independent Iceland generator, bounded 5×5 render / 3×3 physics rings. */
export class IcelandStreamingRuntime {
  private entries = new Map<string, Entry>();
  private physics = new Set<string>();
  private centre = '';
  private disposed = false;
  private lastActivationMs = 0;
  private material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  private horizon: THREE.Mesh;
  private horizonTiles = new Map<string, { start: number; count: number; visible: boolean }>();
  private horizonIndices: Uint32Array;
  private scenery: ReturnType<typeof buildIcelandScenery>;
  constructor(private scene: THREE.Scene, private world: RAPIER.World, private transport: IcelandTransport,
    private onError: (error: Error) => void = () => {}) {
    const vertices: number[] = [], colors: number[] = [], normals: number[] = [], indices: number[] = [];
    for (let cz = ICELAND_MIN_CHUNK; cz <= ICELAND_MAX_CHUNK; cz++) for (let cx = ICELAND_MIN_CHUNK; cx <= ICELAND_MAX_CHUNK; cx++) {
      const c = generateIcelandChunk(cx, cz, true), offset = vertices.length / 3;
      vertices.push(...c.vertices); colors.push(...c.colors); normals.push(...c.normals);
      this.horizonTiles.set(key(cx, cz), { start: indices.length, count: c.indices.length, visible: true });
      for (const i of c.indices) indices.push(i + offset);
    }
    this.horizonIndices = Uint32Array.from(indices);
    const g = geometry({ cx: 0, cz: 0, vertices: Float32Array.from(vertices), colors: Float32Array.from(colors), normals: Float32Array.from(normals), indices: this.horizonIndices.slice() });
    this.horizon = new THREE.Mesh(g, this.material); this.horizon.name = 'Iceland · distant coast'; scene.add(this.horizon);
    this.scenery = buildIcelandScenery(world); scene.add(this.scenery.group);
  }
  private refreshHorizon() {
    let changed = false;
    for (const [k, tile] of this.horizonTiles) {
      const visible = !this.entries.get(k)?.mesh;
      if (visible === tile.visible) continue;
      const index = this.horizon.geometry.index!;
      if (visible) index.array.set(this.horizonIndices.subarray(tile.start, tile.start + tile.count), tile.start);
      else index.array.fill(0, tile.start, tile.start + tile.count);
      tile.visible = visible; changed = true;
    }
    if (changed) this.horizon.geometry.index!.needsUpdate = true;
  }
  update(x: number, z: number) {
    if (this.disposed) return;
    const cx = Math.floor(x / 96), cz = Math.floor(z / 96);
    if (key(cx, cz) !== this.centre) {
      this.centre = key(cx, cz); this.physics.clear();
      const wanted = new Set<string>(), requests: Entry[] = [];
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const a = cx + dx, b = cz + dz;
        if (a < -9 || a > 8 || b < -9 || b > 8) continue;
        const k = key(a, b); wanted.add(k);
        if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) this.physics.add(k);
        if (!this.entries.has(k)) requests.push({ cx: a, cz: b });
      }
      for (const [k, e] of this.entries) if (!wanted.has(k)) { this.remove(e); this.entries.delete(k); }
      for (const [k, e] of this.entries) this.setPhysics(e, this.physics.has(k));
      requests.sort((a, b) => Math.hypot(a.cx - cx, a.cz - cz) - Math.hypot(b.cx - cx, b.cz - cz));
      for (const e of requests) {
        const k = key(e.cx, e.cz); this.entries.set(k, e);
        this.transport.generate(e.cx, e.cz).then(chunk => { if (!this.disposed && this.entries.get(k) === e) e.chunk = chunk; })
          .catch(error => { if (!this.disposed && this.entries.get(k) === e) { e.error = error instanceof Error ? error : new Error(String(error)); this.onError(e.error); } });
      }
      this.refreshHorizon();
    }
    const next = [...this.entries.values()].find(e => e.chunk && !e.mesh && !e.error);
    if (next) {
      const start = performance.now();
      try {
        next.mesh = new THREE.Mesh(geometry(next.chunk!), this.material); next.mesh.receiveShadow = true; this.scene.add(next.mesh);
        this.setPhysics(next, this.physics.has(key(next.cx, next.cz))); this.refreshHorizon();
      } catch (error) { next.error = error instanceof Error ? error : new Error(String(error)); this.onError(next.error); }
      this.lastActivationMs = performance.now() - start;
    }
  }
  private setPhysics(e: Entry, enabled: boolean) {
    if (enabled && e.mesh && e.chunk && !e.collider) e.collider = this.world.createCollider(RAPIER.ColliderDesc.trimesh(e.chunk.vertices, e.chunk.indices).setFriction(0.9));
    else if (!enabled && e.collider) { this.world.removeCollider(e.collider, true); e.collider = undefined; }
  }
  private remove(e: Entry) { this.setPhysics(e, false); if (e.mesh) { this.scene.remove(e.mesh); e.mesh.geometry.dispose(); } }
  async waitForIdle() {
    const deadline = Date.now() + 30_000;
    while (!this.disposed) {
      const error = [...this.entries.values()].find(e => e.error)?.error; if (error) throw error;
      if (!this.stats.queued) return;
      if (Date.now() > deadline) throw new Error('Iceland terrain loading timed out');
      const [cx, cz] = this.centre.split(',').map(Number); this.update(cx * 96 + 1, cz * 96 + 1);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    throw new Error('Iceland runtime disposed while loading');
  }
  async ensureReady(x: number, z: number) { this.update(x, z); await this.waitForIdle(); if (!this.isCollisionReadyAt(x, z)) throw new Error('Iceland destination has no collision'); }
  isCollisionReadyAt(x: number, z: number) { return !!this.entries.get(key(Math.floor(x / 96), Math.floor(z / 96)))?.collider; }
  shrubBumpAt() { return 0; }
  animate(dt: number, reducedMotion: boolean) { if (!this.disposed) this.scenery.animate(dt, reducedMotion); }
  get stats(): NorthernStreamingStats {
    const entries = [...this.entries.values()];
    return { activeRender: entries.filter(e => e.mesh).length, activePhysics: entries.filter(e => e.collider).length,
      queued: entries.filter(e => !e.mesh && !e.error).length, lastActivationMs: this.lastActivationMs,
      triangles: entries.reduce((n, e) => n + (e.mesh ? e.chunk!.indices.length / 3 : 0), [...this.horizonTiles.values()].reduce((n, t) => n + (t.visible ? t.count / 3 : 0), 0)),
      colliderCount: entries.filter(e => e.collider).length + this.scenery.colliderCount };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.transport.dispose();
    for (const e of this.entries.values()) this.remove(e); this.entries.clear();
    this.scene.remove(this.horizon); this.horizon.geometry.dispose(); this.material.dispose();
    this.scene.remove(this.scenery.group); this.scenery.dispose();
  }
}
