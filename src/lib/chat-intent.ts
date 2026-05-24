/**
 * Lightweight intent matcher for Tony chat (Phase 3, no LLM yet).
 * Phase 5+ will swap this with a real model.
 */
import type { Product } from '@/types/product';
import type { SortKey, StoreFilter } from '@/types/search';

export type ChatIntent =
  | { kind: 'sort'; sort: SortKey; vars: Record<string, string | number> }
  | { kind: 'filter'; store: StoreFilter; vars: Record<string, string | number> }
  | { kind: 'fallback' };

const RE = {
  cheap: /(싼|저렴|최저가|cheap|rẻ|giá)/i,
  fast: /(빠른|배송|fast|ship|nhanh|giao)/i,
  authentic: /(정품|공식|authentic|genuine|chính|hãng)/i,
  review: /(리뷰|review|đánh giá)/i,
  vn: /(베트남|vn|vietnam|việt)/i,
};

export function matchIntent(text: string, products: Product[]): ChatIntent {
  const t = text;

  if (RE.cheap.test(t)) {
    const cheapest = [...products].sort(
      (a, b) => a.finalPrice.amount - b.finalPrice.amount,
    )[0];
    return {
      kind: 'sort',
      sort: 'price',
      vars: { min: cheapest?.finalPrice.amount ?? 0 },
    };
  }
  if (RE.fast.test(t)) {
    const fastest = [...products].sort((a, b) => a.shipDays - b.shipDays)[0];
    return {
      kind: 'sort',
      sort: 'ship',
      vars: { etaDays: fastest?.shipDays ?? 0 },
    };
  }
  if (RE.authentic.test(t)) {
    return { kind: 'sort', sort: 'authentic', vars: {} };
  }
  if (RE.review.test(t)) {
    const top = [...products].sort((a, b) => b.reviewCount - a.reviewCount)[0];
    return { kind: 'sort', sort: 'review', vars: { n: top?.reviewCount ?? 0 } };
  }
  if (RE.vn.test(t)) {
    return { kind: 'filter', store: 'Shopee', vars: {} };
  }

  return { kind: 'fallback' };
}
