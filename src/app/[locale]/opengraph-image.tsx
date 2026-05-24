import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';

export const runtime = 'edge';
export const alt = 'Tony Shopping — AI Meta Shopping Agent';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage({
  params,
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale: params.locale, namespace: 'meta' });
  const th = await getTranslations({ locale: params.locale, namespace: 'header' });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          backgroundColor: '#0a0a0a',
          color: 'white',
          padding: '64px 72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Decorative glow blobs (satori-friendly) */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            left: -160,
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.55) 0%, rgba(124,58,237,0) 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            right: -160,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.35) 0%, rgba(6,182,212,0) 70%)',
            display: 'flex',
          }}
        />
        {/* Top brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed, #4c1d95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 30,
            }}
          >
            T
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontWeight: 900, fontSize: 36, letterSpacing: '-0.03em' }}>
              Tony<span style={{ color: '#a78bfa' }}>Shopping</span>
            </span>
            <span
              style={{
                color: '#c4b5fd',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {th('tagline')}
            </span>
          </div>
        </div>

        {/* Big headline */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
              maxWidth: 980,
            }}
          >
            {t('title')}
          </div>
          <div
            style={{
              fontSize: 24,
              color: '#a1a1aa',
              maxWidth: 960,
              lineHeight: 1.35,
            }}
          >
            {t('description')}
          </div>
        </div>

        {/* Store row */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 28,
            flexWrap: 'wrap',
          }}
        >
          {['Coupang', 'Amazon', 'Shopee', 'Lazada', 'Naver'].map((s) => (
            <span
              key={s}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid #27272a',
                background: '#18181b',
                color: '#e4e4e7',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
