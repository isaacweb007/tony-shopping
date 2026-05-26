'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { searchProducts } from '@/lib/api/search-client';
import { ProductCard } from '@/components/search/product-card';
import { ProductDetailDialog } from '@/components/search/product-detail-dialog';
import type { Product } from '@/types/product';
import type { AppLocale } from '@/i18n/routing';

interface Props {
  /** Source product — name seeds the query, id is excluded from results. */
  product: Product;
}

/**
 * "Tony가 추천하는 비슷한 상품" — server hits /api/search using the current
 * product's name as the query, filters out the current id, sorts by Tony
 * score, takes top 4. Failures degrade to nothing (no section rendered).
 */
export function RelatedProducts({ product }: Props) {
  const t = useTranslations('product.related');
  const locale = useLocale() as AppLocale;
  const [detail, setDetail] = React.useState<Product | null>(null);

  // Reduce the query to the first 4 words — long product titles often have
  // marketing noise that hurts search precision.
  const seed = product.name.split(/\s+/).slice(0, 4).join(' ').trim();

  const { data, isFetching } = useQuery({
    queryKey: ['related', product.id, seed, locale],
    enabled: seed.length > 0,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => searchProducts(seed, signal, locale),
  });

  const related = React.useMemo<Product[]>(() => {
    if (!data?.products) return [];
    return data.products
      .filter((p) => p.id !== product.id)
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, 4);
  }, [data, product.id]);

  if (!isFetching && related.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-accent-600 dark:text-accent-400" strokeWidth={2.2} />
        <h2 className="text-[18px] font-extrabold tracking-tighter2 md:text-[22px]">
          {t('title')}
        </h2>
      </div>
      <p className="mt-0.5 text-[13px] text-ink-500 dark:text-ink-400">{t('subtitle')}</p>

      {isFetching && related.length === 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800"
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} onOpenDetail={setDetail} />
          ))}
        </div>
      )}

      <ProductDetailDialog
        product={detail}
        onOpenChange={(open) => !open && setDetail(null)}
      />
    </section>
  );
}
