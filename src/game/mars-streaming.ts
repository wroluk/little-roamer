import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { generateMarsChunk, type MarsChunk } from './mars-terrain';
import { buildMarsDecor, attachMarsSolids, type MarsDecor } from './mars-landmarks';
import type { NorthernStreamingStats } from './northern-streaming';

export interface MarsTransport { generate(cx: number, cz: number): Promise<MarsChunk>; dispose(): void }
export class MarsWorkerTransport implements MarsTransport {
  private readonly worker = new Worker(new URL('./mars-worker.ts', import.meta.url), { type: 'module' });
  private pending = new Map<number, { resolve: (c: MarsChunk) => void; reject: (e: Error) => void }>();
  private id = 0;
  private failure?: Error;
  constructor() {
    this.worker.onmessage = (e: MessageEvent<{ id: number; chunk?: MarsChunk; error?: string }>) => {
      const p = this.pending.get(e.data.id); this.pending.delete(e.data.id);
      if (e.data.chunk) p?.resolve(e.data.chunk); else p?.reject(new Error(e.data.error ?? 'Invalid Mars worker response'));
    };
    this.worker.onerror = e => { e.preventDefault(); this.fail(new Error(e.message || 'Mars worker failed')); };
    this.worker.onmessageerror = () => this.fail(new Error('Mars worker response could not be read'));
  }
  private fail(error: Error) { this.failure = error; for (const p of this.pending.values()) p.reject(error); this.pending.clear(); }
  generate(cx: number, cz: number): Promise<MarsChunk> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => { const id = ++this.id; this.pending.set(id, { resolve, reject }); this.worker.postMessage({ id, cx, cz }); });
  }
  dispose() { this.fail(new Error('Mars worker disposed')); this.worker.terminate(); }
}
export class LocalMarsTransport implements MarsTransport {
  private disposed = false;
  async generate(cx: number, cz: number) { if (this.disposed) throw new Error('Mars transport disposed'); return generateMarsChunk(cx, cz); }
  dispose() { this.disposed = true; }
}
type Entry = { cx: number; cz: number; chunk?: MarsChunk; mesh?: THREE.Mesh; decor?: MarsDecor; colliders: RAPIER.Collider[]; error?: Error };
const key = (x: number, z: number) => `${x},${z}`;
const meshGeometry = (chunk: MarsChunk) => {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(chunk.vertices, 3));
  g.setAttribute('color', new THREE.BufferAttribute(chunk.colors, 3)); g.setIndex(new THREE.BufferAttribute(chunk.indices, 1)); g.computeVertexNormals(); return g;
};

/** Bounded 5×5 render / 3×3 collision rings; detailed terrain comes from a worker. */
export class MarsStreamingRuntime {
  private entries = new Map<string, Entry>();
  private centre = '';
  private physics = new Set<string>();
  private disposed = false;
  private lastActivationMs = 0;
  private material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
  private horizon: THREE.Mesh;
  private horizonIndices = new Map<string, number[]>();
  constructor(private scene: THREE.Scene, private world: RAPIER.World, private transport: MarsTransport,
    private onError: (error: Error) => void = () => {}) {
    // A coarse, non-colliding horizon keeps the Great Ring visible. Detailed active chunks
    // replace its corresponding tiles, so no coincident surfaces or distant physics load.
    const vertices: number[] = [], colors: number[] = [];
    for (let cz = -5; cz <= 4; cz++) for (let cx = -5; cx <= 4; cx++) {
      const c = generateMarsChunk(cx, cz, 4), offset = vertices.length / 3;
      vertices.push(...c.vertices); colors.push(...c.colors);
      this.horizonIndices.set(key(cx, cz), Array.from(c.indices, i => i + offset));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.horizon = new THREE.Mesh(g, this.material); this.horizon.name = 'Mars · distant basin'; this.scene.add(this.horizon);
    this.refreshHorizon();
  }
  private refreshHorizon() {
    const indices: number[] = [];
    for (const [k, values] of this.horizonIndices) if (!this.entries.get(k)?.mesh) indices.push(...values);
    this.horizon.geometry.setIndex(indices); this.horizon.geometry.computeVertexNormals();
  }
  update(x: number, z: number) {
    if (this.disposed) return;
    const cx = Math.floor(x / 96), cz = Math.floor(z / 96);
    if (key(cx, cz) !== this.centre) {
      this.centre = key(cx, cz); this.physics.clear();
      const desired = new Set<string>(), needed: { cx: number; cz: number; distance: number }[] = [];
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const a = cx + dx, b = cz + dz;
        if (a < -5 || a > 4 || b < -5 || b > 4) continue;
        const k = key(a, b); desired.add(k);
        if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) this.physics.add(k);
        if (!this.entries.has(k)) needed.push({ cx: a, cz: b, distance: dx * dx + dz * dz });
      }
      for (const [k, e] of this.entries) if (!desired.has(k)) { this.remove(e); this.entries.delete(k); }
      for (const [k, e] of this.entries) this.setPhysics(e, this.physics.has(k));
      for (const p of needed.sort((a, b) => a.distance - b.distance)) {
        const e: Entry = { cx: p.cx, cz: p.cz, colliders: [] }; const k = key(p.cx, p.cz); this.entries.set(k, e);
        this.transport.generate(p.cx, p.cz).then(c => { if (!this.disposed && this.entries.get(k) === e) e.chunk = c; })
          .catch(error => { if (!this.disposed && this.entries.get(k) === e) { e.error = error instanceof Error ? error : new Error(String(error)); this.onError(e.error); } });
      }
      this.refreshHorizon();
    }
    // Activate at most one chunk per frame. Requests nearest the car are sent first.
    const next = [...this.entries.values()].find(e => e.chunk && !e.mesh && !e.error);
    if (next) {
      const start = performance.now();
      try {
        next.mesh = new THREE.Mesh(meshGeometry(next.chunk!), this.material); next.mesh.receiveShadow = true; this.scene.add(next.mesh);
        next.decor = buildMarsDecor(next.cx, next.cz); this.scene.add(next.decor.group);
        this.setPhysics(next, this.physics.has(key(next.cx, next.cz))); this.refreshHorizon();
      } catch (error) { next.error = error instanceof Error ? error : new Error(String(error)); this.onError(next.error); }
      this.lastActivationMs = performance.now() - start;
    }
  }
  private setPhysics(e: Entry, enabled: boolean) {
    if (enabled && e.chunk && e.mesh && e.decor && !e.colliders.length) {
      e.colliders.push(this.world.createCollider(RAPIER.ColliderDesc.trimesh(e.chunk.vertices, e.chunk.indices).setFriction(0.9)), ...attachMarsSolids(this.world, e.decor.solids));
    } else if (!enabled) { for (const c of e.colliders) this.world.removeCollider(c, true); e.colliders = []; }
  }
  private remove(e: Entry) {
    this.setPhysics(e, false);
    if (e.mesh) { this.scene.remove(e.mesh); e.mesh.geometry.dispose(); }
    if (e.decor) { this.scene.remove(e.decor.group); e.decor.dispose(); }
  }
  async waitForIdle() {
    const deadline = Date.now() + 30_000;
    while (!this.disposed) {
      const error = [...this.entries.values()].find(e => e.error)?.error; if (error) throw error;
      if (!this.stats.queued) return;
      if (Date.now() > deadline) throw new Error('Mars terrain loading timed out');
      const [cx, cz] = this.centre.split(',').map(Number); this.update(cx * 96 + 1, cz * 96 + 1);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    throw new Error('Mars runtime disposed while loading');
  }
  async ensureReady(x: number, z: number) {
    this.update(x, z); await this.waitForIdle();
    if (!this.isCollisionReadyAt(x, z)) throw new Error('Mars destination has no terrain collision');
  }
  isCollisionReadyAt(x: number, z: number) { return !!this.entries.get(key(Math.floor(x / 96), Math.floor(z / 96)))?.colliders.length; }
  shrubBumpAt() { return 0; }
  get stats(): NorthernStreamingStats {
    const entries = [...this.entries.values()];
    return { activeRender: entries.filter(e => e.mesh).length, activePhysics: entries.filter(e => e.colliders.length).length,
      queued: entries.filter(e => !e.mesh && !e.error).length,
      triangles: entries.reduce((n, e) => n + (e.mesh ? e.chunk!.indices.length / 3 : 0), (this.horizon.geometry.index?.count ?? 0) / 3),
      colliderCount: entries.reduce((n, e) => n + e.colliders.length, 0), lastActivationMs: this.lastActivationMs };
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.transport.dispose();
    for (const e of this.entries.values()) this.remove(e); this.entries.clear();
    this.scene.remove(this.horizon); this.horizon.geometry.dispose(); this.material.dispose();
  }
}
