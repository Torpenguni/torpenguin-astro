// Topics for torpenguin.com essays.
// `slug` is used in URLs (/essays/<slug>) and must match the `topic`
// enum in src/content/config.ts and the options in tina/config.ts.

export interface Topic {
  slug: string;
  label: string;
  description: string;
}

export const topics: Topic[] = [
  {
    slug: 'building',
    label: 'Building',
    description:
      'Starting things from zero — brands, teams, and the messy first years before anything works.',
  },
  {
    slug: 'operations',
    label: 'Operations',
    description:
      'The daily craft of running outlets: people, process, and the unglamorous details that decide whether a business survives.',
  },
  {
    slug: 'scaling',
    label: 'Scaling',
    description:
      'What changes when one outlet becomes forty. Systems, hiring, and the failure modes of growth.',
  },
  {
    slug: 'unit-economics',
    label: 'Unit Economics',
    description:
      'The numbers underneath a restaurant — rent, labor, margin, and the math most plans get wrong.',
  },
  {
    slug: 'f-and-b',
    label: 'F&B Industry',
    description:
      'Reading the wider food-and-beverage landscape in Thailand and across Asia.',
  },
];
