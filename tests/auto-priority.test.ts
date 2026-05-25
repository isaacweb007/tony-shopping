import { describe, it, expect } from 'vitest';
import { inferPriority } from '@/lib/compare/auto-priority';
import type { ClickEvent } from '@/stores/click-store';

const NOW = 1_770_000_000_000; // fixed reference for deterministic recency
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function ev(tag: ClickEvent['tag'], ageMs = HOUR, id = Math.random().toString()): ClickEvent {
  return {
    id,
    at: NOW - ageMs,
    productId: 'p',
    store: 'Coupang',
    tag,
    score: 80,
    fromVerdict: false,
    q: 'airpods',
  };
}

describe('inferPriority', () => {
  it('returns null on empty input', () => {
    expect(inferPriority([], NOW)).toBeNull();
  });

  it('returns null below minimum sample (< 3 recent)', () => {
    const events = [ev('fast'), ev('fast')];
    expect(inferPriority(events, NOW)).toBeNull();
  });

  it('returns null when signals are evenly split (no clear lead)', () => {
    const events = [
      ev('fast'),
      ev('fast'),
      ev('cheap'),
      ev('cheap'),
      ev('genuine'),
      ev('genuine'),
    ];
    expect(inferPriority(events, NOW)).toBeNull();
  });

  it('returns "fast" when fast clicks dominate', () => {
    const events = [
      ev('fast'),
      ev('fast'),
      ev('fast'),
      ev('fast'),
      ev('cheap'),
    ];
    const r = inferPriority(events, NOW);
    expect(r).not.toBeNull();
    expect(r!.priority).toBe('fast');
    expect(r!.signal).toBe('fast');
    expect(r!.sampleSize).toBe(5);
    expect(r!.confidence).toBeGreaterThan(0.4);
  });

  it('returns "value" for cheap/value clicks', () => {
    const events = [ev('cheap'), ev('value'), ev('cheap'), ev('value'), ev('cheap')];
    const r = inferPriority(events, NOW);
    expect(r?.priority).toBe('value');
  });

  it('ignores stale clicks beyond the 30-day window', () => {
    const DAY = 24 * HOUR;
    const stale = [
      ev('fast', 40 * DAY),
      ev('fast', 41 * DAY),
      ev('fast', 42 * DAY),
      ev('fast', 43 * DAY),
    ];
    expect(inferPriority(stale, NOW)).toBeNull();
  });

  it('confidence plateaus at 6 samples (no spurious < 0.4 dip)', () => {
    const events = Array.from({ length: 6 }, () => ev('fast'));
    const r = inferPriority(events, NOW);
    expect(r!.confidence).toBeGreaterThan(0.7);
  });
});
