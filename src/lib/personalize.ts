'use client';

/**
 * Personalised prompt-chip generator.
 *
 * Input: anonymous profile collected in the user-profile store.
 * Output: 5 chip suggestions ranked by relevance, with localized labels.
 *
 * Rules of thumb:
 *  - First-time visitors (searchCount < 2): mostly default chips, one
 *    "tutorial" chip ("사진 한 장 올려보세요" / "Upload a photo").
 *  - Returning users (searchCount >= 2):
 *      * Top category → "최근 [카테고리]에 관심 보이셨어요"
 *      * Top store    → "[store]보다 더 싼 곳"
 *      * Top price    → "10만원 이하 추천"
 *      * 1 random default fallback
 *  - Power users (searchCount >= 8): all chips personalised, plus a
 *    "지금 가성비 BEST"-style discovery chip.
 */
import type { Category } from './categorize';
import type { UserProfile, PriceBucket } from '@/stores/user-profile-store';
import type { StoreId } from '@/types/product';

export interface PromptChip {
  id: string;
  text: string;
  /** lucide icon name to render. UI maps this to the actual component. */
  icon: 'image' | 'footprints' | 'lightbulb' | 'dollar' | 'gift' | 'sparkles' | 'shirt' | 'sparkle' | 'shopping-bag' | 'tag';
}

interface BuildArgs {
  profile: UserProfile;
  /**
   * Translator that returns a localized template by key.
   * Keys live under `recommend.*` in messages/*.json.
   */
  t: (key: string, vars?: Record<string, string | number | Date>) => string;
}

const CATEGORY_LABEL_KEY: Record<Category, string> = {
  shoes: 'recommend.cat.shoes',
  bag: 'recommend.cat.bag',
  lighting: 'recommend.cat.lighting',
  clothes: 'recommend.cat.clothes',
  beauty: 'recommend.cat.beauty',
  electronics: 'recommend.cat.electronics',
  furniture: 'recommend.cat.furniture',
  kitchen: 'recommend.cat.kitchen',
  food: 'recommend.cat.food',
  sports: 'recommend.cat.sports',
  toy: 'recommend.cat.toy',
  pet: 'recommend.cat.pet',
  jewelry: 'recommend.cat.jewelry',
  baby: 'recommend.cat.baby',
};

const CATEGORY_ICON: Record<Category, PromptChip['icon']> = {
  shoes: 'footprints',
  bag: 'shopping-bag',
  lighting: 'lightbulb',
  clothes: 'shirt',
  beauty: 'sparkles',
  electronics: 'sparkle',
  furniture: 'tag',
  kitchen: 'tag',
  food: 'tag',
  sports: 'tag',
  toy: 'gift',
  pet: 'tag',
  jewelry: 'sparkles',
  baby: 'gift',
};

const PRICE_BUCKET_KEY: Record<PriceBucket, string> = {
  low: 'recommend.price.low',
  mid: 'recommend.price.mid',
  high: 'recommend.price.high',
};

function topEntries<T extends string>(rec: Partial<Record<T, number>>, n: number): T[] {
  return Object.entries(rec)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, n)
    .map(([k]) => k as T);
}

const DEFAULT_CHIPS: Array<{ key: string; icon: PromptChip['icon'] }> = [
  { key: 'recommend.default.bag', icon: 'image' },
  { key: 'recommend.default.shoes', icon: 'footprints' },
  { key: 'recommend.default.lamp', icon: 'lightbulb' },
  { key: 'recommend.default.cheaper', icon: 'dollar' },
  { key: 'recommend.default.gift', icon: 'gift' },
];

export function buildPromptChips({ profile, t }: BuildArgs): PromptChip[] {
  const chips: PromptChip[] = [];

  // First-time / very new user: show the defaults.
  if (profile.searchCount < 2) {
    return DEFAULT_CHIPS.map((d, i) => ({ id: 'd_' + i, text: t(d.key), icon: d.icon }));
  }

  const topCats = topEntries(profile.categories as Partial<Record<Category, number>>, 2) as Category[];
  const topStores = topEntries(profile.stores, 1);
  const topBucket = Object.entries(profile.priceBuckets).sort((a, b) => b[1] - a[1])[0]?.[0] as PriceBucket | undefined;

  // 1) Top category → friendly upsell
  if (topCats[0]) {
    const cat = topCats[0];
    chips.push({
      id: 'cat_' + cat,
      icon: CATEGORY_ICON[cat],
      text: t('recommend.foryou.category', { cat: t(CATEGORY_LABEL_KEY[cat]) }),
    });
  }

  // 2) Top store → cheaper alternative
  if (topStores[0]) {
    chips.push({
      id: 'store_' + topStores[0],
      icon: 'dollar',
      text: t('recommend.foryou.cheaperThan', { store: storeLabel(topStores[0]) }),
    });
  }

  // 3) Price bucket → budget hint
  if (topBucket && topBucket !== 'mid') {
    chips.push({
      id: 'price_' + topBucket,
      icon: 'tag',
      text: t(PRICE_BUCKET_KEY[topBucket]),
    });
  }

  // 4) Second category if we have one
  if (topCats[1]) {
    const cat = topCats[1];
    chips.push({
      id: 'cat2_' + cat,
      icon: CATEGORY_ICON[cat],
      text: t('recommend.foryou.similar', { cat: t(CATEGORY_LABEL_KEY[cat]) }),
    });
  }

  // 5) Power-user discovery chip
  if (profile.searchCount >= 8) {
    chips.push({ id: 'pwr_value', icon: 'sparkles', text: t('recommend.foryou.bestValue') });
  } else {
    chips.push({ id: 'd_gift', icon: 'gift', text: t('recommend.default.gift') });
  }

  // Pad up to 5 with defaults we haven't used yet.
  let i = 0;
  while (chips.length < 5 && i < DEFAULT_CHIPS.length) {
    const d = DEFAULT_CHIPS[i++]!;
    if (!chips.some((c) => c.text === t(d.key))) {
      chips.push({ id: 'd_' + d.key, text: t(d.key), icon: d.icon });
    }
  }

  return chips.slice(0, 5);
}

function storeLabel(s: StoreId): string {
  if (s === 'NaverShopping') return '네이버쇼핑';
  if (s === '11st') return '11번가';
  if (s === 'TikTokShop') return 'TikTok Shop';
  return s;
}
