import { TOWN } from './town-data';
import { LANDMARKS } from './landmarks';
import { bumps, canStand, nearest, onLand, route } from './walk';

describe('walk', () => {
  it('lets Luis stand where he starts, but not in the sea or on the cliffs', () => {
    expect(canStand(TOWN.start.x, TOWN.start.y)).toBeTrue();
    expect(onLand(TOWN.w / 2, TOWN.h - 8)).toBeFalse();
    expect(onLand(TOWN.w / 2, 8)).toBeFalse();
  });

  it('every place can be walked to from the start, and its door counts as near it', () => {
    for (const spot of TOWN.spots) {
      expect(canStand(spot.x, spot.y)).withContext(spot.id).toBeTrue();
      expect(route(TOWN.start, spot).length).withContext(spot.id).toBeGreaterThan(0);
      expect(nearest(spot.x, spot.y, TOWN.spots)).toBe(spot.id);
    }
  });

  it('routes only over walkable tiles and ends at the target', () => {
    const to = TOWN.spots[0], path = route(TOWN.start, to);
    expect(path.at(-1)).toEqual(to);
    expect(path.every(p => onLand(p.x, p.y))).toBeTrue();
    expect(route(TOWN.start, { x: TOWN.w / 2, y: TOWN.h - 8 })).toEqual([]);   // into the sea: no route
  });

  it('stops a step into someone, but always lets you step away', () => {
    const luis = [{ x: 100, y: 100, r: 10 }];
    expect(bumps(luis, 106, 100, { x: 115, y: 100 })).toBeTrue();    // walking into him
    expect(bumps(luis, 112, 100, { x: 106, y: 100 })).toBeFalse();   // already overlapping, moving away
    expect(bumps(luis, 130, 100, { x: 135, y: 100 })).toBeFalse();   // nowhere near
  });

  it('every place on the map has a landmark (a missing one would break the page)', () => {
    const ids = LANDMARKS.map(l => l.id);
    for (const { id } of [...TOWN.hits, ...TOWN.spots, { id: 'boat' }]) expect(ids).withContext(id).toContain(id);
  });

  it('picks the closest spot in range, or none', () => {
    const spots = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 30, y: 0 }];
    expect(nearest(20, 0, spots)).toBe('b');
    expect(nearest(500, 500, spots)).toBeNull();
  });
});
