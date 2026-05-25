/**
 * Adapter status — a single source of truth for whether each upstream
 * (Naver / eBay / SerpAPI / Amazon / Coupang / Shopee / Lazada / Vision /
 * LLM) is wired with real credentials or running in mock fallback.
 *
 * Consumed by:
 *   - /api/status              (read by the search-results badge)
 *   - any future setup/admin page
 *
 * Pure, server-only, no fetches. Just a snapshot of ADAPTER_MODE().
 */
import 'server-only';
import { ADAPTER_MODE, type AdapterMode } from '@/lib/env';

export type AdapterName =
  | 'naver'
  | 'ebay'
  | 'serpapi'
  | 'amazon'
  | 'coupang'
  | 'shopee'
  | 'lazada'
  | 'vision'
  | 'llm';

export interface AdapterStatus {
  name: AdapterName;
  /** Human label used by the badge UI. */
  label: string;
  /** Whether the adapter is configured to hit the real upstream. */
  real: boolean;
  reason: AdapterMode['reason'];
}

const LABELS: Record<AdapterName, string> = {
  naver: 'Naver',
  ebay: 'eBay',
  serpapi: 'SerpAPI',
  amazon: 'Amazon',
  coupang: 'Coupang',
  shopee: 'Shopee',
  lazada: 'Lazada',
  vision: 'Vision',
  llm: 'LLM',
};

export function getAdapterStatuses(): AdapterStatus[] {
  return (Object.keys(LABELS) as AdapterName[]).map((name) => {
    const mode = ADAPTER_MODE[name]();
    return { name, label: LABELS[name], real: mode.real, reason: mode.reason };
  });
}

export interface OverallStatus {
  /** True when at least one search adapter is live. */
  anyRealSearch: boolean;
  /** Names of search adapters in real mode (for the badge "Live: Naver, eBay"). */
  liveSearchLabels: string[];
  /** Same in mock mode (for "Demo: …" when zero are live). */
  mockSearchLabels: string[];
  /** True when any LLM provider is configured (review narratives, compare verdict). */
  llmReady: boolean;
  /** True when image extraction (Vision) is ready. */
  visionReady: boolean;
}

/** A coarse, single-glance status used by the search-page badge. */
export function getOverallStatus(): OverallStatus {
  const all = getAdapterStatuses();
  const searchAdapters = all.filter((a) =>
    (['naver', 'ebay', 'serpapi', 'amazon', 'coupang', 'shopee', 'lazada'] as const).includes(
      a.name as Exclude<AdapterName, 'vision' | 'llm'>,
    ),
  );
  const live = searchAdapters.filter((a) => a.real);
  return {
    anyRealSearch: live.length > 0,
    liveSearchLabels: live.map((a) => a.label),
    mockSearchLabels: searchAdapters.filter((a) => !a.real).map((a) => a.label),
    llmReady: all.find((a) => a.name === 'llm')?.real ?? false,
    visionReady: all.find((a) => a.name === 'vision')?.real ?? false,
  };
}
