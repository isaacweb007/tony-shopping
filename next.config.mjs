import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    typedRoutes: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.tonyshopping.io' },
      // Real adapter hosts
      { protocol: 'https', hostname: 'i.ebayimg.com' },
      { protocol: 'https', hostname: '**.ebayimg.com' },
      { protocol: 'https', hostname: 'shopping-phinf.pstatic.net' },
      { protocol: 'https', hostname: 'shop-phinf.pstatic.net' },
      { protocol: 'https', hostname: '**.pstatic.net' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
      { protocol: 'https', hostname: 'image*.coupangcdn.com' },
      { protocol: 'https', hostname: '**.coupangcdn.com' },
      // SerpAPI / Google Shopping image CDN (thumbnails come from gstatic)
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com' },
      { protocol: 'https', hostname: 'encrypted-tbn1.gstatic.com' },
      { protocol: 'https', hostname: 'encrypted-tbn2.gstatic.com' },
      { protocol: 'https', hostname: 'encrypted-tbn3.gstatic.com' },
      { protocol: 'https', hostname: '**.gstatic.com' },
      { protocol: 'https', hostname: 'serpapi.com' },
      // AliExpress / Taobao image CDN
      { protocol: 'https', hostname: 'gw.alicdn.com' },
      { protocol: 'https', hostname: 'ae01.alicdn.com' },
      { protocol: 'https', hostname: 'ae02.alicdn.com' },
      { protocol: 'https', hostname: 'ae03.alicdn.com' },
      { protocol: 'https', hostname: 'ae04.alicdn.com' },
      { protocol: 'https', hostname: '**.alicdn.com' },
      // Shopee CDN
      { protocol: 'https', hostname: 'cf.shopee.com' },
      { protocol: 'https', hostname: 'cf.shopee.vn' },
      { protocol: 'https', hostname: 'cf.shopee.co.id' },
      { protocol: 'https', hostname: 'cf.shopee.com.my' },
      { protocol: 'https', hostname: 'cf.shopee.ph' },
      { protocol: 'https', hostname: 'cf.shopee.sg' },
      { protocol: 'https', hostname: 'cf.shopee.tw' },
      { protocol: 'https', hostname: '**.shopee.com' },
      { protocol: 'https', hostname: '**.shopee.vn' },
      // Lazada CDN
      { protocol: 'https', hostname: 'laz-img-cdn.alicdn.com' },
      { protocol: 'https', hostname: '**.lazcdn.com' },
      // Rakuten image CDN
      { protocol: 'https', hostname: 'thumbnail.image.rakuten.co.jp' },
      { protocol: 'https', hostname: '**.r10s.jp' },
      { protocol: 'https', hostname: '**.rakuten.co.jp' },
      // Yahoo Shopping JP
      { protocol: 'https', hostname: 'item-shopping.c.yimg.jp' },
      { protocol: 'https', hostname: '**.yimg.jp' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
