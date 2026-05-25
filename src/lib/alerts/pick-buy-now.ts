/**
 * pickBuyNow — pick at most one "이거 지금 살 만해요" candidate from the
 * alerts inbox. Returns null when nothing crosses the confidence bar.
 *
 * Heuristic, intentionally simple and explainable:
 *   buyScore = max(0, -delta) * 60        // up to +6 for a 10% drop
 *            + (tony.total ?? 50) * 0.30  // up to +30 from quality
 *            + (authenticity ?? 50) * 0.10// up to +10 from auth confidence
 *            - max(0, (shipDays - 2)) * 0.5 // small ship penalty
 *
 * A row is surfaced only when its delta is a real drop (≥ threshold) AND its
 * buyScore beats the next row by at least 5pts (so there's a clear winner).
 */
import type { AlertRow } from './build-alerts';

export interface BuyNowPick {
  row: AlertRow;
  buyScore: number;
  /** Top reason key shown next to the headline (i18n under alerts.buyNow.reason.{key}). */
  reasonKey: 'bigDrop' | 'qualityAndDrop' | 'genuineAndDrop';
}

interface PickArgs {
  rows: readonly AlertRow[];
  /** Same threshold as the price-watch store (default 0.05). */
  threshold: number;
}

function scoreRow(row: AlertRow): number {
  if (row.delta === null) return 0;
  if (row.delta > 0) return 0; // never recommend a rising price
  const dropBonus = Math.max(0, -row.delta) * 60;
  const tony = row.snap.score?.total ?? 50;
  const auth = row.snap.authenticityPct ?? 50;
  const ship = row.snap.shipDays ?? 5;
  const shipPenalty = Math.max(0, ship - 2) * 0.5;
  return dropBonus + tony * 0.3 + auth * 0.1 - shipPenalty;
}

function pickReason(row: AlertRow): BuyNowPick['reasonKey'] {
  const delta = row.delta ?? 0;
  const tony = row.snap.score?.total ?? 0;
  const auth = row.snap.authenticityPct ?? 0;
  if (delta <= -0.1 && tony >= 80) return 'qualityAndDrop';
  if (delta <= -0.1 && auth >= 90) return 'genuineAndDrop';
  return 'bigDrop';
}

export function pickBuyNow({ rows, threshold }: PickArgs): BuyNowPick | null {
  // Only consider rows that are *currently* on a confirmed drop above the
  // user's threshold.
  const drops = rows.filter((r) => r.status === 'drop' && r.delta !== null && r.delta <= -threshold);
  if (drops.length === 0) return null;

  const scored = drops
    .map((r) => ({ row: r, buyScore: scoreRow(r) }))
    .sort((a, b) => b.buyScore - a.buyScore);

  const top = scored[0];
  if (!top) return null;

  // Require a clear lead so the surfaced pick feels confident; if two drops
  // are roughly equal we stay silent rather than coin-flip.
  const runnerUp = scored[1];
  if (runnerUp && top.buyScore - runnerUp.buyScore < 5) return null;

  return {
    row: top.row,
    buyScore: Math.round(top.buyScore),
    reasonKey: pickReason(top.row),
  };
}
