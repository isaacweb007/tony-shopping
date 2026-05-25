import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const SIZE = { width: 1200, height: 630 } as const;

type Locale = 'ko' | 'en' | 'vi';
const isLocale = (v: string | null): v is Locale =>
  v === 'ko' || v === 'en' || v === 'vi';

interface CopyBundle {
  eyebrow: string;
  sharedEyebrow: string;
  pickedFromCohort: (n: number) => string;
  cohortScore: (s: number) => string;
  brandTagline: string;
  generic: string;
  sharedAgo: (rel: string) => string;
}

const COPY: Record<Locale, CopyBundle> = {
  ko: {
    eyebrow: '토니 비교 분석',
    sharedEyebrow: '공유된 비교',
    pickedFromCohort: (n) => `${n}개 후보 중에서 토니가 추천`,
    cohortScore: (s) => `비교 점수 ${s}/100`,
    brandTagline: 'AI 메타쇼핑 에이전트',
    generic: '비교함을 한눈에 — 토니가 결론을 내드려요.',
    sharedAgo: (rel) => `${rel} 공유`,
  },
  en: {
    eyebrow: "Tony's compare",
    sharedEyebrow: 'Shared compare',
    pickedFromCohort: (n) => `Tony's pick from ${n} candidates`,
    cohortScore: (s) => `Cohort score ${s}/100`,
    brandTagline: 'AI Meta Shopping Agent',
    generic: "Side-by-side, decisive — Tony picks one from your shortlist.",
    sharedAgo: (rel) => `Shared ${rel}`,
  },
  vi: {
    eyebrow: 'Tony so sánh',
    sharedEyebrow: 'So sánh đã chia sẻ',
    pickedFromCohort: (n) => `Tony chọn từ ${n} ứng viên`,
    cohortScore: (s) => `Điểm so sánh ${s}/100`,
    brandTagline: 'Trợ lý mua sắm meta AI',
    generic: 'So sánh trực diện — Tony chốt một lựa chọn từ shortlist.',
    sharedAgo: (rel) => `Chia sẻ ${rel}`,
  },
};

/** Coarse "X ago" rendering (used in the shared-cohort variant). */
function relTime(ageSeconds: number, locale: Locale): string {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0) return '';
  const min = Math.floor(ageSeconds / 60);
  if (min < 60) {
    if (locale === 'ko') return `${min}분 전`;
    if (locale === 'vi') return `${min} phút trước`;
    return `${min} min ago`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    if (locale === 'ko') return `${hr}시간 전`;
    if (locale === 'vi') return `${hr} giờ trước`;
    return `${hr} hr ago`;
  }
  const day = Math.floor(hr / 24);
  if (locale === 'ko') return `${day}일 전`;
  if (locale === 'vi') return `${day} ngày trước`;
  return `${day} d ago`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const localeParam = url.searchParams.get('locale');
  const locale: Locale = isLocale(localeParam) ? localeParam : 'ko';
  const copy = COPY[locale];

  const winnerName = (url.searchParams.get('w') ?? '').trim();
  const store = (url.searchParams.get('store') ?? '').trim();
  const scoreRaw = Number(url.searchParams.get('score'));
  const nRaw = Number(url.searchParams.get('n'));
  const score = Number.isFinite(scoreRaw) && scoreRaw >= 0 && scoreRaw <= 100 ? Math.round(scoreRaw) : null;
  const n = Number.isFinite(nRaw) && nRaw >= 2 && nRaw <= 12 ? Math.round(nRaw) : null;

  const hasCohort = winnerName.length > 0 && store.length > 0 && n != null;
  const safeWinner = truncate(winnerName, 80);
  const safeStore = truncate(store, 24);

  // Shared-cohort variant — emerald accent + "공유된 비교" pill + optional
  // "X ago" timestamp. Used by /c/{slug} OG to mark "this is something
  // someone shared, not your own compare".
  const isShared = url.searchParams.get('variant') === 'shared';
  const ageSec = Number(url.searchParams.get('age'));
  const ageRel = Number.isFinite(ageSec) && ageSec >= 0 ? relTime(ageSec, locale) : '';
  const eyebrowText = isShared ? copy.sharedEyebrow : copy.eyebrow;
  const accentColorMain = isShared ? '#10b981' : '#7c3aed'; // emerald 500 vs accent
  const accentColorDeep = isShared ? '#047857' : '#4c1d95'; // emerald 700 vs accent deep
  const accentColorSoft = isShared ? '#a7f3d0' : '#c4b5fd'; // emerald 200 vs accent 300

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
        {/* Decorative blobs */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            left: -180,
            width: 560,
            height: 560,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(124,58,237,0.55) 0%, rgba(124,58,237,0) 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -220,
            right: -180,
            width: 620,
            height: 620,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(6,182,212,0.30) 0%, rgba(6,182,212,0) 70%)',
            display: 'flex',
          }}
        />

        {/* Brand row */}
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
              {copy.brandTagline}
            </span>
          </div>
        </div>

        {/* Eyebrow pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 56,
            padding: '8px 16px',
            borderRadius: 999,
            background: '#fafafa',
            color: '#0a0a0a',
            alignSelf: 'flex-start',
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {eyebrowText}
        </div>

        {hasCohort ? (
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                fontSize: 22,
                color: accentColorSoft,
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              {copy.pickedFromCohort(n!)}
            </div>
            <div
              style={{
                fontSize: 60,
                fontWeight: 900,
                letterSpacing: '-0.035em',
                lineHeight: 1.05,
                maxWidth: 1040,
              }}
            >
              {safeWinner}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginTop: 4,
                color: '#e4e4e7',
                fontSize: 22,
              }}
            >
              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  background: '#18181b',
                  border: '1px solid #27272a',
                  fontWeight: 700,
                }}
              >
                {safeStore}
              </span>
              {score != null && (
                <span
                  style={{
                    padding: '6px 14px',
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${accentColorMain}, ${accentColorDeep})`,
                    fontWeight: 800,
                  }}
                >
                  {copy.cohortScore(score)}
                </span>
              )}
              {isShared && ageRel && (
                <span
                  style={{
                    padding: '6px 14px',
                    borderRadius: 10,
                    background: '#18181b',
                    border: '1px solid #27272a',
                    color: '#a1a1aa',
                    fontWeight: 600,
                  }}
                >
                  {copy.sharedAgo(ageRel)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: 'auto',
              fontSize: 48,
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              maxWidth: 980,
            }}
          >
            {copy.generic}
          </div>
        )}

        {/* Bottom store row */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 'auto',
            paddingTop: 32,
            flexWrap: 'wrap',
          }}
        >
          {['Coupang', 'Amazon', 'eBay', 'Shopee', 'Lazada', 'Naver'].map((s) => (
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
    { ...SIZE },
  );
}
