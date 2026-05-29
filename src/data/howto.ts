// How-to sub-topics. Shown as a sub-nav on the How-to pillar and backed by
// tag-archive pages (/tag/<slug>) so each is an indexable, keyword-targeted hub.
// `slug` must match the English tag string used on posts in src/data/posts.ts.

export interface HowToTopic {
  slug: string;
  label: string; // English display (matches nav style)
  th: string; // Thai keyword for headings / SEO
}

export const howToTopics: HowToTopic[] = [
  { slug: 'cost', label: 'Cost', th: 'ต้นทุน' },
  { slug: 'marketing', label: 'Marketing', th: 'การตลาด' },
  { slug: 'team', label: 'Team', th: 'ทีมงาน' },
  { slug: 'systems', label: 'Systems', th: 'ระบบร้าน' },
  { slug: 'menu', label: 'Menu', th: 'เมนู' },
];

export const howToTopicBySlug = (slug: string): HowToTopic | undefined =>
  howToTopics.find((t) => t.slug === slug);
