# Tony Shopping

> AI 메타쇼핑 에이전트. 사진 한 장, SNS 링크 하나, 자연어 한 줄이면 — 토니가 전 세계 10+ 쇼핑몰을 한 번에 비교해 결정해 드립니다.

[![Vercel](https://img.shields.io/badge/Hosted%20on-Vercel-black?logo=vercel)](https://vercel.com)
[![Next.js 14](https://img.shields.io/badge/Next.js-14_App_Router-blueviolet?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org)

---

## 핵심 가치

- **10개 매장 + 메타 검색**: Naver · Coupang · Amazon · eBay · Shopee · Lazada · 楽天 · Yahoo! JP · AliExpress + SerpAPI (한 호출로 Walmart · Target · Best Buy 등)
- **결정 피로 제거**: "토니의 결론" 한 장 카드(VerdictCard)가 항상 1순위 추천을 제시
- **/compare 사이드-바이-사이드**: 항목별 winner 강조 + LLM 내러티브 + 사용자 우선순위(가성비/빠른배송/정품안전) 가중치
- **자동 우선순위**: 클릭 히스토리에서 사용자 성향을 30일 추론해 priority를 미리 선택
- **가격 변동 인박스** `/alerts`: 추적 중인 모든 후보의 ▼/▲ 변화를 한 페이지에서, "지금 살 만한 한 가지" 배너 자동 추천
- **dual-currency 표기**: KR 사용자에게 USD 상품을 "₩330,303 ≈ US$218" 형태로 병기
- **PWA + Web Share Target**: 홈 화면 설치 가능, OS 공유 시트에서 받음, offline 폴백
- **운영자 콘솔** `/setup`: 12개 어댑터의 LIVE/MOCK 상태를 한눈에 + 키 발급 콘솔로 deep-link

---

## 스택

- **Next.js 14 App Router** · **TypeScript** strict + `noUncheckedIndexedAccess`
- **Tailwind CSS 3** + Radix UI primitives (shadcn 스타일)
- **next-intl** · KO / EN / VI 다국어 (`localePrefix: 'as-needed'`)
- **Zustand** (클라 상태) + **TanStack Query v5** (서버 상태)
- **Supabase** (auth + cross-device shortlist / cohort short-links)
- **next/og** (동적 OG 이미지) · vanilla service worker (PWA shell)
- **lucide-react** 라인 아이콘 (이모지 사용 안 함)

---

## 빠른 시작

```bash
pnpm install
pnpm dev
```

- 개발 서버: http://localhost:3000
- 기본 로케일: 한국어 (URL prefix 없음). 영어 `/en`, 베트남어 `/vi`

| 스크립트 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 (Turbopack) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 |
| `pnpm check` | lint + typecheck |
| `pnpm format` | Prettier 포매팅 |

---

## 페이지 카탈로그

| 경로 | 설명 |
|---|---|
| `/` | 홈 · 사진/링크/텍스트로 검색 시작 + 추출 미리보기 카드 |
| `/search?q=...` | 검색 결과 · VerdictCard + TOP3 + 전체 그리드 (점진 노출 12개 단위) + 키보드 nav |
| `/product/[id]` | 상품 상세 · 가격 sparkline (price-watch 시계열) + LLM 리뷰 요약 |
| `/compare` | 비교함 · side-by-side 테이블 + priority 칩 + LLM 내러티브 + 자동 우선순위 |
| `/c/[slug]` | 공개 cohort 단축 URL · 비로그인 누구나 비교 결과 열람 |
| `/alerts` | 가격 변동 인박스 · drop/rise/flat 필터 + "지금 살 만해요" 배너 |
| `/dashboard` | 개인 대시보드 · 주간 인사이트 + KPI + store/tag 분포 도넛 |
| `/setup` | 운영자 콘솔 · 12개 어댑터 LIVE/MOCK + 키 발급 deep-link |
| `/disclosure` | 광고·제휴·점수 산출 투명성 페이지 (FTC/EU DSA/KFTC 준수) |
| `/offline` | 오프라인 폴백 (service worker 캐시 미스 시) |

---

## 어댑터 카탈로그 — 12개

| 매장 | 어댑터 상태 | 필요한 env | 무료 한도 | 발급 콘솔 |
|---|:-:|---|---|---|
| **Naver Shopping** (KR) | ✅ | `NAVER_CLIENT_ID` + `NAVER_CLIENT_SECRET` | 25K/일 | [developers.naver.com](https://developers.naver.com/main/) |
| **eBay Browse** (Global) | ✅ | `EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET` | 5K/일 | [developer.ebay.com](https://developer.ebay.com/my/keys) |
| **SerpAPI** Google Shopping (메타) | ✅ | `SERPAPI_KEY` | 100/월 · $50/mo 5K | [serpapi.com](https://serpapi.com/manage-api-key) |
| **Rakuten Ichiba** (JP) | ✅ | `RAKUTEN_APP_ID` (+ optional `RAKUTEN_AFFILIATE_ID`) | 1 req/sec | [webservice.rakuten.co.jp](https://webservice.rakuten.co.jp/) |
| **Yahoo! Shopping JP** | ✅ | `YAHOO_JP_APP_ID` | Free | [developer.yahoo.co.jp](https://developer.yahoo.co.jp/webapi/shopping/) |
| **Amazon PA-API 5.0** | ⚠️ gated | `AMAZON_ACCESS_KEY` + `AMAZON_SECRET_KEY` + `AMAZON_PARTNER_TAG` | Affiliate 매출 조건 | [affiliate-program.amazon.com](https://affiliate-program.amazon.com) |
| **Coupang Partners** | ⚠️ gated | `COUPANG_ACCESS_KEY` + `COUPANG_SECRET_KEY` | Partner 승인 | [partners.coupang.com](https://partners.coupang.com/) |
| **Shopee Open Platform** | ⚠️ gated | `SHOPEE_APP_KEY` + `SHOPEE_APP_SECRET` | Partner 승인 | [open.shopee.com](https://open.shopee.com/) |
| **Lazada Open Platform** | ⚠️ gated | `LAZADA_APP_KEY` + `LAZADA_APP_SECRET` | Partner 승인 | [open.lazada.com](https://open.lazada.com/) |
| **AliExpress Affiliate** | ⚠️ gated | `ALIEXPRESS_APP_KEY` + `ALIEXPRESS_APP_SECRET` + `ALIEXPRESS_TRACKING_ID` | Affiliate 승인 | [openservice.aliexpress.com](https://openservice.aliexpress.com/) |
| **Google Cloud Vision** (이미지 분석) | ✅ | `GOOGLE_VISION_API_KEY` | 1K/월 | [console.cloud.google.com](https://console.cloud.google.com/apis/library/vision.googleapis.com) |
| **LLM** (Anthropic 또는 OpenAI) | ✅ | `ANTHROPIC_API_KEY` *또는* `OPENAI_API_KEY` | Pay-as-you-go (~$0.001/검색) | [console.anthropic.com](https://console.anthropic.com/settings/keys) |

✅ = 무료 또는 즉시 발급 가능 · ⚠️ gated = 가입 승인/매출 조건 필요

**키가 없으면 모든 어댑터는 결정론적 mock으로 자동 폴백**합니다. 데모/프리뷰는 항상 동작.

### "한 번에 해결" 답 = SerpAPI

`SERPAPI_KEY` 하나만 등록하면 Amazon · Walmart · eBay · Target · Best Buy · Naver · Coupang · Google Shopping을 메타로 동시에 받습니다 (무료 100/월).

### 공식 API 없음 (스크래핑 제외)

다음 매장은 아무리 원해도 공식 검색 API를 제공하지 않습니다 — 일부는 SerpAPI의 Google Shopping 색인이 우회 커버:

- 카카오쇼핑 · 11번가 · Gmarket · 인터파크
- TikTok Shop (검색 API 부실)
- Taobao · Tmall · JD.com (외국인 개발자 가입 사실상 불가)

---

## Vercel 환경변수 등록 (배포)

> **전체 GO-LIVE 체크리스트는 [`GO-LIVE.md`](./GO-LIVE.md) 에 정리되어 있습니다.**
> Supabase 마이그레이션 4개, 어댑터 키 발급 우선순위, 배포 후 검증 절차, 모니터링 첫 주 점검 항목까지 한 문서에 다 있습니다.

### 방법 A: Dashboard (1분)
1. https://vercel.com/dashboard → `tony-shopping` → **Settings → Environment Variables**
2. 위 어댑터 표의 env 이름을 그대로 복사 + 발급받은 값 붙여넣기
3. Production · Preview · Development 모두 체크 → Save
4. **Deployments 탭 → 최신 ⋯ → Redeploy**

### 방법 B: CLI
```bash
vercel env add NAVER_CLIENT_ID production
vercel env add NAVER_CLIENT_SECRET production
vercel env add EBAY_CLIENT_ID production
vercel env add EBAY_CLIENT_SECRET production
vercel env add SERPAPI_KEY production
vercel env add ANTHROPIC_API_KEY production
vercel --prod  # 즉시 재배포
```

### 등록 후 즉시 확인
- `https://your-domain/setup` → 카드의 pill이 `MOCK` → `LIVE`로 자동 갱신
- `https://your-domain/search?q=airpods` 우상단 배지가 emerald **"Live · Naver + eBay + SerpAPI"**로 전환

---

## 디렉토리

```
src/
  app/
    [locale]/           # i18n 라우팅 (KO / EN / VI)
      page.tsx          # 홈
      search/           # 검색 결과
      product/[id]/     # 상품 상세
      compare/          # 비교함
      c/[slug]/         # 공개 cohort 단축 URL
      alerts/           # 가격 변동 인박스
      dashboard/        # 개인 대시보드
      setup/            # 운영자 콘솔
      disclosure/       # 투명성 페이지
      auth/             # Supabase 로그인
    api/                # 13개 API 라우트
      search · extract · status · cohort · compare-narrative
      og/compare · review-summary · dashboard/stats · health
      shortlist · track · auth · cohort/[slug]
    manifest.ts         # PWA manifest + share_target
    offline/            # SW 폴백 페이지
  components/
    home/               # AskBox, ExtractPreview, PromptChips, Hero
    search/             # VerdictCard, ProductCard, FilterBar, Clusters, …
    compare/            # CompareView + cohort verdict + LLM narrative
    alerts/             # AlertsView + BuyNowBanner
    dashboard/          # KPI + donuts + InsightsRow
    checkout/           # CheckoutGuideModal
    product/            # PriceSparkline + ProductDetailView
    site/               # Header / Footer / KeyboardHelp / SwRegister
    ui/                 # shadcn primitives + DualMoney
  lib/
    adapters/           # 10 매장 + SerpAPI + base / mock-factory / registry
    compare/            # verdict + auto-priority + llm-narrative
    alerts/             # build-alerts + pick-buy-now
    checkout/           # checks
    insights/           # weekly
    supabase/           # client / server / sync-shortlist
    adapter-status.ts   # /api/status + /setup 데이터 소스
    env.ts              # ADAPTER_MODE
    format.ts           # formatMoneyDual + intl helpers
    haptic.ts           # navigator.vibrate 래퍼
  hooks/                # use-search, use-compare-narrative, use-auto-priority,
                        # use-grid-keyboard-nav, use-progressive-list, use-checkout-guide
  stores/               # Zustand: shortlist, history, click, price-watch,
                        # auth, search, ui, user-profile, toast, checkout-*
  types/                # product, search, shortlist
  i18n/                 # next-intl routing + request

supabase/
  migrations/
    0001_init.sql              # users / shortlist / clicks / history
    0002_cohort_shares.sql     # 공개 cohort 단축 URL 테이블

messages/
  ko.json · en.json · vi.json   # ~700 키 / locale
```

---

## 절대 원칙 (CLAUDE.md 준수)

1. **금액 계산은 `number` 금지** — `Decimal` 또는 `string`
2. **체인별 통화 decimals 주의** — 어댑터별 currency 상수 사용
3. **견적의 최종 출처는 서버** — 클라 계산은 UX 즉시성용
4. **JWT는 HttpOnly 쿠키** — `localStorage` 금지
5. **`any` 금지** — 모르면 `unknown` + type guard
6. **`/c/[slug]` 등 공개 페이지는 PII 노출 금지**

---

## 로드맵 (Round-H 시리즈)

11개 라운드로 평탄한 검색 결과 페이지에서 풀-스택 메타 쇼핑 에이전트까지:

| 라운드 | 기능 |
|---|---|
| H5 | Shortlist 스냅 영속화 + side-by-side compare |
| H6 | priority 가중치 + LLM 내러티브 |
| H7 | 클릭 히스토리 → auto-priority 추천 |
| H8 | `/compare` 동적 OG 이미지 (next/og) |
| H9 | `/alerts` 가격 변동 인박스 |
| H10 | 결제 직전 가이드 모달 |
| H11 | 공개 cohort 단축 URL `/c/{slug}` |
| H12 | 키보드 nav + 단축키 |
| H13 | 주간 패턴 인사이트 카드 |
| H14 | "지금 살 만한 한 가지" 배너 |
| H15 | PWA shell + offline 폴백 |
| H16 | dual-currency 가격 표기 |
| H17 | 검색 결과 progressive disclosure |
| H18 | `/disclosure` 투명성 페이지 |
| H19 | 가격 sparkline + price-watch 시계열 |
| H20 | Web Share Target + 햅틱 |
| H21 | sticky FilterBar |
| H22 | real-vs-mock 상태 배지 |
| H23 | +3 어댑터 (Rakuten, Yahoo JP, AliExpress) |
| H24 | `/setup` 운영자 콘솔 |
| H25 | ExtractPreview 카드 |
| H26 | SerpAPI v2 (locale-aware gl/hl) |

---

## 라이선스 / 운영

- Affiliate disclosure: 모든 "구매" 버튼은 제휴 마케팅 링크. 추천 알고리즘에는 영향 없음. [/disclosure](/disclosure)
- 데이터: 기본 LocalStorage. 로그인 시 Supabase로 동기화. 광고 네트워크에 노출하지 않음.
- 문의: support@tonyshopping.io
