// Typed request/result/error protocol for streaming Northern Reach chunk generation off the
// main thread, plus the (guarded) worker-side bootstrap that answers it.
//
// This module is safe to import from anywhere — Node test code, the main-thread streaming
// runtime, or the worker itself — because the actual `self`/`postMessage` wiring only runs
// when the module happens to execute inside a worker-like global scope. Everywhere else
// (including `tsx --test` under Node, which has no `self`) it contributes only types and pure
// functions.
import { generateNorthernChunk, type NorthernChunk } from './northern-terrain';

/** A request for one generated chunk, tagged with a caller-assigned id for matching results. */
export type NorthernChunkRequest = {
  readonly type: 'generate';
  readonly requestId: number;
  readonly cx: number;
  readonly cz: number;
};

export type NorthernChunkResultMessage = {
  readonly type: 'result';
  readonly requestId: number;
  readonly cx: number;
  readonly cz: number;
  readonly chunk: NorthernChunk;
};

export type NorthernChunkErrorMessage = {
  readonly type: 'error';
  readonly requestId: number;
  readonly cx: number;
  readonly cz: number;
  readonly message: string;
};

/** Everything the worker can send back for a single request: exactly one result or one error. */
export type NorthernWorkerMessage = NorthernChunkResultMessage | NorthernChunkErrorMessage;

/**
 * Pure, synchronous, environment-agnostic request handler. Shared by the real worker
 * bootstrap below and by in-process test transports, so both exercise identical logic.
 */
export function handleNorthernChunkRequest(request: NorthernChunkRequest): NorthernWorkerMessage {
  try {
    const chunk = generateNorthernChunk(request.cx, request.cz);
    return { type: 'result', requestId: request.requestId, cx: request.cx, cz: request.cz, chunk };
  } catch (error) {
    return {
      type: 'error',
      requestId: request.requestId,
      cx: request.cx,
      cz: request.cz,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Every ArrayBuffer inside a generated chunk, ready for a `postMessage` transfer list. */
export function collectChunkTransferables(chunk: NorthernChunk): ArrayBuffer[] {
  const buffers = new Set<ArrayBuffer>([
    chunk.vertices.buffer as ArrayBuffer,
    chunk.indices.buffer as ArrayBuffer,
    chunk.colors.buffer as ArrayBuffer,
    chunk.props.type.buffer as ArrayBuffer,
    chunk.props.x.buffer as ArrayBuffer,
    chunk.props.y.buffer as ArrayBuffer,
    chunk.props.z.buffer as ArrayBuffer,
    chunk.props.rotationY.buffer as ArrayBuffer,
    chunk.props.scale.buffer as ArrayBuffer,
    chunk.props.variant.buffer as ArrayBuffer,
  ]);
  if (chunk.waterVertices) buffers.add(chunk.waterVertices.buffer as ArrayBuffer);
  if (chunk.waterIndices) buffers.add(chunk.waterIndices.buffer as ArrayBuffer);
  if (chunk.waterColors) buffers.add(chunk.waterColors.buffer as ArrayBuffer);
  return Array.from(buffers);
}

/** Minimal shape of a dedicated-worker global scope, described locally to avoid depending on
 *  the "webworker" lib (which would conflict with this project's "DOM" lib). */
type WorkerLikeScope = {
  postMessage(message: NorthernWorkerMessage, transfer: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<NorthernChunkRequest>) => void): void;
};

function currentWorkerScope(): WorkerLikeScope | undefined {
  if (typeof self === 'undefined') return undefined;
  const scope = self as unknown as { document?: unknown; postMessage?: unknown; addEventListener?: unknown };
  // Dedicated workers have no `document`; the main thread / a DOM window always does.
  if (scope.document !== undefined) return undefined;
  if (typeof scope.postMessage !== 'function' || typeof scope.addEventListener !== 'function') return undefined;
  return self as unknown as WorkerLikeScope;
}

const workerScope = currentWorkerScope();
if (workerScope) {
  workerScope.addEventListener('message', event => {
    const message = handleNorthernChunkRequest(event.data);
    const transfer = message.type === 'result' ? collectChunkTransferables(message.chunk) : [];
    workerScope.postMessage(message, transfer);
  });
}
