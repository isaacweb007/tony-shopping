import type { Product, StoreId, CountryCode, Money } from '@/types/product';
import { computeTonyScore } from '@/lib/scoring';

/** FNV-1a 32-bit hash for deterministic per-store seeds. */
export function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function rng() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

const ADJ = [
  'Minimal ',
  'Classic ',
  'Essential ',
  'Premium ',
  'Comfort ',
  'Original ',
  'Soft ',
  'Vivid ',
];

export interface AdapterProfile {
  store: StoreId;
  /** Base price multiplier vs reference. */
  priceMul: number;
  /** ms artificial latency to simulate real network. */
  latencyMs: number;
  /** Default country origin. */
  country: CountryCode;
  /** Probability official seller. */
  officialRate: number;
  /** Base shipping fee. */
  shipBase: number;
}

const REF_PRICE = 40000;

export async function generateMockProducts(
  profile: AdapterProfile,
  q: string,
  limit: number,
  signal?: AbortSignal,
): Promise<Product[]> {
  await delay(profile.latencyMs, signal);

  const baseSeed = hash(profile.store + '|' + q);
  const rng = mulberry32(baseSeed);
  const baseName = (q || 'Item').slice(0, 18).trim() || 'Item';

  const products: Product[] = [];
  for (let i = 0; i < limit; i++) {
    const adj = ADJ[i % ADJ.length] ?? '';
    const seed = baseSeed + i * 9973;
    const r = mulberry32(seed)();

    const rawPrice = Math.round((18000 + r * 90000) * profile.priceMul);
    const shippingFee = i % 3 === 0 ? 0 : profile.shipBase + Math.floor(rng() * 3500);
    const shipDays = [0, 1, 2, 3, 4, 5, 7, 10, 14][(i + (profile.country === 'KR' ? 0 : 2)) % 9] ?? 3;
    const reviewCount = 80 + Math.floor(rng() * 5200);
    const rating = Math.round((3.8 + rng() * 1.4) * 10) / 10;
    const authenticityPct = Math.min(99, 55 + Math.floor(rng() * 40) + (i % 4 === 1 ? 10 : 0));
    const discountPct = i % 5 === 0 ? Math.floor(10 + rng() * 30) : 0;
    const official = rng() < profile.officialRate;
    const similarity = Math.max(72, 99 - i * 2);

    const price: Money = { amount: rawPrice, currency: 'KRW' };
    const ship: Money = { amount: shippingFee, currency: 'KRW' };
    const final: Money = { amount: rawPrice + shippingFee, currency: 'KRW' };

    const score = computeTonyScore({
      similarity,
      finalPrice: final.amount,
      referencePrice: REF_PRICE,
      reviewCount,
      authenticityPct,
    });

    products.push({
      id: `${profile.store.toLowerCase()}_${seed.toString(36)}`,
      name: `${adj}${baseName}${i % 2 === 0 ? ' Edition' : ' Pro'}`,
      store: profile.store,
      country: profile.country,
      price,
      finalPrice: final,
      shippingFee: ship,
      shipDays,
      rating,
      reviewCount,
      authenticityPct,
      official,
      discountPct,
      imageUrl: placeholderImage(seed % 1024),
      tag: 'value',
      score,
      buyUrl: `https://example.com/${profile.store.toLowerCase()}/${seed.toString(36)}`,
    });
  }
  return products;
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('aborted'));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(signal.reason ?? new Error('aborted'));
      },
      { once: true },
    );
  });
}
