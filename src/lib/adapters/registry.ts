import type { SearchAdapter } from './base';
import { amazonAdapter } from './amazon';
import { coupangAdapter } from './coupang';
import { ebayAdapter } from './ebay';
import { shopeeAdapter } from './shopee';
import { lazadaAdapter } from './lazada';
import { naverAdapter } from './naver';

/** All registered adapters. Order is the default UI ordering. */
export const ALL_ADAPTERS: SearchAdapter[] = [
  coupangAdapter,
  naverAdapter,
  amazonAdapter,
  ebayAdapter,
  shopeeAdapter,
  lazadaAdapter,
];

/** Adapters enabled under the current process env. */
export function getEnabledAdapters(): SearchAdapter[] {
  return ALL_ADAPTERS.filter((a) => a.isEnabled());
}
