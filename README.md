# Tony Shopping

> AI 메타쇼핑 에이전트. 사진 한 장이면 전 세계 쇼핑몰을 토니가 비교해드립니다.

## 스택

- **Next.js 14** App Router · **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Tailwind CSS 3** + `tailwindcss-animate` (디자인 토큰은 CSS 변수)
- **next-intl** · KO / EN / VI 다국어 라우팅 (`localePrefix: 'as-needed'`)
- **next-themes** · 다크 / 라이트 / 시스템 테마
- **Radix UI** + custom UI primitives (shadcn 스타일)
- **lucide-react** 라인 아이콘 (이모지 미사용)

## 빠른 시작

```bash
pnpm install
pnpm dev
```

- 개발 서버: http://localhost:3000
- 기본 로케일: 한국어 (URL prefix 없음). 영어: `/en`, 베트남어: `/vi`

## 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TS 타입 검사 |
| `pnpm check` | lint + typecheck |
| `pnpm format` | Prettier 포매팅 |

## 디렉토리

```
src/
  app/
    [locale]/
      layout.tsx        # html/body, ThemeProvider, NextIntlClientProvider
      page.tsx          # 홈
    globals.css         # Tailwind + CSS 변수
    icon.svg
  components/
    brand/logo.tsx
    home/               # Hero, AskBox, FeatureCards, HowItWorks
    providers/theme-provider.tsx
    site/header.tsx, footer.tsx
    ui/                 # Button, DropdownMenu, ThemeToggle, LanguageSwitch
  i18n/
    routing.ts          # next-intl 라우팅 정의 + Link/router helpers
    request.ts          # 서버 요청별 로케일 → messages 로드
  lib/utils.ts          # cn() helper
  middleware.ts         # next-intl middleware

messages/
  ko.json · en.json · vi.json

legacy/
  index.html            # Phase 0 단일 파일 프로토타입 (참고용)
```

## 환경 변수

`.env.local.example`을 복사해서 `.env.local`로 사용합니다.

```bash
cp .env.local.example .env.local
```

Phase 1에서는 `NEXT_PUBLIC_SITE_URL`만 사용됩니다. Phase 4 이후 외부 API 키, Phase 5 이후 Supabase 키가 추가됩니다.

## 로드맵

- ✅ **Phase 1** — 스캐폴딩, 홈 페이지, 다크모드, i18n
- ✅ **Phase 2** — 검색 결과 페이지, 상품/Tony Score 모델, Zustand 상태관리
- ✅ **Phase 3** — AI 채팅 패널(intent matching), 히스토리/비교함 드로어, LocalStorage 영속
- ✅ **Phase 4** — API Routes (`/api/search`, `/api/extract`), 5개 어댑터(Coupang/Naver/Amazon/Shopee/Lazada), React Query, AbortSignal
- ✅ **Phase 6** — SEO 메타데이터, sitemap, robots, 동적 OG 이미지, JSON-LD, 404/loading/error 페이지, Vercel Analytics + Speed Insights, 보안 헤더, Vercel 배포 설정
- ⏳ **Phase 5** (보류) — Supabase 인증 + 유저별 데이터 + 결제(제휴 링크 추적)

## 배포

### Vercel (권장)

```bash
# 1) Vercel CLI 설치 + 로그인
npm i -g vercel
vercel login

# 2) 프로젝트 디렉토리에서 한 번만 link
cd "/Users/isaac/Downloads/토니쇼핑"
vercel link

# 3) 환경변수 등록 (production / preview / development)
vercel env add NEXT_PUBLIC_SITE_URL production    # 예: https://tonyshopping.io

# 4) 프로덕션 배포
vercel --prod
```

배포 후 자동 활성화되는 것:
- **6 SSG 페이지** (`/ko`, `/en`, `/vi` × home/search)
- **3 dynamic API routes** (`/api/search`, `/api/extract`, `/api/health`)
- **동적 OG 이미지** (`/[locale]/opengraph-image`, `/[locale]/twitter-image`)
- **sitemap.xml** + **robots.txt** + **JSON-LD** (Organization + WebSite + SearchAction)
- **Vercel Analytics** + **Speed Insights** (자동 수집)
- **보안 헤더** (HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options)

### 도메인 연결

```bash
vercel domains add tonyshopping.io
vercel alias set <deployment-url> tonyshopping.io
```

DNS는 Vercel A/AAAA 레코드 또는 Nameserver 위임 방식 중 선택.

### 헬스체크

```bash
curl https://<your-domain>/api/health
# → { "status":"ok", "uptime":..., "timestamp":"...", "commit":"..." }
```

UptimeRobot / Pingdom 같은 모니터에 이 URL을 5분 간격으로 등록하면 됩니다.

### 빌드 통계

| 라우트 | 타입 | 첫 로드 JS |
|---|---|---|
| `/[locale]` | SSG (3 locales) | ~130 kB |
| `/[locale]/search` | SSG | ~155 kB |
| `/api/search` | Dynamic | 0 B |
| `/api/extract` | Dynamic | 0 B |
| `/api/health` | Dynamic (edge) | 0 B |
| Middleware | — | ~49 kB |

## 코딩 컨벤션

- 컴포넌트 named export 기본 (페이지/레이아웃만 default)
- 모든 문자열은 `messages/{locale}.json` 통과 — 하드코딩 금지
- 컬러는 Tailwind 토큰 사용 — 매직 헥스 금지 (디자인 토큰은 CSS 변수)
- `any` 금지, 모르면 `unknown` + type guard
