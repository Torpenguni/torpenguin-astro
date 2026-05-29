// Yahoo Finance ticker fetch — runs at build time (and from update-tickers script)
// Symbols use Yahoo's convention: .BK for SET-listed Thai stocks, =F for futures.
import YahooFinance from 'yahoo-finance2';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export type Ticker = {
  label: string;
  value: string;
  change: string;
  positive: boolean;
};

export type TickerPayload = {
  tickers: Ticker[];
  asOf: string;
  live: boolean;
};

type SymbolConfig = {
  symbol: string;
  label: string;
  currency: 'THB' | 'USD';
};

export const SYMBOLS: SymbolConfig[] = [
  // Restaurant operators
  { symbol: 'MINT.BK',    label: 'MINT',     currency: 'THB' },
  { symbol: 'CENTEL.BK',  label: 'CENTEL',   currency: 'THB' },
  { symbol: 'M.BK',       label: 'M (MK)',   currency: 'THB' },
  { symbol: 'AU.BK',      label: 'AU',       currency: 'THB' },
  { symbol: 'ZEN.BK',     label: 'ZEN',      currency: 'THB' },
  { symbol: 'MAGURO.BK',  label: 'MAGURO',   currency: 'THB' },
  { symbol: 'SNP.BK',     label: 'S&P',      currency: 'THB' },
  // Beverages & snacks (consumer F&B brands)
  { symbol: 'CBG.BK',     label: 'CBG',      currency: 'THB' },
  { symbol: 'OSP.BK',     label: 'OSP',      currency: 'THB' },
  { symbol: 'ICHI.BK',    label: 'ICHI',     currency: 'THB' },
  { symbol: 'SAPPE.BK',   label: 'SAPPE',    currency: 'THB' },
  { symbol: 'TKN.BK',     label: 'TKN',      currency: 'THB' },
  // Food giants, distribution & ingredients
  { symbol: 'TFMAMA.BK',  label: 'TFMAMA',   currency: 'THB' },
  { symbol: 'CPF.BK',     label: 'CPF',      currency: 'THB' },
  { symbol: 'CPALL.BK',   label: 'CPALL',    currency: 'THB' },
  { symbol: 'TU.BK',      label: 'TU',       currency: 'THB' },
  { symbol: 'CPAXT.BK',   label: 'CPAXT',    currency: 'THB' },
  { symbol: 'GFPT.BK',    label: 'GFPT',     currency: 'THB' },
  { symbol: 'NRF.BK',     label: 'NRF',      currency: 'THB' },
  { symbol: 'PB.BK',      label: 'PB',       currency: 'THB' },
  // Commodities relevant to F&B operators
  { symbol: 'KC=F',       label: 'Coffee C', currency: 'USD' },
  { symbol: 'ZW=F',       label: 'Wheat',    currency: 'USD' },
  { symbol: 'SB=F',       label: 'Sugar #11', currency: 'USD' },
];

// Mock fallback — used if Yahoo Finance is unreachable AND no cached JSON exists
const FALLBACK: Ticker[] = [
  { label: 'MINT',      value: '฿21.50',   change: '-0.92%', positive: false },
  { label: 'CENTEL',    value: '฿30.75',   change: '-1.60%', positive: false },
  { label: 'M (MK)',    value: '฿19.00',   change: '+1.60%', positive: true },
  { label: 'AU',        value: '฿4.42',    change: '+0.00%', positive: true },
  { label: 'ZEN',       value: '฿5.45',    change: '+0.93%', positive: true },
  { label: 'MAGURO',    value: '฿17.10',   change: '+0.00%', positive: true },
  { label: 'S&P',       value: '฿9.00',    change: '+0.00%', positive: true },
  { label: 'CBG',       value: '฿40.00',   change: '+0.00%', positive: true },
  { label: 'OSP',       value: '฿14.20',   change: '+0.00%', positive: true },
  { label: 'ICHI',      value: '฿12.70',   change: '+0.00%', positive: true },
  { label: 'SAPPE',     value: '฿29.50',   change: '+0.00%', positive: true },
  { label: 'TKN',       value: '฿3.84',    change: '+0.00%', positive: true },
  { label: 'TFMAMA',    value: '฿252.00',  change: '+0.00%', positive: true },
  { label: 'CPF',       value: '฿22.10',   change: '+0.00%', positive: true },
  { label: 'CPALL',     value: '฿54.75',   change: '+0.00%', positive: true },
  { label: 'TU',        value: '฿14.00',   change: '+0.00%', positive: true },
  { label: 'CPAXT',     value: '฿35.50',   change: '+0.00%', positive: true },
  { label: 'GFPT',      value: '฿9.20',    change: '+0.00%', positive: true },
  { label: 'NRF',       value: '฿4.10',    change: '+0.00%', positive: true },
  { label: 'PB',        value: '฿69.50',   change: '+0.00%', positive: true },
  { label: 'Coffee C',  value: '$280.70',  change: '-0.02%', positive: false },
  { label: 'Wheat',     value: '$677.25',  change: '+0.26%', positive: true },
  { label: 'Sugar #11', value: '$15.39',   change: '+0.07%', positive: true },
];

function format(value: number, currency: 'THB' | 'USD'): string {
  const prefix = currency === 'THB' ? '฿' : '$';
  return `${prefix}${value.toFixed(2)}`;
}

function formatChange(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function nowAsOf(): string {
  return new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });
}

export async function fetchLiveTickers(): Promise<TickerPayload> {
  const asOf = nowAsOf();
  try {
    const results = await yahooFinance.quote(SYMBOLS.map(s => s.symbol));
    const resultMap = new Map(results.map(r => [r.symbol, r]));

    const tickers: Ticker[] = SYMBOLS.map(cfg => {
      const r = resultMap.get(cfg.symbol);
      if (!r || r.regularMarketPrice == null) {
        return FALLBACK.find(f => f.label === cfg.label) ?? FALLBACK[0];
      }
      const pct = r.regularMarketChangePercent ?? 0;
      return {
        label: cfg.label,
        value: format(r.regularMarketPrice, cfg.currency),
        change: formatChange(pct),
        positive: pct >= 0,
      };
    });

    return { tickers, asOf, live: true };
  } catch (err) {
    console.warn('[tickers] Yahoo fetch failed:', (err as Error).message);
    return { tickers: FALLBACK, asOf, live: false };
  }
}

// Build-time loader: prefer public/tickers.json (updated by GitHub Action cron),
// fall back to live Yahoo fetch (initial build / when JSON missing).
export async function loadTickers(): Promise<TickerPayload> {
  const jsonPath = resolve(process.cwd(), 'public', 'tickers.json');
  if (existsSync(jsonPath)) {
    try {
      const raw = readFileSync(jsonPath, 'utf-8');
      const parsed = JSON.parse(raw) as TickerPayload;
      if (parsed?.tickers?.length) return parsed;
    } catch {
      // fall through to live fetch
    }
  }
  return fetchLiveTickers();
}
