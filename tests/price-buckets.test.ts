import { describe, it, expect } from 'vitest';
import { computePriceBuckets, bucketOf } from '@/lib/price-buckets';

describe('computePriceBuckets', () => {
  it('returns null for fewer than 6 points', () => {
    expect(computePriceBuckets([10, 20, 30])).toBeNull();
    expect(computePriceBuckets([10, 20, 30, 40, 50])).toBeNull();
  });

  it('returns null when 33rd and 67th percentiles collapse', () => {
    // 9 identical points → both percentiles land on the same value.
    expect(computePriceBuckets([100, 100, 100, 100, 100, 100, 100, 100, 100])).toBeNull();
  });

  it('returns sane thresholds for an even-spread range', () => {
    const t = computePriceBuckets([10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(t).not.toBeNull();
    // lowMax is the 33rd-percentile pick (index floor(9/3)=3 → value 40)
    // midMax is the 67th-percentile pick (index floor(18/3)=6 → value 70)
    expect(t!.lowMax).toBe(40);
    expect(t!.midMax).toBe(70);
  });

  it('bucketOf maps amounts to the right bucket', () => {
    const t = { lowMax: 40, midMax: 70 };
    expect(bucketOf(30, t)).toBe('low');
    expect(bucketOf(40, t)).toBe('low');
    expect(bucketOf(50, t)).toBe('mid');
    expect(bucketOf(70, t)).toBe('mid');
    expect(bucketOf(80, t)).toBe('high');
  });
});
