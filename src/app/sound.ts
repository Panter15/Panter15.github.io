// Sea waves + the island waltz in Game Boy style, synthesized with Web Audio (no audio files).
import { END_ROW, INTRO_ROWS, NOTES, ROW } from './song';

const WAVE = 8.5; // seconds between surf swells

// instrument -> [oscillator, volume, fade in seconds]; fades match the GB "Down" envelope (15 steps of length/64 s)
const VOICES: [OscillatorType, number, number][] = [
  ['square', 0.07, 0.7], // melody
  ['square', 0.045, 0.94], // held notes
  ['square', 0.045, 0.47], // picked notes
  ['sine', 0.2, 0], // bass: holds until the next note
];

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'A4' -> 440 Hz, 'C#5' -> 554.37 Hz */
export function freq(note: string): number {
  const sharp = note[1] === '#' ? 1 : 0;
  const midi = 12 * (Number(note[1 + sharp]) + 1) + SEMITONES[note[0]] + sharp;
  return 440 * 2 ** ((midi - 69) / 12);
}

export class Sound {
  private ctx?: AudioContext;
  private timer?: number;

  get playing(): boolean {
    return !!this.ctx;
  }

  start(): void {
    if (this.ctx) return;
    const ctx = (this.ctx = new AudioContext());
    const out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(ctx.destination);

    // Surf: looping white noise through a lowpass filter; each wave rises fast and fades slowly.
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const foam = ctx.createBiquadFilter();
    foam.type = 'lowpass';
    const surf = ctx.createGain();
    noise.connect(foam).connect(surf).connect(out);
    noise.start();

    const note = (name: string, t: number, len: number, voice: number) => {
      const [type, vol, fade] = VOICES[voice];
      const end = t + (fade ? Math.min(fade, len) : len);
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq(name);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      if (!fade) g.gain.setValueAtTime(vol, end - 0.02); // bass holds, then a short release to avoid clicks
      g.gain.linearRampToValueAtTime(0, end);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(end);
    };

    // Plays from `fromRow` to the end; the first pass includes the intro, later passes start after it.
    const loop = (t: number, fromRow: number) => {
      const length = (END_ROW - fromRow) * ROW;
      for (let s = t, k = 0; s < t + length; s += WAVE, k++) {
        surf.gain.setValueAtTime(0.03, s);
        surf.gain.linearRampToValueAtTime(k % 2 ? 0.35 : 0.5, s + 1.4);
        surf.gain.exponentialRampToValueAtTime(0.03, s + WAVE - 0.1);
        foam.frequency.setValueAtTime(300, s);
        foam.frequency.linearRampToValueAtTime(1600, s + 1.4);
        foam.frequency.exponentialRampToValueAtTime(300, s + 6);
      }
      for (const [row, name, rows, voice] of NOTES) {
        if (row >= fromRow) note(name, t + (row - fromRow) * ROW, rows * ROW, voice);
      }
      // Schedule the next pass shortly before this one ends.
      // Hidden tabs can fire this timer late; never start the next pass in the past (notes would pile up).
      this.timer = window.setTimeout(() => loop(Math.max(t + length, ctx.currentTime + 0.1), INTRO_ROWS),
        (t + length - ctx.currentTime - 0.5) * 1000);
    };
    loop(ctx.currentTime + 0.1, 0);
  }

  stop(): void {
    clearTimeout(this.timer);
    this.ctx?.close();
    this.ctx = undefined;
  }
}
