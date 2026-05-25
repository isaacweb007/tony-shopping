import Link from 'next/link';

/**
 * Locale-less offline shell served by the service worker as the navigation
 * fallback when the network is down AND the user hits a route they haven't
 * cached yet. Inline styles + zero client JS so it boots in any state.
 */
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: '#a78bfa',
            marginBottom: 14,
          }}
        >
          Tony Shopping
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
          오프라인 · You&rsquo;re offline
        </h1>
        <p style={{ marginTop: 14, color: '#a1a1aa', fontSize: 14, lineHeight: 1.55 }}>
          네트워크 연결이 끊겼어요. 캐시에 남아있는 페이지는 그대로 열어볼 수 있고,
          다시 연결되면 자동으로 최신 결과를 받아올게요.
          <br />
          You&rsquo;re offline. Cached pages still open; Tony will refresh data the moment you reconnect.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginTop: 22,
            padding: '10px 18px',
            borderRadius: 12,
            background: '#7c3aed',
            color: 'white',
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: 13,
          }}
        >
          홈으로 / Home
        </Link>
      </div>
    </main>
  );
}
