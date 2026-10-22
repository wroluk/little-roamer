import type { AreaId } from './areas';
import { NORTHERN_STARTS } from './regional-starts';
import { MARS_STARTS } from './mars-terrain';
import { STONE_CIRCLE } from './northern-discovery-layout';
import { WRECK_PASSAGE, WRECK_SITE } from './mars-wreck-layout';
import { DISH_SITE } from './mars-dish-layout';
import { GLASSFALL_SCAR } from './mars-glassfall-layout';
import { KEYHOLE_ARCH } from './mars-keyhole-layout';
import { TUBES_CENTRE, TUBES_LOOKOUT } from './mars-tubes-layout';
import { DELTA_ROUTES } from './mars-delta-layout';
import { DUNES_ROUTES } from './mars-dunes-layout';
import { VALLEY_FORDS } from './northern-valley';
import { inletCenterX, INLET_FORDS, LAKE_ISLAND, lakeShorePoint } from './northern-watershed';
import { ADVENTURE_REGIONS } from './northern-adventures';
import { PASS_LOOKOUT, PASS_BOWL } from './northern-pass';
import { EMBER_LOOKOUT } from './northern-ember';
import { MARSH_LOOKOUT } from './northern-marsh';
import { FOREST_TRAILS } from './northern-forest';

export type PostcardArea = Extract<AreaId, 'northern-reach' | 'mars'>;
export type Postcard = {
  id: string; area: PostcardArea; name: string; note: string;
  x: number; z: number; radius: number; visitZones?: readonly { x: number; z: number; radius: number }[];
  secret?: boolean; image: string;
};
export type PostcardRecord = { id: string; discoveredAt: string };
export const POSTCARD_STORAGE_KEY = 'little-roamer-postcards-v1';

const northernNotes: Record<string, string> = {
  'pine-hollows': 'Pines gather around a quiet hollow near the first stretch of road.',
  'river-valley': 'Two quiet fords and a ridge above the winding river.',
  'fjord-coast': 'The road gives way to sea stacks, sheltered coves and salt air.',
  'high-pass': 'Cairns lead between the peaks to a view above the clouds.',
  'ember-basin': 'A circle of old fire, now softened by ash and time.',
  'willow-marsh': 'Willows gather around the shallow water and hidden paths.',
  'windstone-ridge': 'A stone arch frames the long climb across the ridge.',
  'ochre-terraces': 'Warm shelves step down the mountainside in broad layers.',
  'timber-run': 'The forest trail winds among fallen trunks and tall pines.',
  'stonegate-basin': 'A sheltered stone bowl opens beyond the narrow pass.',
  'boulder-shoals': 'Sea stacks and smooth stones mark the edge of the land.',
  'great-lake': 'Long coves and pale water make room for a slower turn.',
  'alder-river': 'The river threads between alder banks and gravel fords.',
  'river-mouth': 'The river loosens into tidal channels and open sea.',
  'outer-headlands': 'Weathered cliffs shelter small coves beneath the ridge.',
  'driftwood-strand': 'A long beach collects what the sea leaves behind.',
};
const marsNotes: Record<string, string> = {
  'habitat-seven': 'Ivory domes and a landing pad, a small home on a vast plain.',
  'crown-crater': 'A pale crater rim rises above the old impact floor.',
  'dish-ridge': 'The great receiver watches over the red basin.',
  'glassfall-plain': 'Dark glass follows the path of a long-finished impact.',
  'iron-maze': 'Tall ironstone fins make a winding passage through the dust.',
  'keyhole-badlands': 'An arch of weathered rock opens onto the southern wash.',
  'fossil-delta': 'Dry channels remember where water once found its way.',
  'rust-dunes': 'A crescent of loose sand curls around a dark bedrock island.',
  'lava-tubes': 'Light falls through broken skylights into the cooled lava.',
};
const marsLandmarks: Record<string, { x: number; z: number }> = {
  'crown-crater': { x: 0, z: -195 },
  'dish-ridge': DISH_SITE,
  'glassfall-plain': GLASSFALL_SCAR,
  'iron-maze': { x: 390, z: 455 },
  'keyhole-badlands': KEYHOLE_ARCH,
  'lava-tubes': TUBES_CENTRE,
};
const northernLandmarks: Record<string, { x: number; z: number }> = {
  'stonegate-basin': { x: -260, z: -365 },
  'ember-basin': { x: 592, z: 438 },
  'ochre-terraces': { x: 400, z: 110 },
};
const northernRadii: Record<string, number> = {
  'stonegate-basin': 115,
  'ember-basin': 90,
  'ochre-terraces': 85,
};
const visitZone = (point: { x: number; z: number }, radius = 76) => ({ x: point.x, z: point.z, radius });
const northernTrail = (id: string, name: string) => ADVENTURE_REGIONS.find(region => region.id === id)!
  .trails.find(trail => trail.name === name)!.points;
// A regional start is only one point on a loop or a long bank. Keep discoveries
// available on the other ordinary approaches without widening the whole region.
const northernVisitZones: Record<string, readonly { x: number; z: number; radius: number }[]> = {
  'pine-hollows': [visitZone(FOREST_TRAILS[2].points[1], 52)],
  'river-valley': [visitZone(VALLEY_FORDS[1], 52)],
  'high-pass': [visitZone(PASS_LOOKOUT, 52), visitZone(PASS_BOWL, 46)],
  'ember-basin': [visitZone(EMBER_LOOKOUT, 52)],
  'ochre-terraces': [visitZone({ x: 480, z: 165 }, 85)],
  'willow-marsh': [visitZone(MARSH_LOOKOUT, 52)],
  'timber-run': [visitZone(northernTrail('timber-run', 'Coast Road connection')[2], 52)],
  'windstone-ridge': [visitZone(northernTrail('windstone-ridge', 'Windstone lookout')[0], 52)],
  'great-lake': [
    ...Array.from({ length: 7 }, (_, i) => visitZone(lakeShorePoint(0.4 + (i + 1) * Math.PI / 4, 10), 76)),
    visitZone(LAKE_ISLAND, 50),
  ],
  'alder-river': [
    visitZone({ x: INLET_FORDS[0].x + 42, z: INLET_FORDS[0].z }, 52),
    visitZone(INLET_FORDS[1], 52),
    ...[-180, -280, -380, -480, -550].map(z => visitZone({ x: inletCenterX(z) + 42, z }, 58)),
  ],
  'river-mouth': [visitZone(northernTrail('river-mouth', 'Estuary south spit')[2], 52)],
};
// Ordinary regional cards should unlock on the travelled routes, including arrivals
// from the far end. The regional start alone is insufficient for branching regions.
const marsVisitZones: Record<string, readonly { x: number; z: number; radius: number }[]> = {
  'fossil-delta': [DELTA_ROUTES[1].points[3], DELTA_ROUTES[2].points[2],
    DELTA_ROUTES[3].points[5], DELTA_ROUTES[4].points[0]].map(point => visitZone(point, 68)),
  'rust-dunes': [DUNES_ROUTES[1].points[3], DUNES_ROUTES[2].points[4],
    DUNES_ROUTES[3].points[3]].map(point => visitZone(point, 72)),
  'lava-tubes': [visitZone(TUBES_LOOKOUT)],
};
const image = (area: PostcardArea, id: string) => `./postcards/${area}/${id}.jpg`;
export const POSTCARDS: readonly Postcard[] = [
  { id: 'pine-hollows', area: 'northern-reach', name: 'Pine Hollows',
    note: northernNotes['pine-hollows'], x: -33, z: 503, radius: 72,
    visitZones: northernVisitZones['pine-hollows'],
    image: image('northern-reach', 'pine-hollows') },
  ...NORTHERN_STARTS.filter(start => start.id !== 'northern-reach').map(start => ({
    id: start.id, area: 'northern-reach' as const, name: start.name,
    note: northernNotes[start.id], x: (northernLandmarks[start.id] ?? start.position).x,
    z: (northernLandmarks[start.id] ?? start.position).z,
    radius: northernRadii[start.id] ?? 72,
    visitZones: northernVisitZones[start.id], image: image('northern-reach', start.id),
  })),
  { id: 'stone-circle', area: 'northern-reach', name: 'Stone Circle',
    note: 'Old stones stand quietly inside a hidden hollow.',
    x: STONE_CIRCLE.x, z: STONE_CIRCLE.z, radius: 19, secret: true, image: image('northern-reach', 'stone-circle') },
  ...MARS_STARTS.map(start => {
    const point = marsLandmarks[start.id] ?? start.position;
    return { id: start.id, area: 'mars' as const, name: start.name,
      note: marsNotes[start.id], x: point.x, z: point.z,
      radius: start.id === 'iron-maze' ? 130 : start.id === 'crown-crater' ? 105
        : start.id === 'keyhole-badlands' ? 82 : 76,
      visitZones: marsVisitZones[start.id],
      image: image('mars', start.id) };
  }),
  { id: 'shuttle-wreck', area: 'mars', name: 'Buried Shuttle',
    note: 'A broken tail and three open engines rise from the sand.',
    x: WRECK_SITE.x, z: WRECK_SITE.z, radius: 41,
    visitZones: WRECK_PASSAGE.slice(1).map(point => ({ ...point, radius: 42 })),
    secret: true, image: image('mars', 'shuttle-wreck') },
];

export function readPostcardRecords(storage: Pick<Storage, 'getItem'>): PostcardRecord[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(POSTCARD_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    const known = new Set(POSTCARDS.map(card => card.id));
    const seen = new Set<string>();
    return parsed.filter((record): record is PostcardRecord => {
      if (!record || typeof record !== 'object' || !('id' in record) || !('discoveredAt' in record)
        || typeof record.id !== 'string' || typeof record.discoveredAt !== 'string'
        || !known.has(record.id) || seen.has(record.id)
        || Number.isNaN(Date.parse(record.discoveredAt))) return false;
      seen.add(record.id); return true;
    });
  } catch { return []; }
}

/** Segment distance catches a fast pass between rendered frames. */
function segmentDistanceSquared(ax: number, az: number, bx: number, bz: number, px: number, pz: number) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return (px - ax - t * dx) ** 2 + (pz - az - t * dz) ** 2;
}
export class PostcardTracker {
  private previous: { x: number; z: number };
  private traveled = 0;
  constructor(private readonly found: Set<string>, x: number, z: number) { this.previous = { x, z }; }
  reset(x: number, z: number) { this.previous = { x, z }; this.traveled = 0; }
  update(area: AreaId, x: number, z: number): Postcard[] {
    const distance = Math.hypot(x - this.previous.x, z - this.previous.z);
    // A teleport is not an explored path; movement must come from actual driving.
    if (distance > 25) { this.reset(x, z); return []; }
    const before = this.previous;
    this.previous = { x, z };
    this.traveled += distance;
    if (this.traveled < 8 || (area !== 'northern-reach' && area !== 'mars')) return [];
    const visits = POSTCARDS.filter(card => card.area === area && !this.found.has(card.id)
      && [{ x: card.x, z: card.z, radius: card.radius }, ...(card.visitZones ?? [])].some(zone =>
        segmentDistanceSquared(before.x, before.z, x, z, zone.x, zone.z) <= zone.radius ** 2));
    for (const card of visits) this.found.add(card.id);
    return visits;
  }
}
