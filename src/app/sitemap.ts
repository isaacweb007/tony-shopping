import type { MetadataRoute } from 'next';
import { LOCALES, absoluteUrl, hreflangFor } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = ['/', '/search'] as const;

  const entries: MetadataRoute.Sitemap = [];
  for (const path of paths) {
    for (const locale of LOCALES) {
      entries.push({
        url: absoluteUrl(path, locale),
        lastModified: now,
        changeFrequency: path === '/' ? 'weekly' : 'daily',
        priority: path === '/' ? 1 : 0.7,
        alternates: { languages: hreflangFor(path) },
      });
    }
  }
  return entries;
}
