import { LAGOON_VIEW_ROUTE } from './iceland-lagoon';
import { VATNAJOKULL_START } from './iceland-vatnajokull';
import { ICE_CAVE_START, ICE_CAVE_ROUTE } from './iceland-ice-cave';
import { LOMAGNUPUR_START } from './iceland-skeidararsandur';
import { ICELAND_START, icelandSpawn } from './iceland-terrain';
import { SOLHEIMASANDUR_APPROACH } from './iceland-sandur';
import { REYNIS_BEACH_PATH, REYNIS_START } from './iceland-reynisfjara';

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
  {
    id: 'reynisfjara', name: 'Reynisfjara', position: REYNIS_START,
    heading: Math.atan2(REYNIS_BEACH_PATH[2].x - REYNIS_START.x, REYNIS_BEACH_PATH[2].z - REYNIS_START.z),
    welcomeTitle: 'Where basalt meets the sea.',
    description: 'Follow the beach track toward the column wall and the Reynisdrangar sea stacks.',
    hint: 'The beach track leads south. Route 1 is behind you to the north.',
    readyMessage: 'Reynisfjara is ready. Follow the beach track toward the columns.',
  },
  {
    id: 'lomagnupur', name: 'Lómagnúpur', position: LOMAGNUPUR_START,
    heading: Math.atan2(-25, 22),
    welcomeTitle: 'At the edge of the sandur.',
    description: 'Follow the gravel track below Lómagnúpur, then rejoin Route 1 across the dark outwash plain.',
    hint: 'The cliff track returns to the paved road at both ends.',
    readyMessage: 'Lómagnúpur is ready. The sandur opens to the east.',
  },
  {
    id: 'vatnajokull', name: 'Vatnajökull', position: VATNAJOKULL_START,
    heading: -Math.PI / 2,
    welcomeTitle: 'Above the southern ice.',
    description: 'Cross the broad ice plateau below the dark Grímsvötn rim. The western ascent returns to the sandur; the eastern descent returns to Route 1 beyond the lagoon.',
    hint: 'Stone cairns flank the easy traverse. Keep clear of the broken outlet tongues south of the plateau.',
    readyMessage: 'Vatnajökull is ready. Grímsvötn lies north of the through-route.',
  },
  {
    id: 'ice-cave', name: 'Western Ice Margin', position: ICE_CAVE_START,
    heading: Math.atan2(ICE_CAVE_START.x - ICE_CAVE_ROUTE[2].x, ICE_CAVE_START.z - ICE_CAVE_ROUTE[2].z),
    welcomeTitle: 'Beneath the blue ice.',
    description: 'Follow winding melt passages beneath the glacier. At the fork, continue north or take the western opening to the hillside.',
    hint: 'Three irregular mouths connect to the hillside return. The southern approach rejoins the cairned ascent.',
    readyMessage: 'The western ice cave is ready. Follow the blue ice to the fork.',
  },
  {
    id: 'jokulsarlon', name: 'Jökulsárlón', position: LAGOON_VIEW_ROUTE[1],
    heading: Math.atan2(21, 27),
    welcomeTitle: 'Where the glacier meets the water.',
    description: 'Follow the gravel shore to the glacier viewpoint, or take Route 1 across the short outlet river toward the eastern coast.',
    hint: 'The lagoon is deep. The bridge crosses its outlet south of the shore track.',
    readyMessage: 'Jökulsárlón is ready. Icebergs lie beyond the gravel shore.',
  },
];

export function nearestIcelandStart(x: number, z: number): IcelandStart {
  return ICELAND_STARTS.reduce((best, candidate) =>
    Math.hypot(x - candidate.position.x, z - candidate.position.z)
      < Math.hypot(x - best.position.x, z - best.position.z) ? candidate : best);
}

export const icelandStartSpawn = (start: IcelandStart) => icelandSpawn(start.position);
