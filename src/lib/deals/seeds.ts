/**
 * Daily deal-feed seeds.
 *
 * The home "오늘의 딜" rail re-runs Tony's search for a rotating subset of
 * popular queries each day and surfaces the best-priced results. This module
 * owns (a) the curated query pool and (b) the deterministic per-day selection
 * so the feed is stable within a day but refreshes at KST midnight — the
 * "daily" hook that brings habitual users back.
 *
 * Pure + no IO so it's unit-testable; the API route wires it to runServerSearch.
 */

/** Category tag → drives the card's fallback icon (mapped in the component). */
export type DealCategory =
  | 'electronics'
  | 'beauty'
  | 'home'
  | 'kitchen'
  | 'fashion'
  | 'sports'
  | 'baby'
  | 'pet';

export interface DealSeed {
  /** Stable id (also the i18n key suffix under home.deals.seed.*). */
  id: string;
  /** The query Tony searches — carried through to the card's click-through. */
  query: string;
  category: DealCategory;
}

/**
 * Curated pool of popular cross-border queries. Mix of KR/global brands across
 * categories so the daily rotation stays varied. Hand-maintained; add/remove
 * freely — selection logic is index-agnostic.
 */
export const DEAL_SEED_POOL: readonly DealSeed[] = [
  { id: 'airpodsPro', query: 'AirPods Pro 2 USB-C', category: 'electronics' },
  { id: 'galaxyBuds', query: 'Galaxy Buds3 Pro', category: 'electronics' },
  { id: 'dysonAirwrap', query: 'Dyson Airwrap', category: 'beauty' },
  { id: 'airfryer', query: '필립스 에어프라이어', category: 'kitchen' },
  { id: 'monitor4k', query: '4K 모니터 27인치', category: 'electronics' },
  { id: 'roborock', query: 'Roborock S8 Pro Ultra', category: 'home' },
  { id: 'mattress', query: '시몬스 매트리스 퀸', category: 'home' },
  { id: 'nintendoSwitch', query: 'Nintendo Switch OLED', category: 'electronics' },
  { id: 'stanleyTumbler', query: 'Stanley Quencher tumbler', category: 'kitchen' },
  { id: 'lululemon', query: 'Lululemon align leggings', category: 'fashion' },
  { id: 'creamSpf', query: '선크림 SPF50', category: 'beauty' },
  { id: 'protein', query: '단백질 보충제 프로틴', category: 'sports' },
  { id: 'diaper', query: '기저귀 대형', category: 'baby' },
  { id: 'catFood', query: '고양이 사료', category: 'pet' },
  { id: 'kindle', query: 'Kindle Paperwhite', category: 'electronics' },
  { id: 'sodastream', query: 'SodaStream 탄산수 제조기', category: 'kitchen' },
] as const;

/** FNV-1a 32-bit hash — same family as the mock generator, kept local. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function rng() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Today's date as YYYY-MM-DD in Asia/Seoul, so the feed flips at KST midnight
 * regardless of server timezone. `now` is injectable for tests.
 */
export function todayKeyKST(now: number = Date.now()): string {
  // en-CA yields ISO-style YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now));
}

/**
 * Deterministically select `count` seeds for the given date key. Same dateKey →
 * same selection (and same order); different days reshuffle. A seeded
 * Fisher-Yates over a copy of the pool, taking the first `count`.
 */
export function pickDailySeeds(
  dateKey: string,
  count: number,
  pool: readonly DealSeed[] = DEAL_SEED_POOL,
): DealSeed[] {
  const arr = [...pool];
  const rng = mulberry32(hash(dateKey));
  // Fisher-Yates shuffle.
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  const n = Math.max(0, Math.min(count, arr.length));
  return arr.slice(0, n);
}
