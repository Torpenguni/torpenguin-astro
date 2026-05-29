// Fetches F&B tickers from Yahoo Finance and writes public/tickers.json
// Used by GitHub Actions cron (.github/workflows/update-tickers.yml)
// and can also be run locally: `node scripts/update-tickers.mjs`
import YahooFinance from 'yahoo-finance2';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const SYMBOLS = [
  { symbol: 'MINT.BK',    label: 'MINT',     currency: 'THB' },
  { symbol: 'CENTEL.BK',  label: 'CENTEL',   currency: 'THB' },
  { symbol: 'M.BK',       label: 'M (MK)',   currency: 'THB' },
  { symbol: 'AU.BK',      label: 'AU',       currency: 'THB' },
  { symbol: 'ZEN.BK',     label: 'ZEN',      currency: 'THB' },
  { symbol: 'MAGURO.BK',  label: 'MAGURO',   currency: 'THB' },
  { symbol: 'SNP.BK',     label: 'S&P',      currency: 'THB' },
  { symbol: 'CBG.BK',     label: 'CBG',      currency: 'THB' },
  { symbol: 'OSP.BK',     label: 'OSP',      currency: 'THB' },
  { symbol: 'ICHI.BK',    label: 'ICHI',     currency: 'THB' },
  { symbol: 'SAPPE.BK',   label: 'SAPPE',    currency: 'THB' },
  { symbol: 'TKN.BK',     label: 'TKN',      currency: 'THB' },
  { symbol: 'TFMAMA.BK',  label: 'TFMAMA',   currency: 'THB' },
  { symbol: 'CPF.BK',     label: 'CPF',      currency: 'THB' },
  { symbol: 'CPALL.BK',   label: 'CPALL',    currency: 'THB' },
  { symbol: 'TU.BK',      label: 'TU',       currency: 'THB' },
  { symbol: 'CPAXT.BK',   label: 'CPAXT',    currency: 'THB' },
  { symbol: 'GFPT.BK',    label: 'GFPT',     currency: 'THB' },
  { symbol: 'NRF.BK',     label: 'NRF',      currency: 'THB' },
  { symbol: 'PB.BK',      label: 'PB',       currency: 'THB' },
  { symbol: 'KC=F',       label: 'Coffee C', currency: 'USD' },
  { symbol: 'ZW=F',       label: 'Wheat',    currency: 'USD' },
  { symbol: 'SB=F',       label: 'Sugar #11', currency: 'USD' },
];

const fmt = (v, c) => `${c === 'THB' ? '฿' : '$'}${v.toFixed(2)}`;
const fmtPct = (p) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;

const asOf = new Date().toLocaleString('en-GB', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: 'short',
});

const results = await yahooFinance.quote(SYMBOLS.map(s => s.symbol));
const byId = new Map(results.map(r => [r.symbol, r]));

const tickers = SYMBOLS.map(cfg => {
  const r = byId.get(cfg.symbol);
  if (!r || r.regularMarketPrice == null) {
    return { label: cfg.label, value: '—', change: '—', positive: true };
  }
  const pct = r.regularMarketChangePercent ?? 0;
  return {
    label: cfg.label,
    value: fmt(r.regularMarketPrice, cfg.currency),
    change: fmtPct(pct),
    positive: pct >= 0,
  };
});

const payload = { tickers, asOf, live: true, updatedAt: new Date().toISOString() };

const outPath = resolve(process.cwd(), 'public', 'tickers.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2));

console.log(`[update-tickers] Wrote ${tickers.length} tickers to ${outPath}`);
console.log(`[update-tickers] As of ${asOf} ICT`);
