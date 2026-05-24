import type { SearchAdapter, SearchInput } from './base';
import { generateMockProducts } from './mock-factory';

export const coupangAdapter: SearchAdapter = {
  id: 'Coupang',
  isEnabled: () => true,
  search: ({ q, limit = 4, signal }: SearchInput) =>
    generateMockProducts(
      { store: 'Coupang', priceMul: 1.05, latencyMs: 180, country: 'KR', officialRate: 0.45, shipBase: 0 },
      q,
      limit,
      signal,
    ),
};
