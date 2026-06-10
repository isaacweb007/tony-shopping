import { describe, it, expect } from 'vitest';
import { selectDeals, type DealGroup } from '@/lib/deals/build-deals';
import type { Product } from '@/types/product';

function product(
  over: Partial<Product> & Pick<Product, 'id'> & { amount: number },
): Product {
  const { amount, ...rest } = over;
  return {
    name: `Item ${rest.id}`,
    store: 'Coupang',
    country: 'KR',
    shippingFee: { amount: 0, currency: 'KRW' },
    shipDays: 2,
    rating: 4.5,
    reviewCount: 500,
    authenticityPct: 90,
    official: false,
    discountPct: 0,
    imageUrl: '',
    tag: 'value',
    score: { total: 80, similarity: 90, priceEdge: 80, reviewTrust: 80, authenticity: 90 },
    buyUrl: '#',
    ...rest,
    price: { amount, currency: 'KRW' },
    finalPrice: { amount, currency: 'KRW' },
  };
}

describe('selectDeals — derived discount (real-adapter case, discountPct=0)', () => {
  it('flags an item priced well below its group median', () => {
    const groups: DealGroup[] = [
      {
        query: 'q1',
        products: [
          product({ id: 'a', amount: 100_000 }),
          product({ id: 'b', amount: 100_000 }),
          product({ id: 'c', amount: 50_000 }), // 50% below median
        ],
      },
    ];
    const deals = selectDeals(groups, { count: 6 });
    expect(deals).toHaveLength(1);
    expect(deals[0]!.product.id).toBe('c');
    expect(deals[0]!.discountPct).toBe(50);
    expect(deals[0]!.referenceAmount).toBe(100_000);
    expect(deals[0]!.savings).toBe(50_000);
  });
});

describe('selectDeals — explicit discountPct', () => {
  it('uses the reported discount and reconstructs the list price', () => {
    const groups: DealGroup[] = [
      {
        query: 'q1',
        products: [
          product({ id: 'a', amount: 80_000, discountPct: 20 }),
          product({ id: 'b', amount: 80_000 }),
          product({ id: 'd', amount: 80_000 }),
        ],
      },
    ];
    const deals = selectDeals(groups, { count: 6 });
    expect(deals).toHaveLength(1);
    expect(deals[0]!.product.id).toBe('a');
    expect(deals[0]!.discountPct).toBe(20);
    expect(deals[0]!.referenceAmount).toBe(100_000); // 80000 / 0.8
    expect(deals[0]!.savings).toBe(20_000);
  });
});

describe('selectDeals — bogus discount hardening', () => {
  it('never yields an Infinity / non-finite reference price for a ~100% discount', () => {
    const groups: DealGroup[] = [
      {
        query: 'q1',
        products: [
          product({ id: 'a', amount: 100_000 }),
          product({ id: 'b', amount: 100_000 }),
          product({ id: 'scam', amount: 1000, discountPct: 100 }),
        ],
      },
    ];
    const deals = selectDeals(groups, { count: 6 });
    for (const d of deals) {
      expect(Number.isFinite(d.referenceAmount)).toBe(true);
      expect(Number.isFinite(d.savings)).toBe(true);
      // Falls back to the median-derived discount, not the bogus 100%.
      expect(d.discountPct).toBeLessThan(100);
    }
  });
});

describe('selectDeals — gates', () => {
  it('drops items under the minDiscount threshold', () => {
    const groups: DealGroup[] = [
      {
        query: 'q1',
        products: [
          product({ id: 'a', amount: 100_000 }),
          product({ id: 'b', amount: 100_000 }),
          product({ id: 'c', amount: 50_000 }),
        ],
      },
    ];
    expect(selectDeals(groups, { count: 6, minDiscount: 60 })).toHaveLength(0);
  });

  it('drops low-authenticity listings even when cheap', () => {
    const groups: DealGroup[] = [
      {
        query: 'q1',
        products: [
          product({ id: 'a', amount: 100_000 }),
          product({ id: 'b', amount: 100_000 }),
          product({ id: 'c', amount: 50_000, authenticityPct: 55 }),
        ],
      },
    ];
    expect(selectDeals(groups, { count: 6 })).toHaveLength(0);
  });
});

describe('selectDeals — caps & dedup', () => {
  it('caps deals per query', () => {
    const groups: DealGroup[] = [
      {
        query: 'q1',
        products: [
          product({ id: 'a', amount: 200_000 }),
          product({ id: 'b', amount: 200_000 }),
          product({ id: 'c', amount: 50_000 }),
          product({ id: 'd', amount: 60_000 }),
          product({ id: 'e', amount: 70_000 }),
        ],
      },
    ];
    const deals = selectDeals(groups, { count: 6, maxPerQuery: 1 });
    expect(deals).toHaveLength(1);
    expect(deals[0]!.product.id).toBe('c'); // biggest discount kept
  });

  it('dedups the same product id across groups', () => {
    const shared = product({ id: 'dup', amount: 50_000 });
    const groups: DealGroup[] = [
      { query: 'q1', products: [shared, product({ id: 'x', amount: 100_000 }), product({ id: 'y', amount: 100_000 })] },
      { query: 'q2', products: [shared, product({ id: 'z', amount: 100_000 }), product({ id: 'w', amount: 100_000 })] },
    ];
    const deals = selectDeals(groups, { count: 6 });
    expect(deals.filter((d) => d.product.id === 'dup')).toHaveLength(1);
  });

  it('ranks bigger discounts first and respects count', () => {
    const groups: DealGroup[] = [
      { query: 'q1', products: [product({ id: 'big', amount: 30_000 }), product({ id: 'h1', amount: 100_000 }), product({ id: 'h2', amount: 100_000 })] },
      { query: 'q2', products: [product({ id: 'small', amount: 85_000 }), product({ id: 'h3', amount: 100_000 }), product({ id: 'h4', amount: 100_000 })] },
    ];
    const deals = selectDeals(groups, { count: 1 });
    expect(deals).toHaveLength(1);
    expect(deals[0]!.product.id).toBe('big');
  });
});
