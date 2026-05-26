import type { MetadataRoute } from 'next';

/**
 * Web App Manifest — makes /[locale]/ installable as a PWA.
 *
 * We deliberately keep start_url at "/" (locale-less) so the install prompt
 * lands on the locale-detection redirect and ends up at the user's
 * preferred locale, rather than pinning the user to whichever locale they
 * installed from.
 *
 * Icons reference the same vector source the site icon uses. Lighthouse
 * prefers per-size raster files; we'll add 192 + 512 PNG renders in a
 * follow-up once design ships them.
 */
export default function manifest(): MetadataRoute.Manifest {
  // Build as a plain record so the share_target object-form params (which
  // the spec + every browser supports, but Next types as a {name,value}[])
  // can sit on the object without fighting the framework's narrower type.
  const m: Record<string, unknown> = {
    name: 'Tony Shopping — AI Meta Shopping Agent',
    short_name: 'Tony',
    description:
      'AI 메타쇼핑 에이전트 · 사진 한 장이면 전 세계 쇼핑몰을 토니가 비교해드립니다.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#0a0a0a',
    background_color: '#0a0a0a',
    lang: 'ko',
    categories: ['shopping', 'productivity', 'lifestyle'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    // Web Share Target — when Tony is installed as a PWA, it appears in the
    // OS share sheet. A shared URL or text lands at /share, which redirects
    // into a search using the payload as the query.
    share_target: {
      action: '/share',
      method: 'get',
      params: { title: 'title', text: 'text', url: 'url' },
    },
    // Right-click / long-press the installed PWA icon to jump straight
    // into the most common surfaces. Most modern Chromium-based desktops
    // and Android surface these as a jumplist.
    shortcuts: [
      {
        name: 'Search',
        short_name: 'Search',
        description: 'Start a new search',
        url: '/?focus=ask',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      {
        name: 'Compare',
        short_name: 'Compare',
        description: 'Open my compare cohort',
        url: '/compare',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      {
        name: 'Alerts',
        short_name: 'Alerts',
        description: 'See price drops',
        url: '/alerts',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    ],
  };
  return m as MetadataRoute.Manifest;
}
