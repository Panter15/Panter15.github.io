// Places that link somewhere. `id` matches a place id in town-data.ts (made by art/town.js).
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
    place: 'the consulate',
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
  {
    id: 'boat',
    name: 'DANZA FOLCLOR',
    place: 'the chiva boat',
    about: 'Bilingual animated site for a Colombian folk dance group (Next.js, GSAP).',
    url: 'https://panter15.github.io/danza-folclor/',
  },
];
