/**
 * Schema.org Product JSON-LD for /product/[id] pages.
 *
 * Google reads this server-side to render rich snippets (rating stars,
 * price, availability) in shopping search results — which is the single
 * biggest lever for organic discovery on a meta-shop. Includes:
 *
 *   - Product (name, image, description-via-aggregated-rating)
 *   - Offer (price, currency, availability, seller, shipping)
 *   - AggregateRating (rating + reviewCount)
 *
 * Renders nothing if essential fields (name + finalPrice) are missing
 * so we don't ship malformed structured data.
 */
import type { Product } from '@/types/product';
import { storeDisplay } from '@/lib/format';

interface Props {
  product: Product;
  /** Absolute URL of THIS detail page — used as the @id anchor. */
  pageUrl: string;
}

export function ProductJsonLd({ product, pageUrl }: Props) {
  if (!product.name || !product.finalPrice?.amount) return null;

  const merchant = storeDisplay(product);
  const availability = 'https://schema.org/InStock';

  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    url: pageUrl,
    priceCurrency: product.finalPrice.currency,
    price: product.finalPrice.amount,
    availability,
    seller: {
      '@type': 'Organization',
      name: merchant,
    },
    // Pricing valid for 24 hours from generation (search results are
    // re-fetched live).
    priceValidUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
  };

  // Only attach shippingDetails when we have ship info to anchor on.
  if (product.shipDays >= 0) {
    offer['shippingDetails'] = {
      '@type': 'OfferShippingDetails',
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: product.country,
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: {
          '@type': 'QuantitativeValue',
          minValue: 0,
          maxValue: 1,
          unitCode: 'DAY',
        },
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: Math.max(0, product.shipDays - 1),
          maxValue: product.shipDays + 1,
          unitCode: 'DAY',
        },
      },
    };
  }

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': pageUrl,
    name: product.name,
    description: product.name,
    offers: offer,
  };

  if (product.imageUrl && product.imageUrl.startsWith('http')) {
    data['image'] = product.imageUrl;
  }
  if (product.rating > 0 && product.reviewCount > 0) {
    data['aggregateRating'] = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (product.merchantName) {
    data['brand'] = {
      '@type': 'Brand',
      name: product.merchantName,
    };
  }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- server-rendered, all values come from our own data
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
