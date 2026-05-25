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
  | 'rakuten'
  | 'yahoojp'
  | 'aliexpress'
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

export interface AdapterMeta {
  name: AdapterName;
  label: string;
  /** One-line description of the adapter's role. */
  blurb: string;
  /** Env var names this adapter expects (in order). */
  envVars: string[];
  /** Developer console / signup URL for the key. */
  consoleUrl: string;
  /** Free-tier limit hint (or "Paid / partner only"). */
  freeTier: string;
  /** Country origin / scope hint. */
  region: string;
}

export const ADAPTER_META: Record<AdapterName, AdapterMeta> = {
  naver: {
    name: 'naver',
    label: 'Naver Shopping',
    blurb: '한국 최대 쇼핑 메타 검색 — 가장 추천하는 첫 키.',
    envVars: ['NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET'],
    consoleUrl: 'https://developers.naver.com/main/',
    freeTier: '25,000 req/day · free',
    region: 'KR',
  },
  ebay: {
    name: 'ebay',
    label: 'eBay Browse',
    blurb: '미국·글로벌 직구의 가격 비교 핵심.',
    envVars: ['EBAY_CLIENT_ID', 'EBAY_CLIENT_SECRET'],
    consoleUrl: 'https://developer.ebay.com/my/keys',
    freeTier: '5,000 req/day · free',
    region: 'US / Global',
  },
  serpapi: {
    name: 'serpapi',
    label: 'SerpAPI Google Shopping',
    blurb: '한 호출로 Amazon · Walmart · Target · Naver · Coupang 메타.',
    envVars: ['SERPAPI_KEY'],
    consoleUrl: 'https://serpapi.com/manage-api-key',
    freeTier: '100 req/month · free (paid $50/mo for 5K)',
    region: 'Worldwide',
  },
  amazon: {
    name: 'amazon',
    label: 'Amazon PA-API 5.0',
    blurb: '본인 매출 자격 후 발급. Associates 가입 → 180일 3건 판매.',
    envVars: ['AMAZON_ACCESS_KEY', 'AMAZON_SECRET_KEY', 'AMAZON_PARTNER_TAG'],
    consoleUrl: 'https://affiliate-program.amazon.com',
    freeTier: 'Affiliate gated',
    region: 'US (and per-marketplace)',
  },
  coupang: {
    name: 'coupang',
    label: 'Coupang Partners',
    blurb: '쿠팡 파트너스 승인 후 Open API 발급.',
    envVars: ['COUPANG_ACCESS_KEY', 'COUPANG_SECRET_KEY'],
    consoleUrl: 'https://partners.coupang.com/',
    freeTier: 'Partner approval gated',
    region: 'KR',
  },
  shopee: {
    name: 'shopee',
    label: 'Shopee Open Platform',
    blurb: '동남아 1위 쇼핑몰. 가입 승인 후 발급.',
    envVars: ['SHOPEE_APP_KEY', 'SHOPEE_APP_SECRET'],
    consoleUrl: 'https://open.shopee.com/',
    freeTier: 'Partner approval gated',
    region: 'SEA',
  },
  lazada: {
    name: 'lazada',
    label: 'Lazada Open Platform',
    blurb: '알리바바 그룹 동남아 마켓.',
    envVars: ['LAZADA_APP_KEY', 'LAZADA_APP_SECRET'],
    consoleUrl: 'https://open.lazada.com/',
    freeTier: 'Partner approval gated',
    region: 'SEA',
  },
  rakuten: {
    name: 'rakuten',
    label: '楽天 Ichiba',
    blurb: '일본 최대 쇼핑몰. 무료 + 즉시 발급.',
    envVars: ['RAKUTEN_APP_ID'],
    consoleUrl: 'https://webservice.rakuten.co.jp/',
    freeTier: '1 req/sec · free',
    region: 'JP',
  },
  yahoojp: {
    name: 'yahoojp',
    label: 'Yahoo! Shopping JP',
    blurb: '일본 야후 쇼핑. 무료 + 즉시 발급.',
    envVars: ['YAHOO_JP_APP_ID'],
    consoleUrl: 'https://developer.yahoo.co.jp/webapi/shopping/',
    freeTier: 'Free with App ID',
    region: 'JP',
  },
  aliexpress: {
    name: 'aliexpress',
    label: 'AliExpress Affiliate',
    blurb: '알리바바 글로벌 마켓. 제휴 승인 + HMAC 서명 필요.',
    envVars: ['ALIEXPRESS_APP_KEY', 'ALIEXPRESS_APP_SECRET', 'ALIEXPRESS_TRACKING_ID'],
    consoleUrl: 'https://openservice.aliexpress.com/',
    freeTier: 'Affiliate gated',
    region: 'Global',
  },
  vision: {
    name: 'vision',
    label: 'Google Cloud Vision',
    blurb: '이미지 → 검색어 추출. 사진 한 장 입력 흐름에 필요.',
    envVars: ['GOOGLE_VISION_API_KEY'],
    consoleUrl: 'https://console.cloud.google.com/apis/library/vision.googleapis.com',
    freeTier: '1,000 req/month · free',
    region: 'Worldwide',
  },
  llm: {
    name: 'llm',
    label: 'LLM (Anthropic / OpenAI)',
    blurb: '리뷰 요약 + 비교 페이지 토니 내러티브. 둘 중 하나만 있으면 됨.',
    envVars: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'],
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    freeTier: 'Pay-as-you-go (very cheap)',
    region: 'Worldwide',
  },
};

const LABELS: Record<AdapterName, string> = {
  naver: 'Naver',
  ebay: 'eBay',
  serpapi: 'SerpAPI',
  amazon: 'Amazon',
  coupang: 'Coupang',
  shopee: 'Shopee',
  lazada: 'Lazada',
  rakuten: 'Rakuten',
  yahoojp: 'Yahoo JP',
  aliexpress: 'AliExpress',
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
    (
      ['naver', 'ebay', 'serpapi', 'amazon', 'coupang', 'shopee', 'lazada', 'rakuten', 'yahoojp', 'aliexpress'] as const
    ).includes(a.name as Exclude<AdapterName, 'vision' | 'llm'>),
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
