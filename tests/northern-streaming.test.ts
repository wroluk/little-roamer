import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  generateNorthernChunk, isChunkInBounds, NORTHERN_CHUNK_SIZE, sampledHeightAt,
} from '../src/game/northern-terrain';
import {
  BrowserChunkTransport, DEFAULT_ACTIVATION_BUDGET_PER_UPDATE, InProcessChunkTransport,
  NorthernStreamingRuntime, type BrowserWorkerLike, type NorthernStreamingOptions,
} from '../src/game/northern-streaming';

before(async () => { await RAPIER.init(); });

function harness(options: NorthernStreamingOptions = {}, transport: InProcessChunkTransport = new InProcessChunkTransport()) {
  const scene = new THREE.Scene();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const runtime = new NorthernStreamingRuntime(scene, world, transport, options);
  return { scene, world, transport, runtime };
}

function colliderCount(world: RAPIER.World): number {
  let count = 0;
  world.forEachCollider(() => count++);
  return count;
}

function raycastHeight(world: RAPIER.World, x: number, z: number): { height: number; handle: number } | null {
  // Newly created/removed fixed colliders only become visible to queries after a physics
  // step rebuilds the broad-phase; there are no dynamic bodies here, so stepping is inert.
  world.step();
  const hit = world.castRay(new RAPIER.Ray({ x, y: 400, z }, { x: 0, y: -1, z: 0 }),
    800, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
  if (!hit) return null;
  return { height: 400 - hit.timeOfImpact, handle: hit.collider.handle };
}

test('a fully interior position gets an exact deterministic 5x5 render ring and 3x3 collider ring', async () => {
  const { world, runtime } = harness();
  try {
    await runtime.ensureReady(0, 0);
    const stats = runtime.stats;
    assert.equal(stats.activeRender, 25);
    assert.equal(stats.activePhysics, 9);
    assert.ok(stats.colliderCount >= 9);
    assert.equal(stats.queued, 0);
    assert.equal(colliderCount(world), stats.colliderCount);
    // Centre and the whole 3x3 core must be solid...
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        assert.ok(runtime.isCollisionReadyAt(dx * NORTHERN_CHUNK_SIZE + 10, dz * NORTHERN_CHUNK_SIZE + 10));
      }
    }
    // ...while a render-only chunk two rings out is rendered but not solid.
    assert.ok(!runtime.isCollisionReadyAt(2 * NORTHERN_CHUNK_SIZE + 10, 10));
  } finally { runtime.dispose(); }
});

test('rings clip to the apron near the world edge instead of exceeding valid chunk bounds', async () => {
  const { transport, runtime } = harness();
  try {
    const edgeX = 8 * NORTHERN_CHUNK_SIZE + 10; // deep in the far apron corner
    const edgeZ = 8 * NORTHERN_CHUNK_SIZE + 10;
    await runtime.ensureReady(edgeX, edgeZ);
    assert.ok(runtime.stats.activeRender < 25, 'the ring should be clipped, not full, at the world edge');
    for (const { cx, cz } of transport.requestedChunks) assert.ok(isChunkInBounds(cx, cz), `(${cx},${cz}) escaped the apron`);
  } finally { runtime.dispose(); }
});

test('chunks are requested in priority order: nearest to the focus point first', () => {
  const { transport, runtime } = harness();
  try {
    runtime.initialize(0, 0);
    assert.equal(transport.requestedChunks.length, 25);
    assert.deepEqual([transport.requestedChunks[0].cx, transport.requestedChunks[0].cz], [0, 0]);
    let previousDist2 = -1;
    for (const { cx, cz } of transport.requestedChunks) {
      const dist2 = cx * cx + cz * cz;
      assert.ok(dist2 >= previousDist2, 'requests must never regress to a closer chunk after a farther one');
      previousDist2 = dist2;
    }
  } finally { runtime.dispose(); }
});

test('activation is budgeted per update call, not dumped all at once for a burst of ready chunks', () => {
  const { runtime } = harness({ activationBudgetPerUpdate: 1 });
  try {
    runtime.initialize(0, 0); // synchronous transport: all 25 results already arrived
    assert.equal(runtime.stats.activeRender, 1, 'default/explicit budget of 1 activates exactly one chunk per call');
    assert.equal(runtime.stats.queued, 24);
    for (let activated = 2; activated <= 25; activated++) {
      runtime.update(0, 0); // same chunk: no new requests, just spends more activation budget
      assert.equal(runtime.stats.activeRender, activated);
      assert.ok(Number.isFinite(runtime.stats.lastActivationMs) && runtime.stats.lastActivationMs >= 0);
    }
    assert.equal(runtime.stats.queued, 0);
  } finally { runtime.dispose(); }
});

test('waitForIdle bypasses the per-frame activation budget to fully settle the ring', async () => {
  const { runtime } = harness({ activationBudgetPerUpdate: 1 });
  try {
    runtime.initialize(0, 0);
    assert.equal(runtime.stats.activeRender, 1);
    await runtime.waitForIdle();
    assert.equal(runtime.stats.activeRender, 25);
    assert.equal(runtime.stats.queued, 0);
  } finally { runtime.dispose(); }
});

test('the default activation budget constant is a sane, small, positive number', () => {
  assert.ok(DEFAULT_ACTIVATION_BUDGET_PER_UPDATE >= 1);
});

test('moving one chunk over produces a seam-ready transition: the ring resettles fully with no lasting gap', async () => {
  const { runtime } = harness();
  try {
    await runtime.ensureReady(0, 0);
    assert.equal(runtime.stats.activeRender, 25);
    await runtime.ensureReady(NORTHERN_CHUNK_SIZE, 0); // exactly one chunk east
    assert.equal(runtime.stats.activeRender, 25, 'the ring must fully resettle after crossing a chunk boundary');
    assert.equal(runtime.stats.activePhysics, 9);
    assert.ok(runtime.isCollisionReadyAt(NORTHERN_CHUNK_SIZE + 10, 10), 'the new position must be solid');
    assert.ok(runtime.isCollisionReadyAt(10, 10), 'the previous position, still within the new collider ring, must remain solid');
  } finally { runtime.dispose(); }
});

test('a chunk that stays within both the old and new collider ring keeps its exact same collider (no premature removal)', async () => {
  const { world, runtime } = harness();
  try {
    await runtime.ensureReady(0, 0);
    const probeX = 20;
    const probeZ = 20; // stays inside chunk (0,0), within collider radius 1 of both centres below
    const before = raycastHeight(world, probeX, probeZ);
    assert.ok(before);
    await runtime.ensureReady(NORTHERN_CHUNK_SIZE, 0); // move one chunk east; (0,0) is still within the new 3x3 ring
    const after = raycastHeight(world, probeX, probeZ);
    assert.ok(after);
    assert.equal(after!.handle, before!.handle, 'the collider object must be reused, not removed and recreated');
    assert.ok(Math.abs(after!.height - before!.height) < 1e-4);
  } finally { runtime.dispose(); }
});

test('a collider dropped from the ring and later re-entered is rebuilt cleanly with correct height', async () => {
  const { world, runtime } = harness();
  try {
    await runtime.ensureReady(0, 0);
    assert.ok(runtime.isCollisionReadyAt(10, 10));
    // Jump far away so chunk (0,0) leaves both rings entirely.
    await runtime.ensureReady(6 * NORTHERN_CHUNK_SIZE, 6 * NORTHERN_CHUNK_SIZE);
    assert.ok(!runtime.isCollisionReadyAt(10, 10));
    // And back again.
    await runtime.ensureReady(0, 0);
    assert.ok(runtime.isCollisionReadyAt(10, 10));
    const hit = raycastHeight(world, 10, 10);
    assert.ok(hit);
    assert.ok(Math.abs(hit!.height - sampledHeightAt(10, 10)) < 0.01);
  } finally { runtime.dispose(); }
});

test('collider height exactly matches the analytic lattice used by the terrain model', async () => {
  const { world, runtime } = harness();
  try {
    await runtime.ensureReady(0, 560); // near spawn
    for (const [x, z] of [[0, 560], [40, 500], [-30, 610]]) {
      const hit = raycastHeight(world, x, z);
      assert.ok(hit, `expected a collider hit at (${x},${z})`);
      assert.ok(Math.abs(hit!.height - sampledHeightAt(x, z)) < 0.01);
    }
  } finally { runtime.dispose(); }
});

test('streamed loose boulders have matching collision inside the physics ring', async () => {
  const { world, runtime } = harness();
  try {
    // Use the lake-side chunk; (3, 0) is now cleared for the Ochre approach.
    const chunk = generateNorthernChunk(2, 2);
    const boulder = Array.from(chunk.props.type).findIndex(type => type === 1 || type === 2);
    assert.ok(boulder >= 0, 'test chunk should contain a deterministic loose boulder');
    const x = chunk.props.x[boulder];
    const y = chunk.props.y[boulder];
    const z = chunk.props.z[boulder];
    const scale = chunk.props.scale[boulder];
    const geometry = new THREE.DodecahedronGeometry(chunk.props.type[boulder] === 1 ? 0.8 : 0.9);
    geometry.computeBoundingBox();
    const radius = geometry.boundingBox!.max.y * scale;
    const centerY = y + scale * 0.2;
    geometry.dispose();
    await runtime.ensureReady(x, z);
    world.step();
    const sideHit = world.castRay(
      new RAPIER.Ray({ x: x - radius - 1, y: centerY, z }, { x: 1, y: 0, z: 0 }),
      radius * 2 + 2,
      true,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
    );
    assert.ok(sideHit, 'a horizontal ray should hit the visible boulder');
    assert.ok(sideHit.timeOfImpact >= 1 && sideHit.timeOfImpact < 1.2,
      `boulder side should match the visible bound, got ${sideHit.timeOfImpact}`);
    const topHit = world.castRay(
      new RAPIER.Ray({ x, y: centerY + radius + 1, z }, { x: 0, y: -1, z: 0 }),
      radius + 2,
      true,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
    );
    assert.ok(topHit, 'a vertical ray should hit the visible boulder');
    assert.ok(topHit.timeOfImpact >= 0.999 && topHit.timeOfImpact < 1.2,
      `boulder top should match the visible bound, got ${topHit.timeOfImpact}`);
    assert.ok(runtime.stats.colliderCount > runtime.stats.activePhysics);
  } finally { runtime.dispose(); }
});

test('streamed shrubs expose a bounded soft bump without adding hard colliders', async () => {
  const { runtime } = harness();
  try {
    const chunk = generateNorthernChunk(0, 6);
    const shrub = Array.from(chunk.props.type).findIndex(type => type === 5);
    assert.ok(shrub >= 0, 'test chunk should contain a deterministic shrub');
    const x = chunk.props.x[shrub];
    const z = chunk.props.z[shrub];
    await runtime.ensureReady(x, z);
    assert.equal(runtime.shrubBumpAt(x, z), 1);
    assert.ok(runtime.shrubBumpAt(x + chunk.props.scale[shrub] * 1.6, z) > 0);
    assert.equal(runtime.shrubBumpAt(x + chunk.props.scale[shrub] * 1.9, z), 0);
  } finally { runtime.dispose(); }
});

test('stale in-flight results are safely ignored when their chunk is abandoned before the response arrives', async () => {
  const { scene, transport, runtime } = harness({}, new InProcessChunkTransport({ delayMs: 15 }));
  try {
    runtime.initialize(0, 0); // 25 requests in flight, none resolved yet
    assert.equal(runtime.stats.activeRender, 0);
    // Jump far enough that none of the original 25 chunks overlap the new ring at all, but
    // stay within the finite world so the new ring is not itself clipped away.
    runtime.update(6 * NORTHERN_CHUNK_SIZE, 6 * NORTHERN_CHUNK_SIZE);
    await runtime.waitForIdle();
    assert.equal(runtime.stats.activeRender, 25, 'only the new ring should have live resources');
    const poolMeshCount = scene.children.filter(child => child instanceof THREE.InstancedMesh).length;
    // Every active chunk contributes exactly one terrain mesh, and at most one extra water mesh.
    assert.ok(scene.children.length >= poolMeshCount + runtime.stats.activeRender);
    assert.ok(scene.children.length <= poolMeshCount + runtime.stats.activeRender * 2 + 1);
    assert.equal(transport.requestedChunks.length, 50, 'the abandoned chunks were still requested exactly once each');
  } finally { runtime.dispose(); }
});

test('a failing chunk reports an explicit, per-chunk error without crashing the runtime or blocking waitForIdle', async () => {
  const errors: { cx: number; cz: number; message: string }[] = [];
  const { runtime } = harness({
    renderRadius: 1, colliderRadius: 1,
    onChunkError: (cx, cz, message) => errors.push({ cx, cz, message }),
  }, new InProcessChunkTransport({ shouldFail: (cx, cz) => cx === 0 && cz === 0 }));
  try {
    // Use update+waitForIdle here (not ensureReady): this test is about the runtime tolerating
    // a partial failure without crashing, not about ensureReady's stricter safe-spawn contract
    // (covered separately below) — and the failing chunk here is the exact target chunk, which
    // ensureReady is now required to reject on.
    runtime.update(0, 0);
    await runtime.waitForIdle(); // 3x3 = 9 chunks, one of which always fails
    assert.equal(runtime.stats.activeRender, 8, 'the eight healthy chunks should still activate');
    assert.equal(runtime.stats.activePhysics, 8, 'the eight healthy chunks should still be solid');
    assert.equal(runtime.stats.queued, 0, 'a failure must still resolve its request, not hang it');
    assert.equal(errors.length, 1);
    assert.equal(errors[0].cx, 0);
    assert.equal(errors[0].cz, 0);
    assert.equal(runtime.getChunkError(0, 0), errors[0].message);
    assert.equal(runtime.getChunkError(1, 0), undefined);
    assert.ok(!runtime.isCollisionReadyAt(10, 10), 'the failed chunk must never appear solid');
    assert.ok(runtime.isCollisionReadyAt(NORTHERN_CHUNK_SIZE + 10, 10), 'neighbouring chunks must be unaffected');
  } finally { runtime.dispose(); }
});

test('ensureReady rejects, and never resolves success-shaped, when the target chunk itself fails to generate', async () => {
  const { runtime } = harness({}, new InProcessChunkTransport({ shouldFail: (cx, cz) => cx === 0 && cz === 5 }));
  try {
    // (0, 560) lands in chunk (0, 5), which is configured to always fail.
    await assert.rejects(
      () => runtime.ensureReady(0, 560),
      /generation errors/,
      'a spawn/teleport target that failed to generate must never resolve as ready',
    );
    assert.ok(!runtime.isCollisionReadyAt(0, 560), 'the failed target must never report itself as safe to drive on');
  } finally { runtime.dispose(); }
});

test('ensureReady rejects when a chunk elsewhere in the collider neighbourhood fails, even though the target chunk itself succeeded', async () => {
  const { runtime } = harness({}, new InProcessChunkTransport({ shouldFail: (cx, cz) => cx === 1 && cz === 5 }));
  try {
    // Target (0, 560) -> chunk (0, 5); its collider ring (radius 1) includes chunk (1, 5),
    // which is configured to always fail — the target chunk itself generates fine.
    await assert.rejects(
      () => runtime.ensureReady(0, 560),
      /generation errors/,
      'a broken neighbour inside the collider ring must also block a safe-spawn resolution',
    );
    // The target chunk itself is fine and reachable — this is a "do not trust this
    // neighbourhood yet" rejection, not a claim that the exact target point is unsafe.
    assert.equal(runtime.getChunkError(0, 5), undefined);
    assert.equal(runtime.getChunkError(1, 5), 'Simulated failure generating chunk (1, 5).');
  } finally { runtime.dispose(); }
});

test('ensureReady still resolves normally when nothing in the collider neighbourhood failed', async () => {
  const { runtime } = harness();
  try {
    await assert.doesNotReject(() => runtime.ensureReady(0, 560));
    assert.ok(runtime.isCollisionReadyAt(0, 560));
  } finally { runtime.dispose(); }
});

test('a BrowserChunkTransport worker crash resolves every outstanding request into an explicit error instead of hanging', () => {
  let posted: unknown[] = [];
  const fakeWorker: BrowserWorkerLike = {
    postMessage: message => { posted.push(message); },
    terminate: () => {},
    onmessage: null,
    onerror: null,
  };
  const transport = new BrowserChunkTransport(() => fakeWorker);
  const received: Array<{ type: string; requestId: number; cx: number; cz: number }> = [];
  transport.onMessage(message => received.push(message as typeof received[number]));

  transport.requestChunk(0, 0, 1);
  transport.requestChunk(1, 0, 2);
  transport.requestChunk(0, 1, 3);
  assert.equal(posted.length, 3, 'all three requests should have reached the worker before the crash');
  assert.equal(received.length, 0);
  assert.ok(!transport.isFatallyErrored);

  // Simulate an unrecoverable worker-level crash (e.g. an uncaught exception in worker code).
  fakeWorker.onerror?.({ message: 'boom: worker thread died' } as ErrorEvent);

  assert.equal(received.length, 3, 'every outstanding request must be resolved into an explicit error, none left hanging');
  for (const message of received) {
    assert.equal(message.type, 'error');
  }
  assert.deepEqual(received.map(m => m.requestId).sort(), [1, 2, 3]);
  assert.ok(transport.isFatallyErrored);
  assert.match(transport.fatalErrorMessage ?? '', /boom: worker thread died/);

  // A crash must not be swallowed silently, and the transport must not try to keep using a
  // dead worker: further requests are resolved as errors immediately, without posting again.
  posted = [];
  received.length = 0;
  transport.requestChunk(2, 2, 4);
  assert.equal(posted.length, 0, 'a fatally-errored transport must never post to the dead worker again');
  assert.equal(received.length, 1);
  assert.equal(received[0].type, 'error');
  assert.equal(received[0].requestId, 4);

  transport.dispose();
});

test('a worker crash mid-flight surfaces as explicit per-chunk errors on the runtime, and ensureReady rejects instead of hanging or lying', async () => {
  const scene = new THREE.Scene();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  let fakeWorker!: BrowserWorkerLike;
  const transport = new BrowserChunkTransport(() => {
    fakeWorker = {
      postMessage: () => {}, // never answers — simulates a worker that crashes before responding
      terminate: () => {},
      onmessage: null,
      onerror: null,
    };
    return fakeWorker;
  });
  const errors: { cx: number; cz: number; message: string }[] = [];
  const runtime = new NorthernStreamingRuntime(scene, world, transport, {
    onChunkError: (cx, cz, message) => errors.push({ cx, cz, message }),
  });
  try {
    const readyPromise = runtime.ensureReady(0, 560);
    fakeWorker.onerror?.({ message: 'fatal worker crash' } as ErrorEvent);
    await assert.rejects(() => readyPromise, /generation errors/);
    assert.ok(errors.length > 0, 'the crash must be propagated through the normal per-chunk error channel');
    assert.ok(errors.every(e => e.message.includes('fatal worker crash')));
    assert.equal(runtime.stats.queued, 0, 'nothing should be left permanently in flight after the crash');
  } finally { runtime.dispose(); }
});

test('repeated back-and-forth movement keeps resource usage bounded, never growing without limit', async () => {
  const { world, scene, runtime } = harness();
  try {
    const stops: [number, number][] = [];
    for (let i = 0; i < 12; i++) stops.push([(i % 4) * NORTHERN_CHUNK_SIZE, ((i * 3) % 5) * NORTHERN_CHUNK_SIZE]);
    for (const [x, z] of stops) {
      await runtime.ensureReady(x, z);
      assert.ok(runtime.stats.activeRender <= 25);
      assert.ok(runtime.stats.activePhysics <= 9);
      assert.ok(colliderCount(world) <= 80);
    }
    const poolMeshCount = scene.children.filter(child => child instanceof THREE.InstancedMesh).length;
    assert.ok(scene.children.length <= poolMeshCount + 25 + 25 + 1);
  } finally { runtime.dispose(); }
});

test('dispose tears down every render mesh, every collider, the prop pools, and the transport', async () => {
  const { scene, world, transport, runtime } = harness();
  await runtime.ensureReady(0, 560);
  assert.ok(scene.children.length > 0);
  assert.ok(colliderCount(world) > 0);
  runtime.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(colliderCount(world), 0);
  assert.ok(transport.isDisposed);
  // Further calls after disposal must be inert, not throw, and allocate nothing.
  assert.doesNotThrow(() => runtime.update(0, 0));
  assert.equal(scene.children.length, 0);
  assert.equal(runtime.stats.activeRender, 0);
  await assert.doesNotReject(() => runtime.waitForIdle());
});

test('BrowserChunkTransport wires a worker-like object correctly and terminates it exactly once on dispose', () => {
  let posted: unknown[] = [];
  let terminateCalls = 0;
  const fakeWorker: BrowserWorkerLike = {
    postMessage: message => { posted.push(message); },
    terminate: () => { terminateCalls++; },
    onmessage: null,
    onerror: null,
  };
  const transport = new BrowserChunkTransport(() => fakeWorker);
  const received: unknown[] = [];
  transport.onMessage(message => received.push(message));
  transport.requestChunk(1, 2, 42);
  assert.deepEqual(posted, [{ type: 'generate', requestId: 42, cx: 1, cz: 2 }]);
  // Simulate the worker answering.
  fakeWorker.onmessage?.({ data: { type: 'result', requestId: 42, cx: 1, cz: 2, chunk: 'stub' } } as MessageEvent);
  assert.equal(received.length, 1);
  transport.dispose();
  assert.equal(terminateCalls, 1);
  transport.dispose(); // idempotent
  assert.equal(terminateCalls, 1);
  // Requests and messages after dispose are dropped, not forwarded.
  posted = [];
  transport.requestChunk(3, 4, 99);
  assert.equal(posted.length, 0);
});

test('constructing the runtime with an invalid ring or activation budget throws an explicit error', () => {
  const scene = new THREE.Scene();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  assert.throws(() => new NorthernStreamingRuntime(scene, world, new InProcessChunkTransport(), { renderRadius: 1, colliderRadius: 2 }));
  assert.throws(() => new NorthernStreamingRuntime(scene, world, new InProcessChunkTransport(), { activationBudgetPerUpdate: 0 }));
});

test('isCollisionReadyAt is false everywhere before the runtime has ever been pointed anywhere', () => {
  const { runtime } = harness();
  try {
    assert.ok(!runtime.isCollisionReadyAt(0, 0));
    assert.equal(runtime.stats.activeRender, 0);
    assert.equal(runtime.stats.queued, 0);
  } finally { runtime.dispose(); }
});
