import '../globals.css';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { HistoryDrawer } from '@/components/site/history-drawer';
import { ShortlistDrawer } from '@/components/site/shortlist-drawer';
import { ChatPanel } from '@/components/chat/chat-panel';
import { CheckoutGuideModal } from '@/components/checkout/checkout-guide-modal';
import { KeyboardHelp } from '@/components/site/keyboard-help';
import { JsonLd } from '@/components/site/json-ld';
import { ToastViewport } from '@/components/ui/toast-viewport';
import { FxPreloader } from '@/components/providers/fx-preloader';
import { AuthBridge } from '@/components/providers/auth-bridge';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { routing } from '@/i18n/routing';
import { SITE_HANDLE, SITE_NAME, SITE_URL, absoluteUrl, hreflangFor } from '@/lib/site';
import type { AppLocale } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const canonical = absoluteUrl('/', locale as AppLocale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t('title'), template: '%s · Tony Shopping' },
    description: t('description'),
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    keywords: [
      'AI shopping',
      'meta shopping',
      'price compare',
      'Amazon',
      'Coupang',
      'Shopee',
      'Lazada',
      'Naver',
      'Tony Score',
    ],
    alternates: {
      canonical,
      languages: hreflangFor('/'),
    },
    openGraph: {
      type: 'website',
      title: t('title'),
      description: t('description'),
      url: canonical,
      siteName: SITE_NAME,
      locale,
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      site: SITE_HANDLE,
      creator: SITE_HANDLE,
      images: ['/twitter-image'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    icons: { icon: '/icon.svg' },
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <JsonLd />
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <QueryProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <HistoryDrawer />
              <ShortlistDrawer />
              <ChatPanel />
              <CheckoutGuideModal />
              <KeyboardHelp />
              <ToastViewport />
              <FxPreloader />
              <AuthBridge />
              <Analytics />
              <SpeedInsights />
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
