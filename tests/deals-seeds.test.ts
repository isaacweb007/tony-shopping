import { describe, it, expect } from 'vitest';
import { pickDailySeeds, todayKeyKST, DEAL_SEED_POOL } from '@/lib/deals/seeds';

describe('pickDailySeeds', () => {
  it('is deterministic for the same date key', () => {
    const a = pickDailySeeds('2026-05-30', 6);
    const b = pickDailySeeds('2026-05-30', 6);
    expect(a).toEqual(b);
  });

  it('returns the requested count', () => {
    expect(pickDailySeeds('2026-05-30', 6)).toHaveLength(6);
    expect(pickDailySeeds('2026-05-30', 3)).toHaveLength(3);
  });

  it('clamps count to the pool size', () => {
    const all = pickDailySeeds('2026-05-30', 999);
    expect(all).toHaveLength(DEAL_SEED_POOL.length);
  });

  it('returns only seeds from the pool, with no duplicates', () => {
    const picked = pickDailySeeds('2026-05-30', 6);
    const ids = picked.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of picked) {
      expect(DEAL_SEED_POOL.some((p) => p.id === s.id)).toBe(true);
    }
  });

  it('produces different selections across days (varies over a week)', () => {
    const days = ['2026-05-25', '2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29'];
    const firsts = days.map((d) => pickDailySeeds(d, 6)[0]!.id);
    // Not all five days should lead with the same seed.
    expect(new Set(firsts).size).toBeGreaterThan(1);
  });
});

describe('todayKeyKST', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(todayKeyKST(Date.parse('2026-05-30T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rolls to the next day at KST midnight (UTC+9)', () => {
    // 2026-05-30 15:30 UTC === 2026-05-31 00:30 KST.
    expect(todayKeyKST(Date.parse('2026-05-30T15:30:00Z'))).toBe('2026-05-31');
    // 2026-05-30 14:30 UTC === 2026-05-30 23:30 KST.
    expect(todayKeyKST(Date.parse('2026-05-30T14:30:00Z'))).toBe('2026-05-30');
  });
});
