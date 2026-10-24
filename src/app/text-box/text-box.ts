import { Component, ElementRef, HostListener, OnDestroy, effect, input, output, signal, viewChildren } from '@angular/core';
import { Landmark } from '../island/landmarks';

// Pokémon-style dialogue: the text types itself out, then ▶YES / NO (arrows to switch, Enter to pick, Esc = NO).
@Component({
  selector: 'app-text-box',
  templateUrl: './text-box.html',
  styleUrl: './text-box.scss',
})
export class TextBox implements OnDestroy {
  readonly landmark = input.required<Landmark>();
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly typed = signal('');
  protected readonly choice = signal(0);              // 0 = YES, 1 = NO
  private readonly options = viewChildren<ElementRef<HTMLButtonElement>>('option');
  private timer = 0;

  constructor() {
    effect(() => {
      const l = this.landmark();
      const text = `This is ${l.place}. ${l.about} Do you want to go there?`;
      clearInterval(this.timer);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { this.typed.set(text); return; }
      let n = 0;
      this.typed.set('');
      this.timer = window.setInterval(() => {
        this.typed.set(text.slice(0, ++n));
        if (n >= text.length) clearInterval(this.timer);
      }, 18);
    });
    effect(() => this.options()[this.choice()]?.nativeElement.focus());
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); this.choice.update(c => 1 - c); }
    if (e.key === 'Escape') this.cancelled.emit();
  }

  protected pick(i: number): void { i === 0 ? this.confirmed.emit() : this.cancelled.emit(); }

  ngOnDestroy(): void { clearInterval(this.timer); }
}
