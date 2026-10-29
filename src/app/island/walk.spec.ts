import { ISLAND } from './island-data';
import { nearest, onLand } from './walk';

describe('walk', () => {
  const spot = (id: string) => ISLAND.objects.find(o => o.id === id)!;

  it('lets Luis stand where he starts, but not in the sea or on the mountain', () => {
    expect(onLand(spot('luis').ax, spot('luis').ay)).toBeTrue();
    expect(onLand(20, 20)).toBeFalse();
    expect(onLand(402, 288)).toBeFalse();
  });

  it('every landmark can be reached from land', () => {
    for (const id of ['visa', 'library', 'lighthouse', 'boat']) {
      const s = spot(id);
      let reachable = false;
      for (let a = 0; a < 360 && !reachable; a += 10) {
        const x = s.ax + Math.cos(a * Math.PI / 180) * 35, y = s.ay + Math.sin(a * Math.PI / 180) * 35;
        reachable = onLand(x, y) && nearest(x, y, [s]) === id;
      }
      expect(reachable).withContext(id).toBeTrue();
    }
  });

  it('picks the closest landmark in range, or none', () => {
    const spots = [{ id: 'a', ax: 0, ay: 0 }, { id: 'b', ax: 30, ay: 0 }];
    expect(nearest(20, 0, spots)).toBe('b');
    expect(nearest(500, 500, spots)).toBeNull();
  });
});
