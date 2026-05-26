/**
 * ShortlistSnap — frozen copy of a Product kept locally so the compare drawer
 * and /compare page stay populated after a fresh search, page reload, or
 * cross-device hydration. Mirrors the subset of Product fields the compare UI
 * needs; everything is optional except the bare minimum because server-side
 * rows (Phase H3) currently only persist a partial subset.
 */
import type { Money, StoreId, TonyScore, TonyTag } from './product';

export interface ShortlistSnap {
  id: string;
  name: string;
  store: StoreId | string;
  imageUrl?: string;
  buyUrl?: string;
  finalPrice: Money;
  shipDays?: number;
  rating?: number;
  reviewCount?: number;
  authenticityPct?: number;
  official?: boolean;
  tag?: TonyTag;
  score?: TonyScore;
  /** ms since epoch. */
  addedAt: number;
  /** Free-text note the user left themselves about why they shortlisted this. */
  note?: string;
}
