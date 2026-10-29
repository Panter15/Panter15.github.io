import { END_ROW, INTRO_ROWS, NOTES } from './song';
import { freq } from './sound';

describe('freq', () => {
  it('maps note names to Hz', () => {
    expect(freq('A4')).toBe(440);
    expect(freq('A2')).toBe(110);
    expect(freq('C5')).toBeCloseTo(523.25, 2);
    expect(freq('C#5')).toBeCloseTo(554.37, 2);
  });
});

describe('song data', () => {
  it('fits inside the song and every note has a valid voice and pitch', () => {
    for (const [row, name, rows, voice] of NOTES) {
      expect(row + rows).toBeLessThanOrEqual(END_ROW);
      expect([0, 1, 2, 3]).toContain(voice);
      expect(freq(name)).toBeGreaterThan(30);
    }
  });

  it('has music after the intro, so the loop is not silent', () => {
    expect(NOTES.some(([row, , , voice]) => row >= INTRO_ROWS && voice === 0)).toBeTrue();
  });
});
