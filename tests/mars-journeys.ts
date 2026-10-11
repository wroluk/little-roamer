import assert from 'node:assert/strict';
import { MARS_ROUTES, type MarsPoint } from '../src/game/mars-terrain';

const route = (name: string) => {
  const route = MARS_ROUTES.find(route => route.name === name);
  assert.ok(route, `missing route ${name}`);
  return route.points;
};
const join = (parts: MarsPoint[][]) => {
  const path = [...parts[0]];
  for (const part of parts.slice(1)) {
    const a = path.at(-1)!, b = part[0];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z, a.y - b.y) < 0.001, 'journey segments must join, not teleport');
    path.push(...part.slice(1));
  }
  return path;
};
export const MARS_OUTER_CIRCUIT = join([
  route('Crown rim circuit').slice(8, 25), route('Crown to Dish saddle'),
  route('Dish switchbacks').slice(0, 5), route('Dish eastern ledge').slice(0, 2),
  route('Dish southern descent'), route('Glassfall Dish connection'),
  route('Glassfall firm circuit').slice(0, 10), route('Glassfall southern exit'),
  route('Iron Glassfall connection'), route('Iron main passage'), route('Iron Keyhole connection'),
  route('Keyhole Iron connection'), route('Keyhole wash'), route('Keyhole gentle return').slice(0, 5),
  route('Delta Keyhole connection'), route('Delta northern channel'), route('Delta Dunes connection'),
  route('Dunes Delta connection'), route('Dunes bedrock perimeter'), route('Tubes Dunes connection'),
  route('Tubes skylight passage'), route('Tubes Crown return'),
]);
