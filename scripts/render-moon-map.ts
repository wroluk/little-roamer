// Rebuild the navigation reference from the game's current terrain, routes and starts.
// Run: node --import tsx scripts/render-moon-map.ts
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { MOON_HALF, MOON_HOLLOW_ROOF, MOON_ROUTES, MOON_STARTS, moonColor, moonHollowCentreX, moonSurfaceHeight } from '../src/game/moon-terrain';
import { moonHollowOpening } from '../src/game/moon-hollow';

const resolution = 384, worldSize = MOON_HALF * 2;
const width = 1600, height = 1300, left = 50, top = 170, mapSize = 900;
const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const heights = new Float32Array(resolution * resolution);
const pixels = new Uint8ClampedArray(heights.length * 4);
for (let j = 0; j < resolution; j++) for (let i = 0; i < resolution; i++) {
  const x = -MOON_HALF + (i + 0.5) * worldSize / resolution;
  const z = -MOON_HALF + (j + 0.5) * worldSize / resolution;
  heights[j * resolution + i] = moonSurfaceHeight(x, z);
}
for (let j = 0; j < resolution; j++) for (let i = 0; i < resolution; i++) {
  const dx = heights[j * resolution + Math.min(resolution - 1, i + 1)]
    - heights[j * resolution + Math.max(0, i - 1)];
  const dz = heights[Math.min(resolution - 1, j + 1) * resolution + i]
    - heights[Math.max(0, j - 1) * resolution + i];
  const shade = Math.max(0.45, Math.min(1.3, 0.95 - (dx + dz) * 0.1));
  const color = moonColor(-MOON_HALF + (i + 0.5) * worldSize / resolution,
    -MOON_HALF + (j + 0.5) * worldSize / resolution);
  pixels.set([...color.map(value => Math.round(Math.min(255, 255 * Math.sqrt(value) * shade))), 255],
    (j * resolution + i) * 4);
}
const colors = ['#fff1c3', '#fff1c3', '#ffb45f', '#72e1df', '#d7afff', '#d7afff', '#c8e883', '#c8e883', '#edc3e4', '#edc3e4'];
const labels: Record<string, { dx: number; dy: number; color: string; detail: string }> = {
  'earthview-base': { dx: -190, dy: -25, color: colors[0], detail: 'Home start / shelter to the west' },
  'earthrise-overlook': { dx: -150, dy: -25, color: colors[0], detail: 'Northern rim / Earth above the horizon' },
  'crater-floor': { dx: -100, dy: 45, color: colors[0], detail: 'Quiet Crater / return via the graded descent' },
  'basalt-reach': { dx: -105, dy: 55, color: colors[2], detail: 'Dark lava lobes in the south' },
  'silver-rille': { dx: 25, dy: 0, color: colors[3], detail: 'Winding channel in the east' },
  'broken-highlands': { dx: -125, dy: -25, color: colors[6], detail: 'Pale uplands and optional western ridge' },
  'skylight-hollow': { dx: 25, dy: -20, color: colors[8], detail: 'NEW / short passage and easy western bypass' },
};
const x = (v: number) => left + (v + MOON_HALF) / worldSize * mapSize;
const y = (v: number) => top + (v + MOON_HALF) / worldSize * mapSize;
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (px: number, py: number, value: string, size = 20, color = '#eae8df', weight = 400) =>
  `<text x="${px}" y="${py}" font-size="${size}" fill="${color}" font-weight="${weight}">${escape(value)}</text>`;
const path = (points: readonly { x: number; z: number }[]) =>
  points.map(p => `${x(p.x)},${y(p.z)}`).join(' ');
assert.equal(colors.length, MOON_ROUTES.length, 'Give each current route a map style');
assert.equal(Object.keys(labels).length, MOON_STARTS.length, 'Label every current regional start');
for (const route of MOON_ROUTES) for (const p of route.points)
  assert.ok(Math.abs(p.x) < MOON_HALF && Math.abs(p.z) < MOON_HALF, 'Keep every route on the map');
assert.ok([...heights].every(Number.isFinite), 'Terrain sampling must not contain holes');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const raster = await page.evaluate(({ data, size }) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Map raster requires a 2D canvas');
    context.putImageData(new ImageData(new Uint8ClampedArray(data), size, size), 0, 0);
    return canvas.toDataURL('image/png');
  }, { data: Array.from(pixels), size: resolution });
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += '<style>text{font-family:Arial,Helvetica,sans-serif}.label{paint-order:stroke;stroke:#161c20;stroke-width:5;stroke-linejoin:round}</style>';
  svg += `<rect width="${width}" height="${height}" fill="#161c20"/>`;
  svg += text(50, 70, 'MOON / FIND YOUR WAY', 42, '#fff1c3', 700);
  svg += text(50, 110, `Current built terrain + route guide / north is up / ${date}`, 23);
  svg += text(50, 145, 'Sampled relief, not an aerial game capture. Route lines are navigation overlays, not painted roads.', 17, '#acb8b9');
  svg += `<image x="${left}" y="${top}" width="${mapSize}" height="${mapSize}" href="${raster}"/>`;
  for (let n = 0; n <= 8; n++) {
    const p = left + n * mapSize / 8, q = top + n * mapSize / 8;
    svg += `<path d="M ${p} ${top} V ${top + mapSize} M ${left} ${q} H ${left + mapSize}" stroke="#fff" stroke-opacity=".13" fill="none"/>`;
  }
  svg += `<rect x="${left}" y="${top}" width="${mapSize}" height="${mapSize}" fill="none" stroke="#acb8b9"/>`;
  const roofRows = Array.from({ length: 30 }, (_, i) => MOON_HOLLOW_ROOF.north + i * 2);
  const roofBoundary = [-1, 1].flatMap(side => (side < 0 ? roofRows : [...roofRows].reverse())
    .map(z => ({ x: moonHollowCentreX(z) + side * MOON_HOLLOW_ROOF.halfWidth, z })));
  const openingRows = Array.from({ length: 13 }, (_, i) => MOON_HOLLOW_ROOF.skylight - 12 + i * 2);
  const openingBoundary = [-1, 1].flatMap(side => (side < 0 ? openingRows : [...openingRows].reverse())
    .map(z => ({ x: moonHollowCentreX(z) + side * moonHollowOpening(z), z })));
  svg += `<path d="M ${path(roofBoundary)} Z M ${path(openingBoundary)} Z" fill="#25272b" fill-rule="evenodd" stroke="${colors[8]}" stroke-width="1.5"/>`;
  MOON_ROUTES.forEach((route, i) => {
    const points = path(route.points), dash = [4, 5, 7, 9].includes(i) ? ' stroke-dasharray="10 7"' : '';
    svg += `<polyline points="${points}" fill="none" stroke="#161c20" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>`;
    svg += `<polyline points="${points}" fill="none" stroke="${colors[i]}" stroke-width="4"${dash} stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  MOON_STARTS.forEach((start, i) => {
    const label = labels[start.id];
    assert.ok(label, `Missing map label for ${start.id}`);
    const px = x(start.position.x), py = y(start.position.z), color = label.color;
    svg += `<a href="http://localhost:5173/?area=moon&amp;start=${escape(start.id)}">`;
    svg += `<circle cx="${px}" cy="${py}" r="16" fill="#161c20" stroke="${color}" stroke-width="3"/>`;
    svg += text(px - 6, py + 7, String(i + 1), 20, color, 700);
    svg += `<g class="label">${text(px + label.dx, py + label.dy, start.name, 21, color, 700)}</g>`;
    const row = 230 + i * 73;
    svg += `<circle cx="1018" cy="${row - 7}" r="17" fill="${color}"/>`;
    svg += text(1012, row, String(i + 1), 20, '#161c20', 700);
    svg += text(1050, row, start.name, 27, color, 700);
    svg += text(1050, row + 28, label.detail, 17);
    svg += '</a>';
  });
  svg += '<path d="M 915 125 V 65 m -9 14 9 -14 9 14" fill="none" stroke="#fff1c3" stroke-width="3"/>';
  svg += text(905, 52, 'N', 22, '#fff1c3', 700);
  svg += text(1000, 750, 'FROM EARTHVIEW BASE', 23, '#fff1c3', 700);
  svg += text(1000, 787, 'Basalt / rille: orange south, then cyan', 21);
  svg += text(1000, 817, 'north through the channel.', 21);
  svg += text(1000, 857, 'Highlands: circuit north, green branch west;', 21);
  svg += text(1000, 887, 'return east to Earthrise Overlook.', 21);
  svg += text(1000, 927, 'Hollow: pink southwest; dashed bypass west.', 21);
  svg += text(1000, 957, 'Both rejoin the basalt approach to the east.', 21);
  for (const [i, label] of ['Crater circuit / floor descent', 'Basalt approach', 'Silver Rille floor', 'Optional bank / crossing breach', 'Broken Highlands traverse', 'Optional highland ridge', 'Skylight Hollow passage', 'Hollow surface bypass'].entries()) {
    const py = 1007 + i * 33, color = colors[[0, 2, 3, 4, 6, 7, 8, 9][i]];
    svg += `<path d="M 1000 ${py - 6} h 38" stroke="${color}" stroke-width="4"${[3, 5, 7].includes(i) ? ' stroke-dasharray="8 5"' : ''}/>`;
    svg += text(1050, py, label, 20);
  }
  svg += `<path d="M 50 1100 h ${100 * mapSize / worldSize} m 0 -6 v 12 M 50 1094 v 12" stroke="#eae8df" stroke-width="3"/>`;
  svg += text(50, 1130, '0', 16) + text(145, 1130, '100 m', 16);
  svg += text(250, 1105, '768 m detailed footprint / grid: 96 m / west = left, east = right', 18);
  svg += text(250, 1133, 'Individual props omitted. Dark Hollow roof and its daylight opening shown.', 17, '#acb8b9');
  svg += '</svg>';
  const folder = 'artifacts/moon';
  await mkdir(folder, { recursive: true });
  await writeFile(`${folder}/moon-map.svg`, svg);
  await page.setContent(`<body style="margin:0"><img width="${width}" height="${height}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></body>`);
  await page.locator('img').evaluate((image: HTMLImageElement) => image.decode());
  assert.equal(await page.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth), width);
  await page.screenshot({ path: `${folder}/moon-map.png` });
  console.log(`Updated ${folder}/moon-map.svg and moon-map.png (${MOON_STARTS.length} starts, ${MOON_ROUTES.length} routes)`);
} finally {
  await browser.close();
}
