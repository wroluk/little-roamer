// Run before the postcard overlay: node --import tsx scripts/render-island-tracks-map.ts
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { TIDAL_BOUNDS, HOME_LOOP, MAINLAND_LOOP, HEATHER_CUT, WHALES_BACK, TIDAL_ROUTE,
  SEABIRD_CLIMB, PEBBLE_DESCENT, CLIFF_WADE, WEST_BEACON_APPROACH, WEST_BEACH_APPROACH,
  NORTH_COVE_APPROACH, SMUGGLERS_APPROACH, tidalGroundHeight, tidalColor } from '../src/game/tidal-terrain';

const [minX, minZ, maxX, maxZ] = TIDAL_BOUNDS;
const scale = 1.5, left = 40, top = 160, width = 1980, height = 1050;
const cols = (maxX - minX) / 2, rows = (maxZ - minZ) / 2;
const heights = new Float32Array(cols * rows), pixels = new Uint8ClampedArray(cols * rows * 4);
for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++)
  heights[j * cols + i] = tidalGroundHeight(minX + i * 2 + 1, minZ + j * 2 + 1);
for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
  const y = heights[j * cols + i];
  const dx = heights[j * cols + Math.min(cols - 1, i + 1)] - heights[j * cols + Math.max(0, i - 1)];
  const dz = heights[Math.min(rows - 1, j + 1) * cols + i] - heights[Math.max(0, j - 1) * cols + i];
  const shade = Math.max(0.5, Math.min(1.25, 0.95 + (dx + dz) * 0.07));
  const color = tidalColor(minX + i * 2 + 1, minZ + j * 2 + 1);
  const rgb = y < 0 ? y > -0.6 ? [139, 192, 186] : [30, 101, 116]
    : [color.r, color.g, color.b].map(value => Math.round(Math.min(255, 255 * Math.sqrt(value) * shade)));
  pixels.set([...rgb, 255], (j * cols + i) * 4);
}
const x = (value: number) => left + (value - minX) * scale;
const z = (value: number) => top + (value - minZ) * scale;
const text = (px: number, py: number, value: string, size = 20) =>
  `<text x="${px}" y="${py}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="#f3edda">${value}</text>`;
const routes = [
  { points: HOME_LOOP, color: '#f5e1a3' }, { points: MAINLAND_LOOP, color: '#f5e1a3' },
  { points: WEST_BEACON_APPROACH, color: '#f5e1a3' }, { points: WEST_BEACH_APPROACH, color: '#f5e1a3' },
  { points: NORTH_COVE_APPROACH, color: '#f5e1a3' },
  { points: HEATHER_CUT, color: '#ef975e' }, { points: WHALES_BACK, color: '#ef975e' },
  { points: TIDAL_ROUTE, color: '#76e2ec' }, { points: SEABIRD_CLIMB, color: '#ef975e' },
  { points: PEBBLE_DESCENT, color: '#ef975e' }, { points: CLIFF_WADE, color: '#76e2ec' },
  { points: SMUGGLERS_APPROACH, color: '#d99dc6' },
];
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const raster = await page.evaluate(({ pixels, cols, rows }) => {
    const canvas = document.createElement('canvas'); canvas.width = cols; canvas.height = rows;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Island Tracks map requires a 2D canvas');
    context.putImageData(new ImageData(new Uint8ClampedArray(pixels), cols, rows), 0, 0);
    return canvas.toDataURL('image/png');
  }, { pixels: Array.from(pixels), cols, rows });
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="#192c30"/>`;
  svg += text(40, 65, 'ISLAND TRACKS / POSTCARD TRIGGER AREAS', 36);
  svg += text(40, 105, 'Development reference / sampled current terrain / north is up / includes the hidden discovery', 21);
  svg += text(40, 135, 'Route overlays are guides, not painted roads. This is not an in-game map.', 17);
  svg += `<image x="${left}" y="${top}" width="${(maxX - minX) * scale}" height="${(maxZ - minZ) * scale}" href="${raster}"/>`;
  for (let gridX = -600; gridX <= maxX; gridX += 100) {
    svg += `<path d="M ${x(gridX)} ${top} v ${(maxZ - minZ) * scale}" stroke="#fff" stroke-opacity=".15"/>`;
    svg += text(x(gridX) - 18, top + (maxZ - minZ) * scale + 24, String(gridX), 15);
  }
  for (let gridZ = minZ; gridZ <= maxZ; gridZ += 100)
    svg += `<path d="M ${left} ${z(gridZ)} h ${(maxX - minX) * scale}" stroke="#fff" stroke-opacity=".15"/>`;
  for (const route of routes) {
    const points = route.points.map(point => `${x(point.x)},${z(point.z)}`).join(' ');
    svg += `<polyline points="${points}" fill="none" stroke="#192c30" stroke-width="5" stroke-linejoin="round"/>`;
    svg += `<polyline points="${points}" fill="none" stroke="${route.color}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }
  svg += `<path d="M 1290 130 V 80 m -7 10 7 -10 7 10" fill="none" stroke="#f3edda" stroke-width="3"/>`;
  svg += text(1282, 70, 'N', 20);
  svg += `<path d="M 40 820 h 150 m 0 -5 v 10 M 40 815 v 10" stroke="#f3edda" stroke-width="3"/>`;
  svg += text(40, 850, '100 m / 100 m grid / X east, Z south', 18);
  svg += text(40, 895, 'Cream: easy mainland circuits and approaches. Orange: optional rocky rides.', 20);
  svg += text(40, 928, 'Cyan: Rock Passage and cliff-foot shallows. Pink: hidden inlet approach.', 20);
  svg += text(40, 970, 'The map uses the same interpolated terrain as rendering and collision; props are omitted.', 17);
  svg += '</svg>';
  await mkdir('artifacts/island-tracks', { recursive: true });
  await writeFile('artifacts/island-tracks/island-tracks-map.svg', svg);
  await page.setContent(`<body style="margin:0">${svg}</body>`);
  await page.locator('image').evaluate(async image => {
    const img = new Image(); img.src = image.getAttribute('href')!; await img.decode();
  });
  await page.screenshot({ path: 'artifacts/island-tracks/island-tracks-map.png' });
} finally { await browser.close(); }
