/**
 * Centralised env access. Only server-side.
 *
 * - Each adapter checks its own credentials here and reports whether it
 *   should run in 'real' or 'mock' mode.
 * - Missing credentials never crash the app — adapters silently fall back
 *   to deterministic mock data so dev/preview always works.
 */
import 'server-only';

export interface AdapterMode {
  /** Whether to call the real upstream API. */
  real: boolean;
  /** Reason for the decision (for logs and the admin/dev console). */
  reason: 'enabled' | 'missing_credentials' | 'force_mock';
}

const FORCE_MOCK = process.env.MOCK_MODE === 'true';

function decide(...required: Array<string | undefined>): AdapterMode {
  if (FORCE_MOCK) return { real: false, reason: 'force_mock' };
  const ok = required.every((v) => typeof v === 'string' && v.length > 0);
  return ok
    ? { real: true, reason: 'enabled' }
    : { real: false, reason: 'missing_credentials' };
}

export const ADAPTER_MODE = {
  ebay: () => decide(process.env.EBAY_CLIENT_ID, process.env.EBAY_CLIENT_SECRET),
  naver: () => decide(process.env.NAVER_CLIENT_ID, process.env.NAVER_CLIENT_SECRET),
  vision: () => decide(process.env.GOOGLE_VISION_API_KEY),
  /** Meta-search SaaS: SerpAPI's Google Shopping wrapper. One call → many stores. */
  serpapi: () => decide(process.env.SERPAPI_KEY),
  /** LLM provider for review summarisation. Prefers Anthropic when both are set. */
  llm: () =>
    decide(
      process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY,
    ),
  // Mock-only adapters until partner credentials land.
  amazon: () => decide(process.env.AMAZON_ACCESS_KEY, process.env.AMAZON_SECRET_KEY, process.env.AMAZON_PARTNER_TAG),
  coupang: () => decide(process.env.COUPANG_ACCESS_KEY, process.env.COUPANG_SECRET_KEY),
  shopee: () => decide(process.env.SHOPEE_APP_KEY, process.env.SHOPEE_APP_SECRET),
  lazada: () => decide(process.env.LAZADA_APP_KEY, process.env.LAZADA_APP_SECRET),
  /** Rakuten Ichiba Item Search — JP. Free 1 req/sec. */
  rakuten: () => decide(process.env.RAKUTEN_APP_ID),
  /** Yahoo! Shopping Web Services — JP. Free with Application ID. */
  yahoojp: () => decide(process.env.YAHOO_JP_APP_ID),
  /** AliExpress Affiliate Open Platform. */
  aliexpress: () => decide(process.env.ALIEXPRESS_APP_KEY, process.env.ALIEXPRESS_APP_SECRET),
} as const;
