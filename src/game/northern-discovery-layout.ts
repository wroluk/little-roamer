/** Unmarked hollow south of Pine Hollow. The entrance faces away from all nearby tracks. */
export const STONE_CIRCLE = { x: -170, z: 650, floor: 16.8 };

const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };

export function stoneHollowHeight(x: number, z: number, ground: number): number {
  const u = x - STONE_CIRCLE.x, v = z - STONE_CIRCLE.z;
  if (Math.abs(u) >= 85 || v <= -78 || v >= 62) return ground;
  const fade = (1 - smooth((Math.abs(u) - 65) / 20))
    * smooth((v + 78) / 18) * (1 - smooth((v - 44) / 18));
  const hill = (cx: number, cz: number, rx: number, rz: number, h: number) =>
    h * Math.exp(-(((u - cx) / rx) ** 2 + ((v - cz) / rz) ** 2));
  // Elongated knolls form an uneven horseshoe. Their crests rise above the stones
  // from the track side, while a gentle southern gap reaches the floor.
  const ridges = hill(-7, -35, 49, 18, 13) + hill(35, -6, 18, 33, 11)
    + hill(-37, -1, 19, 35, 10);
  const clearing = 1 - smooth((Math.hypot(u / 24, v / 25) - 0.68) / 0.55);
  const shaped = ground + ridges;
  return ground + ((shaped + (STONE_CIRCLE.floor - shaped) * clearing) - ground) * fade;
}

export function stoneHollowClearance(x: number, z: number): boolean {
  const u = x - STONE_CIRCLE.x, v = z - STONE_CIRCLE.z;
  return Math.hypot(u / 19, v / 19) < 1 || (Math.abs(u) < 6 && v >= 0 && v < 44);
}

export const STONE_HOLLOW_PINES = [
  [-214, 627, 1.05], [-222, 644, 1.25], [-211, 664, 0.9],
  [-185, 607, 1.15], [-160, 606, 0.95], [-133, 620, 1.1],
  [-126, 640, 1.2], [-136, 667, 0.9],
] as const;
