// SpoonAsia — content source of truth
// Articles, categories, cities, and videos used across the site

export interface Article {
  slug: string;
  title: string;
  dek: string;
  category: string;
  tag: string;
  author: string;
  date: string;
  readTime: string;
  body: string;
}

export interface Category {
  slug: string;
  label: string;
  description: string;
}

export interface City {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  stats: Array<{ label: string; value: string; note?: string }>;
  zones: Array<{ name: string; note: string }>;
}

export interface Video {
  slug: string;
  episode: string;
  title: string;
  description: string;
  duration: string;
  views: string;
  date: string;
}

export const categories: Category[] = [
  {
    slug: 'unit-economics',
    label: 'Unit Economics',
    description: 'The math behind every outlet — rent, labor, COGS, and what no broker tells you. We pull apart the P&L of cafes, restaurants, and chains across Asia.',
  },
  {
    slug: 'neighborhood-alpha',
    label: 'Neighborhood Alpha',
    description: 'Why one block becomes a dining destination and the next stays empty. Street-level analysis of Asia\'s F&B zones — rent curves, foot traffic, and the social capital that prices a corner.',
  },
  {
    slug: 'market-entry',
    label: 'Market Entry',
    description: 'How foreign operators get in, what trips them up, and the case studies behind both. Partner contracts, license traps, and the playbooks that actually work.',
  },
  {
    slug: 'supplier-intel',
    label: 'Supplier Intel',
    description: 'The hidden chains feeding Thailand\'s F&B economy. Importers, distributors, and the duopolies hiding in plain sight.',
  },
  {
    slug: 'markets',
    label: 'Markets',
    description: 'Macro signals: rents, vacancies, REIT yields, ticker movements.',
  },
  {
    slug: 'operators',
    label: 'Operators',
    description: 'Inside the chains and independents reshaping Asian F&B.',
  },
  {
    slug: 'suppliers',
    label: 'Suppliers',
    description: 'Importers, distributors, and the supply-chain dynamics that move the menu.',
  },
  {
    slug: 'investment',
    label: 'Investment',
    description: 'Where Asian F&B capital flows — family offices, private equity, and the cross-border deals.',
  },
  {
    slug: 'neighborhood',
    label: 'Neighborhood',
    description: 'Street-level alpha on Asia\'s F&B zones.',
  },
  {
    slug: 'founder-stories',
    label: 'Founder Stories',
    description: 'How Thai F&B operators built their businesses — origin moves, format decisions, and the structural choices that compounded.',
  },
  {
    slug: 'deals',
    label: 'Deals & Funding',
    description: 'Acquisitions, fundraises, exits, joint ventures. The capital flows reshaping Thai F&B and the structural reasons behind each deal.',
  },
  {
    slug: 'neighborhood-watch',
    label: 'Neighborhood Watch',
    description: 'Real-time signals from Bangkok\'s F&B zones — openings, closures, rent moves, and the small shifts that anticipate the big trends.',
  },
  {
    slug: 'torpenguin',
    label: "Torpenguin's Take",
    description: 'First-person reads from eight years of operating Thai F&B. The patterns I see, the calls I\'m making, and where I think I\'m wrong.',
  },
];

const lorem = (paragraphs: string[]) => paragraphs.join('\n\n');

export const articles: Article[] = [
  {
    slug: 'why-foreign-coffee-chains-fail-thailand',
    title: 'Why foreign coffee chains keep failing in Thailand',
    dek: "Three international chains entered in 2023. Two are closing outlets in 2025. The difference wasn't the coffee — it was the rent escalator, the staff turnover, and the math no broker shows you.",
    category: 'unit-economics',
    tag: 'Unit Economics',
    author: 'SpoonAsia Desk',
    date: '13 May 2026',
    readTime: '12 min read',
    body: lorem([
      'In late 2023, three international coffee chains made high-profile entries into Thailand. Two of them are now closing outlets faster than they opened them. The third — quieter, smaller, less venture-backed — is profitable on a per-outlet basis and quietly preparing to expand.',
      'The conventional explanation is taste. Thai consumers, the story goes, prefer sweet drinks. They prefer local brands. They prefer 7-Eleven. None of this is wrong, exactly. All of it misses the actual reason.',
      'The actual reason is the rent escalator clause. Mall landlords in Bangkok do not negotiate fixed rent — they negotiate a percentage of revenue, with a floor. The floor escalates 8% per year, automatically. In year one, percentage rent is the binding constraint. In year three, the floor is.',
      'There\'s a second layer: staff turnover. The Bangkok labor market for trained baristas runs roughly 60% annual churn at international chains, against 22% at the local independents that dominate Ari and Phra Khanong. Every replaced barista is roughly 35,000 THB of fully-loaded onboarding cost. At scale, this is the difference between break-even and a slow bleed.',
      'The chain that survived — and is now expanding — solved both problems by doing something the other two refused to: they let their first store sit in a B+ location for two years before pushing for a mall lease. The compounding lesson is that mall presence is a marketing expense disguised as a real estate decision, and most foreign operators do not have the patience or the balance sheet to treat it that way.',
    ]),
  },
  {
    slug: 'ari-bangkok-fb-zone',
    title: "Why Ari became Bangkok's most underrated F&B zone",
    dek: 'BTS upgrades, low-rise zoning, and a creator-class that prices Sukhumvit out of reach.',
    category: 'neighborhood-alpha',
    tag: 'Neighborhood',
    author: 'SpoonAsia Editorial',
    date: '12 May 2026',
    readTime: '9 min read',
    body: lorem([
      'Ari sits one BTS stop north of the central business district, but operates on a different rent curve entirely. Where Sukhumvit Soi 49 commands 4,200 THB per square meter for F&B retail, Ari\'s back sois clear at roughly 1,800 — and converging.',
      'The three signals that matter: BTS station upgrades completed in 2024 that doubled passenger capacity; a city plan that capped most of the neighborhood at four storeys, preserving the daylight character that draws creator-class spending; and a quiet exodus of independent coffee operators from Sukhumvit, where rent escalators have outpaced specialty-coffee margins for three years running.',
      'What you should not do is enter Ari with a chain playbook. The zone rewards specificity — a single concept, executed with editorial precision, that the neighborhood\'s opinion-makers will champion on Instagram for free. The chains that have tried Ari have all underperformed; the independent operators with a clear point of view consistently outperform their pro formas.',
      'Watch the rent curve from late 2026 onward. If specialty coffee margins compress further at the chain level, Ari\'s rent floor will move up faster than headline inflation, and the window for under-the-radar entry will close.',
    ]),
  },
  {
    slug: 'hidden-costs-thai-market-entry',
    title: 'The hidden costs no Thai broker will tell you about',
    dek: 'A line-item breakdown of the soft costs that turn a clean pro forma into a 24-month bleed.',
    category: 'market-entry',
    tag: 'Market Entry',
    author: 'SpoonAsia Desk',
    date: '11 May 2026',
    readTime: '14 min read',
    body: lorem([
      'Every broker pitch deck for Thai F&B real estate quotes a clean monthly rent figure, a deposit, and key money. Those three numbers, in our review of 47 deals across 2023–2025, account for roughly 61% of true cost of entry. The remaining 39% sits in line items that almost never appear in the broker memo.',
      'Top of the list: common area maintenance (CAM) escalators, which compound separately from base rent and are often back-loaded with mall renovation surcharges that materialize in years three through five. A 320 THB/sqm CAM in year one is regularly a 510 THB/sqm CAM by year five — a 60% increase against a rent base that has also escalated.',
      'Then: marketing contributions. Most premium malls bundle a mandatory contribution to landlord-led campaigns, typically 1.5–2.5% of gross sales, with no opt-out. Some foreign operators discover this in the second tenancy meeting; some discover it in the audit notice.',
      'Third: utility deposits and shared service fees, which compound when you operate a kitchen with grease trap and high-amperage cooking equipment.',
      'And finally, the one no one mentions out loud — the consulting and "facilitation" line. We do not editorialize. We simply note that the deals that closed cleanest were the ones where the foreign operator engaged a third-party Thai-licensed retail real estate advisor independent of the broker chain, and budgeted accordingly.',
    ]),
  },
  {
    slug: 'penguin-eat-shabu-rollout',
    title: 'Penguin Eat Shabu: anatomy of a 40-outlet rollout',
    dek: 'How a single Bangkok shabu concept scaled across Thailand without venture capital — and what the unit economics actually look like.',
    category: 'operators',
    tag: 'Operator',
    author: 'SpoonAsia Editorial',
    date: '10 May 2026',
    readTime: '16 min read',
    body: lorem([
      'Most chain rollouts in Thai F&B follow a familiar arc: raise a Series A, hire an ex-McKinsey COO, open ten flagships in twelve months, and then quietly close half of them by year three. Penguin Eat Shabu did none of this.',
      'Founded as a single shabu outlet in 2014, the chain reached 40 locations across Thailand by 2024 without external equity, operating on a unit-economics-first model that prioritized payback period over speed. The average new outlet hits payback in 14 months, against an industry standard of 28.',
      'The mechanism is supplier consolidation. Penguin runs central procurement on proteins, broth bases, and dipping sauces — three line items that together are roughly 41% of COGS. Across 40 outlets, the volume discount compounds: meat costs at outlet level are 18% below what a comparable independent operator pays.',
      'The chain has also resisted the standard expansion temptation of premium-mall presence. Roughly 70% of outlets are in B and B+ malls or freestanding street locations, where rent runs 40–55% of the equivalent mall figure. Brand awareness was built through social, not foot traffic.',
      'The interesting question is what happens at 80 outlets. The Thai shabu category is not infinitely deep; saturation is real. Penguin\'s next move — quietly being prototyped — looks like format extension into adjacent Japanese-leaning casual dining. Whether the supplier-consolidation moat travels is the open question.',
    ]),
  },
  {
    slug: 'bangkok-mall-fb-vacancy',
    title: 'Bangkok mall F&B vacancy hits 7-year high as anchor tenants exit',
    dek: 'EmQuartier, ICONSIAM, and Central Embassy all report double-digit F&B turnover.',
    category: 'markets',
    tag: 'Markets',
    author: 'SpoonAsia Desk',
    date: '13 May 2026',
    readTime: '7 min read',
    body: lorem([
      'F&B vacancy at Bangkok\'s premium malls has reached its highest level since 2018, with EmQuartier, ICONSIAM, and Central Embassy each reporting double-digit turnover at the casual-dining tier.',
      'The triggers are visible: post-pandemic rent re-escalation, a soft consumer spending environment for mid-tier dining, and the migration of premium F&B operators toward street-level Sukhumvit and the Ari corridor.',
      'What is less visible — and more interesting — is what the malls are doing about it. Two of the three premium operators have begun quietly renegotiating with anchor F&B tenants, accepting 15–22% effective rent reductions in exchange for longer tenor and CAM concessions. This was not happening 18 months ago.',
      'For operators considering a mall flagship, the leverage window is open. It will not stay open through 2027.',
    ]),
  },
  {
    slug: 'menu-engineering-bangkok',
    title: 'After Inflation: how three Bangkok chains rewrote their menus to survive',
    dek: 'A close read of menu engineering, portion calibration, and price-tier strategy.',
    category: 'operators',
    tag: 'Operators',
    author: 'SpoonAsia Editorial',
    date: '12 May 2026',
    readTime: '11 min read',
    body: lorem([
      'Between 2022 and 2025, food costs across Bangkok casual dining rose roughly 23%, while headline menu prices rose 11%. The math, on its face, does not work. Yet three chains we tracked closely — without naming them here — improved unit-level gross margin over the same period.',
      'The mechanism was not price increases. It was menu engineering: re-portioning, ingredient substitution, and most importantly, the deliberate construction of a price-tier ladder that pushed customers toward higher-margin entry points without the customer experiencing a price hike.',
      'The single most-replicated tactic: introducing a new "premium" tier item priced 35–45% above the previous top item, which anchors the perception of the existing menu as mid-priced and makes the historic mid-tier feel like a value choice.',
      'The second: portion calibration on side items, where a 12% reduction in serving size combined with a plate redesign produced zero detectable customer complaint and 4–6 percentage points of gross margin.',
    ]),
  },
  {
    slug: 'coffee-duopoly-thailand',
    title: "The hidden duopoly behind Thailand's coffee bean trade",
    dek: 'Two importers control 78% of specialty bean flow into Bangkok cafés.',
    category: 'suppliers',
    tag: 'Suppliers',
    author: 'SpoonAsia Desk',
    date: '11 May 2026',
    readTime: '10 min read',
    body: lorem([
      'Of the roughly 4,200 tons of specialty-grade green coffee imported into Thailand annually, two importers handle approximately 78% of total volume. Neither is publicly listed. Neither is widely covered in trade press.',
      'The duopoly emerged through cold-chain logistics investment in the 2015–2019 period, when independent cafés were proliferating and a generation of operators had no easy way to source consistent single-origin lots. The two importers built relationships at origin — primarily in Ethiopia, Colombia, and Brazil — and locked in exclusive Thai distribution for several roaster-favored estates.',
      'The strategic consequence is that any new specialty café in Bangkok, no matter how independent its branding, almost certainly sources beans through one of these two channels. The implications for menu pricing, lot variability, and supply continuity are direct and significant.',
      'The competitive vector is direct importing — a route only the largest chains have the volume to pursue. Watch for which chain announces a direct-origin program first.',
    ]),
  },
  {
    slug: 'singapore-family-office-thai-fb',
    title: 'Why Singaporean family offices keep funding Thai F&B — even when it loses money',
    dek: 'Lifestyle capital, brand portfolios, and the ASEAN halo trade.',
    category: 'investment',
    tag: 'Investment',
    author: 'SpoonAsia Editorial',
    date: '10 May 2026',
    readTime: '13 min read',
    body: lorem([
      'A Singaporean family office puts SGD 4M into a Bangkok F&B concept that has never been cash-flow positive. The IRR projection in the deck is, generously, 6% over five years. The check clears in three weeks.',
      'This is not unusual. It is the structure of a category we call lifestyle capital — investment that is rational only when you account for the optionality of brand portfolio, cross-border distribution rights, and the social positioning value of being known as the backer of a particular concept.',
      'The Singaporean family office community has been a quiet primary funder of Thai F&B for at least eight years. Most of these investments do not appear in standard deal trackers because they are structured as direct equity from holding vehicles, often offshore.',
      'For operators raising in this segment, the relevant question is not "what IRR do I project" but "what brand, geography, and category optionality am I selling you."',
    ]),
  },
  {
    slug: 'phra-khanong-frontier',
    title: "Phra Khanong is quietly becoming Bangkok's next F&B frontier",
    dek: 'Three signals: rents up 18%, BTS upgrades, and Gen Z creator clusters.',
    category: 'neighborhood',
    tag: 'Neighborhood',
    author: 'SpoonAsia Desk',
    date: '09 May 2026',
    readTime: '8 min read',
    body: lorem([
      'Phra Khanong, the BTS station between Ekkamai and On Nut, has historically been a residential pass-through. As of mid-2025, it is becoming something else.',
      'Three signals worth tracking: ground-floor retail rents up 18% year-over-year against a citywide F&B retail average of 6%; BTS station refurbishment completed in Q4 2024, doubling pedestrian throughput; and a measurable cluster of creator-class Gen Z operators opening small-format concepts on the sois south of Sukhumvit.',
      'The pattern mirrors Ari\'s trajectory from 2018–2021. Whether Phra Khanong follows the same curve depends on two variables: how aggressively the corridor zones for higher-density mixed use, and whether the chain operators arrive within 24 months or wait until rents have already compressed the entry window.',
    ]),
  },
  {
    slug: 'thai-cloud-kitchens-pivot',
    title: "Thai cloud kitchens are pivoting hard — and most won't survive",
    dek: 'GrabFood data shows the order curve flattening for the first time since 2019.',
    category: 'operators',
    tag: 'Operators',
    author: 'SpoonAsia Editorial',
    date: '08 May 2026',
    readTime: '10 min read',
    body: lorem([
      'Cloud kitchens — the post-pandemic darling of Thai F&B — are facing the first sustained slowdown in their category since the format took hold in 2019.',
      'GrabFood order volume, segmented by virtual-brand cloud operators, flattened in Q1 2026. Average order value declined 4.2% year-over-year. Operator-level interviews suggest that the unit economics of dark-kitchen rent plus delivery commission plus marketing acquisition is no longer clearing in the format\'s original target neighborhoods.',
      'The operators that will survive are pivoting in one of two directions. Some are converting cloud kitchens into hybrid takeaway-and-dine-in formats, accepting higher rent in exchange for direct customer acquisition. Others are consolidating into multi-brand commissaries that produce for both delivery and retail packaged goods.',
      'The pure-play dark kitchen, as a standalone business model, appears to be ending in Thailand.',
    ]),
  },
  {
    slug: 'bangkok-rent-story',
    title: 'Bangkok rent is not a number — it is a story about who the city is becoming',
    dek: 'A five-month investigation into how landlords price retail F&B space across nine Bangkok neighborhoods. What we found rewrites the standard market-entry playbook.',
    category: 'neighborhood-alpha',
    tag: 'Long Read',
    author: 'SpoonAsia Editorial',
    date: '07 May 2026',
    readTime: '24 min read',
    body: lorem([
      'Over five months, we requested rent data on 312 retail F&B spaces across nine Bangkok neighborhoods. We received quotes on 184. We sat through 46 actual landlord meetings. The picture that emerged does not match any broker memo or REIT investor deck.',
      'The headline finding: Bangkok F&B retail rent is priced less on square meters and more on what the landlord believes the neighborhood is becoming. Two adjacent spaces in the same building, identical in size and access, frequently quote 30–40% apart based on the landlord\'s read of the tenant\'s social positioning.',
      'The mechanism is not corruption or favoritism. It is a structurally sophisticated form of dynamic pricing in which the landlord internalizes the brand-building externality of a particular tenant and discounts the rent to capture the expected uplift in neighboring rents over the lease term.',
      'For foreign operators, this is the single biggest source of pro-forma error. The rent number you receive is not market — it is narrative. And the narrative is rewritten every time a new flagship opens within 200 meters.',
      'The full investigation is below, with neighborhood-by-neighborhood breakdowns, sample lease term sheets, and the contact playbook we developed for negotiating against narrative-priced rent.',
    ]),
  },
];

export const cities: City[] = [
  {
    slug: 'bangkok',
    name: 'Bangkok',
    tagline: 'The volatile capital of Asian F&B alpha.',
    description: 'Bangkok is the most over-analyzed and least-understood F&B market in Asia. We track rent curves, neighborhood trajectories, and the operator playbooks that actually clear the bar.',
    stats: [
      { label: 'F&B retail rent (avg)', value: '2,840 THB/sqm', note: 'Premium malls' },
      { label: 'F&B vacancy', value: '11.2%', note: '7-year high' },
      { label: 'New outlet openings (LTM)', value: '4,120', note: 'Citywide' },
      { label: 'Avg payback period', value: '22 mo', note: 'Casual dining' },
    ],
    zones: [
      { name: 'Sukhumvit (Asoke–Thonglor)', note: 'Premium-tier saturation. Rents flat, vacancy creeping.' },
      { name: 'Ari', note: 'Creator-class corridor. Independent-favored. Rent floor rising.' },
      { name: 'Phra Khanong', note: 'Emerging. Rents up 18% YoY. Window open through 2026.' },
      { name: 'Charoenkrung / Talad Noi', note: 'Heritage-led, slow burn. Premium-independent only.' },
      { name: 'Ratchada (Huai Khwang)', note: 'Local-tier resilience. Underwritten by night-market footfall.' },
    ],
  },
  {
    slug: 'tokyo',
    name: 'Tokyo',
    tagline: 'The supply-chain reference for Asian F&B.',
    description: 'Tokyo sets the upstream standard — ingredients, equipment, training pipelines — that the rest of Asia imports. We cover the operators, the suppliers, and the cross-border flow.',
    stats: [
      { label: 'F&B retail rent (avg)', value: '¥38,500/tsubo', note: 'Ginza/Shibuya' },
      { label: 'Standing-bar density', value: '1 per 84m', note: 'Shimbashi sample' },
      { label: 'Exporting operators (LTM)', value: '47', note: 'Cross-Asia' },
      { label: 'Avg outlet labor cost', value: '34% of revenue', note: 'Full-service' },
    ],
    zones: [
      { name: 'Ginza', note: 'Trophy real estate. Operator-as-brand. Premium ramen and sushi flagships.' },
      { name: 'Shibuya / Ebisu', note: 'Younger casual-tier. Format incubation.' },
      { name: 'Shimbashi / Yurakucho', note: 'Standing bars and izakayas. The benchmark for high-density F&B.' },
      { name: 'Nakameguro', note: 'Independent, design-led. The export pipeline to Bangkok and Singapore.' },
    ],
  },
  {
    slug: 'singapore',
    name: 'Singapore',
    tagline: 'The capital allocator for ASEAN F&B.',
    description: 'Singapore does not produce most of the F&B it consumes. It does, however, produce most of the capital, brand portfolios, and regional licensing structures that move ASEAN F&B. We track the family offices and the cross-border flow.',
    stats: [
      { label: 'F&B retail rent (avg)', value: 'S$22/psf', note: 'Orchard/CBD' },
      { label: 'Family office F&B AUM', value: 'S$1.8B', note: 'Est., direct equity' },
      { label: 'Outbound brand deals (LTM)', value: '23', note: 'SG → Thai/MY/ID' },
      { label: 'Avg deal size', value: 'S$3.4M', note: 'Direct equity' },
    ],
    zones: [
      { name: 'Orchard Road', note: 'Premium flagship belt. International chain dominant.' },
      { name: 'Tanjong Pagar / Telok Ayer', note: 'CBD-led casual dining. Younger operators.' },
      { name: 'Tiong Bahru', note: 'Heritage shophouse cluster. Independent-friendly.' },
      { name: 'Joo Chiat / Katong', note: 'Peranakan culinary corridor. Slow-burn premium.' },
    ],
  },
];

export const videos: Video[] = [
  {
    slug: 'bangkok-rent-prices-brand-out',
    episode: '03',
    title: 'How Bangkok rent prices a brand out of existence',
    description: 'A walkthrough of three failed Sukhumvit flagships, the rent escalator math that killed them, and the alternative deal structure that would have worked.',
    duration: '13:42',
    views: '24K',
    date: '05 May 2026',
  },
  {
    slug: 'reading-ari',
    episode: '02',
    title: 'Reading Ari like an urban architect',
    description: 'On foot through the Ari corridor — what the rent map looks like, why low-rise zoning is the moat, and which sois are pricing the loudest signal.',
    duration: '11:08',
    views: '18K',
    date: '28 Apr 2026',
  },
  {
    slug: 'penguin-eat-shabu-walkthrough',
    episode: '01',
    title: 'The Penguin Eat Shabu unit economics walkthrough',
    description: 'A line-item breakdown of how a Thai shabu chain scaled to 40 outlets without venture capital — supplier consolidation, payback discipline, and the moat that compounds.',
    duration: '16:21',
    views: '32K',
    date: '14 Apr 2026',
  },
];

export function articlesByCategory(slug: string): Article[] {
  return articles.filter(a => a.category === slug);
}

export function relatedArticles(slug: string, limit = 3): Article[] {
  const current = articles.find(a => a.slug === slug);
  if (!current) return articles.slice(0, limit);
  return articles
    .filter(a => a.slug !== slug && a.category === current.category)
    .slice(0, limit)
    .concat(
      articles.filter(a => a.slug !== slug && a.category !== current.category)
    )
    .slice(0, limit);
}
