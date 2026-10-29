import { Component, ElementRef, HostListener, NgZone, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
import { gsap } from 'gsap';
import { LANDMARKS, Landmark } from './landmarks';
import { TOWN } from './town-data';
import { bumps, canStand, nearest, route } from './walk';

// Luis's town, seen from the top like a Pokémon map. The camera follows Luis; it opens on the whole map and glides in.
const SPEED = 70;           // px per second (1x) that Luis walks
const STEP_MS = 130;        // how long each walk frame shows
export type Dir = 'up' | 'down' | 'left' | 'right';
const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEYS: Record<string, Dir> = {
  ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
};
const landmark = (id: string) => LANDMARKS.find(l => l.id === id)!;
type Mood = 'none' | 'floreo' | 'sit' | 'phone';
const MOODS: Mood[] = ['floreo', 'sit', 'phone'];
interface Decor { src: string; x: number; y: number; w: number; h: number; kind: string; frames: number; ms: number; delay: number; dist?: number; roam?: number; speed?: number; right?: boolean; run?: string; runFrames?: number; }
/** An animal walking about: position = its feet (px), home = where it started, path = the route it's on. */
interface Critter extends Decor { fx: number; fy: number; hx: number; hy: number; path: { x: number; y: number }[]; wait: number; flip: boolean; moving: boolean; }

@Component({
  selector: 'app-island',
  templateUrl: './island.html',
  styleUrl: './island.scss',
})
export class Island implements OnDestroy {
  /** Freeze input while a dialog is open. */
  readonly locked = input(false);
  readonly selected = output<Landmark>();

  protected readonly town = TOWN;
  protected readonly hits = TOWN.hits.map(h => ({ ...h, landmark: landmark(h.id) }));
  protected readonly boat = { ...TOWN.boat, landmark: landmark('boat') };
  protected readonly decor = (TOWN.decor as readonly Decor[]).filter(d => d.kind !== 'animal');
  // animals roam: each picks a random spot within `roam` tiles of home, walks the route there, waits, picks again
  private readonly herd: Critter[] = (TOWN.decor as readonly Decor[]).filter(d => d.kind === 'animal').map(d => ({
    ...d, fx: d.x + d.w / 2, fy: d.y + d.h - 1, hx: d.x + d.w / 2, hy: d.y + d.h - 1, path: [], wait: Math.random() * 3000, flip: false, moving: false,
  }));
  protected readonly critters = signal<readonly Critter[]>(this.herd);

  // ---- Luis ----------------------------------------------------------------------------------------------
  private readonly pos = signal({ x: TOWN.start.x as number, y: TOWN.start.y as number });
  private readonly frame = signal(0);   // 0 = standing, 1-2 = walk steps
  private readonly facing = signal<Dir>('down');

  // ---- size and camera -----------------------------------------------------------------------------------
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly box = signal({ w: innerWidth, h: innerHeight });
  /** Px per map px: whole numbers (crisp pixels) for about 20 tiles across on big screens; small screens
   *  (the phone's Game Boy screen) show about 15 tiles across, like the real thing. */
  protected readonly scale = computed(() => {
    const { w, h } = this.box(), fit = Math.min(w / 320, h / 208);
    return fit >= 2 ? Math.floor(fit) : Math.min(2, Math.max(1, w / 240));
  });
  private readonly intro = signal(0);   // 0 = whole map in view, 1 = following Luis
  protected readonly introDone = computed(() => this.intro() === 1);
  protected readonly mapTransform = computed(() => {
    const s = this.scale(), { w, h } = this.box(), t = this.intro(), p = this.pos();
    const fit = Math.min(w / (TOWN.w * s), h / (TOWN.h * s), 1), z = fit + (1 - fit) * t;
    // camera centre: from the middle of the map to Luis, kept inside the map edges
    const along = (from: number, to: number, size: number, view: number) =>
      size <= view ? size / 2 : Math.min(Math.max(from + (to - from) * t, view / 2), size - view / 2);
    const cx = along(TOWN.w / 2, p.x, TOWN.w, w / (s * z)), cy = along(TOWN.h / 2, p.y, TOWN.h, h / (s * z));
    return `translate(${Math.round(w / 2 - cx * s * z)}px, ${Math.round(h / 2 - cy * s * z)}px) scale(${z})`;
  });
  private readonly resizer = new ResizeObserver(() => this.box.set({ w: this.host.clientWidth, h: this.host.clientHeight }));
  // the opening shot: a second on the whole town, then glide in to Luis
  private readonly introState = { t: 0 };
  private readonly introTween = gsap.to(this.introState, {
    t: 1, delay: 1, duration: 2.2, ease: 'power2.inOut', onUpdate: () => this.intro.set(this.introState.t),
  });

  constructor() {
    this.resizer.observe(this.host);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) this.introTween.progress(1);
  }

  // while he stands still: blinks now and then; after a few seconds facing you he picks a mood: the floreo (spins the
  // reata), sits down, or looks at his phone; moving again ends it
  private readonly idle = signal<{ blink: boolean; mood: Mood; step: number }>({ blink: false, mood: 'none', step: 0 });
  private nextMood: Mood = MOODS[Math.floor(Math.random() * MOODS.length)];
  private movedAt = 0;
  protected readonly bubble = signal<string | null>(null);   // emote bubble over his head
  private bubbleTimer = 0;
  private waiting = false;   // the "!" bubble is up; the place's box opens in a moment

  protected readonly luis = computed(() => {
    const s = this.scale(), { x, y } = this.pos(), d = this.facing(), { blink, mood, step } = this.idle();
    const lasso = mood === 'floreo' ? step % 4 : -1;
    const still = mood === 'sit' ? `sit-${blink ? 1 : 0}` : mood === 'phone' ? `phone-${Math.floor(step / 4) % 2}` : lasso >= 0 ? `floreo-${lasso}` : blink ? 'blink' : 0;
    // the side frames face left; walking right shows them mirrored
    // shortcut: mirroring moves the reata to his other hand; draw a right-facing set if that bothers anyone
    const view = d === 'left' || d === 'right' ? 'side' : d, frame = this.frame(), pass = frame === 3;
    return {
      src: `town/luis-${view}-${frame === 0 && view === 'down' ? still : pass ? 0 : frame}.png`, flip: d === 'right',
      left: (x - 12) * s, top: (y - 33 - (pass ? 1 : 0)) * s, w: 24 * s, h: 34 * s, x: x * s, y: y * s,
      lasso: lasso < 0 ? null : { back: `town/luis-lasso-back-${lasso}.png`, front: `town/luis-lasso-front-${lasso}.png`, left: (x - 24) * s, top: (y - 19) * s, w: 48 * s, h: 16 * s },
      bubble: { left: (x - 7) * s, top: (y - 48) * s, w: 14 * s, h: 13 * s },
    };
  });

  /** Show an emote bubble over Luis for a moment: 'alert' (!), 'happy', 'music'. */
  emote(name: 'alert' | 'happy' | 'music', ms = 1400): void {
    clearTimeout(this.bubbleTimer);
    this.bubble.set(`town/emote-${name}.png`);
    this.bubbleTimer = window.setTimeout(() => this.bubble.set(null), ms);
  }

  private standStill(t: number): void {
    const facingYou = this.facing() === 'down', still = t - this.movedAt;
    const next = { blink: (t % 3400) < 140, mood: facingYou && still > 4000 && !this.locked() ? this.nextMood : 'none' as Mood, step: Math.floor(t / 110) };
    const cur = this.idle();
    if (cur.blink !== next.blink || cur.mood !== next.mood || (next.mood !== 'none' && cur.step !== next.step)) this.idle.set(next);
  }
  protected readonly hintGone = signal(false);
  private readonly held = new Set<Dir>();
  private steps: { x: number; y: number }[] = [];   // tap-to-walk route
  private near: string | null = null;   // the place already asked about; asks again only after Luis walks away
  private last = 0;
  private readonly zone = inject(NgZone);
  // the loop runs outside Angular so 60 frames/s don't each trigger change detection; signals still update the view
  private raf = this.zone.runOutsideAngular(() => requestAnimationFrame(t => this.tick(t)));

  /** Arrow keys / WASD and the on-screen arrows. */
  press(dir: Dir): void {
    if (this.locked()) return;
    this.introTween.progress(1);   // skip the opening shot as soon as someone moves
    this.held.add(dir); this.steps = []; this.hintGone.set(true);
  }
  release(dir: Dir): void { this.held.delete(dir); }

  /** The A button: ask about the place Luis is standing next to, if any (even one he said NO to). */
  interact(): void {
    const { x, y } = this.pos(), id = nearest(x, y, TOWN.spots);
    if (id) this.pick(landmark(id));
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(e: KeyboardEvent): void {
    const dir = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!dir || this.locked() || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault(); this.press(dir);
  }
  @HostListener('window:keyup', ['$event'])
  protected onKeyUp(e: KeyboardEvent): void {
    const dir = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (dir) this.release(dir);
  }
  @HostListener('window:blur')
  protected onBlur(): void { this.held.clear(); }

  /** Click / tap on the ground: walk there around trees and houses. offsetX/Y are in the ground image's px. */
  protected walkTo(e: MouseEvent): void {
    if (this.locked()) return;
    this.introTween.progress(1);
    this.steps = route(this.pos(), { x: e.offsetX / this.scale(), y: e.offsetY / this.scale() }); this.hintGone.set(true);
  }

  protected pick(l: Landmark): void {
    if (this.locked()) return;
    this.hintGone.set(true);
    this.selected.emit(l);
  }

  private tick(t: number): void {
    const dt = Math.min(t - (this.last || t), 50) / 1000; this.last = t;
    this.raf = requestAnimationFrame(next => this.tick(next));
    this.roam(dt);
    if (this.locked() || this.waiting) { this.held.clear(); this.steps = []; this.frame.set(0); this.standStill(t); return; }
    const p = this.pos();
    let dx = 0, dy = 0;
    for (const d of this.held) { dx += DIRS[d][0]; dy += DIRS[d][1]; }
    if (!this.held.size && this.steps.length) {
      dx = this.steps[0].x - p.x; dy = this.steps[0].y - p.y;
      if (Math.hypot(dx, dy) < 1) { this.steps.shift(); return; }
    }
    const len = Math.hypot(dx, dy);
    if (!len) { this.frame.set(0); this.standStill(t); return; }
    if (this.idle().mood !== 'none') this.nextMood = MOODS[Math.floor(Math.random() * MOODS.length)];   // a new mood next time
    this.movedAt = t; if (this.idle().mood !== 'none' || this.idle().blink) this.idle.set({ blink: false, mood: 'none', step: 0 });
    const step = Math.min(SPEED * dt, this.held.size ? Infinity : len);
    let x = p.x + dx / len * step, y = p.y + dy / len * step;
    // slide along walls: if the move is blocked, try each axis on its own
    const free = (ax: number, ay: number) => canStand(ax, ay) && !this.bumps(ax, ay, p, null);
    if (!free(x, y)) { if (free(x, p.y)) y = p.y; else if (free(p.x, y)) x = p.x; else { this.steps = []; this.frame.set(0); return; } }
    this.pos.set({ x, y });
    this.facing.set(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
    this.frame.set([1, 3, 2, 3][Math.floor(t / STEP_MS) % 4]);   // step, pass, other step, pass
    const id = nearest(x, y, TOWN.spots);
    if (id && id !== this.near) {   // "!" over his head, then the place's box
      this.held.clear(); this.steps = []; this.frame.set(0); this.waiting = true;
      this.zone.run(() => { this.emote('alert', 600); setTimeout(() => { this.waiting = false; this.pick(landmark(id)); }, 550); });
    }
    this.near = id;
  }

  /** Would moving to (x, y) walk into Luis or an animal (other than `self`)? Moving away from one is always allowed. */
  private bumps(x: number, y: number, from: { x: number; y: number }, self: Critter | null): boolean {
    const bodies = [...(self ? [{ x: this.pos().x, y: this.pos().y, r: 7 }] : []),
      ...this.herd.filter(c => c !== self).map(c => ({ x: c.fx, y: c.fy, r: (c.w + (self ? self.w : 10)) / 2 - 6 }))];   // contact, not personal space
    return bumps(bodies, x, y, from);
  }

  private roam(dt: number): void {
    for (const c of this.herd) {
      c.moving = false;
      if (c.wait > 0) { c.wait -= dt * 1000; continue; }
      if (!c.path.length) {
        const r = (c.roam ?? 5) * TOWN.tile;
        for (let tries = 0; tries < 6 && !c.path.length; tries++) {
          const to = { x: c.hx + (Math.random() * 2 - 1) * r, y: c.hy + (Math.random() * 2 - 1) * r };
          if (canStand(to.x, to.y)) c.path = route({ x: c.fx, y: c.fy }, to);
        }
        if (!c.path.length) { c.wait = 1000; continue; }
      }
      c.moving = true;
      const p = c.path[0], dx = p.x - c.fx, dy = p.y - c.fy, len = Math.hypot(dx, dy), step = (c.speed ?? 18) * dt;
      const nx = len <= step ? p.x : c.fx + dx / len * step, ny = len <= step ? p.y : c.fy + dy / len * step;
      if (this.bumps(nx, ny, { x: c.fx, y: c.fy }, c)) { c.path = []; c.moving = false; c.wait = 600 + Math.random() * 900; continue; }
      c.fx = nx; c.fy = ny;
      if (len <= step) { c.path.shift(); if (!c.path.length) c.wait = 1500 + Math.random() * 3500; }
      if (Math.abs(dx) > .5) c.flip = (dx < 0) === (c.right ?? true);   // face the way it walks
    }
    this.critters.set([...this.herd]);
  }

  ngOnDestroy(): void { clearTimeout(this.bubbleTimer); this.introTween.kill(); cancelAnimationFrame(this.raf); this.resizer.disconnect(); }
}
