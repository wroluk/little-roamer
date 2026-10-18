import { generateIcelandChunk } from './iceland-terrain';

self.onmessage = (event: MessageEvent<{ id: number; cx: number; cz: number }>) => {
  const { id, cx, cz } = event.data;
  try {
    const chunk = generateIcelandChunk(cx, cz);
    self.postMessage({ id, chunk }, { transfer: [chunk.vertices.buffer, chunk.colors.buffer, chunk.normals.buffer, chunk.indices.buffer] });
  } catch (error) { self.postMessage({ id, error: String(error) }); }
};
