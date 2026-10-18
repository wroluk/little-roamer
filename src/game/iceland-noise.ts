/** Positional noise: independent of chunk order, with no repeating stripe axis. */
export function icelandHash(x: number, z: number) {
  let n = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function icelandNoise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const sx = x - ix, sz = z - iz;
  const u = sx * sx * (3 - 2 * sx), v = sz * sz * (3 - 2 * sz);
  const a = icelandHash(ix, iz), b = icelandHash(ix + 1, iz);
  const c = icelandHash(ix, iz + 1), d = icelandHash(ix + 1, iz + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
