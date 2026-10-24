import { Component } from '@angular/core';
import { EXTRA_LINKS, LANDMARKS } from '../island/landmarks';

// The same links as a plain list: for recruiters in a hurry, screen readers and slow phones.
@Component({
  selector: 'app-classic-view',
  template: `
    <section aria-label="Classic view">
      <h1>LUIS PORTILLA</h1>
      <ul>
        @for (l of links; track l.url) {
          <li><a [href]="l.url" target="_blank" rel="noopener">{{ l.name }}</a><small>{{ l.about }}</small></li>
        }
      </ul>
    </section>
  `,
  styles: `
    section { position: fixed; inset: 0; z-index: 2; overflow: auto; padding: 80px 24px 24px; background: var(--paper); }
    h1 { margin: 0 0 24px; font-size: 16px; }
    ul { display: grid; gap: 18px; max-width: 640px; margin: 0; padding: 0; list-style: none; }
    a { color: var(--ink); font-size: 12px; line-height: 1.8; }
    small { display: block; margin-top: 4px; font-family: system-ui, sans-serif; font-size: 14px; color: #555; }
  `,
})
export class ClassicView {
  protected readonly links = [...LANDMARKS, ...EXTRA_LINKS];
}
