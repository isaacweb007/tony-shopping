/**
 * Deterministic mock product generator.
 * Same `query` → same products. Phase 4 swaps this with real adapters.
 */
import type {
  CountryCode,
  Money,
  Product,
  StoreId,
  TonyReport,
  TonyScore,
} from '@/types/product';
import type { SearchQuery, SearchResult } from '@/types/search';
import { computeTonyScore } from '@/lib/scoring';

const STORES: StoreId[] = [
  'Coupang',
  'Amazon',
  'Shopee',
  'Lazada',
  'NaverShopping',
  'AliExpress',
  'Gmarket',
  '11st',
  'TikTokShop',
];

const ADJ = ['Minimal ', 'Classic ', 'Essential ', 'Premium ', 'Comfort ', 'Original ', 'Soft ', 'Vivid '];

const COUNTRY: CountryCode[] = ['KR', 'KR', 'VN', 'SG', 'KR', 'US', 'MY', 'TH'];

const TAG_CYCLE: Product['tag'][] = ['best', 'cheap', 'fast', 'genuine', 'value', 'alt', 'not'];

/** Small deterministic 32-bit hash (FNV-1a). */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function rngFromSeed(seed: number) {
  // Mulberry32
  let s = seed >>> 0;
  return function rng() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length] as T;
}

function placeholderImage(seed: number): string {
  const palettes: Array<[string, string]> = [
    ['#ede9fe', '#7c3aed'],
    ['#dbeafe', '#2563eb'],
    ['#cffafe', '#0891b2'],
    ['#fce7f3', '#db2777'],
    ['#fef3c7', '#d97706'],
    ['#dcfce7', '#16a34a'],
    ['#e0e7ff', '#4f46e5'],
    ['#fee2e2', '#dc2626'],
  ];
  const [bg, fg] = palettes[seed % palettes.length]!;
  const rot = (seed * 37) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 480'>
    <defs><linearGradient id='g${seed}' x1='0' x2='1' y1='0' y2='1'>
      <stop offset='0' stop-color='${bg}'/>
      <stop offset='1' stop-color='${fg}' stop-opacity='0.4'/>
    </linearGradient></defs>
    <rect width='480' height='480' fill='url(#g${seed})'/>
    <g transform='translate(240 240) rotate(${rot})'>
      <circle r='144' fill='${fg}' opacity='0.16'/>
      <circle r='96' cx='48' cy='-24' fill='${fg}' opacity='0.30'/>
      <rect x='-86' y='-86' width='172' height='172' rx='38' fill='${fg}' opacity='0.40'/>
    </g>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function money(amount: number): Money {
  return { amount, currency: 'KRW' };
}

function buildProduct(seed: number, baseName: string): Product {
  const rng = rngFromSeed(seed);
  const i = seed;

  const store: StoreId = pick(STORES, i);
  const adj = pick(ADJ, i);
  const name = `${adj}${baseName}${i % 2 === 0 ? ' Edition' : ' Pro'}`;
  const price = 18000 + Math.floor(rng() * 90000);
  const shippingFee = i % 3 === 0 ? 0 : 2500 + Math.floor(rng() * 4000);
  const shipDays = [0, 1, 2, 3, 4, 5, 7, 10, 14][i % 9] ?? 3;
  const reviewCount = 80 + Math.floor(rng() * 5200);
  const rating = Math.round((3.8 + rng() * 1.4) * 10) / 10;
  const authenticityPct = 60 + Math.floor(rng() * 40);
  const similarity = Math.max(72, 99 - i * 2);
  const discountPct = i % 5 === 0 ? Math.floor(10 + rng() * 30) : 0;
  const official = i % 4 === 1;
  const country = pick(COUNTRY, i);
  const tag = pick(TAG_CYCLE, i);

  const score: TonyScore = computeTonyScore({
    similarity,
    finalPrice: price + shippingFee,
    referencePrice: 40000,
    reviewCount,
    authenticityPct,
  });

  return {
    id: `p_${seed.toString(36)}`,
    name,
    store,
    country,
    price: money(price),
    finalPrice: money(price + shippingFee),
    shippingFee: money(shippingFee),
    shipDays,
    rating,
    reviewCount,
    authenticityPct,
    official,
    discountPct,
    imageUrl: placeholderImage(i + 1),
    tag,
    score,
    buyUrl: '#',
  };
}

/** Generate a stable list of products for a given query. */
export function generateProducts(query: SearchQuery): Product[] {
  const baseSeed = hash(
    (query.q || '') +
      '|' +
      query.attachments.map((a) => `${a.type}:${a.label}`).join(','),
  );
  const baseName = (query.q || 'Item').slice(0, 18).trim() || 'Item';

  const products: Product[] = [];
  for (let i = 0; i < 14; i++) {
    products.push(buildProduct(baseSeed + i * 9973, baseName));
  }

  // Promote a clearly-best, cheapest, and fastest item so Top 3 picks make sense
  const best = [...products].sort((a, b) => b.score.total - a.score.total)[0];
  if (best) {
    best.tag = 'best';
    best.score = { ...best.score, total: Math.max(best.score.total, 92) };
  }
  const cheap = [...products]
    .filter((p) => p.id !== best?.id)
    .sort((a, b) => a.finalPrice.amount - b.finalPrice.amount)[0];
  if (cheap) cheap.tag = 'cheap';
  const fast = [...products]
    .filter((p) => p.id !== best?.id && p.id !== cheap?.id)
    .sort((a, b) => a.shipDays - b.shipDays)[0];
  if (fast) {
    fast.tag = 'fast';
    fast.shipDays = Math.min(fast.shipDays, 1);
  }

  return products;
}

/** Build the AI report panel data. */
export function buildReport(products: Product[]): TonyReport {
  const total = products.length;
  const highlySimilar = products.filter((p) => p.score.similarity >= 92).length;
  const similar = total - highlySimilar;
  const avgTony = Math.round(products.reduce((a, p) => a + p.score.total, 0) / total);
  const avgAuthenticity = Math.round(
    products.reduce((a, p) => a + p.authenticityPct, 0) / total,
  );
  const cheapest = [...products].sort((a, b) => a.finalPrice.amount - b.finalPrice.amount)[0]!;
  const fastest = [...products].sort((a, b) => a.shipDays - b.shipDays)[0]!;
  const best = [...products].sort((a, b) => b.score.total - a.score.total)[0]!;

  return { total, highlySimilar, similar, avgTony, avgAuthenticity, cheapest, fastest, best };
}

/** Run a search end-to-end. Server-callable. */
export function runMockSearch(query: SearchQuery): SearchResult {
  const products = generateProducts(query);
  const report = buildReport(products);
  return {
    id: 's_' + hash(JSON.stringify(query)).toString(36),
    query,
    products,
    report,
    createdAt: Date.now(),
  };
}
