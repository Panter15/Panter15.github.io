// Where Luis may walk and what he is standing next to, in map px (1x). The grid comes from art/town.js.
import { TOWN } from './town-data';

const T = TOWN.tile;
export const NEAR = 40;   // px: closer than this to a place's door opens its YES/NO box

const free = (tx: number, ty: number) => TOWN.blocked[ty]?.[tx] === '.';
export const onLand = (x: number, y: number) => free(Math.floor(x / T), Math.floor(y / T));
/** Luis's feet are about 10 px wide: both sides must be on walkable tiles. */
export const canStand = (x: number, y: number) => onLand(x - 4, y) && onLand(x + 4, y);

/** Would a step to (x, y) walk into one of `bodies` (circles, squashed vertically for the top-down view)?
 *  Stepping away from a body you already overlap is always allowed, so nobody gets stuck. */
export function bumps(bodies: readonly { x: number; y: number; r: number }[], x: number, y: number, from: { x: number; y: number }): boolean {
  const dist = (b: { x: number; y: number }, px: number, py: number) => Math.hypot(b.x - px, (b.y - py) * 1.6);
  return bodies.some(b => dist(b, x, y) < b.r && dist(b, x, y) < dist(b, from.x, from.y));
}

/** Id of the closest spot within NEAR, or null. */
export function nearest(x: number, y: number, spots: readonly { id: string; x: number; y: number }[]): string | null {
  let best: string | null = null, bestD = NEAR;
  for (const s of spots) { const d = Math.hypot(s.x - x, s.y - y); if (d < bestD) { best = s.id; bestD = d; } }
  return best;
}

/** Shortest walk over tiles (breadth-first), as waypoints in px ending at `to`; [] if `to` can't be reached. */
export function route(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number }[] {
  const sx = Math.floor(from.x / T), sy = Math.floor(from.y / T), gx = Math.floor(to.x / T), gy = Math.floor(to.y / T);
  if (!free(gx, gy)) return [];
  const cols = TOWN.blocked[0].length, start = sy * cols + sx, prev = new Map<number, number>([[start, -1]]), queue = [start];
  for (let head = 0; head < queue.length; head++) {   // read by index: shift() would copy the queue every step
    const k = queue[head], x = k % cols, y = (k - x) / cols;
    if (x === gx && y === gy) {   // walk back from the goal, through tile centres, to (not including) the start tile
      const path: { x: number; y: number }[] = [to];
      for (let p = prev.get(k)!; p !== -1 && p !== start; p = prev.get(p)!) path.unshift({ x: (p % cols) * T + T / 2, y: Math.floor(p / cols) * T + T / 2 });
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, nk = ny * cols + nx;
      if (free(nx, ny) && !prev.has(nk)) { prev.set(nk, k); queue.push(nk); }
    }
  }
  return [];
}
