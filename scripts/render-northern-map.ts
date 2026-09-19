// Rebuild the reference map from the same terrain and route definitions as the game.
// Run: node --import tsx scripts/render-northern-map.ts
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { sampledHeightAt, waterHeightAt, ROUTES, NORTHERN_SPAWN } from '../src/game/northern-terrain';
import { ADVENTURE_REGIONS } from '../src/game/northern-adventures';
import { VALLEY_TRAIL } from '../src/game/northern-valley';
import { FOREST_TRAILS } from '../src/game/northern-forest';
import { COAST_TRAILS, COAST_START } from '../src/game/northern-coast';
import { PASS_TRAILS, PASS_START } from '../src/game/northern-pass';
import { EMBER_TRAILS, EMBER_START } from '../src/game/northern-ember';
import { MARSH_TRAILS, MARSH_START } from '../src/game/northern-marsh';

const resolution = 512, worldSize = 1536, mapSize = 1080, left = 60, top = 190;
const heights = new Float32Array(resolution * resolution);
const depths = new Float32Array(heights.length);
for (let j = 0; j < resolution; j++) for (let i = 0; i < resolution; i++) {
  const x = -768 + (i + 0.5) * worldSize / resolution, z = -768 + (j + 0.5) * worldSize / resolution;
  const k = j * resolution + i, h = sampledHeightAt(x, z), water = waterHeightAt(x, z);
  heights[k] = h; depths[k] = water === null ? 0 : Math.max(0.01, water - h);
}
const stops = [[0,190,180,137],[12,127,153,106],[40,104,128,92],[80,145,139,119],[110,179,184,174],[145,235,239,228]];
const pixels = new Uint8ClampedArray(heights.length * 4);
for (let j = 0; j < resolution; j++) for (let i = 0; i < resolution; i++) {
  const k = j * resolution + i, h = heights[k], depth = depths[k];
  let color: number[];
  if (depth > 0) {
    const d = Math.min(1, depth / 15);
    color = [90 - 46*d, 165 - 66*d, 179 - 48*d];
  } else {
    const high = stops.findIndex(s => s[0] > h), b = high < 0 ? stops.at(-1)! : stops[high];
    const a = stops[Math.max(0, high - 1)], t = high <= 0 ? (high < 0 ? 1 : 0) : (h-a[0])/(b[0]-a[0]);
    const dx = heights[j*resolution+Math.min(resolution-1,i+1)] - heights[j*resolution+Math.max(0,i-1)];
    const dz = heights[Math.min(resolution-1,j+1)*resolution+i] - heights[Math.max(0,j-1)*resolution+i];
    const shade = Math.max(0.55, Math.min(1.23, 0.94 - (dx+dz)*0.032));
    color = a.slice(1).map((v,c) => (v+(b[c+1]-v)*t)*shade);
  }
  pixels.set([...color,255],k*4);
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1400 }, deviceScaleFactor: 1 });
  const raster = await page.evaluate(({ data, size }) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data), size, size),0,0);
    return canvas.toDataURL('image/png');
  }, { data: Array.from(pixels), size: resolution });
  const x = (v: number) => left + (v+768)/worldSize*mapSize;
  const y = (v: number) => top + (v+768)/worldSize*mapSize;
  const escape = (s: string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;');
  const text = (px: number, py: number, label: string, size = 20, color = '#29483e', weight = 400) =>
    `<text x="${px}" y="${py}" font-size="${size}" fill="${color}" font-weight="${weight}">${escape(label)}</text>`;
  const paths = (points: readonly {x:number;z:number}[], color: string, width: number) =>
    `<polyline points="${points.map(p=>`${x(p.x)},${y(p.z)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const existing = [
    {name:'River Valley',start:{x:-290,z:205},bounds:[-425,-190,65,330],detail:'Shallow fords · sculpted riverbanks'},
    {name:'Pine Hollow',start:{x:-95,z:465},bounds:[-215,65,330,595],detail:'Forest ravine · rock saddle · lake view'},
    {name:'Fjord Coast / Pebble Cove',start:COAST_START,bounds:[-725,-435,255,550],detail:'Beach logs · rocks in shallow water'},
    {name:'High Pass',start:PASS_START,bounds:[475,695,-660,-350],detail:'Twin peaks · ice hollow · high lookout'},
    {name:'Ember Basin',start:EMBER_START,bounds:[475,725,285,580],detail:'Hidden caldera · basalt · rim views'},
    {name:'Willow Marsh',start:MARSH_START,bounds:[-400,-145,-220,125],detail:'Reed ford · willow islands · lookout'},
  ];
  const details: Record<string, string> = {
    'timber-run': 'Fallen trunks · gully · hillside bypass',
    'stonegate-basin': 'Enclosed bowl · stone garden · rim',
    'boulder-shoals': 'Climbable rocks · sea stacks · beach',
    'windstone-ridge': 'Natural arch · rolling crest · lookout',
    'ochre-terraces': 'Stone shelves · rock ramp · winding descent',
    'great-lake': 'Scalloped coves · willow island · shallow shelves',
    'alder-river': 'Winding channel · gravel fords · bank trail',
  };
  const newIds = new Set(['great-lake', 'alder-river']);
  const ordered = ['timber-run', 'stonegate-basin', 'boulder-shoals', 'windstone-ridge', 'ochre-terraces', 'great-lake', 'alder-river'];
  const regions = [...existing, ...ordered.map(id => {
    const r = ADVENTURE_REGIONS.find(r => r.id === id)!;
    return { ...r, detail: details[id] };
  })];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1400" viewBox="0 0 1800 1400"><style>text{font-family:Arial,Helvetica,sans-serif}</style><rect width="1800" height="1400" fill="#f5f1e6"/>`;
  svg += text(60,75,'NORTHERN REACH',44,'#29483e',700)+text(60,116,'Current terrain · 1,536 × 1,536 m · north is up · September 2026',22);
  svg += text(60,165,'TERRAIN, WATER & DRIVING ROUTES',16,'#506759',700);
  svg += `<image x="${left}" y="${top}" width="${mapSize}" height="${mapSize}" href="${raster}"/>`;
  for(let n=0;n<=16;n++) {
    const p=left+n*mapSize/16,q=top+n*mapSize/16;
    svg+=`<path d="M ${p} ${top} V ${top+mapSize} M ${left} ${q} H ${left+mapSize}" stroke="#ffffff" stroke-opacity=".12" fill="none"/>`;
  }
  for(const route of ROUTES) svg+=paths(route.line,'#534b37',5)+paths(route.line,'#f5e5b9',2.8);
  for(const points of [VALLEY_TRAIL,...[FOREST_TRAILS,COAST_TRAILS,PASS_TRAILS,EMBER_TRAILS,MARSH_TRAILS].flatMap(a=>a.map(t=>t.points))]) svg+=paths(points,'#f6f5da',2);
  for(const r of ADVENTURE_REGIONS) for(const trail of r.trails) svg+=newIds.has(r.id)
    ? paths(trail.points,'#63351c',4)+paths(trail.points,'#ffc267',2.4) : paths(trail.points,'#f6f5da',2);
  regions.forEach((r,i)=>{
    const fresh=i===0||i>=11, color=fresh?'#b65724':'#275d55', [l,rr,t,b]=r.bounds;
    svg+=`<rect x="${x(l)}" y="${y(t)}" width="${(rr-l)*mapSize/worldSize}" height="${(b-t)*mapSize/worldSize}" rx="9" fill="none" stroke="${fresh?'#ffb85f':'#d1e4ce'}" stroke-width="${fresh?3:1.5}" stroke-dasharray="8 5"/>`;
    svg+=`<circle cx="${x(r.start.x)}" cy="${y(r.start.z)}" r="17" fill="${color}" stroke="#fff8e8" stroke-width="2"/>`;
    svg+=text(x(r.start.x)-(i>=9?11:6),y(r.start.z)+7,String(i+1),20,'#ffffff',700);
    const cy=218+i*73;
    svg+=`<circle cx="1212" cy="${cy-7}" r="17" fill="${color}"/>`+text(i>=9?1201:1206,cy,String(i+1),20,'#ffffff',700);
    svg+=text(1245,cy,r.name,24,color,700)+text(1245,cy+29,r.detail,18);
    if(fresh)svg+=text(1245,cy+50,i===0?'OUTLET LOWERED & BANK LINKS REGRADED':'REWORKED IN THIS UPDATE',12,color,700);
  });
  svg+=`<circle cx="${x(NORTHERN_SPAWN.x)}" cy="${y(NORTHERN_SPAWN.z)}" r="6" fill="#fff" stroke="#263c32" stroke-width="2"/>`;
  svg+=text(x(NORTHERN_SPAWN.x)+12,y(NORTHERN_SPAWN.z)+5,'START',14,'#223e30',700);
  svg+=text(1178,1200,'Dashed outlines: approximate authored regions',18)+text(1178,1230,'Pale trails: existing  ·  amber trails: new',18)+text(1178,1260,'Fine grid: 96 m streaming chunks',18);
  svg+=`<path d="M 60 1313 h ${300*mapSize/worldSize} m 0 -7 v 14 M 60 1306 v 14" stroke="#29483e" stroke-width="3"/>`+text(60,1345,'0',16)+text(230,1345,'300 m',16);
  svg+=text(395,1320,'Relief and water sampled from the game; individual props are omitted.',18)+text(395,1350,'Region numbers identify areas, not a required driving order.',18);
  svg+='</svg>';
  const dir='artifacts/northern-reach'; await mkdir(dir,{recursive:true});
  await writeFile(`${dir}/mapa-northern-reach.svg`,svg);
  await page.setContent(`<body style="margin:0"><img width="1800" height="1400" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></body>`);
  await page.locator('img').evaluate((img: HTMLImageElement)=>img.decode());
  await page.screenshot({path:`${dir}/mapa-northern-reach.png`});
  console.log(`Updated ${dir}/mapa-northern-reach.{svg,png}`);
} finally { await browser.close(); }
