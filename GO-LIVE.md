# Tony Shopping — GO-LIVE Checklist

> **목적**: 코드는 완성됐다. 이 문서 1장만 따라 하면 mock 데모 → 실서비스 운영 상태로 끝낸다.
>
> **마지막 갱신**: 2026-05-26 (round H115 기준)
>
> **체크리스트 분량**: 정직하게 약 60–90분. 키 발급 대기(eBay/Amazon 승인)는 별도.

각 단계는 **반드시** / **선택** / **나중에** 로 표시. 처음부터 모든 매장 키를 다 받을 필요 없음 — Naver + SerpAPI + Anthropic 셋만 있으면 한국 사용자 대상 정식 서비스가 가능.

---

## 0. 사전 점검 (5분)

- [ ] `pnpm install` 한 번 더 실행해 lock 파일 동기화
- [ ] `pnpm check` 로컬 통과 (lint + typecheck + 51 tests)
- [ ] `git status` clean (push 전 commit 잔여물 없음)
- [ ] 도메인 결정 (예: `tony-shopping.vercel.app` 또는 자체 도메인)

---

## 1. Supabase 설정 (15분, **반드시**)

cohort 공유·반응·복사 카운트 + cross-device sync 가 필요한 모든 기능을 이걸로 처리.

### 1.1 프로젝트 생성
1. https://supabase.com/dashboard → **New project**
2. Region: **Northeast Asia (Seoul)** 권장
3. DB password 안전한 곳에 백업
4. 프로젝트 생성 후 **Settings → API** 에서 다음 3개 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` *(절대 클라이언트 노출 금지)*

### 1.2 마이그레이션 실행
**SQL Editor → New query** 에 아래 파일을 순서대로 복붙 + Run. 전부 idempotent — 두 번 돌려도 안전.

```
supabase/migrations/0001_init.sql          → auth + shortlist + click events
supabase/migrations/0002_cohort_shares.sql → /c/{slug} 공유 테이블
supabase/migrations/0003_cohort_reactions.sql → /c/{slug} 👍/👎
supabase/migrations/0004_cohort_clones.sql → /c/{slug} 복사 카운터
```

### 1.3 Auth Provider 설정 (선택)
**Authentication → Providers** 에서 사용할 로그인 방식 활성화. 기본 email magic-link 만 켜도 충분.

### 1.4 검증
- [ ] **Database → Tables** 에 `shortlist_items`, `cohort_shares`, `cohort_reactions` 보임
- [ ] `cohort_shares` 컬럼에 `clones` 보임 (0004 적용 확인)
- [ ] **Database → Functions** 에 `increment_cohort_clones` 보임

---

## 2. 어댑터 키 발급 (20–60분, **선택**)

**우선순위 순으로 권장**. 0개 받아도 mock 데모 가능, 1개만 받아도 실서비스 가능.

### 2.1 LLM (가장 큰 영향) — **반드시**
| 키 | 어디서 | 무료 한도 | 비고 |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys | 신용카드 등록 후 $5 크레딧 | Compare narrative + review summary. Tony 추천 톤이 살아남 |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys | $5 free trial | Anthropic 폴백. 둘 다 비면 deterministic fallback. |

> 코드는 Anthropic 우선, 없으면 OpenAI, 둘 다 없으면 deterministic. 모두 graceful.

### 2.2 검색 어댑터 (있을수록 좋음)

| 우선순위 | 키 | 어디서 | 무료 한도 | 시간 |
|---|---|---|---|---|
| 🥇 | `NAVER_CLIENT_ID` + `_SECRET` | https://developers.naver.com | 25K/일 | 5분 |
| 🥇 | `SERPAPI_KEY` | https://serpapi.com | 100/월 | 3분 |
| 🥈 | `EBAY_CLIENT_ID` + `_SECRET` | https://developer.ebay.com | 5K/일 | 10분 |
| 🥈 | `RAKUTEN_APP_ID` | https://webservice.rakuten.co.jp | 1 req/s 무제한 | 5분 |
| 🥈 | `YAHOO_JP_APP_ID` | https://developer.yahoo.co.jp | 무료 | 5분 |
| 🥉 | `AMAZON_*` | Amazon Associates → PA-API 5.0 | 가입 후 90일 + 3건 판매 필요 | 며칠–몇 주 |
| 🥉 | `COUPANG_ACCESS_KEY` + `_SECRET` | https://partners.coupang.com | 파트너스 가입 후 발급 | 1–7일 |
| 🥉 | `SHOPEE_APP_KEY` + `_SECRET` | https://open.shopee.com | 사업자 등록 필요 | 며칠 |
| 🥉 | `LAZADA_APP_KEY` + `_SECRET` | https://open.lazada.com | 사업자 등록 필요 | 며칠 |
| 🥉 | `ALIEXPRESS_APP_KEY` + `_SECRET` | https://openservice.aliexpress.com | 가입 후 즉시 | 1일 |
| 🥉 | `GOOGLE_VISION_API_KEY` | https://cloud.google.com/vision | 1K/월 | 10분 |

> 🥇 = 첫날 등록 권장. 🥈 = 1주차 등록. 🥉 = 운영 자리잡힌 후.

### 2.3 어필리에이트 태그 (선택, 수익화용)
`NEXT_PUBLIC_AMAZON_PARTNER_TAG`, `NEXT_PUBLIC_COUPANG_SUBID` 등은 발급된 affiliate ID. 없어도 검색은 작동, "구매" 클릭 시 수수료만 안 잡힘. **수익 모델이라 운영자라면 반드시 등록 권장.**

---

## 3. Vercel 환경변수 등록 (10분, **반드시**)

### 3.1 한 번에 등록
1. https://vercel.com/dashboard → 프로젝트 → **Settings → Environment Variables**
2. 위 단계에서 받은 키를 하나씩 추가
3. 각 키마다 **Production · Preview · Development** 모두 체크
4. `NEXT_PUBLIC_SITE_URL` 은 도메인 확정 후 한 번만 등록 (예: `https://tony-shopping.vercel.app`)

### 3.2 키 등록 후 재배포
**Deployments → 최신 ⋯ → Redeploy**. 환경변수는 빌드/런타임 양쪽에서 다시 읽혀야 반영됨.

### 3.3 CLI 대안 (스크립트화하려면)
```bash
vercel env add NAVER_CLIENT_ID production
vercel env add NAVER_CLIENT_SECRET production
vercel env add SERPAPI_KEY production
vercel env add ANTHROPIC_API_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel --prod
```

---

## 4. 검증 (10분, **반드시**)

배포 직후 다음 페이지를 차례로 열어 상태 확인. 각 페이지는 운영자용 진단 데이터를 즉시 노출하도록 설계됨.

### 4.1 `/setup` — 어댑터 상태판
- [ ] 각 어댑터 카드의 pill 이 `MOCK` → `LIVE` 로 바뀜
- [ ] **"Run test search"** 버튼 클릭 → 모든 LIVE 어댑터의 latency / result count 표시
- [ ] 카드 하단에 `Sony WH-1000XM5 · ₩410,000` 형식 sample 보임 (H102)
- [ ] sparkline (H59) 이 한두 점 표시
- [ ] 실패 어댑터는 빨간 mono 블록에 error message 표시 (H77)

### 4.2 `/search?q=airpods` (또는 다른 일반 키워드)
- [ ] 우상단 ResultsBadge 가 emerald `Live · Naver + SerpAPI + ...` 표시
- [ ] 그리드에 실제 매장명 + 진짜 가격 표시 (mock label 없음)
- [ ] `MockStoresNote` (H46) 가 mock 모드 매장만 나열

### 4.3 `/compare` (상품 2개 이상 담고)
- [ ] LLM narrative 가 한국어로 표시 (H71 — locale mismatch 시 deterministic 폴백)
- [ ] "Copy" / "Listen" / "다시 쓰기" 3 버튼 모두 작동

### 4.4 `/c/{slug}` (공유 후 받은 링크)
- [ ] 새 incognito 창에서 열려도 보임
- [ ] OG 이미지 (linkedin/twitter 미리보기) 제대로 렌더링
- [ ] "내 비교함에 복사" 누르면 카운터 증가 (H76)

### 4.5 `/api/health` (있다면) 또는 `/api/status`
- [ ] HTTP 200
- [ ] JSON `overall.anyRealSearch: true` (실 키 있는 경우)

### 4.6 PWA
- [ ] Chrome desktop → 주소창 install icon 보임
- [ ] 설치 후 우클릭 → "Search / Compare / Alerts" 점프리스트 (H115)
- [ ] 모바일 Safari → "Add to Home Screen" 동작
- [ ] 오프라인 모드로 전환 → `/offline` 폴백 페이지 렌더

---

## 5. 도메인 연결 (5분, **선택**)

기본 `*.vercel.app` 도메인으로 운영 가능. 자체 도메인 쓰려면:

1. **Vercel Settings → Domains → Add**
2. DNS 제공자에서 표시되는 A / CNAME 레코드 등록
3. SSL 자동 발급 대기 (보통 1–10분)
4. 등록 완료 후 `NEXT_PUBLIC_SITE_URL` 환경변수 새 도메인으로 업데이트 + 재배포

> **중요**: OG 이미지 + share-target manifest 가 `NEXT_PUBLIC_SITE_URL` 기준이라 도메인 변경 시 반드시 업데이트.

---

## 6. 모니터링 (5분, **선택이지만 권장**)

### 6.1 이미 켜진 것 (코드에 포함)
- **Vercel Analytics** (`@vercel/analytics` import) — 자동 트래킹
- **Vercel Speed Insights** (`@vercel/speed-insights`) — Core Web Vitals
- `/dashboard` — 사용자별 활동 패턴 (heatmap, KPI, WoW 델타)
- `/setup` — 어댑터 latency sparkline + last error

### 6.2 직접 켤 것
- [ ] **Vercel → Settings → Analytics** 에서 Web Analytics 활성화
- [ ] **Supabase → Reports** 에서 DB 사용량 baseline 확인
- [ ] LLM 콘솔 (Anthropic/OpenAI) 에서 사용량 알림 임계값 설정
- [ ] (선택) Sentry 같은 에러 트래킹 — 코드에는 아직 없음, Phase 6+

---

## 7. 운영 첫 주 점검 항목

### 매일 (1분)
- [ ] `/setup` 열어서 빨간 lastError 블록 없는지 확인
- [ ] `/dashboard` heatmap 으로 트래픽 시간대 파악

### 주간 (10분)
- [ ] Vercel Analytics: Top pages / countries / referrers
- [ ] Supabase Reports: DB Egress / Storage / API requests
- [ ] LLM 사용량: 월 한도 대비 진행률
- [ ] 어필리에이트 콘솔 (Amazon Associates / Coupang Partners 등): 클릭/전환 추적

### 월간
- [ ] LLM 응답 품질 샘플 점검 (10개 cohort 골라 narrative 읽기)
- [ ] `/cohorts` 갤러리 둘러보면서 공유된 비교 품질 확인
- [ ] 어댑터 추가 검토 (분기별 신규 매장 평가)

---

## 8. 위기 대응

### 어댑터 하나가 죽었을 때
- 자동 처리: 실패한 어댑터는 mock 으로 fallback, 나머지 매장은 정상
- 운영자 액션: `/setup` 에서 lastError 확인 → 키 만료/한도/upstream 장애 분류

### Supabase 잠시 다운
- 자동 처리: 모든 cohort/reaction/clone 엔드포인트는 503 + `{ items: [] }` 형식 반환 → UI 가 빈 상태로 graceful 표시
- shortlist는 LocalStorage 기반이라 영향 없음

### LLM API 다운/한도 초과
- 자동 처리: deterministic fallback narrative 가 자동으로 들어감 (H39, H71)
- 운영자 액션: 한도 늘리거나 Anthropic ↔ OpenAI 전환

### 트래픽 급증
- Vercel 자동 스케일
- Supabase: Free 플랜은 DB egress 5GB/월. 초과 시 Pro ($25/월) 자동 청구 안 됨 — 미리 업그레이드 필요
- LLM: 자동 throttle 없음. 한도 알림 설정 필수.

---

## 9. 출시 후 다음 마일스톤 (참고)

이 문서는 **현재 코드 베이스의 GO-LIVE 만** 다룸. 다음 단계 후보:
- 결제 / 구독 (Stripe)
- 백오피스 / 어드민 UI
- 새 카테고리 (식품, 패션, 가전, 도서)
- 모바일 네이티브 앱 (React Native / Capacitor)
- 추천 알고리즘 v2 (사용자별 ML)
- B2B 파트너 API

---

## 부록 A: 어댑터별 우선순위 표 한 줄 요약

```
🥇 NAVER (KR 사용자 핵심) → SERPAPI (글로벌 meta) → ANTHROPIC (LLM)
🥈 EBAY → RAKUTEN → YAHOO_JP (지역별 보강)
🥉 AMAZON → COUPANG → SHOPEE → LAZADA → ALIEXPRESS → VISION
```

## 부록 B: 운영 단축키

| 단축키 | 동작 |
|---|---|
| `?` | 키보드 단축키 도움말 |
| `/` | 검색 입력에 포커스 (없으면 홈으로 이동) |
| `Shift+C` | 내 비교함 열기 |
| `Shift+G` | 공유 비교 갤러리 |
| `,` `.` | `/search` 정렬 cycle (이전/다음) |

## 부록 C: 페이지별 운영자 시야

| URL | 무엇을 보는 곳 |
|---|---|
| `/setup` | 어댑터 LIVE/MOCK + latency + lastError + lastSample |
| `/api/status` | JSON 헬스 — 모니터링 도구에 연결 |
| `/dashboard` | 본인 활동 히트맵 / WoW 델타 / "내 인기 비교" |
| `/cohorts` | 공개된 다른 사람들의 비교 (소셜 프루프) |
| `/disclosure` | 어필리에이트 / 데이터 처리 투명성 페이지 |

---

**완료 후**: 이 문서의 모든 ✅를 체크하면 운영 시작 가능 상태.
키 발급 대기 중인 매장은 받는 대로 Vercel env 추가 + Redeploy. 코드 변경 불필요.
