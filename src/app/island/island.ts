import { Component, HostListener, OnDestroy, computed, input, output, signal } from '@angular/core';
import { gsap } from 'gsap';
import { ISLAND } from './island-data';
import { LANDMARKS, Landmark } from './landmarks';

// The island in Yoshi's Island title-screen style: the ground image lies on a tilted plane (CSS 3D, the "Mode 7"
// look) and every object is a billboard that counter-rotates so it always stands up and faces the camera.
// Objects with four drawings (front, east, back, west) swap to the side that faces the camera as the island
// turns, like Mario Kart / Doom sprites, so you see the houses' sides and back.
// Clicking a screen side turns the island 45°, dragging or the mouse wheel turns it freely, clicking a building
// zooms in on it.
const TILT = 60;            // degrees the ground is tilted away from the viewer
const STEP = 45;            // degrees per side click
const ZOOM_IN = 380;        // px the camera moves towards a selected building
const DRAG_DEG_PER_PX = 0.25;
const ISLAND_WIDTH = 428;   // px of land in the 1x art (2 × RX in render3.js)

interface Sprite {
  id: string; src: string; left: number; top: number; w: number; h: number; origin: string; landmark?: Landmark;
}

@Component({
  selector: 'app-island',
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
  private readonly cam = { rot: 0, zoom: 0, focusX: ISLAND.ground.centerX as number, focusY: ISLAND.ground.centerY as number };
  protected readonly rot = signal(0);
  protected readonly zoom = signal(0);
  protected readonly focusX = signal<number>(ISLAND.ground.centerX);
  protected readonly focusY = signal<number>(ISLAND.ground.centerY);
  protected readonly hintGone = signal(false);
  protected readonly ground = ISLAND.ground;
  // just past the ground image's corners (half-diagonal 512 px at 1x), so it always covers them
  protected readonly seaRadius = computed(() => 560 * this.scale());

  // Which side of the objects faces the camera: turning the island +90° brings their east side round to the front.
  private readonly side = computed(() => ((Math.round(this.rot() / 90) % 4) + 4) % 4);

  // Each object stands on its ground anchor; the current view is placed by its offset from that anchor, and turns
  // around the anchor (transform-origin), so all four views stand on the same spot.
  protected readonly sprites = computed<Sprite[]>(() => {
    const s = this.scale(), side = this.side();
    return ISLAND.objects.map(o => {
      const v = o.views[o.views.length === 4 ? side : 0];
      return {
        id: o.id, src: v.src, w: v.w * s, h: v.h * s, left: (o.ax + v.dx) * s, top: (o.ay + v.dy) * s,
        origin: `${-v.dx * s}px ${-v.dy * s}px`, landmark: LANDMARKS.find(l => l.id === o.id),
      };
    });
  });

  protected readonly worldTransform = computed(() => {
    const s = this.scale();
    return `translateZ(${this.zoom()}px) rotateX(${TILT}deg) rotateZ(${this.rot()}deg) ` +
      `translate(${-this.focusX() * s}px, ${-this.focusY() * s}px)`;
  });

  private readonly reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private tween?: gsap.core.Tween;
  private drag: { x: number; rot: number; moved: boolean } | null = null;
  private suppressClick = false;

  // ---- turning -------------------------------------------------------------------------------------------
  turn(direction: 1 | -1): void {
    if (this.locked()) return;
    this.hintGone.set(true);
    // snap to the next 45° step so repeated clicks stay on a clean grid
    const target = Math.round(this.cam.rot / STEP) * STEP + direction * STEP;
    this.animate({ rot: target }, 500);
  }

  protected onPointerDown(e: PointerEvent): void {
    if (this.locked() || e.button !== 0) return;
    this.drag = { x: e.clientX, rot: this.cam.rot, moved: false };
    this.suppressClick = false;
  }

  @HostListener('window:pointermove', ['$event'])
  protected onPointerMove(e: PointerEvent): void {
    if (!this.drag) return;
    const dx = e.clientX - this.drag.x;
    if (!this.drag.moved && Math.abs(dx) < 6) return;     // small moves are still clicks
    this.drag.moved = true;
    this.tween?.kill();
    this.cam.rot = this.drag.rot + dx * DRAG_DEG_PER_PX;
    this.sync();
    this.hintGone.set(true);
  }

  @HostListener('window:pointerup')
  @HostListener('window:pointercancel')
  protected onPointerUp(): void {
    if (this.drag?.moved) this.suppressClick = true;
    this.drag = null;
  }

  // mouse wheel / trackpad scroll turns the island too
  protected onWheel(e: WheelEvent): void {
    if (this.locked()) return;
    e.preventDefault();
    this.tween?.kill();
    this.cam.rot -= (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.15;
    this.sync();
    this.hintGone.set(true);
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if (this.locked()) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); this.turn(1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); this.turn(-1); }
  }

  // ---- buildings -----------------------------------------------------------------------------------------
  protected pick(sprite: Sprite): void {
    if (this.suppressClick || this.locked() || !sprite.landmark) return;
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
  @HostListener('window:resize')
  protected onResize(): void { this.scale.set(this.pickScale()); }

  // integer scale (crisp pixels) that makes the island about 85% of the screen width
  private pickScale(): number { return Math.max(1, Math.floor(innerWidth * 0.85 / ISLAND_WIDTH)); }

  private animate(to: Partial<typeof this.cam>, ms: number, done?: () => void): void {
    this.tween?.kill();
    this.tween = gsap.to(this.cam, {
      ...to, duration: this.reduceMotion ? 0 : ms / 1000, ease: 'power3.out',
      onUpdate: () => this.sync(), onComplete: done,
    });
  }

  private sync(): void {
    this.rot.set(this.cam.rot); this.zoom.set(this.cam.zoom);
    this.focusX.set(this.cam.focusX); this.focusY.set(this.cam.focusY);
  }

  ngOnDestroy(): void { this.tween?.kill(); }
}
