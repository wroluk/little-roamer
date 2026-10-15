import type { AreaId } from './areas';
import { NORTHERN_STARTS } from './regional-starts';
import { MARS_STARTS } from './mars-terrain';
import { STONE_CIRCLE } from './northern-discovery-layout';
import { WRECK_SITE } from './mars-wreck-layout';
import { DISH_SITE } from './mars-dish-layout';
import { GLASSFALL_SCAR } from './mars-glassfall-layout';
import { KEYHOLE_ARCH } from './mars-keyhole-layout';
import { TUBES_CENTRE, TUBES_LOOKOUT } from './mars-tubes-layout';

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
  'dish-ridge': DISH_SITE,
  'glassfall-plain': GLASSFALL_SCAR,
  'keyhole-badlands': KEYHOLE_ARCH,
  'lava-tubes': TUBES_CENTRE,
};
const image = (area: PostcardArea, id: string) => `./postcards/${area}/${id}.jpg`;
export const POSTCARDS: readonly Postcard[] = [
  { id: 'pine-hollows', area: 'northern-reach', name: 'Pine Hollows',
    note: northernNotes['pine-hollows'], x: -33, z: 503, radius: 72,
    image: image('northern-reach', 'pine-hollows') },
  ...NORTHERN_STARTS.filter(start => start.id !== 'northern-reach').map(start => ({
    id: start.id, area: 'northern-reach' as const, name: start.name,
    note: northernNotes[start.id], x: start.position.x, z: start.position.z,
    radius: 72, image: image('northern-reach', start.id),
  })),
  { id: 'stone-circle', area: 'northern-reach', name: 'Stone Circle',
    note: 'Old stones stand quietly inside a hidden hollow.',
    x: STONE_CIRCLE.x, z: STONE_CIRCLE.z, radius: 19, secret: true, image: image('northern-reach', 'stone-circle') },
  ...MARS_STARTS.map(start => {
    const point = marsLandmarks[start.id] ?? start.position;
    return { id: start.id, area: 'mars' as const, name: start.name,
      note: marsNotes[start.id], x: point.x, z: point.z,
      radius: start.id === 'keyhole-badlands' ? 82 : 76,
      visitZones: start.id === 'lava-tubes'
        ? [{ x: TUBES_LOOKOUT.x, z: TUBES_LOOKOUT.z, radius: 76 }] : undefined,
      image: image('mars', start.id) };
  }),
  { id: 'shuttle-wreck', area: 'mars', name: 'Buried Shuttle',
    note: 'A broken tail and three open engines rise from the sand.',
    x: WRECK_SITE.x, z: WRECK_SITE.z, radius: 41, secret: true, image: image('mars', 'shuttle-wreck') },
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
