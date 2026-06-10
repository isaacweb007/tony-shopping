import { describe, it, expect } from 'vitest';
import { mapLensMatches } from '@/lib/search/lens-map';

const FIXTURE = {
  visual_matches: [
    {
      position: 1,
      title: 'Reference blog post (no price)',
      link: 'https://blog.example.com/airpods-review',
      source: 'Example Blog',
      thumbnail: 'https://img/1.jpg',
    },
    {
      position: 2,
      title: 'AirPods Pro 2 USB-C — Coupang',
      link: 'https://coupang.com/vp/products/123',
      source: 'Coupang',
      thumbnail: 'https://img/2.jpg',
      price: { value: '₩289,000', extracted_value: 289000, currency: '₩' },
      in_stock: true,
    },
    {
      position: 3,
      title: 'AirPods Pro 2 — Amazon',
      link: 'https://amazon.com/dp/X',
      source: 'Amazon.com',
      price: { value: '$199.99', extracted_value: 199.99, currency: '$' },
    },
    // Duplicate link of #2 — should be deduped.
    {
      position: 4,
      title: 'AirPods Pro 2 dup',
      link: 'https://coupang.com/vp/products/123',
      source: 'Coupang',
      price: { value: '₩290,000', extracted_value: 290000, currency: '₩' },
    },
    // No link — dropped.
    { position: 5, title: 'No link item', source: 'X' },
  ],
};

describe('mapLensMatches', () => {
  it('ranks price-bearing listings ahead of bare reference pages', () => {
    const out = mapLensMatches(FIXTURE);
    expect(out[0]!.priceValue).toBeDefined();
    // The no-price blog post sinks to the bottom.
    expect(out[out.length - 1]!.source).toBe('Example Blog');
  });

  it('extracts price text + numeric value + currency', () => {
    const coupang = mapLensMatches(FIXTURE).find((m) => m.source === 'Coupang')!;
    expect(coupang.priceValue).toBe(289000);
    expect(coupang.priceText).toBe('₩289,000');
    expect(coupang.currency).toBe('₩');
  });

  it('dedupes by link and drops entries without a link', () => {
    const out = mapLensMatches(FIXTURE);
    const coupangCount = out.filter((m) => m.link === 'https://coupang.com/vp/products/123').length;
    expect(coupangCount).toBe(1);
    expect(out.some((m) => m.title === 'No link item')).toBe(false);
  });

  it('respects the limit', () => {
    expect(mapLensMatches(FIXTURE, 1)).toHaveLength(1);
  });

  it('returns [] for empty / malformed input', () => {
    expect(mapLensMatches(null)).toEqual([]);
    expect(mapLensMatches({})).toEqual([]);
    expect(mapLensMatches({ visual_matches: 'nope' })).toEqual([]);
  });
});
