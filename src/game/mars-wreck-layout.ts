export const WRECK_SITE = { x: -653, z: 265, turn: -0.24 };

export function wreckPoint(u: number, v: number) {
  const c = Math.cos(WRECK_SITE.turn), s = Math.sin(WRECK_SITE.turn);
  return { x: WRECK_SITE.x + u * c + v * s, z: WRECK_SITE.z - u * s + v * c };
}

export function wreckLocal(x: number, z: number) {
  const c = Math.cos(WRECK_SITE.turn), s = Math.sin(WRECK_SITE.turn);
  return { u: (x - WRECK_SITE.x) * c - (z - WRECK_SITE.z) * s,
    v: (x - WRECK_SITE.x) * s + (z - WRECK_SITE.z) * c };
}

/** A broad windward sand bank, not an access road or a circular landmark pedestal. */
export function wreckSandHeight(x: number, z: number, base: number) {
  const { u, v } = wreckLocal(x, z);
  const bank = Math.exp(-(((u - 48) / 29) ** 2 + ((v + 4) / 102) ** 4));
  const fade = Math.max(0, Math.min(1, (135 - Math.hypot(u, v)) / 20));
  const north = Math.exp(-(((u - 5) / 82) ** 4 + ((v + 89) / 27) ** 2));
  return base + Math.max(39 * bank, 37 * north) * fade * fade * (3 - 2 * fade);
}

// Unmarked sandy approach beside the buried fuselage, not an interior passage.
export const WRECK_PASSAGE = [[-35, 65], [-35, 45], [-38, 25], [-38, 5]].map(([u, v]) => wreckPoint(u, v));
export const wreckClearance = (x: number, z: number) => {
  const { u, v } = wreckLocal(x, z);
  return Math.abs(u) < 45 && v > -68 && v < 70;
};
