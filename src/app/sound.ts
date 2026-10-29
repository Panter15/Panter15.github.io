// Sea waves + an original 8-bit loop, synthesized with Web Audio (no audio files).
const BPM = 112;
const STEP = 60 / BPM / 2; // one eighth note, in seconds

// One string per bar, 8 eighth notes each; '-' is a rest. Chords: C Am F G, twice.
const LEAD = [
  'E5 G5 C6 G5 E5 - G5 -', 'A5 - G5 E5 C5 - E5 -', 'F5 A5 C6 A5 G5 F5 E5 -', 'D5 - G5 - B4 D5 G4 -',
  'E5 G5 C6 G5 E5 - G5 A5', 'C6 - B5 A5 E5 - A5 -', 'F5 - A5 G5 F5 E5 D5 -', 'D5 E5 F5 D5 C5 - - -',
].join(' ').split(' ');
const BASS = ['C3', 'A2', 'F2', 'G2', 'C3', 'A2', 'F2', 'G2'];
const LOOP = LEAD.length * STEP;

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'A4' -> 440 Hz */
export function freq(note: string): number {
  const midi = 12 * (Number(note[1]) + 1) + SEMITONES[note[0]];
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

    const note = (type: OscillatorType, name: string, t: number, len: number, vol: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq(name);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + len);
    };

    const loop = (t: number) => {
      for (const [at, peak] of [[0, 0.5], [LOOP / 2, 0.35]]) {
        const s = t + at;
        surf.gain.setValueAtTime(0.03, s);
        surf.gain.linearRampToValueAtTime(peak, s + 1.4);
        surf.gain.exponentialRampToValueAtTime(0.03, s + LOOP / 2 - 0.1);
        foam.frequency.setValueAtTime(300, s);
        foam.frequency.linearRampToValueAtTime(1600, s + 1.4);
        foam.frequency.exponentialRampToValueAtTime(300, s + 6);
      }
      LEAD.forEach((n, i) => n !== '-' && note('square', n, t + i * STEP, STEP * 0.9, 0.06));
      BASS.forEach((n, bar) => {
        for (let i = 0; i < 8; i++) {
          const octaveUp = n[0] + (Number(n[1]) + (i % 2));
          note('triangle', octaveUp, t + (bar * 8 + i) * STEP, STEP * 0.8, 0.18);
        }
      });
      // Schedule the next loop shortly before this one ends.
      this.timer = window.setTimeout(() => loop(t + LOOP), (t + LOOP - ctx.currentTime - 0.5) * 1000);
    };
    loop(ctx.currentTime + 0.1);
  }

  stop(): void {
    clearTimeout(this.timer);
    this.ctx?.close();
    this.ctx = undefined;
  }
}
