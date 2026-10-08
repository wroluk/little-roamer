import { COAST_START } from './northern-coast';
import { PASS_START } from './northern-pass';
import { EMBER_START } from './northern-ember';
import { MARSH_START } from './northern-marsh';
import { ADVENTURE_REGIONS } from './northern-adventures';
import { NORTHERN_SPAWN, sampledHeightAt } from './northern-terrain';

export type RegionalStart = {
  id: string; name: string; position: { x: number; z: number };
  welcomeTitle: string; description: string; readyMessage: string; hint?: string;
};

export const NORTHERN_STARTS: readonly RegionalStart[] = [
  { id: 'northern-reach', name: 'Northern Reach', position: NORTHERN_SPAWN,
    welcomeTitle: 'The road is yours.', description: 'Explore the Northern Reach.', readyMessage: 'Ready to roam.' },
  { id: 'river-valley', name: 'River Valley', position: { x: -240, z: 232 },
      welcomeTitle: 'Follow the river.',
      description: 'Two shallow fords, a rocky branch and a winding ridge loop. Try the stones or take the easier climb, then look back across the river.',
      hint: 'Follow amber ford posts. On the north bank, try the stones or the easy dirt climb.',
      readyMessage: 'River Valley. Two crossings and a little room to explore.' },
  { id: 'fjord-coast', name: 'Fjord Coast', position: COAST_START,
      welcomeTitle: 'Explore the coast.',
      description: 'Follow the clifftop trail, descend to sheltered pebble coves and circle the sea stacks along the beach.',
      readyMessage: 'Fjord Coast. Follow the beach loop down to the shallows.' },
  { id: 'high-pass', name: 'High Pass', position: PASS_START,
      welcomeTitle: 'Above the clouds.',
      description: 'Wind between twin peaks, climb to the north lookout and descend into the frozen Blue Hollow. Stone cairns guide the mountain circuit.',
      readyMessage: 'High Pass. Follow the cairns; Blue Hollow is slippery.' },
  { id: 'ember-basin', name: 'Ember Basin', position: EMBER_START,
      welcomeTitle: 'Around the old crater.',
      description: 'Circle the caldera rim, descend into soft ash and weave past basalt columns on the way to the northern overlook.',
      readyMessage: 'Ember Basin. Follow the ochre trail; loose ash slows the crater descent.' },
  { id: 'willow-marsh', name: 'Willow Marsh', position: MARSH_START,
      welcomeTitle: 'Among the willows.',
      description: 'A soft muddy patch begins the dry hummock loop. Or take the marked Reed Ford to Heron lookout, then follow the hidden pass into Stonegate Basin.',
      hint: 'Try the brown mud on the hummock loop, or follow amber posts into Reed Ford.',
      readyMessage: 'Willow Marsh. Amber posts mark the shallow crossing.' },
  ...ADVENTURE_REGIONS.map(region => ({
    id: region.id, name: region.name, position: region.start,
    welcomeTitle: region.name, description: region.description,
    hint: region.description, readyMessage: `${region.name}. Choose your own line.`,
  })),
];

/** Registry order resolves exact distance ties, independently of chunk loading. */
export function nearestNorthernStart(x: number, z: number): RegionalStart {
  return NORTHERN_STARTS.reduce((best, candidate) =>
    Math.hypot(x - candidate.position.x, z - candidate.position.z)
      < Math.hypot(x - best.position.x, z - best.position.z) ? candidate : best);
}

export function regionalSpawn(start: Pick<RegionalStart, 'position'>) {
  const { x, z } = start.position;
  return { x, y: sampledHeightAt(x, z) + 1.25, z };
}
