import { Component, signal, viewChild } from '@angular/core';
import { ClassicView } from './classic-view/classic-view';
import { Island } from './island/island';
import { Landmark } from './island/landmarks';
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

  protected open(): void {
    const l = this.selected();
    if (l) window.open(l.url, '_blank', 'noopener');
    this.close();
  }

  protected close(): void {
    this.selected.set(null);
    this.island().zoomOut();
  }
}
