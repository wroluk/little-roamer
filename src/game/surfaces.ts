export type SurfaceId = 'grass' | 'dirt' | 'ash' | 'lava' | 'moss' | 'ice' | 'water';

export type Surface = {
  id: SurfaceId;
  label: string;
  trait: string;
  longitudinalGrip: number;
  lateralGrip: number;
  power: number;
  rollingBrake: number;
  brakeEffect: number;
  drag: number;
  speed: number;
  steering: number;
  suspensionStiffness: number;
  suspensionCompression: number;
  suspensionRelaxation: number;
  roughness: number;
  feedback: number;
  particleColor: string;
  particleRate: number;
};

export const SURFACES: Record<SurfaceId, Surface> = {
  dirt: {
    id: 'dirt', label: 'Packed dirt', trait: 'Sure-footed', longitudinalGrip: 1, lateralGrip: 1,
    power: 1, rollingBrake: 0, brakeEffect: 1, drag: 0, speed: 1, steering: 1,
    suspensionStiffness: 30, suspensionCompression: 4.4, suspensionRelaxation: 5.2,
    roughness: 0.022, feedback: 0.022, particleColor: '#d7ae72', particleRate: 0.45,
  },
  grass: {
    id: 'grass', label: 'Soft grass', trait: 'Soft going', longitudinalGrip: 0.86, lateralGrip: 0.88,
    power: 0.85, rollingBrake: 1.55, brakeEffect: 0.92, drag: 0.18, speed: 0.82, steering: 0.88,
    suspensionStiffness: 25, suspensionCompression: 4.8, suspensionRelaxation: 5.8,
    roughness: 0.038, feedback: 0.04, particleColor: '#91ad67', particleRate: 0.3,
  },
  ash: {
    id: 'ash', label: 'Loose black sand', trait: 'Loose & sliding', longitudinalGrip: 0.7, lateralGrip: 0.56,
    power: 0.66, rollingBrake: 2.8, brakeEffect: 0.72, drag: 0.55, speed: 0.64, steering: 0.64,
    suspensionStiffness: 22, suspensionCompression: 5.2, suspensionRelaxation: 6.2,
    roughness: 0.048, feedback: 0.045, particleColor: '#3f4849', particleRate: 1,
  },
  lava: {
    id: 'lava', label: 'Rough lava', trait: 'Rocky & rough', longitudinalGrip: 0.84, lateralGrip: 0.86,
    power: 0.74, rollingBrake: 3.2, brakeEffect: 0.9, drag: 0.38, speed: 0.56, steering: 0.84,
    suspensionStiffness: 37, suspensionCompression: 3.6, suspensionRelaxation: 4.2,
    roughness: 0.108, feedback: 0.1, particleColor: '#242c2d', particleRate: 0.5,
  },
  moss: {
    id: 'moss', label: 'Springy moss', trait: 'Soft & springy', longitudinalGrip: 0.8, lateralGrip: 0.8,
    power: 0.81, rollingBrake: 1.8, brakeEffect: 0.86, drag: 0.3, speed: 0.71, steering: 0.81,
    suspensionStiffness: 18, suspensionCompression: 5.8, suspensionRelaxation: 7.2,
    roughness: 0.069, feedback: 0.065, particleColor: '#7f995d', particleRate: 0.48,
  },
  ice: {
    id: 'ice', label: 'Glacier ice', trait: 'Slippery', longitudinalGrip: 0.74, lateralGrip: 0.31,
    power: 0.96, rollingBrake: 0.08, brakeEffect: 0.42, drag: 0.005, speed: 0.91, steering: 0.47,
    suspensionStiffness: 31, suspensionCompression: 4.2, suspensionRelaxation: 5,
    roughness: 0.026, feedback: 0.028, particleColor: '#c5edf2', particleRate: 0.38,
  },
  water: {
    id: 'water', label: 'Glacial river', trait: 'Slow & rocky', longitudinalGrip: 0.64, lateralGrip: 0.62,
    power: 0.42, rollingBrake: 4.6, brakeEffect: 0.74, drag: 2.35, speed: 0.31, steering: 0.58,
    suspensionStiffness: 34, suspensionCompression: 3.9, suspensionRelaxation: 4.5,
    roughness: 0.093, feedback: 0.09, particleColor: '#bcebed', particleRate: 1,
  },
};

export const BLENDED_SURFACE_FIELDS = [
  'power', 'drag', 'speed', 'steering', 'feedback',
] as const satisfies readonly (keyof Surface)[];
