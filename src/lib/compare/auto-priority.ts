/**
 * Auto-priority — infer the user's preferred compare priority from their
 * recent outbound-click history.
 *
 * The signal: every `recordProductClick` writes a ClickEvent with the Tony tag
 * that drove the choice (best / cheap / fast / genuine / value / alt / not).
 * Over time the user's tag mix is a clean preference fingerprint. We map that
 * mix onto the four compare priorities and only commit to a recommendation
 * when the dominant signal is strong enough — otherwise we stay silent and
 * let the page render in `balanced` mode like always.
 *
 * Pure, no React, no IO. Trivial to unit-test.
 */
import type { ClickEvent } from '@/stores/click-store';
import type { TonyTag } from '@/types/product';
import type { ComparePriority } from './verdict';

export type AutoPrioritySignal = 'fast' | 'value' | 'genuine' | null;

export interface AutoPriorityResult {
  priority: ComparePriority;
  /** Stable key for i18n: compare.auto.signal.{key}. */
  signal: AutoPrioritySignal;
  /** 0..1. UI suppresses the recommendation when confidence is low. */
  confidence: number;
  /** How many recent clicks the inference looked at. */
  sampleSize: number;
}

/** Tag → priority mapping. `best` and `alt` are neutral; `not` is ignored. */
const TAG_TO_PRIORITY: Partial<Record<TonyTag, ComparePriority>> = {
  cheap: 'value',
  value: 'value',
  fast: 'fast',
  genuine: 'genuine',
};

const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MIN_SAMPLE = 3;
const MIN_DOMINANCE = 0.45; // top bucket must own ≥ 45% of votes
const MIN_LEAD = 0.15;      // …and beat the runner-up by ≥ 15 pts

/**
 * Run inference. Returns null when the click history is too sparse, too
 * mixed, or pre-dates the recency window.
 */
export function inferPriority(
  events: readonly ClickEvent[],
  now: number = Date.now(),
): AutoPriorityResult | null {
  if (!events || events.length === 0) return null;

  // Recency filter: ignore stale clicks from before the user formed habits.
  const recent = events.filter((e) => now - e.at <= RECENT_WINDOW_MS);
  if (recent.length < MIN_SAMPLE) return null;

  const buckets: Record<ComparePriority, number> = {
    balanced: 0,
    value: 0,
    fast: 0,
    genuine: 0,
  };

  for (const ev of recent) {
    const mapped = TAG_TO_PRIORITY[ev.tag];
    if (!mapped) continue;
    buckets[mapped] += 1;
  }

  const totalSignal =
    buckets.value + buckets.fast + buckets.genuine; // ignore balanced bucket
  if (totalSignal < MIN_SAMPLE) return null;

  const ranked = (Object.entries(buckets) as Array<[ComparePriority, number]>)
    .filter(([k]) => k !== 'balanced')
    .sort((a, b) => b[1] - a[1]);

  const [top, second] = ranked;
  if (!top || top[1] === 0) return null;

  const dominance = top[1] / totalSignal;
  const runnerUpRatio = second ? second[1] / totalSignal : 0;
  const lead = dominance - runnerUpRatio;

  if (dominance < MIN_DOMINANCE || lead < MIN_LEAD) return null;

  const priority = top[0];
  const signal: AutoPrioritySignal =
    priority === 'value' ? 'value' : priority === 'fast' ? 'fast' : priority === 'genuine' ? 'genuine' : null;
  if (!signal) return null;

  // Confidence: 0..1 blend of dominance + lead, dampened by tiny samples.
  // The boost plateaus at 6 samples — past that, more data doesn't make the
  // user "more decided", it just confirms what we already know.
  const sampleBoost = Math.min(1, totalSignal / 6);
  const confidence = Math.round(((dominance * 0.6) + (lead * 0.4)) * sampleBoost * 100) / 100;

  return {
    priority,
    signal,
    confidence,
    sampleSize: totalSignal,
  };
}
