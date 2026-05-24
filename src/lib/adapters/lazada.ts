import type { SearchAdapter, SearchInput } from './base';
import { generateMockProducts } from './mock-factory';

export const lazadaAdapter: SearchAdapter = {
  id: 'Lazada',
  isEnabled: () => true,
  search: ({ q, limit = 4, signal }: SearchInput) =>
    generateMockProducts(
      { store: 'Lazada', priceMul: 0.85, latencyMs: 240, country: 'TH', officialRate: 0.3, shipBase: 2800 },
      q,
      limit,
      signal,
    ),
};
