export type SurfaceId =
  | 'grass' | 'dirt' | 'ash' | 'lava' | 'moss' | 'ice' | 'water'
  | 'snow' | 'mud' | 'rock' | 'sand' | 'regolith' | 'mars-dust' | 'mars-glass';

export type Surface = {
  id: SurfaceId;
  label: string;
  trait: string;
  longitudinalGrip: number;
  lateralGrip: number;
  /** Additional loss of drive force on steep, loose ground; ice uses its own glacier curve. */
  uphillSlip: number;
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
  regolith: {
    id: 'regolith', label: 'Packed regolith', trait: 'Firm & dusty', longitudinalGrip: 1, lateralGrip: 1, uphillSlip: 0,
    power: 1, rollingBrake: 0, brakeEffect: 1, drag: 0, speed: 1, steering: 1,
    suspensionStiffness: 30, suspensionCompression: 4.4, suspensionRelaxation: 5.2,
    roughness: 0.022, feedback: 0.022, particleColor: '#bf7857', particleRate: 0.45,
  },
  'mars-glass': {
    id: 'mars-glass', label: 'Impact glass', trait: 'Smooth & slippery', longitudinalGrip: 0.65, lateralGrip: 0.36, uphillSlip: 0,
    power: 0.9, rollingBrake: 0.04, brakeEffect: 0.38, drag: 0.01, speed: 1, steering: 0.7,
    suspensionStiffness: 31, suspensionCompression: 4.2, suspensionRelaxation: 5,
    roughness: 0.008, feedback: 0.01, particleColor: '#596060', particleRate: 0.1,
  },
  'mars-dust': {
    id: 'mars-dust', label: 'Martian dust', trait: 'Loose & soft', longitudinalGrip: 0.66, lateralGrip: 0.62, uphillSlip: 0.8,
    power: 0.78, rollingBrake: 2.6, brakeEffect: 0.75, drag: 0.46, speed: 1, steering: 0.81,
    suspensionStiffness: 21, suspensionCompression: 5.5, suspensionRelaxation: 6.6,
    roughness: 0.014, feedback: 0.018, particleColor: '#ae573d', particleRate: 0.9,
  },
  dirt: {
    id: 'dirt', label: 'Packed dirt', trait: 'Sure-footed', longitudinalGrip: 1, lateralGrip: 1, uphillSlip: 0,
    power: 1, rollingBrake: 0, brakeEffect: 1, drag: 0, speed: 1, steering: 1,
    suspensionStiffness: 30, suspensionCompression: 4.4, suspensionRelaxation: 5.2,
    roughness: 0.022, feedback: 0.022, particleColor: '#d7ae72', particleRate: 0.45,
  },
  grass: {
    id: 'grass', label: 'Soft grass', trait: 'Soft going', longitudinalGrip: 0.86, lateralGrip: 0.88, uphillSlip: 0.2,
    power: 0.92, rollingBrake: 1.1, brakeEffect: 0.92, drag: 0.1, speed: 1, steering: 0.92,
    suspensionStiffness: 25, suspensionCompression: 4.8, suspensionRelaxation: 5.8,
    roughness: 0.055, feedback: 0.055, particleColor: '#91ad67', particleRate: 0.3,
  },
  ash: {
    id: 'ash', label: 'Loose black sand', trait: 'Loose & sliding', longitudinalGrip: 0.7, lateralGrip: 0.56, uphillSlip: 0.75,
    power: 0.76, rollingBrake: 2.2, brakeEffect: 0.72, drag: 0.36, speed: 1, steering: 0.79,
    suspensionStiffness: 22, suspensionCompression: 5.2, suspensionRelaxation: 6.2,
    roughness: 0.048, feedback: 0.045, particleColor: '#3f4849', particleRate: 1,
  },
  lava: {
    id: 'lava', label: 'Rough lava', trait: 'Rocky & rough', longitudinalGrip: 0.84, lateralGrip: 0.86, uphillSlip: 0.15,
    power: 0.86, rollingBrake: 3.2, brakeEffect: 0.9, drag: 0.25, speed: 1, steering: 0.91,
    suspensionStiffness: 37, suspensionCompression: 3.6, suspensionRelaxation: 4.2,
    roughness: 0.108, feedback: 0.1, particleColor: '#242c2d', particleRate: 0.5,
  },
  moss: {
    id: 'moss', label: 'Springy moss', trait: 'Soft & springy', longitudinalGrip: 0.8, lateralGrip: 0.8, uphillSlip: 0.35,
    power: 0.89, rollingBrake: 1.5, brakeEffect: 0.86, drag: 0.18, speed: 1, steering: 0.87,
    suspensionStiffness: 18, suspensionCompression: 5.8, suspensionRelaxation: 7.2,
    roughness: 0.069, feedback: 0.065, particleColor: '#7f995d', particleRate: 0.48,
  },
  ice: {
    id: 'ice', label: 'Glacier ice', trait: 'Slippery', longitudinalGrip: 0.52, lateralGrip: 0.23, uphillSlip: 0,
    power: 0.82, rollingBrake: 0.04, brakeEffect: 0.15, drag: 0.005, speed: 1, steering: 0.52,
    suspensionStiffness: 31, suspensionCompression: 4.2, suspensionRelaxation: 5,
    roughness: 0.026, feedback: 0.028, particleColor: '#c5edf2', particleRate: 0.38,
  },
  water: {
    id: 'water', label: 'Glacial river', trait: 'Slow & rocky', longitudinalGrip: 0.64, lateralGrip: 0.62, uphillSlip: 0,
    power: 0.42, rollingBrake: 4.6, brakeEffect: 0.74, drag: 2.35, speed: 0.31, steering: 0.58,
    suspensionStiffness: 34, suspensionCompression: 3.9, suspensionRelaxation: 4.5,
    roughness: 0.093, feedback: 0.09, particleColor: '#bcebed', particleRate: 1,
  },
  snow: {
    id: 'snow', label: 'Mountain snow', trait: 'Soft & slippery', longitudinalGrip: 0.58, lateralGrip: 0.44, uphillSlip: 0,
    power: 0.78, rollingBrake: 0.95, brakeEffect: 0.58, drag: 0.15, speed: 1, steering: 0.72,
    suspensionStiffness: 23, suspensionCompression: 5.3, suspensionRelaxation: 6.4,
    roughness: 0.052, feedback: 0.05, particleColor: '#e8f4ef', particleRate: 0.75,
  },
  mud: {
    id: 'mud', label: 'Soft mud', trait: 'Heavy going', longitudinalGrip: 0.58, lateralGrip: 0.56, uphillSlip: 0.85,
    power: 0.68, rollingBrake: 3.5, brakeEffect: 0.76, drag: 0.9, speed: 1, steering: 0.75,
    suspensionStiffness: 19, suspensionCompression: 5.9, suspensionRelaxation: 7.1,
    roughness: 0.082, feedback: 0.08, particleColor: '#665744', particleRate: 1.1,
  },
  rock: {
    id: 'rock', label: 'Mountain rock', trait: 'Firm & bumpy', longitudinalGrip: 1.05, lateralGrip: 1.03, uphillSlip: 0,
    power: 0.95, rollingBrake: 1.1, brakeEffect: 0.98, drag: 0.1, speed: 1, steering: 0.98,
    suspensionStiffness: 36, suspensionCompression: 3.8, suspensionRelaxation: 4.6,
    roughness: 0.1, feedback: 0.09, particleColor: '#7b8582', particleRate: 0.42,
  },
  sand: {
    id: 'sand', label: 'Coastal sand', trait: 'Loose & soft', longitudinalGrip: 0.66, lateralGrip: 0.62, uphillSlip: 0.8,
    power: 0.78, rollingBrake: 2.6, brakeEffect: 0.75, drag: 0.46, speed: 1, steering: 0.81,
    suspensionStiffness: 21, suspensionCompression: 5.5, suspensionRelaxation: 6.6,
    roughness: 0.014, feedback: 0.018, particleColor: '#bca77e', particleRate: 0.9,
  },
};

export const BLENDED_SURFACE_FIELDS = [
  'power', 'drag', 'speed', 'steering', 'feedback',
] as const satisfies readonly (keyof Surface)[];
