import { describe, it, expect } from 'vitest';
import { mapSourceToStore } from '@/lib/search/store-map';

describe('mapSourceToStore', () => {
  it('maps common English merchant strings', () => {
    expect(mapSourceToStore('Amazon.com')).toBe('Amazon');
    expect(mapSourceToStore('eBay')).toBe('eBay');
    expect(mapSourceToStore('AliExpress')).toBe('AliExpress');
    expect(mapSourceToStore('Shopee Vietnam')).toBe('Shopee');
  });

  it('maps Korean merchant strings (Hangul + romanized)', () => {
    expect(mapSourceToStore('쿠팡')).toBe('Coupang');
    expect(mapSourceToStore('Coupang')).toBe('Coupang');
    expect(mapSourceToStore('네이버쇼핑')).toBe('NaverShopping');
    expect(mapSourceToStore('11번가')).toBe('11st');
    expect(mapSourceToStore('지마켓')).toBe('Gmarket');
    expect(mapSourceToStore('알리익스프레스')).toBe('AliExpress');
  });

  it('falls back to GoogleShopping for unknown / empty sources', () => {
    expect(mapSourceToStore('Some Random Shop')).toBe('GoogleShopping');
    expect(mapSourceToStore(undefined)).toBe('GoogleShopping');
    expect(mapSourceToStore('')).toBe('GoogleShopping');
  });
});
