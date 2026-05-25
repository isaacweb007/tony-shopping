import type { SearchAdapter } from './base';
import { amazonAdapter } from './amazon';
import { coupangAdapter } from './coupang';
import { ebayAdapter } from './ebay';
import { shopeeAdapter } from './shopee';
import { lazadaAdapter } from './lazada';
import { naverAdapter } from './naver';
import { serpapiAdapter } from './serpapi';
import { rakutenAdapter } from './rakuten';
import { yahooJpAdapter } from './yahoo-jp';
import { aliexpressAdapter } from './aliexpress';

/** All registered adapters. Order is the default UI ordering. */
export const ALL_ADAPTERS: SearchAdapter[] = [
  coupangAdapter,
  naverAdapter,
  amazonAdapter,
  ebayAdapter,
  shopeeAdapter,
  lazadaAdapter,
  rakutenAdapter,
  yahooJpAdapter,
  aliexpressAdapter,
  // Meta-search comes last so its broad results don't dominate the BEST tag
  // assignment unless they win on their own merits.
  serpapiAdapter,
];

/** Adapters enabled under the current process env. */
export function getEnabledAdapters(): SearchAdapter[] {
  return ALL_ADAPTERS.filter((a) => a.isEnabled());
}
