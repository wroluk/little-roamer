const DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
] as const;

export type NavigationReading = {
  heading: number;
  direction: (typeof DIRECTIONS)[number];
  elevation: number;
};

export function compassHeading(forwardX: number, forwardZ: number): number {
  const degrees = Math.atan2(forwardX, -forwardZ) * 180 / Math.PI;
  return (degrees + 360) % 360;
}

export function compassDirection(heading: number): NavigationReading['direction'] {
  const normalized = ((heading % 360) + 360) % 360;
  return DIRECTIONS[Math.round(normalized / 22.5) % DIRECTIONS.length];
}

export function navigationReading(
  forwardX: number,
  forwardZ: number,
  terrainElevation: number,
): NavigationReading {
  const heading = compassHeading(forwardX, forwardZ);
  return {
    heading,
    direction: compassDirection(heading),
    elevation: Math.round(terrainElevation),
  };
}
