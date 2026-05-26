import { describe, it, expect } from 'vitest';
import { buildHeatmap } from '@/lib/insights/heatmap';

describe('buildHeatmap', () => {
  // Reference "now" anchored to a known wall-clock so day/hour math is
  // deterministic. 2026-05-26 23:00 local time = Tuesday — late enough
  // that earlier-same-day events count as "in window" rather than future.
  const now = new Date(2026, 4, 26, 23, 0, 0).getTime();

  it('returns an empty 7×24 grid when no events', () => {
    const h = buildHeatmap({ events: [], now });
    expect(h.grid).toHaveLength(7);
    expect(h.grid[0]).toHaveLength(24);
    expect(h.total).toBe(0);
    expect(h.peak).toBe(0);
  });

  it('drops events older than the window and out-of-future events', () => {
    const tooOld = now - 30 * 24 * 60 * 60 * 1000;
    const future = now + 60_000;
    const h = buildHeatmap({ events: [{ at: tooOld }, { at: future }], now });
    expect(h.total).toBe(0);
  });

  it('buckets multiple events at the same hour into one cell', () => {
    const t = new Date(2026, 4, 26, 14, 0, 0).getTime(); // Tuesday 14h
    const h = buildHeatmap({ events: [{ at: t }, { at: t + 1000 }, { at: t + 2000 }], now });
    expect(h.total).toBe(3);
    expect(h.peak).toBe(3);
    expect(h.grid[2]![14]).toBe(3); // Tuesday=2
  });

  it('respects the windowDays override', () => {
    const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000;
    const inSeven = buildHeatmap({ events: [{ at: tenDaysAgo }], now, windowDays: 7 });
    const inFourteen = buildHeatmap({ events: [{ at: tenDaysAgo }], now, windowDays: 14 });
    expect(inSeven.total).toBe(0);
    expect(inFourteen.total).toBe(1);
  });
});
