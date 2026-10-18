import { ICELAND_START, icelandSpawn } from './iceland-terrain';
import { SOLHEIMASANDUR_APPROACH } from './iceland-sandur';

export type IcelandStart = {
  id: string;
  name: string;
  position: { x: number; z: number };
  heading: number;
  welcomeTitle: string;
  description: string;
  hint: string;
  readyMessage: string;
};

/** Add a start when its Iceland region has a safe, drivable entry and return. */
export const ICELAND_STARTS: readonly IcelandStart[] = [
  {
    id: 'skogafoss', name: 'Skógafoss', position: ICELAND_START,
    heading: Math.atan2(46, 43),
    welcomeTitle: 'Beneath the falls.',
    description: 'Follow the Skógá to its shallow ford, cross the road bridge, or take Route 1 along the south coast.',
    hint: 'The paved road crosses the bridge. Amber posts mark the optional gravel ford.',
    readyMessage: 'Skógafoss is ready. The ford and Ring Road lie south.',
  },
  {
    id: 'solheimasandur', name: 'Sólheimasandur', position: SOLHEIMASANDUR_APPROACH[2],
    heading: Math.atan2(SOLHEIMASANDUR_APPROACH[2].x - SOLHEIMASANDUR_APPROACH[3].x,
      SOLHEIMASANDUR_APPROACH[2].z - SOLHEIMASANDUR_APPROACH[3].z),
    welcomeTitle: 'Across the black sand.',
    description: 'A quiet outwash plain stretches south of Route 1. Follow the faint spur to the aircraft wreck, then return to the coast road.',
    hint: 'The wreck is a short drive to the southeast. Route 1 is behind you to the north.',
    readyMessage: 'Sólheimasandur is ready. Follow the faint track toward the sea.',
  },
];

export function nearestIcelandStart(x: number, z: number): IcelandStart {
  return ICELAND_STARTS.reduce((best, candidate) =>
    Math.hypot(x - candidate.position.x, z - candidate.position.z)
      < Math.hypot(x - best.position.x, z - best.position.z) ? candidate : best);
}

export const icelandStartSpawn = (start: IcelandStart) => icelandSpawn(start.position);
