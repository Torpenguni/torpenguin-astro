// SpoonAsia — Stories (short-form news and quick takes)

export interface Story {
  slug: string;
  tag: string;
  headline: string;
  dek: string;
  date: string;
  body: string;
}

const lorem = (paragraphs: string[]) => paragraphs.join('\n\n');

export const stories: Story[] = [
  {
    slug: 'starbucks-closes-bangkok-q1-2026',
    tag: 'Market Move',
    headline: 'Starbucks closes 4 Bangkok outlets in Q1 2026',
    dek: "Locations on Silom, Asok, and Phrom Phong. Margin compression cited internally — not consumer demand.",
    date: '11 May 2026',
    body: lorem([
      'Four Starbucks locations in central Bangkok will close before the end of Q2 2026, according to internal communications reviewed by SpoonAsia. The outlets affected sit on Silom Road, two Asok corners, and the BTS Phrom Phong concourse.',
      "Internal memos cite margin compression — not consumer demand softness — as the deciding factor. Each of the four locations operates at a rent-to-revenue ratio above 30%, several points above the chain's global benchmark and well above what their Thai unit economics will support after labor and COGS escalation in 2025.",
      "This is not a Starbucks story, exactly. It is a Bangkok premium-mall and CBD-corridor story. Same dynamics are visible in independent operator closures across the same corridors. We covered the underlying math in <a href=\"/analysis/why-foreign-coffee-chains-fail-thailand\">Why foreign coffee chains keep failing in Thailand</a>.",
      "Two things to watch: whether the closures cluster geographically (so far yes — all four are within a 4 km radius), and whether the chain quietly tests B-tier locations like Ari or Phra Khanong in the second half of 2026. Independent operators in those zones have been profitable for two years on materially lower rent burden.",
      "Comment from Starbucks Thailand was requested but not received as of publication.",
    ]),
  },
  {
    slug: 'arabica-bangkok-june-2026',
    tag: 'Brand Watch',
    headline: 'Why % Arabica is opening in Bangkok next month',
    dek: "Japan-based specialty coffee operator confirms Thonglor location for June 2026. Pricing strategy revealed.",
    date: '09 May 2026',
    body: lorem([
      'Japan-headquartered specialty coffee chain % Arabica has confirmed a Thonglor location opening in June 2026. The brand becomes the eighth international specialty operator to enter Bangkok since 2023.',
      'The pricing strategy disclosed by the brand is notably more aggressive than its Kyoto or Hong Kong stores: signature espresso drinks will price at roughly 180–230 THB, against the 300+ THB equivalent in Hong Kong. Sources close to the brand confirm this is a deliberate accommodation to Thai dwell-time economics.',
      'For coverage of why dwell-time matters more than menu pricing in Thailand, see our <a href="/analysis/why-foreign-coffee-chains-fail-thailand">analysis of foreign coffee chain failures</a>.',
      'The Thonglor location sits at a rent point of approximately $78/sqm — high relative to Ari or Phra Khanong, but lower than the Sukhumvit Asok or Silom CBD comparables. The unit economics question is whether the brand can sustain a 28% rent burden at 1.2× table turn.',
    ]),
  },
  {
    slug: 'bangkok-fb-rents-q1-2026',
    tag: 'Data Point',
    headline: 'Bangkok F&B rents up 12% YoY in premium CBD',
    dek: "CBRE Q1 report shows continued upward pressure on prime retail. Implications for unit economics modeling.",
    date: '05 May 2026',
    body: lorem([
      'CBRE Thailand published its Q1 2026 Bangkok Retail Rental Report this week. Headline figures: premium CBD F&B retail rents up 12% year-over-year, premium mall F&B up 8%, secondary corridor F&B essentially flat.',
      'The implications for foreign operator unit economics are direct. Rent burden at premium-tier Bangkok locations now routinely clears 30% of revenue at modeled throughput. Our <a href="/analysis/why-foreign-coffee-chains-fail-thailand">analysis of three foreign coffee chains</a> showed that 30%+ rent burden is the inflection point past which casual-tier F&B unit economics stop working.',
      'CBRE notes that the premium-corridor increases are concentrated in landlord-led F&B relets — i.e., the rent figures are real, not effective. Cap rates on premium retail held steady at 5.8–6.2%, suggesting that REIT-class owners view the rent levels as sustainable for at least the medium term.',
      'For operators modeling Thailand entry: assume continued upward rent pressure in the premium tier for the next 18 months, and increasing landlord willingness to negotiate effective rent reductions in mid-tier malls as anchor F&B turnover accelerates.',
    ]),
  },
  {
    slug: 'all-day-cafe-concept-thailand',
    tag: 'Observation',
    headline: 'The death of the all-day café concept in Thailand',
    dek: "Three closures in two months suggest the model doesn't survive Thai weekday occupancy patterns.",
    date: '01 May 2026',
    body: lorem([
      "Three Bangkok cafés operating the all-day model — open 8 AM to 10 PM, breakfast through dinner, single concept — have closed in the past 60 days. None of the closures cited financial trouble in their public statements. All three were operating in B-tier locations with reasonable rent burden.",
      "The pattern we see is occupancy-curve mismatch. Thai weekday F&B occupancy is heavily front-loaded toward 8–11 AM and 6–9 PM. The mid-day window from 11:30 AM to 5 PM operates at 30–45% of peak. An all-day café staffs and rents for a 14-hour service window but generates revenue from roughly seven of those hours.",
      "The chains that survive in adjacent formats have either dual-concept the space (café morning, bar evening, two different brand identities) or accept early-close (8 AM to 4 PM, residential-coffee model). For more on Thai dwell-time economics, see <a href=\"/analysis/why-foreign-coffee-chains-fail-thailand\">our Decoded analysis</a>.",
      "If you are modeling a Bangkok café concept, run your hour-by-hour revenue forecast against this pattern before signing a lease. The all-day pro forma will look reasonable on a daily-average basis and catastrophic when you trace where the revenue actually shows up.",
    ]),
  },
];

export function getStory(slug: string): Story | undefined {
  return stories.find((s) => s.slug === slug);
}
