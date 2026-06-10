/**
 * Merchant string → canonical StoreId.
 *
 * SerpAPI (Google Shopping + Lens) returns a free-text `source` like "Amazon.com",
 * "쿠팡", "11번가", "AliExpress". We fold those into our StoreId enum so they get
 * the right label, icon, and — importantly — affiliate tag on outbound clicks.
 * Unknown merchants fall back to 'GoogleShopping' (a no-op for affiliate tagging).
 *
 * Pure, no IO. Shared by the SerpAPI adapter and the reverse-image (Lens) UI.
 */
import type { StoreId } from '@/types/product';

export function mapSourceToStore(source?: string): StoreId {
  if (!source) return 'GoogleShopping';
  const s = source.toLowerCase();
  if (s.includes('amazon')) return 'Amazon';
  if (s.includes('ebay')) return 'eBay';
  if (s.includes('coupang') || s.includes('쿠팡')) return 'Coupang';
  if (s.includes('shopee')) return 'Shopee';
  if (s.includes('lazada')) return 'Lazada';
  if (s.includes('naver') || s.includes('네이버')) return 'NaverShopping';
  if (s.includes('aliexpress') || s.includes('알리')) return 'AliExpress';
  if (s.includes('11st') || s.includes('11번가')) return '11st';
  if (s.includes('gmarket') || s.includes('g마켓') || s.includes('지마켓')) return 'Gmarket';
  if (s.includes('tiktok')) return 'TikTokShop';
  return 'GoogleShopping';
}
