import type { SearchAdapter, SearchInput } from './base';
import { generateMockProducts } from './mock-factory';

export const naverAdapter: SearchAdapter = {
  id: 'NaverShopping',
  isEnabled: () => true,
  search: ({ q, limit = 4, signal }: SearchInput) =>
    generateMockProducts(
      { store: 'NaverShopping', priceMul: 1.0, latencyMs: 160, country: 'KR', officialRate: 0.4, shipBase: 0 },
      q,
      limit,
      signal,
    ),
};
