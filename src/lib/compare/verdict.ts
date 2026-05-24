import type { ShortlistSnap } from '@/types/shortlist';
import { convertMoneySync } from '@/lib/currency';

export interface CriterionRank {
  /** Snap id this rank applies to. */
  id: string;
  /** "best" | "worst" | null (neutral). */
  position: 'best' | 'worst' | null;
}

export interface CriterionTable {
  /** Stable key — i18n consumer looks up under `compare.criteria.{key}`. */
  key: 'price' | 'ship' | 'score' | 'reviews' | 'authenticity';
  /** Higher value is better for the user. */
  higherIsBetter: boolean;
  /** Per-snap normalised numeric value (used only for ranking). null = missing. */
  values: Record<string, number | null>;
  ranks: CriterionRank[];
}

export interface CohortVerdict {
  /** Winning snap id; null when fewer than 2 snaps. */
  winnerId: string | null;
  /** Weighted score 0..100 per snap (for sort). */
  scores: Record<string, number>;
  /** Top 2 reason keys that pushed the winner ahead (`compare.reasons.*`). */
  reasonKeys: string[];
}

/**
 * Normalise the raw price into a single comparable currency. Prevents apples-
 * to-oranges comparisons when the shortlist mixes USD listings and KRW
 * listings. Picks USD as the pivot because every supported currency has a
 * cached USD rate in `currency.ts`.
 */
function priceInUsd(snap: ShortlistSnap): number | null {
  const usd = convertMoneySync(snap.finalPrice, 'USD');
  return usd.currency === 'USD' && Number.isFinite(usd.amount) ? usd.amount : null;
}

function buildCriterion(
  key: CriterionTable['key'],
  higherIsBetter: boolean,
  snaps: ShortlistSnap[],
  pick: (s: ShortlistSnap) => number | null,
): CriterionTable {
  const values: Record<string, number | null> = {};
  for (const s of snaps) values[s.id] = pick(s);

  const numeric = snaps
    .map((s) => ({ id: s.id, v: values[s.id] }))
    .filter((x): x is { id: string; v: number } => x.v != null && Number.isFinite(x.v));

  const ranks: CriterionRank[] = snaps.map((s) => ({ id: s.id, position: null }));
  if (numeric.length < 2) {
    return { key, higherIsBetter, values, ranks };
  }

  const sorted = [...numeric].sort((a, b) => (higherIsBetter ? b.v - a.v : a.v - b.v));
  const bestId = sorted[0]!.id;
  const worstId = sorted[sorted.length - 1]!.id;

  // If everyone tied, treat as neutral.
  if (sorted[0]!.v === sorted[sorted.length - 1]!.v) {
    return { key, higherIsBetter, values, ranks };
  }

  for (const r of ranks) {
    if (r.id === bestId) r.position = 'best';
    else if (r.id === worstId) r.position = 'worst';
  }
  return { key, higherIsBetter, values, ranks };
}

const WEIGHTS: Record<CriterionTable['key'], number> = {
  price: 0.35,
  score: 0.25,
  ship: 0.15,
  reviews: 0.15,
  authenticity: 0.10,
};

/**
 * Build the structured criterion table + an overall cohort verdict.
 *
 * The cohort score is a weighted blend of normalised criterion ranks (0..1
 * where 1 = best in the cohort for that criterion). Missing values contribute
 * 0 to that slot's weight — they neither help nor hurt.
 */
export function buildCompare(snaps: ShortlistSnap[]): {
  criteria: CriterionTable[];
  verdict: CohortVerdict;
} {
  const criteria: CriterionTable[] = [
    buildCriterion('price', false, snaps, priceInUsd),
    buildCriterion('score', true, snaps, (s) => s.score?.total ?? null),
    buildCriterion('ship', false, snaps, (s) => s.shipDays ?? null),
    buildCriterion('reviews', true, snaps, (s) =>
      s.reviewCount != null && s.rating != null
        ? Math.log10(Math.max(1, s.reviewCount)) * s.rating
        : null,
    ),
    buildCriterion('authenticity', true, snaps, (s) => s.authenticityPct ?? null),
  ];

  // Per-snap weighted score. Each criterion's contribution = weight * norm,
  // where norm is min-max normalised within the cohort (best = 1.0).
  const scores: Record<string, number> = {};
  for (const s of snaps) scores[s.id] = 0;

  const criterionContrib: Record<string, Record<CriterionTable['key'], number>> = {};
  for (const s of snaps)
    criterionContrib[s.id] = {
      price: 0,
      score: 0,
      ship: 0,
      reviews: 0,
      authenticity: 0,
    };

  for (const c of criteria) {
    const numericVals = Object.values(c.values).filter(
      (v): v is number => v != null && Number.isFinite(v),
    );
    if (numericVals.length < 2) continue;
    const min = Math.min(...numericVals);
    const max = Math.max(...numericVals);
    if (max === min) continue;
    for (const s of snaps) {
      const v = c.values[s.id];
      if (v == null || !Number.isFinite(v)) continue;
      const norm01 = (v - min) / (max - min); // 0 (min) .. 1 (max)
      const friendly = c.higherIsBetter ? norm01 : 1 - norm01;
      const contribution = WEIGHTS[c.key] * friendly;
      scores[s.id] = (scores[s.id] ?? 0) + contribution;
      criterionContrib[s.id]![c.key] = contribution;
    }
  }

  // Scale 0..100 for display.
  for (const id of Object.keys(scores)) scores[id] = Math.round(scores[id]! * 100);

  let winnerId: string | null = null;
  if (snaps.length >= 2) {
    const ranked = [...snaps].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
    if ((scores[ranked[0]!.id] ?? 0) > (scores[ranked[1]!.id] ?? 0)) {
      winnerId = ranked[0]!.id;
    }
  }

  const reasonKeys: string[] = [];
  if (winnerId) {
    const contribs = criterionContrib[winnerId]!;
    const top = (Object.entries(contribs) as Array<[CriterionTable['key'], number]>)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
    for (const [k] of top) reasonKeys.push(k);
  }

  return { criteria, verdict: { winnerId, scores, reasonKeys } };
}
