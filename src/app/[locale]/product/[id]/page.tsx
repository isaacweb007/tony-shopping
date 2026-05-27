import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { runServerSearch } from '@/lib/search/run';
import { ProductDetailView } from '@/components/product/product-detail-view';
import { ProductJsonLd } from '@/components/site/product-json-ld';
import { SearchSkeleton } from '@/components/search/search-skeleton';
import { SITE_NAME, absoluteUrl } from '@/lib/site';
import type { AppLocale } from '@/i18n/routing';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const { q } = await searchParams;
  const tShare = await getTranslations({ locale, namespace: 'share' });
  if (!q) {
    return { title: tShare('titleProduct') };
  }
  // We re-run the search server-side and look for the product.
  const result = await runServerSearch({ q, attachments: [] });
  const product = result.products.find((p) => p.id === id);
  if (!product) {
    return { title: tShare('titleProduct') };
  }
  const canonical = absoluteUrl(`/product/${id}?q=${encodeURIComponent(q)}`, locale as AppLocale);
  return {
    title: `${product.name} · ${product.store}`,
    description: `${product.name} — ${SITE_NAME}`,
    alternates: { canonical },
    openGraph: {
      title: `${product.name} · ${product.store}`,
      description: tShare('titleProduct'),
      url: canonical,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
  };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { locale, id } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale);

  if (!q) notFound();

  const result = await runServerSearch({ q, attachments: [] });
  const product = result.products.find((p) => p.id === id);
  if (!product) notFound();

  const canonical = absoluteUrl(
    `/product/${id}?q=${encodeURIComponent(q)}`,
    locale as AppLocale,
  );

  return (
    <Suspense fallback={<SearchSkeleton />}>
      {/* Server-rendered structured data for Google rich snippets. */}
      <ProductJsonLd product={product} pageUrl={canonical} />
      <ProductDetailView product={product} q={q} />
    </Suspense>
  );
}
