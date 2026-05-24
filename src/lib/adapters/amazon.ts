import type { SearchAdapter, SearchInput } from './base';
import { generateMockProducts } from './mock-factory';

export const amazonAdapter: SearchAdapter = {
  id: 'Amazon',
  isEnabled: () => true,
  search: ({ q, limit = 4, signal }: SearchInput) =>
    generateMockProducts(
      { store: 'Amazon', priceMul: 0.95, latencyMs: 260, country: 'US', officialRate: 0.55, shipBase: 3500 },
      q,
      limit,
      signal,
    ),
};
