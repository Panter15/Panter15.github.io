import { freq } from './sound';

describe('freq', () => {
  it('maps note names to Hz', () => {
    expect(freq('A4')).toBe(440);
    expect(freq('A2')).toBe(110);
    expect(freq('C5')).toBeCloseTo(523.25, 2);
  });
});
