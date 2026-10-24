// Buildings that link somewhere. `id` matches a sprite id in island-data.ts.
// Rule: one building per deployed project, plus the GitHub library and the LinkedIn lighthouse.
export interface Landmark {
  id: string;
  name: string;
  place: string;
  about: string;
  url: string;
}

export const LANDMARKS: Landmark[] = [
  {
    id: 'visa',
    name: 'EASYTRAVEL VISA',
    place: 'the visa office',
    about: 'Full stack platform for a visa-advisory agency (Angular, Spring Boot, PostgreSQL).',
    url: 'https://panter15.github.io/visa-agency-fe/',
  },
  {
    id: 'library',
    name: 'GITHUB',
    place: 'the library',
    about: 'My code and projects.',
    url: 'https://github.com/Panter15',
  },
  {
    id: 'lighthouse',
    name: 'LINKEDIN',
    place: 'the lighthouse',
    about: 'Experience and contact.',
    url: 'https://www.linkedin.com/in/luis-portilla',
  },
];

// Deployed work that has no building yet (Danza Folclor gets the caimán statue later).
export const EXTRA_LINKS: Omit<Landmark, 'id' | 'place'>[] = [
  {
    name: 'DANZA FOLCLOR',
    about: 'Bilingual animated site for a Colombian folk dance group (Next.js, GSAP).',
    url: 'https://panter15.github.io/danza-folclor/',
  },
];
