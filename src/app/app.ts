import { Component, signal, viewChild } from '@angular/core';
import { ClassicView } from './classic-view/classic-view';
import { Dir, Island } from './island/island';
import { Landmark } from './island/landmarks';
import { Sound } from './sound';
import { TextBox } from './text-box/text-box';

@Component({
  selector: 'app-root',
  imports: [Island, TextBox, ClassicView],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly selected = signal<Landmark | null>(null);
  protected readonly classic = signal(false);
  private readonly island = viewChild.required(Island);
  private readonly textBox = viewChild(TextBox);
  private readonly sound = new Sound();
  protected readonly soundOn = signal(true);

  constructor() {
    // Music is on from the start. Browsers only allow sound after the first tap / click / key press, so it begins
    // there (capture phase, before any button: a first click on the sound button then turns it off, as it shows ON).
    const begin = () => { if (this.soundOn() && !this.sound.playing) { this.sound.start(); this.island().emote('music'); } };
    for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, begin, { capture: true, once: true });
  }

  protected toggleSound(): void {
    if (this.sound.playing) this.sound.stop();
    else this.sound.start();
    this.soundOn.set(this.sound.playing);
    if (this.sound.playing) this.island().emote('music');
  }

  protected open(): void {
    const l = this.selected();
    if (l) window.open(l.url, '_blank', 'noopener');
    this.close();
    this.island().emote('happy');
  }

  // ---- Game Boy controls: D-pad walks Luis (or moves ▶ in the dialog), A = accept / talk, B = cancel
  protected readonly dpad: Dir[] = ['up', 'left', 'right', 'down'];

  protected press(dir: Dir): void {
    const box = this.textBox();
    if (!box) this.island().press(dir);
    else if (dir === 'up' || dir === 'down') box.move();
  }
  protected release(dir: Dir): void { this.island().release(dir); }
  protected buttonA(): void { const box = this.textBox(); if (box) box.accept(); else this.island().interact(); }
  protected buttonB(): void { if (this.selected()) this.close(); }

  protected close(): void {
    this.selected.set(null);
  }
}
