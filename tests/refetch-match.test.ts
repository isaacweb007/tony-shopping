import { describe, it, expect } from 'vitest';
import { matchWatchedProduct, type WatchedRow } from '@/lib/alerts/refetch';
import type { Product } from '@/types/product';

function product(over: Partial<Product> & Pick<Product, 'id' | 'name'>): Product {
  return {
    store: 'Coupang',
    country: 'KR',
    price: { amount: 100, currency: 'KRW' },
    finalPrice: { amount: 100, currency: 'KRW' },
    shippingFee: { amount: 0, currency: 'KRW' },
    shipDays: 1,
    rating: 4.5,
    reviewCount: 100,
    authenticityPct: 90,
    official: false,
    discountPct: 0,
    imageUrl: '',
    tag: 'value',
    score: { total: 80, similarity: 80, priceEdge: 80, reviewTrust: 80, authenticity: 80 },
    buyUrl: '#',
    ...over,
  };
}

const row: WatchedRow = { productId: 'coupang_42', name: 'AirPods Pro 2', store: 'Coupang', currency: 'KRW' };

describe('matchWatchedProduct', () => {
  it('matches by exact id first', () => {
    const products = [
      product({ id: 'coupang_42', name: 'AirPods Pro 2', finalPrice: { amount: 280_000, currency: 'KRW' } }),
      product({ id: 'coupang_99', name: 'AirPods Pro 2', finalPrice: { amount: 250_000, currency: 'KRW' } }),
    ];
    expect(matchWatchedProduct(row, products)?.id).toBe('coupang_42');
  });

  it('falls back to same normalized name + same store when id drifted', () => {
    const products = [
      product({ id: 'serp_x', name: 'airpods   pro 2', store: 'Coupang', finalPrice: { amount: 270_000, currency: 'KRW' } }),
      product({ id: 'serp_y', name: 'AirPods Pro 2', store: 'Amazon', finalPrice: { amount: 260_000, currency: 'KRW' } }),
    ];
    const hit = matchWatchedProduct(row, products);
    expect(hit?.id).toBe('serp_x'); // same store wins over cheaper other-store
  });

  it('falls back to cheapest same-name when no store matches', () => {
    const products = [
      product({ id: 'a', name: 'AirPods Pro 2', store: 'Amazon', finalPrice: { amount: 300_000, currency: 'KRW' } }),
      product({ id: 'b', name: 'AirPods Pro 2', store: 'eBay', finalPrice: { amount: 240_000, currency: 'KRW' } }),
    ];
    expect(matchWatchedProduct(row, products)?.id).toBe('b');
  });

  it('ignores cross-currency matches', () => {
    const products = [
      product({ id: 'coupang_42', name: 'AirPods Pro 2', finalPrice: { amount: 199, currency: 'USD' } }),
    ];
    expect(matchWatchedProduct(row, products)).toBeNull();
  });

  it('returns null when nothing matches', () => {
    const products = [product({ id: 'z', name: 'Galaxy Buds', finalPrice: { amount: 100_000, currency: 'KRW' } })];
    expect(matchWatchedProduct(row, products)).toBeNull();
  });
});
