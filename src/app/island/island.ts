import { Component, ElementRef, HostListener, NgZone, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { gsap } from 'gsap';
import { ISLAND } from './island-data';
import { LANDMARKS, Landmark } from './landmarks';
import { nearest, onLand } from './walk';

// The island stays at a fixed viewing angle. Selecting a building animates the camera towards it.
const TILT = 60;            // degrees the ground is tilted away from the viewer
const ZOOM_IN = 380;        // px the camera moves towards a selected building
const ISLAND_WIDTH = 428;   // px of land in the 1x art (2 × RX in render3.js)
const MOUNTAIN_ID = 'malinche';
const SPEED = 70;           // px per second (1x) that Luis walks
const STEP_MS = 160;        // how long each walk frame shows
const LUIS = ISLAND.objects.find(o => o.id === 'luis')!;
const SPOTS = ISLAND.objects.filter(o => LANDMARKS.some(l => l.id === o.id));
export type Dir = 'up' | 'down' | 'left' | 'right';
const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEYS: Record<string, Dir> = {
  ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
};

interface Sprite {
  id: string; src: string; left: number; top: number; w: number; h: number; origin: string; landmark?: Landmark;
}

@Component({
  selector: 'app-island',
  imports: [NgTemplateOutlet],
  templateUrl: './island.html',
  styleUrl: './island.scss',
})
export class Island implements OnDestroy {
  /** Freeze input while a dialog is open. */
  readonly locked = input(false);
  readonly selected = output<Landmark>();

  protected readonly tilt = TILT;
  protected readonly scale = signal(this.pickScale());
  // Camera: GSAP tweens this plain object, and sync() copies it into the signals the template reads.
  private readonly cam = { zoom: 0, focusX: ISLAND.ground.centerX as number, focusY: ISLAND.ground.centerY as number };
  protected readonly zoom = signal(0);
  protected readonly focusX = signal<number>(ISLAND.ground.centerX);
  protected readonly focusY = signal<number>(ISLAND.ground.centerY);
  protected readonly hintGone = signal(false);
  protected readonly ground = ISLAND.ground;
  // just past the ground image's corners (half-diagonal 512 px at 1x), so it always covers them
  protected readonly seaRadius = computed(() => 560 * this.scale());
  protected readonly mountain = computed<Sprite | undefined>(() => {
    const o = ISLAND.objects.find(object => object.id === MOUNTAIN_ID);
    if (!o) return undefined;
    const s = this.scale(), v = o.views[0];
    return {
      id: o.id, src: v.src, w: v.w * s, h: v.h * s, left: (o.ax + v.dx) * s, top: (o.ay + v.dy) * s,
      origin: `${-v.dx * s}px ${-v.dy * s}px`,
    };
  });

  protected readonly mountainTransform = computed(() => {
    const s = this.scale();
    return `translateZ(${this.zoom()}px) rotateX(${TILT}deg) ` +
      `translate(${-this.focusX() * s}px, ${-this.focusY() * s}px)`;
  });

  // Keep each sprite at its fixed viewing angle and ground anchor.
  protected readonly sprites = computed<Sprite[]>(() => {
    const s = this.scale();
    return ISLAND.objects.filter(o => o.id !== MOUNTAIN_ID && o.id !== LUIS.id).map(o => {
      const v = o.views[0];
      return {
        id: o.id, src: v.src, w: v.w * s, h: v.h * s, left: (o.ax + v.dx) * s, top: (o.ay + v.dy) * s,
        origin: `${-v.dx * s}px ${-v.dy * s}px`, landmark: LANDMARKS.find(l => l.id === o.id),
      };
    });
  });

  protected readonly worldTransform = computed(() => {
    const s = this.scale();
    return `translateZ(${this.zoom()}px) rotateX(${TILT}deg) ` +
      `translate(${-this.focusX() * s}px, ${-this.focusY() * s}px)`;
  });

  private readonly reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private tween?: gsap.core.Tween;

  // ---- Luis walking --------------------------------------------------------------------------------------
  private readonly pos = signal({ x: LUIS.ax as number, y: LUIS.ay as number });
  private readonly frame = signal(0);   // 0 = standing, 1-2 = walk steps
  private readonly facing = signal<Dir>('down');
  protected readonly luis = computed(() => {
    const s = this.scale(), v = LUIS.views[0], { x, y } = this.pos(), d = this.facing();
    // the side frames face left; walking right shows them mirrored
    // shortcut: mirroring moves the reata to his other hand; draw a right-facing set if that bothers anyone
    const view = d === 'left' || d === 'right' ? 'side' : d;
    return {
      src: `island/sprites/luis-${view}-${this.frame()}.png`, flip: d === 'right', x: x * s, y: y * s,
      // shortcut: only Luis switches layers; trees behind the mountain still draw over him. Per-sprite layers if it shows.
      behind: y < 290 && x > 290 && x < 515,   // north of La Malinche's base, inside her width
      w: v.w * s, h: v.h * s, left: (x + v.dx) * s, top: (y + v.dy) * s, origin: `${-v.dx * s}px ${-v.dy * s}px`,
    };
  });
  private readonly held = new Set<Dir>();
  private target?: { x: number; y: number };
  private near: string | null = null;   // the landmark already asked about; asks again only after Luis walks away
  private last = 0;
  private readonly zone = inject(NgZone);
  // the loop runs outside Angular so 60 frames/s don't each trigger change detection; signals still update the view
  private raf = this.zone.runOutsideAngular(() => requestAnimationFrame(t => this.tick(t)));

  /** Arrow keys / WASD and the on-screen arrows. */
  press(dir: Dir): void {
    if (this.locked()) return;
    this.held.add(dir); this.target = undefined; this.hintGone.set(true);
  }
  release(dir: Dir): void { this.held.delete(dir); }

  /** The A button: ask about the landmark Luis is standing next to, if any (even one he said NO to). */
  interact(): void {
    const { x, y } = this.pos(), id = nearest(x, y, SPOTS), sprite = this.sprites().find(s => s.id === id);
    if (sprite) this.pick(sprite);
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

  /** Click / tap on the ground: walk there. offsetX/Y are already in the ground image's own (untilted) px. */
  protected walkTo(e: MouseEvent): void {
    if (this.locked()) return;
    this.target = { x: e.offsetX / this.scale(), y: e.offsetY / this.scale() }; this.hintGone.set(true);
  }

  private tick(t: number): void {
    const dt = Math.min(t - (this.last || t), 50) / 1000; this.last = t;
    this.raf = requestAnimationFrame(next => this.tick(next));
    if (this.locked()) { this.held.clear(); this.target = undefined; this.frame.set(0); return; }
    const p = this.pos();
    let dx = 0, dy = 0;
    for (const d of this.held) { dx += DIRS[d][0]; dy += DIRS[d][1]; }
    if (!this.held.size && this.target) { dx = this.target.x - p.x; dy = this.target.y - p.y; }
    const len = Math.hypot(dx, dy);
    if (len < 0.5) { this.target = undefined; this.frame.set(0); return; }
    const step = Math.min(SPEED * dt, this.held.size ? Infinity : len);
    const x = p.x + dx / len * step, y = p.y + dy / len * step;
    // shortcut: only the shore and the mountain block him; he walks through houses. Add footprints to walk.ts if needed.
    if (!onLand(x, y)) { this.target = undefined; this.frame.set(0); return; }   // shore or mountain: stop
    this.pos.set({ x, y });
    this.facing.set(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
    this.frame.set(1 + Math.floor(t / STEP_MS) % 2);
    const id = nearest(x, y, SPOTS);
    if (id && id !== this.near) {
      const sprite = this.sprites().find(s => s.id === id);
      if (sprite) { this.held.clear(); this.target = undefined; this.frame.set(0); this.zone.run(() => this.pick(sprite)); }
    }
    this.near = id;
  }

  // ---- buildings -----------------------------------------------------------------------------------------
  protected pick(sprite: Sprite): void {
    if (this.locked() || !sprite.landmark) return;
    const s = this.scale();
    this.hintGone.set(true);
    const landmark = sprite.landmark;
    // zoom so the building's base lands in the middle of the screen, then ask
    this.animate({ zoom: ZOOM_IN, focusX: (sprite.left + sprite.w / 2) / s, focusY: (sprite.top + sprite.h) / s }, 600,
      () => this.selected.emit(landmark));
  }

  /** Called by the parent when the dialog closes. */
  zoomOut(): void {
    this.animate({ zoom: 0, focusX: ISLAND.ground.centerX, focusY: ISLAND.ground.centerY }, 500);
  }

  // ---- helpers -------------------------------------------------------------------------------------------
  // re-measure when the island's own box changes size (window resize, or the Game Boy screen layout on phones)
  private readonly resizer = new ResizeObserver(() => this.scale.set(this.pickScale()));
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  constructor() { this.resizer.observe(this.host); }

  // integer scale (crisp pixels) that makes the island about 85% of its box's width (the window, or the Game Boy
  // screen on phones); boxes narrower than the 1x art shrink it instead of letting it spill over the edges
  private pickScale(): number {
    const fit = (this.host?.clientWidth || innerWidth) * 0.85 / ISLAND_WIDTH;
    return fit >= 1 ? Math.floor(fit) : fit;
  }

  private animate(to: Partial<typeof this.cam>, ms: number, done?: () => void): void {
    this.tween?.kill();
    this.tween = gsap.to(this.cam, {
      ...to, duration: this.reduceMotion ? 0 : ms / 1000, ease: 'power3.out',
      onUpdate: () => this.sync(), onComplete: done,
    });
  }

  private sync(): void {
    this.zoom.set(this.cam.zoom);
    this.focusX.set(this.cam.focusX); this.focusY.set(this.cam.focusY);
  }

  ngOnDestroy(): void { this.tween?.kill(); cancelAnimationFrame(this.raf); this.resizer.disconnect(); }
}
