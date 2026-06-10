import { describe, it, expect } from 'vitest';
import { deriveQueryFromLens, cleanTitle } from '@/lib/search/derive-query';
import type { LensMatch } from '@/lib/search/lens-map';

function m(title: string, priceValue?: number): LensMatch {
  return { title, link: 'https://x/' + encodeURIComponent(title), source: 'S', priceValue };
}

describe('cleanTitle', () => {
  it('strips promo/logistics noise words', () => {
    expect(cleanTitle('Apple AirPods Pro 2세대 정품 무료배송 당일발송 최저가')).toBe(
      'Apple AirPods Pro 2세대',
    );
  });
  it('removes bracketed promo blocks', () => {
    expect(cleanTitle('[특가] Sony WH-1000XM5 (무료배송)')).toBe('Sony WH-1000XM5');
  });
});

describe('deriveQueryFromLens', () => {
  it('returns "" for no matches', () => {
    expect(deriveQueryFromLens([])).toBe('');
  });

  it('prefers price-bearing listings and the shortest clean title', () => {
    const matches = [
      m('에어팟 프로 2 리뷰 블로그 후기 정리'), // no price (reference)
      m('Apple AirPods Pro 2 USB-C 정품 무료배송', 289000), // priced → cleans to brand+model
      m('Apple AirPods Pro 2세대 USB-C 화이트 노이즈캔슬링 무선 이어폰 정품', 295000),
    ];
    expect(deriveQueryFromLens(matches)).toBe('Apple AirPods Pro 2 USB-C');
  });

  it('falls back to non-priced titles when none have a price', () => {
    const matches = [m('Sony WH-1000XM5 무선 헤드폰 정품')];
    expect(deriveQueryFromLens(matches)).toBe('Sony WH-1000XM5 무선 헤드폰');
  });

  it('caps the query at max tokens', () => {
    const matches = [m('a b c d e f g h i j', 1000)];
    expect(deriveQueryFromLens(matches, 5).split(/\s+/)).toHaveLength(5);
  });

  it('skips titles that clean down to under 2 tokens', () => {
    const matches = [m('정품 무료배송'), m('Galaxy Buds3 Pro', 100000)];
    expect(deriveQueryFromLens(matches)).toBe('Galaxy Buds3 Pro');
  });
});
