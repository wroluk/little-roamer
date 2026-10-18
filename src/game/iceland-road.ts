/** Compressed Route 1. Westfjords will connect by a separate regional branch. */
export type RoadPoint = { x: number; z: number; y: number };
const anchors = [
  [-575, 530], [-490, 530], [-420, 550], [-300, 570], [-160, 590], [0, 600],
  [180, 610], [380, 610], [510, 610], [610, 530], [640, 380], [635, 200],
  [640, 0], [630, -200], [580, -390], [440, -530], [260, -565], [80, -590],
  [-120, -560], [-290, -500], [-400, -390], [-480, -260],
  [-640, -120], [-640, 70], [-640, 250], [-640, 420], [-638, 500],
];
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
const controls = anchors.map(([x, z], i) => {
  const shelf = 6.3 - 0.018 * (z - 500);
  const westernCoast = smooth((-x - 615) / 25);
  return { x, z, y: i < 2 ? 6.3 : shelf + 42 * (1 - smooth((z - 300) / 210)) * (1 - westernCoast) };
});
const cubic = (a: number, b: number, c: number, d: number, t: number) =>
  0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
export const ICELAND_RING_ROAD: RoadPoint[] = [];
for (let i = 0; i < controls.length; i++) {
  const n = controls.length, a = controls[(i + n - 1) % n], b = controls[i], c = controls[(i + 1) % n], d = controls[(i + 2) % n];
  const count = Math.ceil(Math.hypot(c.x - b.x, c.z - b.z) / 8);
  for (let j = 0; j < count; j++) {
    const t = j / count;
    // Keep the bridge centreline straight through its deck.
    ICELAND_RING_ROAD.push(i === 0 ? { x: b.x + (c.x - b.x) * t, z: 530, y: 6.3 }
      : { x: cubic(a.x, b.x, c.x, d.x, t), z: cubic(a.z, b.z, c.z, d.z, t), y: cubic(a.y, b.y, c.y, d.y, t) });
  }
}
ICELAND_RING_ROAD.push({ ...ICELAND_RING_ROAD[0] });
const buckets = new Map<string, number[]>();
export const RING_HALF_WIDTH = 5;
export let ICELAND_RING_LENGTH = 0;
const distances: number[] = [];
for (let i = 0; i < ICELAND_RING_ROAD.length - 1; i++) {
  const a = ICELAND_RING_ROAD[i], b = ICELAND_RING_ROAD[i + 1]; distances.push(ICELAND_RING_LENGTH);
  ICELAND_RING_LENGTH += Math.hypot(b.x - a.x, b.z - a.z);
  for (let x = Math.floor((Math.min(a.x, b.x) - 40) / 96); x <= Math.floor((Math.max(a.x, b.x) + 40) / 96); x++)
    for (let z = Math.floor((Math.min(a.z, b.z) - 40) / 96); z <= Math.floor((Math.max(a.z, b.z) + 40) / 96); z++) {
      const key = `${x},${z}`, list = buckets.get(key) ?? []; list.push(i); buckets.set(key, list);
    }
}
/** Bounded local segment lookup also used by worker terrain, without Three.js. */
export function ringRoadAt(x: number, z: number) {
  let distance = Infinity, height = 0, along = 0;
  for (const i of buckets.get(`${Math.floor(x / 96)},${Math.floor(z / 96)}`) ?? []) {
    const a = ICELAND_RING_ROAD[i], b = ICELAND_RING_ROAD[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const length2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length2));
    const dist = Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
    if (dist < distance) { distance = dist; height = a.y + (b.y - a.y) * t; along = distances[i] + Math.sqrt(length2) * t; }
  }
  return { distance, height, along };
}
