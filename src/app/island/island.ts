import { Component, HostListener, OnDestroy, computed, input, output, signal } from '@angular/core';
import { gsap } from 'gsap';
import { ISLAND } from './island-data';
import { LANDMARKS, Landmark } from './landmarks';

// The island stays at a fixed viewing angle. Selecting a building animates the camera towards it.
const TILT = 60;            // degrees the ground is tilted away from the viewer
const ZOOM_IN = 380;        // px the camera moves towards a selected building
const ISLAND_WIDTH = 428;   // px of land in the 1x art (2 × RX in render3.js)
const MOUNTAIN_ID = 'malinche';

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
    return ISLAND.objects.filter(o => o.id !== MOUNTAIN_ID).map(o => {
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
    this.zoom.set(this.cam.zoom);
    this.focusX.set(this.cam.focusX); this.focusY.set(this.cam.focusY);
  }

  ngOnDestroy(): void { this.tween?.kill(); }
}
