/**
 * Activity heatmap — bucket the user's recent events into a 7-day ×
 * 24-hour grid keyed by (dayOfWeek, hourOfDay).
 *
 * Pure (no React / IO). Caller passes search history + click events;
 * we drop anything older than the lookback window (default 14 days)
 * and tally the rest. Two weeks of data feeds a more legible heatmap
 * than 7 days — every weekday/hour pair gets up to 2 samples instead
 * of the 0 / 1 binary we'd see at 7d.
 */
export interface HeatmapBucket {
  /** 0 = Sun … 6 = Sat (Date.getDay convention). */
  day: number;
  /** 0 … 23 in local time. */
  hour: number;
  count: number;
}

export interface HeatmapResult {
  /** 7×24 grid in row-major (day-first) order. */
  grid: number[][];
  /** Total events tallied. */
  total: number;
  /** Highest single-bucket count — for normalising color intensity. */
  peak: number;
}

interface BuildArgs {
  events: ReadonlyArray<{ at: number }>;
  /** Override clock for tests. */
  now?: number;
  /** Lookback window in days. Default 14. */
  windowDays?: number;
}

export function buildHeatmap({ events, now = Date.now(), windowDays = 14 }: BuildArgs): HeatmapResult {
  const since = now - windowDays * 24 * 60 * 60 * 1000;
  // 7 rows (Sun..Sat) × 24 columns (0..23h)
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  let total = 0;
  let peak = 0;

  for (const e of events) {
    if (!Number.isFinite(e.at) || e.at < since || e.at > now) continue;
    const d = new Date(e.at);
    const day = d.getDay();
    const hour = d.getHours();
    const row = grid[day]!;
    const next = (row[hour] ?? 0) + 1;
    row[hour] = next;
    total += 1;
    if (next > peak) peak = next;
  }

  return { grid, total, peak };
}
