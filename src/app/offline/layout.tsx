import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '오프라인 · Tony Shopping',
  description: 'You are offline. Cached pages still open; Tony will refresh when you reconnect.',
  robots: { index: false, follow: false },
};

/**
 * Locale-less offline shell layout. We own the <html>/<body> here (instead of
 * the page) so the service worker can cache a self-contained navigation
 * response that doesn't depend on any context providers.
 */
export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
          background: '#0a0a0a',
          color: '#ffffff',
        }}
      >
        {children}
      </body>
    </html>
  );
}
