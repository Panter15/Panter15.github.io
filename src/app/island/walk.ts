// Where Luis may walk and what he is standing next to, in ground-image px (1x).
// The shape mirrors the island in art/render3.js (map coords + its OX/OY canvas offset).
const OX = 160, OY = 138, CX = 240, CY = 182, RX = 214, RY = 122;
export const NEAR = 40;   // px: closer than this to a landmark's base opens its YES/NO box

export function onLand(x: number, y: number): boolean {
  const dx = (x - OX - CX) / RX, dy = (y - OY - CY) / RY, a = Math.atan2(dy, dx);
  const d = Math.hypot(dx, dy) / (1 + 0.05 * Math.sin(3 * a) + 0.035 * Math.sin(5 * a + 1) + 0.02 * Math.sin(9 * a + 2));
  const mountain = ((x - 402) / 88) ** 2 + ((y - 288) / 26) ** 2 < 1;   // La Malinche's base
  return d < 0.9 && !mountain;
}

/** Id of the closest spot within NEAR, or null. */
export function nearest(x: number, y: number, spots: readonly { id: string; ax: number; ay: number }[]): string | null {
  let best: string | null = null, bestD = NEAR;
  for (const s of spots) { const d = Math.hypot(s.ax - x, s.ay - y); if (d < bestD) { best = s.id; bestD = d; } }
  return best;
}
