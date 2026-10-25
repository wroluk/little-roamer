// Render development-only postcard trigger overlays from the live card definitions.
// Run: node --import tsx artifacts/postcards/render-trigger-maps.mjs [moon|mars|northern-reach]
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { POSTCARDS } from '../../src/game/postcards.ts';

const northernOrder = [
  'river-valley', 'pine-hollows', 'fjord-coast', 'high-pass', 'ember-basin',
  'willow-marsh', 'timber-run', 'stonegate-basin', 'boulder-shoals',
  'windstone-ridge', 'ochre-terraces', 'great-lake', 'alder-river',
  'river-mouth', 'outer-headlands', 'driftwood-strand', 'stone-circle',
];
const worlds = [
  { area: 'moon', source: 'artifacts/moon/moon-map.svg',
    output: 'artifacts/moon/postcard-trigger-map', width: 1600, height: 1300,
    originX: 500, originY: 620, scale: 900 / 768,
    panelX: 990, panelY: 185, panelWidth: 570, rowHeight: 100,
    title: 'MOON' },
  { area: 'mars', source: 'artifacts/mars/concept-map.svg',
    output: 'artifacts/mars/postcard-trigger-map', width: 1450, height: 1000,
    originX: 450, originY: 490, scale: .5, panelX: 850, panelY: 125,
    panelWidth: 550, rowHeight: 67, title: 'MARS OUTPOST' },
  { area: 'northern-reach', source: 'artifacts/northern-reach/mapa-northern-reach.svg',
    output: 'artifacts/northern-reach/postcard-trigger-map', width: 1800, height: 1400,
    originX: 60 + 1080 / 2, originY: 190 + 1080 / 2, scale: 1080 / 1536,
    panelX: 1170, panelY: 175, panelWidth: 585, rowHeight: 54,
    title: 'NORTHERN REACH' },
];
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const num = value => Number(value.toFixed(2));
const svgText = (x, y, value, size, color, weight = 400) =>
  `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" style="fill:${color}">${esc(value)}</text>`;

function overlay(world, cards) {
  const px = x => num(world.originX + x * world.scale);
  const py = z => num(world.originY + z * world.scale);
  const radius = r => num(r * world.scale);
  let out = '<g id="postcard-triggers">';
  cards.forEach((card, index) => {
    const color = card.secret ? '#b24b91' : '#f3a949';
    const zones = [{ x: card.x, z: card.z, radius: card.radius }, ...(card.visitZones ?? [])];
    out += `<g data-postcard="${esc(card.id)}">`;
    zones.forEach((zone, i) => {
      out += `<circle cx="${px(zone.x)}" cy="${py(zone.z)}" r="${radius(zone.radius)}" fill="${color}" fill-opacity="${i ? '.14' : '.22'}" stroke="${card.secret ? '#fff0ff' : '#fff3ca'}" stroke-width="${i ? 2.5 : 3.5}" ${i ? 'stroke-dasharray="8 6"' : ''}/>`;
    });
    const marker = card.secret ? '✦' : `${world.area === 'moon' ? 'P' : ''}${index + 1}`;
    const mx = px(card.x) + (world.area === 'moon' ? 28 : 0);
    const my = py(card.z) + (world.area === 'moon' ? card.id === 'small-blue-home' ? 28 : -28 : 0);
    if (world.area === 'moon') out += `<path d="M ${px(card.x)} ${py(card.z)} L ${mx} ${my}" stroke="${color}" stroke-width="2"/>`;
    out += `<circle cx="${mx}" cy="${my}" r="17" fill="${color}" stroke="#242c2b" stroke-width="2.5"/>`;
    out += `<text x="${mx}" y="${num(my + 6)}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${card.secret ? 20 : world.area === 'moon' ? 16 : 18}" font-weight="700" style="fill:#242c2b">${marker}</text>`;
    out += '</g>';
  });
  out += '</g>';
  const { panelX: x, panelY: y, panelWidth: w } = world;
  if (world.area === 'moon') out += `<rect x="980" y="170" width="620" height="1100" fill="#161c20"/>`;
  const panelHeight = world.area === 'northern-reach' ? 1125 : 850;
  out += `<rect x="${x}" y="${y}" width="${w}" height="${panelHeight}" rx="18" fill="#f8f3e8" stroke="#d9cbbb" stroke-width="2"/>`;
  out += svgText(x + 26, y + 42, 'POSTCARD TRIGGER AREAS', 25, '#263f3c', 700);
  out += svgText(x + 26, y + 72, 'Solid ring = main zone  ·  dashed = alternate approach', 15, '#5a6b62');
  out += svgText(x + 26, y + 96, 'Exact x/z centres and radii from src/game/postcards.ts', 15, '#5a6b62');
  const firstRow = y + 133;
  cards.forEach((card, index) => {
    const cy = firstRow + index * world.rowHeight;
    const zoneCount = 1 + (card.visitZones?.length ?? 0);
    const color = card.secret ? '#b24b91' : '#bc6730';
    out += `<circle cx="${x + 42}" cy="${cy - 6}" r="16" fill="${color}"/>`;
    out += `<text x="${x + 42}" y="${cy}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${card.secret ? 19 : 17}" font-weight="700" style="fill:#fff9ec">${card.secret ? '✦' : `${world.area === 'moon' ? 'P' : ''}${index + 1}`}</text>`;
    out += svgText(x + 72, cy, card.name, world.area === 'northern-reach' ? 18 : 19, '#263f3c', 700);
    out += svgText(x + 72, cy + 20, `${zoneCount} ${zoneCount === 1 ? 'zone' : 'zones'} · main radius ${card.radius} m${card.secret ? ' · secret' : ''}`, 14, '#69786b');
    if (world.area === 'moon') out += svgText(x + 72, cy + 42, `Centre X ${card.x} / Z ${card.z}`, 14, '#69786b');
  });
  const footY = y + panelHeight - 52;
  out += svgText(x + 26, footY, 'After 8 m of driving, a pass through any ring unlocks.', 15, '#5a6b62');
  out += svgText(x + 26, footY + 22, 'Spawn, reset and teleport do not count as discovery.', 15, '#5a6b62');
  return out;
}

const selectedWorlds = worlds.filter(world => !process.argv[2] || world.area === process.argv[2]);
if (!selectedWorlds.length) throw new Error(`Unknown postcard map area: ${process.argv[2]}`);
const browser = await chromium.launch();
try {
  for (const world of selectedWorlds) {
    let source = await readFile(world.source, 'utf8');
    if (world.area === 'moon') source = source.replace('MOON / FIND YOUR WAY', 'MOON / POSTCARD TRIGGER AREAS');
    const sourceBody = source.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    const cards = POSTCARDS.filter(card => card.area === world.area);
    if (world.area === 'northern-reach') cards.sort((a, b) => northernOrder.indexOf(a.id) - northernOrder.indexOf(b.id));
    const base = world.area === 'mars' ? `<rect width="${world.width}" height="${world.height}" fill="#211d24"/>` : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${world.width}" height="${world.height}" viewBox="0 0 ${world.width} ${world.height}">${base}${sourceBody}${overlay(world, cards)}</svg>`;
    await writeFile(`${world.output}.svg`, svg);
    const page = await browser.newPage({ viewport: { width: world.width, height: world.height }, deviceScaleFactor: 1 });
    await page.setContent(`<body style="margin:0"><img width="${world.width}" height="${world.height}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></body>`);
    await page.locator('img').evaluate(image => image.decode());
    await page.screenshot({ path: `${world.output}.png` });
    await page.close();
    console.log(`${world.title}: ${cards.length} postcard areas -> ${world.output}.svg/.png`);
  }
} finally { await browser.close(); }
