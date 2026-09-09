export type SurfaceId = 'grass' | 'dirt' | 'ash' | 'lava' | 'moss' | 'ice' | 'water';

export type Surface = {
  id: SurfaceId;
  label: string;
  grip: number;
  power: number;
  rollingBrake: number;
  drag: number;
  speed: number;
  steering: number;
};

export const SURFACES: Record<SurfaceId, Surface> = {
  grass: { id: 'grass', label: 'Soft grass', grip: 0.82, power: 0.9, rollingBrake: 1.1, drag: 0.15, speed: 0.84, steering: 0.9 },
  dirt: { id: 'dirt', label: 'Packed dirt', grip: 1, power: 1, rollingBrake: 0, drag: 0, speed: 1, steering: 1 },
  ash: { id: 'ash', label: 'Loose black sand', grip: 0.64, power: 0.72, rollingBrake: 2.1, drag: 0.42, speed: 0.67, steering: 0.72 },
  lava: { id: 'lava', label: 'Rough lava', grip: 0.93, power: 0.76, rollingBrake: 2.4, drag: 0.32, speed: 0.58, steering: 0.88 },
  moss: { id: 'moss', label: 'Springy moss', grip: 0.78, power: 0.82, rollingBrake: 1.45, drag: 0.24, speed: 0.73, steering: 0.84 },
  ice: { id: 'ice', label: 'Glacier ice', grip: 0.46, power: 0.95, rollingBrake: 0.12, drag: 0.01, speed: 0.8, steering: 0.42 },
  water: { id: 'water', label: 'Glacial river', grip: 0.68, power: 0.62, rollingBrake: 2.8, drag: 1.15, speed: 0.5, steering: 0.7 },
};
