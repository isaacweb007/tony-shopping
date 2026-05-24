import { SITE_NAME, SITE_URL } from '@/lib/site';

/**
 * Schema.org JSON-LD blocks: Organization + WebSite (with SearchAction).
 * Rendered once in the locale layout — Google reads it server-side.
 */
export function JsonLd() {
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      sameAs: [],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- safe, server-rendered constants only
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
