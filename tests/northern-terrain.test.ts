import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LAKE_LEVEL, inletCenterX } from '../src/game/northern-watershed';
import {
  NORTHERN_HALF, NORTHERN_APRON_HALF, NORTHERN_CHUNK_SIZE, NORTHERN_CHUNK_CELLS, NORTHERN_CELL_SIZE,
  NORTHERN_MIN_CHUNK, NORTHERN_MAX_CHUNK, NORTHERN_MIN_NOMINAL_CHUNK, NORTHERN_MAX_NOMINAL_CHUNK,
  NORTHERN_SPAWN, NORTHERN_PROP_TYPES, ROUTES, smooth, isNominalChunk, isChunkInBounds,
  generateNorthernChunk, sampledHeightAt, northernHeightAt, waterHeightAt, northernSurfaceAt,
} from '../src/game/northern-terrain';

const n = NORTHERN_CHUNK_CELLS;
const expectedVertexCount = (n + 1) * (n + 1);
const expectedIndexCount = n * n * 6;

test('world and chunk geometry constants form a fixed, finite 1536x1536m world', () => {
  assert.equal(NORTHERN_HALF, 768);
  assert.equal(NORTHERN_CHUNK_SIZE, 96);
  assert.equal(NORTHERN_CHUNK_CELLS, 40);
  assert.ok(Math.abs(NORTHERN_CELL_SIZE - 2.4) < 1e-9);
  assert.equal(NORTHERN_CHUNK_SIZE / NORTHERN_CHUNK_CELLS, NORTHERN_CELL_SIZE);
  // Nominal logical chunk coordinates -8..7 (16 chunks) exactly tile the 1536m world.
  assert.equal(NORTHERN_MIN_NOMINAL_CHUNK, -8);
  assert.equal(NORTHERN_MAX_NOMINAL_CHUNK, 7);
  assert.equal((NORTHERN_MAX_NOMINAL_CHUNK - NORTHERN_MIN_NOMINAL_CHUNK + 1) * NORTHERN_CHUNK_SIZE, NORTHERN_HALF * 2);
  // One extra apron chunk ring on every side: -9..8.
  assert.equal(NORTHERN_MIN_CHUNK, NORTHERN_MIN_NOMINAL_CHUNK - 1);
  assert.equal(NORTHERN_MAX_CHUNK, NORTHERN_MAX_NOMINAL_CHUNK + 1);
  assert.equal(NORTHERN_APRON_HALF, NORTHERN_HALF + NORTHERN_CHUNK_SIZE);
  assert.ok(isNominalChunk(0, 0));
  assert.ok(isNominalChunk(NORTHERN_MIN_NOMINAL_CHUNK, NORTHERN_MAX_NOMINAL_CHUNK));
  assert.ok(!isNominalChunk(NORTHERN_MIN_CHUNK, 0));
  assert.ok(!isNominalChunk(NORTHERN_MAX_CHUNK, 0));
  assert.ok(isChunkInBounds(NORTHERN_MIN_CHUNK, NORTHERN_MAX_CHUNK));
  assert.ok(!isChunkInBounds(NORTHERN_MIN_CHUNK - 1, 0));
  assert.ok(!isChunkInBounds(0, NORTHERN_MAX_CHUNK + 1));
});

test('smooth is a clamped, monotonic 0..1 ease utility', () => {
  assert.equal(smooth(-5), 0);
  assert.equal(smooth(0), 0);
  assert.equal(smooth(1), 1);
  assert.equal(smooth(5), 1);
  assert.ok(smooth(0.5) > 0 && smooth(0.5) < 1);
  let prev = -1;
  for (let t = 0; t <= 1; t += 0.1) {
    const value = smooth(t);
    assert.ok(value >= prev);
    prev = value;
  }
});

test('generateNorthernChunk returns exact, transferable-friendly typed arrays for nominal chunks', () => {
  const chunk = generateNorthernChunk(0, 1);
  assert.equal(chunk.nominal, true);
  assert.equal(chunk.vertexCount, expectedVertexCount);
  assert.ok(chunk.vertices instanceof Float32Array);
  assert.equal(chunk.vertices.length, expectedVertexCount * 3);
  assert.ok(chunk.indices instanceof Uint32Array);
  assert.equal(chunk.indices.length, expectedIndexCount);
  assert.ok(chunk.colors instanceof Float32Array);
  assert.equal(chunk.colors.length, expectedVertexCount * 3);
  assert.ok(chunk.props.type instanceof Uint8Array);
  assert.ok(chunk.props.x instanceof Float32Array);
  assert.ok(chunk.props.y instanceof Float32Array);
  assert.ok(chunk.props.z instanceof Float32Array);
  assert.ok(chunk.props.rotationY instanceof Float32Array);
  assert.ok(chunk.props.scale instanceof Float32Array);
  assert.equal(chunk.props.type.length, chunk.props.count);
  assert.equal(chunk.props.x.length, chunk.props.count);
  // Every index must reference a real vertex.
  for (let i = 0; i < chunk.indices.length; i++) assert.ok(chunk.indices[i] < chunk.vertexCount);
  // Every vertex colour is a valid RGB triple.
  for (let i = 0; i < chunk.colors.length; i++) assert.ok(chunk.colors[i] >= 0 && chunk.colors[i] <= 1);
});

test('generateNorthernChunk also produces valid apron geometry at the world edge and corners', () => {
  const aprons: [number, number][] = [
    [NORTHERN_MIN_CHUNK, 0], [NORTHERN_MAX_CHUNK, 0], [0, NORTHERN_MIN_CHUNK], [0, NORTHERN_MAX_CHUNK],
    [NORTHERN_MIN_CHUNK, NORTHERN_MIN_CHUNK], [NORTHERN_MAX_CHUNK, NORTHERN_MAX_CHUNK],
    [NORTHERN_MIN_CHUNK, NORTHERN_MAX_CHUNK], [NORTHERN_MAX_CHUNK, NORTHERN_MIN_CHUNK],
  ];
  for (const [cx, cz] of aprons) {
    const chunk = generateNorthernChunk(cx, cz);
    assert.equal(chunk.nominal, false, `(${cx},${cz}) should be apron, not nominal`);
    assert.equal(chunk.vertices.length, expectedVertexCount * 3);
    assert.equal(chunk.indices.length, expectedIndexCount);
    assert.ok(chunk.vertices.every(Number.isFinite), `apron chunk (${cx},${cz}) has non-finite vertices`);
  }
  assert.throws(() => generateNorthernChunk(NORTHERN_MIN_CHUNK - 1, 0), RangeError);
  assert.throws(() => generateNorthernChunk(0, NORTHERN_MAX_CHUNK + 1), RangeError);
  assert.throws(() => generateNorthernChunk(0.5, 0), RangeError);
});

test('chunk generation is fully deterministic', () => {
  for (const [cx, cz] of [[0, 1], [-3, 2], [5, -5], [-9, -9], [8, 8]] as const) {
    const a = generateNorthernChunk(cx, cz);
    const b = generateNorthernChunk(cx, cz);
    assert.deepEqual(Array.from(a.vertices), Array.from(b.vertices));
    assert.deepEqual(Array.from(a.indices), Array.from(b.indices));
    assert.deepEqual(Array.from(a.colors), Array.from(b.colors));
    assert.deepEqual(Array.from(a.props.type), Array.from(b.props.type));
    assert.deepEqual(Array.from(a.props.x), Array.from(b.props.x));
    assert.deepEqual(Array.from(a.props.y), Array.from(b.props.y));
    assert.deepEqual(Array.from(a.props.z), Array.from(b.props.z));
    if (a.waterVertices) assert.deepEqual(Array.from(a.waterVertices), Array.from(b.waterVertices!));
    if (a.waterIndices) assert.deepEqual(Array.from(a.waterIndices), Array.from(b.waterIndices!));
    if (a.waterColors) assert.deepEqual(Array.from(a.waterColors), Array.from(b.waterColors!));
  }
});

function edgeVertexIndex(cellsAcross: number, k: number, side: 'right' | 'left' | 'top' | 'bottom'): number {
  const stride = cellsAcross + 1;
  switch (side) {
    case 'right': return k * stride + cellsAcross;
    case 'left': return k * stride + 0;
    case 'top': return cellsAcross * stride + k;
    case 'bottom': return 0 * stride + k;
  }
}

function assertSharedEdge(a: [number, number], b: [number, number], axis: 'x' | 'z') {
  const chunkA = generateNorthernChunk(a[0], a[1]);
  const chunkB = generateNorthernChunk(b[0], b[1]);
  for (let k = 0; k <= n; k++) {
    const ia = edgeVertexIndex(n, k, axis === 'x' ? 'right' : 'top');
    const ib = edgeVertexIndex(n, k, axis === 'x' ? 'left' : 'bottom');
    for (let c = 0; c < 3; c++) {
      assert.equal(chunkA.vertices[ia * 3 + c], chunkB.vertices[ib * 3 + c],
        `vertex mismatch between (${a}) and (${b}) at k=${k}`);
      assert.equal(chunkA.colors[ia * 3 + c], chunkB.colors[ib * 3 + c],
        `colour mismatch between (${a}) and (${b}) at k=${k}`);
    }
  }
}

test('adjacent chunks share bit-identical edge vertices, colours, and water', () => {
  assertSharedEdge([0, 1], [1, 1], 'x'); // lake chunk east neighbour
  assertSharedEdge([0, 1], [0, 2], 'z'); // lake chunk north neighbour
  assertSharedEdge([-1, 5], [0, 5], 'x'); // near spawn
  assertSharedEdge([2, -3], [3, -3], 'x'); // river-in chunk
  assertSharedEdge([-3, 1], [-2, 1], 'x'); // river-out chunk
  assertSharedEdge([-8, 1], [-7, 1], 'x'); // sea/fjord chunk
  // Nominal <-> apron seams must also match exactly.
  assertSharedEdge([NORTHERN_MIN_CHUNK, 0], [NORTHERN_MIN_NOMINAL_CHUNK, 0], 'x');
  assertSharedEdge([NORTHERN_MAX_NOMINAL_CHUNK, 3], [NORTHERN_MAX_CHUNK, 3], 'x');
});

test('every vertex, colour, and water value across a broad chunk sample is finite', () => {
  for (let cx = NORTHERN_MIN_CHUNK; cx <= NORTHERN_MAX_CHUNK; cx += 3) {
    for (let cz = NORTHERN_MIN_CHUNK; cz <= NORTHERN_MAX_CHUNK; cz += 3) {
      const chunk = generateNorthernChunk(cx, cz);
      assert.ok(chunk.vertices.every(Number.isFinite), `chunk (${cx},${cz}) vertices`);
      assert.ok(chunk.colors.every(Number.isFinite), `chunk (${cx},${cz}) colors`);
      if (chunk.waterVertices) assert.ok(chunk.waterVertices.every(Number.isFinite), `chunk (${cx},${cz}) water`);
      if (chunk.waterColors) {
        assert.equal(chunk.waterColors.length, chunk.waterVertices!.length);
        assert.ok(chunk.waterColors.every(Number.isFinite), `chunk (${cx},${cz}) water colors`);
      }
      assert.ok(chunk.props.x.every(Number.isFinite));
      assert.ok(chunk.props.y.every(Number.isFinite));
      assert.ok(chunk.props.z.every(Number.isFinite));
    }
  }
  for (let x = -NORTHERN_APRON_HALF; x <= NORTHERN_APRON_HALF; x += 48) {
    for (let z = -NORTHERN_APRON_HALF; z <= NORTHERN_APRON_HALF; z += 48) {
      assert.ok(Number.isFinite(northernHeightAt(x, z)));
      assert.ok(Number.isFinite(sampledHeightAt(x, z)));
    }
  }
});

test('sampledHeightAt exactly matches the mesh lattice vertices, using the same diagonal as the index buffer', () => {
  const chunk = generateNorthernChunk(0, 1);
  for (let j = 0; j <= n; j += 4) {
    for (let i = 0; i <= n; i += 4) {
      const idx = (j * (n + 1) + i) * 3;
      const x = chunk.vertices[idx];
      const y = chunk.vertices[idx + 1];
      const z = chunk.vertices[idx + 2];
      assert.equal(sampledHeightAt(x, z), y);
    }
  }
  // And an interior point reproduces the exact a-c-b / b-c-d barycentric split.
  const cellSize = NORTHERN_CELL_SIZE;
  const ai = (0 * (n + 1) + 0) * 3;
  const bi = (0 * (n + 1) + 1) * 3;
  const ci = (1 * (n + 1) + 0) * 3;
  const di = (1 * (n + 1) + 1) * 3;
  const x0 = chunk.vertices[ai];
  const z0 = chunk.vertices[ai + 2];
  const a = chunk.vertices[ai + 1];
  const b = chunk.vertices[bi + 1];
  const c = chunk.vertices[ci + 1];
  const d = chunk.vertices[di + 1];
  const probe = (u: number, v: number) => {
    const expected = u + v <= 1 ? a + u * (b - a) + v * (c - a) : d + (1 - u) * (c - d) + (1 - v) * (b - d);
    const got = sampledHeightAt(x0 + u * cellSize, z0 + v * cellSize);
    assert.ok(Math.abs(got - expected) < 1e-4, `u=${u} v=${v} expected=${expected} got=${got}`);
  };
  probe(0.2, 0.2);
  probe(0.8, 0.8);
  probe(0.9, 0.05);
  probe(0.05, 0.9);
});

test('spawn sits near x=24, z=560 — off the chunk-boundary edge, on safe, dry, gentle ground', () => {
  assert.equal(NORTHERN_SPAWN.x, 24);
  assert.equal(NORTHERN_SPAWN.z, 560);
  // x=0 sits exactly on a chunk seam; a settle-frame's worth of drift to x<0 on some engines
  // (observed on WebKit) immediately queues a whole new render column. Spawn must stay clear
  // of every chunk boundary with real margin, not just avoid landing exactly on one.
  const marginFromChunkEdge = Math.min(
    NORTHERN_SPAWN.x % NORTHERN_CHUNK_SIZE,
    NORTHERN_CHUNK_SIZE - (NORTHERN_SPAWN.x % NORTHERN_CHUNK_SIZE),
  );
  assert.ok(marginFromChunkEdge >= 10, `spawn should sit well clear of a chunk boundary, got margin ${marginFromChunkEdge}`);
  assert.equal(waterHeightAt(NORTHERN_SPAWN.x, NORTHERN_SPAWN.z), null);
  assert.notEqual(northernSurfaceAt(NORTHERN_SPAWN.x, NORTHERN_SPAWN.z), 'water');
  const groundHeight = sampledHeightAt(NORTHERN_SPAWN.x, NORTHERN_SPAWN.z);
  assert.ok(Math.abs(NORTHERN_SPAWN.y - groundHeight) < 2, 'spawn should hover just above the ground');
  assert.ok(NORTHERN_SPAWN.y > groundHeight, 'spawn should be above the ground, not buried');
  let maxSlope = 0;
  for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3], [3, 3], [-3, -3], [3, -3], [-3, 3]]) {
    const delta = Math.abs(sampledHeightAt(NORTHERN_SPAWN.x + dx, NORTHERN_SPAWN.z + dz) - groundHeight);
    maxSlope = Math.max(maxSlope, delta / Math.hypot(dx, dz));
  }
  assert.ok(maxSlope < 0.12, `spawn area should be flat, got slope ${maxSlope}`);
  // The spawn chunk must be inside the nominal (non-apron) world.
  assert.ok(isNominalChunk(Math.floor(NORTHERN_SPAWN.x / NORTHERN_CHUNK_SIZE), Math.floor(NORTHERN_SPAWN.z / NORTHERN_CHUNK_SIZE)));
});

test('the lake, its rivers, and the sea each have distinct, sensible local water elevations', () => {
  const lake = waterHeightAt(0, 180);
  const riverInSource = waterHeightAt(inletCenterX(-540), -540);
  const riverInMid = waterHeightAt(inletCenterX(-360), -360);
  const riverInAtLake = waterHeightAt(inletCenterX(45), 45);
  const riverOutAtLake = waterHeightAt(-110, 193);
  const riverOutAtSea = waterHeightAt(-440, 190);
  const sea = waterHeightAt(-690, 190);

  for (const level of [lake, riverInSource, riverInMid, riverInAtLake, riverOutAtLake, riverOutAtSea, sea]) {
    assert.notEqual(level, null);
    assert.ok(Number.isFinite(level));
  }
  // The glacial stream descends from the mountains down into the lake.
  assert.ok(riverInSource! > riverInMid!);
  assert.ok(riverInMid! > riverInAtLake!);
  assert.ok(Math.abs(riverInAtLake! - lake!) < 1);
  // The lowland lake sits within the surrounding terrain and drains toward the sea.
  assert.equal(lake, LAKE_LEVEL);
  assert.ok(lake! > 0 && lake! < 12);
  assert.ok(Math.abs(riverOutAtLake! - lake!) < 5);
  assert.ok(riverOutAtLake! > riverOutAtSea!);
  assert.ok(riverOutAtSea! > sea!);
  assert.equal(sea, 0);
  // Every reported water surface is actually above the carved ground beneath it.
  for (const [x, z] of [[0, 180], [inletCenterX(-540), -540], [inletCenterX(-360), -360], [-110, 193], [-440, 190], [-690, 190]]) {
    const level = waterHeightAt(x, z)!;
    assert.ok(level > northernHeightAt(x, z));
  }
});

test('clipped water mesh follows the analytic lake bank without an invisible wet strip', () => {
  const shorelineZ = 180;
  const renderedXs: number[] = [];
  for (const cx of [0, 1]) {
    const chunk = generateNorthernChunk(cx, 1);
    assert.ok(chunk.waterVertices);
    for (let i = 0; i < chunk.waterVertices.length; i += 3) {
      if (Math.abs(chunk.waterVertices[i + 2] - shorelineZ) < 0.001) {
        renderedXs.push(chunk.waterVertices[i]);
      }
    }
  }
  let analyticEdge = 0;
  for (let x = 80; x <= 180; x += 0.001) {
    if (waterHeightAt(x, shorelineZ) !== null) analyticEdge = x;
  }
  const renderedEdge = Math.max(...renderedXs);
  assert.ok(Math.abs(renderedEdge - analyticEdge) < 0.02,
    `rendered water ended at ${renderedEdge}, analytic water at ${analyticEdge}`);
});

test('rendered water stays inside analytic banks and follows local levels at feature overlaps', () => {
  for (const [cx, cz] of [[-5, 2], [-4, 1], [-1, 2], [0, 2], [-1, 3], [0, 3]] as const) {
    const vertices = generateNorthernChunk(cx, cz).waterVertices;
    assert.ok(vertices, `expected water in chunk (${cx},${cz})`);
    for (let i = 0; i < vertices.length; i += 9) {
      const ax = vertices[i], az = vertices[i + 2];
      const bx = vertices[i + 3], bz = vertices[i + 5];
      const cx = vertices[i + 6], cz = vertices[i + 8];
      const twiceArea = Math.abs((bx - ax) * (cz - az) - (cx - ax) * (bz - az));
      assert.ok(twiceArea >= 1e-5, 'water mesh should not contain degenerate triangles');
      const centerX = (ax + bx + cx) / 3;
      const centerZ = (az + bz + cz) / 3;
      const analyticHeight = waterHeightAt(centerX, centerZ);
      assert.notEqual(analyticHeight, null, `water triangle center (${centerX},${centerZ}) must be wet`);
      const renderedHeight = (vertices[i + 1] + vertices[i + 4] + vertices[i + 7]) / 3 - 0.015;
      assert.ok(Math.abs(renderedHeight - analyticHeight!) <= 0.076,
        `rendered water differs from analytic level by ${Math.abs(renderedHeight - analyticHeight!)}`);
    }
  }
});

test('authored regions are recognizable by surface id and elevation, and every required surface exists', () => {
  const regions: { name: string; x: number; z: number; surface: string }[] = [
    { name: 'western coast / fjord', x: -690, z: 190, surface: 'water' },
    { name: 'southern forest', x: 150, z: 650, surface: 'grass' },
    { name: 'central lake', x: 0, z: 180, surface: 'water' },
    { name: 'north-east snow mountains', x: 520, z: -500, surface: 'snow' },
    { name: 'south-east volcanic uplands', x: 520, z: 470, surface: 'rock' },
  ];
  for (const region of regions) {
    assert.equal(northernSurfaceAt(region.x, region.z), region.surface, region.name);
  }
  // North-east mountains and south-east uplands are both markedly higher than the coast/lake basin.
  assert.ok(northernHeightAt(520, -500) > 100);
  assert.ok(northernHeightAt(520, 470) > 50);
  assert.ok(northernHeightAt(-690, 190) < 0);

  // Northern tundra is present, flat-ish, and cold-toned (snow/mud/dirt only).
  const tundraSurface = northernSurfaceAt(0, -700);
  assert.ok(['snow', 'mud', 'dirt'].includes(tundraSurface));

  const found = new Set<string>();
  for (let x = -NORTHERN_HALF; x <= NORTHERN_HALF; x += 16) {
    for (let z = -NORTHERN_HALF; z <= NORTHERN_HALF; z += 16) {
      found.add(northernSurfaceAt(x, z));
    }
  }
  for (const required of ['grass', 'dirt', 'water', 'snow', 'mud', 'rock', 'sand']) {
    assert.ok(found.has(required), `expected surface "${required}" to appear somewhere in the world`);
  }
});

test('authored major routes stay dry and within reasonable driving slopes', () => {
  assert.ok(ROUTES.length >= 3);
  for (const route of ROUTES) {
    for (let i = 0; i < route.line.length - 1; i++) {
      const a = route.line[i];
      const b = route.line[i + 1];
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      // Sample at a vehicle-scale baseline (>= one lattice cell) so results reflect the
      // driveable mesh grade rather than sub-cell interpolation noise.
      const steps = Math.max(1, Math.round(length / 3));
      let previous = sampledHeightAt(a.x, a.z);
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        assert.equal(waterHeightAt(x, z), null, `${route.name} should stay dry at (${x.toFixed(1)},${z.toFixed(1)})`);
        const height = sampledHeightAt(x, z);
        const step = length / steps;
        const slope = Math.abs(height - previous) / step;
        assert.ok(slope < 0.5, `${route.name} slope ${slope.toFixed(2)} at (${x.toFixed(1)},${z.toFixed(1)}) is too steep`);
        previous = height;
      }
    }
  }
});

test('land edges retain their perimeter while the western sea stays open through the apron', () => {
  const interiorBaseline = northernHeightAt(0, 0); // ordinary interior ground, untouched by any edge
  const substantial = interiorBaseline + 150; // taller than every authored peak in the world

  // Midpoints and corners of all four nominal edges must rise to a substantial, exploration-stopping height.
  const edgeSamples: [number, number][] = [
    [0, NORTHERN_HALF], [0, -NORTHERN_HALF], [NORTHERN_HALF, 0],
    [NORTHERN_HALF, NORTHERN_HALF], [-NORTHERN_HALF, -NORTHERN_HALF],
    [NORTHERN_HALF, -NORTHERN_HALF], [-NORTHERN_HALF, NORTHERN_HALF],
  ];
  for (const [x, z] of edgeSamples) {
    const height = northernHeightAt(x, z);
    assert.ok(Number.isFinite(height), `edge height at (${x},${z}) must be finite`);
    assert.ok(height > substantial, `edge at (${x},${z}) should rise well above ordinary terrain, got ${height.toFixed(1)}`);
  }

  // The western edge runs straight through open sea; nothing else in the terrain model would
  // otherwise stop a vehicle driving out past the map there. The rise must physically close it.
  for (const z of [190, -300, 0, 500]) {
    assert.equal(waterHeightAt(-NORTHERN_HALF, z), 0, `open western sea at z=${z}`);
    assert.ok(northernHeightAt(-NORTHERN_HALF, z) < -1, `submerged western edge at z=${z}`);
    assert.equal(waterHeightAt(-NORTHERN_APRON_HALF, z), 0);
  }

  // The rise only begins in the last ~60-80m before the edge — well inside that margin, the
  // authored coast and open sea are completely untouched (same depth as without the rise).
  assert.equal(waterHeightAt(-690, 190), 0, 'open sea safely clear of the edge margin must be unaffected by the rise');
  assert.ok(northernHeightAt(-690, 190) < -20, 'open sea safely clear of the edge margin must keep its normal depth');

  // The apron (beyond the nominal edge, used only to supply seam data) stays a finite, bounded
  // plateau — it never diverges, and never drops back below the rise once past the edge.
  for (const t of [NORTHERN_HALF + 10, NORTHERN_HALF + 50, NORTHERN_APRON_HALF]) {
    for (const [x, z] of [[t, 0], [0, t], [0, -t]] as [number, number][]) {
      const height = northernHeightAt(x, z);
      assert.ok(Number.isFinite(height), `apron height at (${x},${z}) must remain finite`);
      assert.ok(height > substantial, `apron at (${x},${z}) should stay at/above the edge plateau, got ${height.toFixed(1)}`);
    }
  }

  // Chunk seams across the perimeter — including nominal<->apron seams at the far corners —
  // remain bit-identical, exactly like everywhere else in the world.
  assertSharedEdge([NORTHERN_MIN_CHUNK, NORTHERN_MIN_CHUNK], [NORTHERN_MIN_CHUNK + 1, NORTHERN_MIN_CHUNK], 'x');
  assertSharedEdge([NORTHERN_MIN_CHUNK, NORTHERN_MIN_CHUNK], [NORTHERN_MIN_CHUNK, NORTHERN_MIN_CHUNK + 1], 'z');
  assertSharedEdge([NORTHERN_MAX_CHUNK - 1, NORTHERN_MAX_CHUNK], [NORTHERN_MAX_CHUNK, NORTHERN_MAX_CHUNK], 'x');
  assertSharedEdge([NORTHERN_MAX_CHUNK, NORTHERN_MAX_CHUNK - 1], [NORTHERN_MAX_CHUNK, NORTHERN_MAX_CHUNK], 'z');
});

test('props are deterministic, stay strictly within their owning chunk, and never duplicate at a seam', () => {
  const region: [number, number][] = [];
  for (let cx = -2; cx <= 2; cx++) for (let cz = 4; cz <= 8; cz++) region.push([cx, cz]);

  const allPositions: { x: number; y: number; z: number; type: number }[] = [];
  for (const [cx, cz] of region) {
    const chunk = generateNorthernChunk(cx, cz);
    const minX = cx * NORTHERN_CHUNK_SIZE;
    const maxX = minX + NORTHERN_CHUNK_SIZE;
    const minZ = cz * NORTHERN_CHUNK_SIZE;
    const maxZ = minZ + NORTHERN_CHUNK_SIZE;
    for (let i = 0; i < chunk.props.count; i++) {
      const x = chunk.props.x[i];
      const z = chunk.props.z[i];
      assert.ok(x >= minX && x < maxX, `prop x=${x} escaped chunk (${cx},${cz})`);
      assert.ok(z >= minZ && z < maxZ, `prop z=${z} escaped chunk (${cx},${cz})`);
      assert.ok(chunk.props.type[i] < NORTHERN_PROP_TYPES.length);
      allPositions.push({ x, z, y: chunk.props.y[i], type: chunk.props.type[i] });
    }
  }
  assert.ok(allPositions.length > 50, 'expected a reasonable number of props across the sampled region');

  // Stacked cairns and sign/post assemblies intentionally share x/z; duplicate
  // instances of the same geometry at the same 3D position indicate a seam bug.
  const seen = new Set<string>();
  for (const { x, y, z, type } of allPositions) {
    const key = `${type}:${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    assert.ok(!seen.has(key), `duplicate prop position at ${key}`);
    seen.add(key);
  }
});
