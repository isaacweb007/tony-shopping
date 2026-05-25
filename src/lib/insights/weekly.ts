/**
 * Weekly insights — distil the user's local activity into 1–4 short
 * "Tony noticed…" cards displayed at the top of /dashboard.
 *
 * Pure function, no React, no IO. Inputs are read straight from the existing
 * stores (clicks / history / shortlist). The dashboard hook composes this
 * with server-side stats but the per-insight headlines stay client-derived —
 * they speak from things only the device knows.
 */
import type { ClickEvent } from '@/stores/click-store';
import type { ShortlistSnap } from '@/types/shortlist';
import { inferPriority } from '@/lib/compare/auto-priority';

export type InsightSeverity = 'info' | 'celebration' | 'nudge';
export type InsightKey =
  | 'thisWeekSearches'
  | 'topStore'
  | 'verdictAdoption'
  | 'autoPriorityHint'
  | 'considerSpeed'
  | 'idleShortlist';

export interface Insight {
  key: InsightKey;
  severity: InsightSeverity;
  /** Variables for the i18n template under dashboard.insights.{key}.body. */
  vars?: Record<string, string | number>;
  /** Numeric weight — higher = surfaced first. */
  score: number;
}

interface BuildArgs {
  clicks: readonly ClickEvent[];
  /** History entries — each has a `at` timestamp (ms). */
  history: ReadonlyArray<{ at: number }>;
  /** Shortlist snaps — uses snap.addedAt. */
  shortlist: readonly ShortlistSnap[];
  /** Override for tests. */
  now?: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function buildWeeklyInsights({
  clicks,
  history,
  shortlist,
  now = Date.now(),
}: BuildArgs): Insight[] {
  const since = now - WEEK_MS;
  const recentClicks = clicks.filter((c) => c.at >= since);
  const recentHistory = history.filter((h) => h.at >= since);

  const out: Insight[] = [];

  // 1) This week's search count — only when ≥ 1, score scales with volume.
  if (recentHistory.length >= 1) {
    out.push({
      key: 'thisWeekSearches',
      severity: 'info',
      vars: { n: recentHistory.length },
      score: 30 + Math.min(20, recentHistory.length * 2),
    });
  }

  // 2) Top store this week.
  if (recentClicks.length >= 3) {
    const counts: Record<string, number> = {};
    for (const c of recentClicks) counts[c.store] = (counts[c.store] ?? 0) + 1;
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = ranked[0];
    if (top && top[1] >= 2) {
      const share = top[1] / recentClicks.length;
      if (share >= 0.4) {
        out.push({
          key: 'topStore',
          severity: 'info',
          vars: { store: top[0], pct: Math.round(share * 100) },
          score: 45 + Math.round(share * 30),
        });
      }
    }
  }

  // 3) Verdict adoption rate — how often "Tony's pick" was the click target.
  if (recentClicks.length >= 4) {
    const fromVerdict = recentClicks.filter((c) => c.fromVerdict).length;
    const rate = Math.round((fromVerdict / recentClicks.length) * 100);
    if (rate >= 50) {
      out.push({
        key: 'verdictAdoption',
        severity: 'celebration',
        vars: { pct: rate },
        score: 60 + Math.round(rate * 0.2),
      });
    }
  }

  // 4) Auto-priority hint — surface only when confident.
  const auto = inferPriority(clicks, now);
  if (auto && auto.confidence >= 0.5 && auto.signal) {
    out.push({
      key: 'autoPriorityHint',
      severity: 'info',
      vars: { signal: auto.signal, n: auto.sampleSize },
      score: 55 + Math.round(auto.confidence * 30),
    });
  }

  // 5) Consider→checkout speed — average ms from shortlist add to a click on
  // that same product. Tiny stat but it reframes the funnel for the user.
  if (shortlist.length >= 1 && recentClicks.length >= 2) {
    const productAdd: Record<string, number> = {};
    for (const s of shortlist) productAdd[s.id] = s.addedAt;
    const deltas: number[] = [];
    for (const c of recentClicks) {
      const at = productAdd[c.productId];
      if (at && c.at > at) deltas.push(c.at - at);
    }
    if (deltas.length >= 2) {
      const avgMs = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      const avgHours = Math.round(avgMs / (60 * 60 * 1000));
      if (avgHours >= 1) {
        out.push({
          key: 'considerSpeed',
          severity: 'info',
          vars: { hours: avgHours, days: Math.max(1, Math.round(avgHours / 24)) },
          score: 35,
        });
      }
    }
  }

  // 6) Idle shortlist — items added > 7 days ago with no recent click.
  if (shortlist.length >= 1) {
    const clickedIds = new Set(recentClicks.map((c) => c.productId));
    const idle = shortlist.filter((s) => now - s.addedAt > WEEK_MS && !clickedIds.has(s.id));
    if (idle.length >= 2) {
      out.push({
        key: 'idleShortlist',
        severity: 'nudge',
        vars: { n: idle.length },
        score: 40 + Math.min(20, idle.length * 2),
      });
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 4);
}
