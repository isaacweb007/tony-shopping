import type { SearchAdapter, SearchInput } from './base';
import { generateMockProducts } from './mock-factory';

export const shopeeAdapter: SearchAdapter = {
  id: 'Shopee',
  isEnabled: () => true,
  search: ({ q, limit = 4, signal }: SearchInput) =>
    generateMockProducts(
      { store: 'Shopee', priceMul: 0.75, latencyMs: 220, country: 'VN', officialRate: 0.25, shipBase: 2200 },
      q,
      limit,
      signal,
    ),
};
