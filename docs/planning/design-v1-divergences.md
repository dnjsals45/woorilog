# 확정 디자인과 기존 계획의 불일치

Claude Design 에서 확정한 **Crisp Calm V1** 디자인(핸드오프 번들 `design_handoff_woorilog_v1`, 14화면)을
프론트엔드에 이식하면서 드러난, **기존 기획·설계 문서와 어긋나는 지점**을 모은 문서입니다.

- 작성 시점: 2026-08-02
- 이식 범위: 프론트엔드 화면 14개 전부 (`frontend/src/pages`, `frontend/src/features/*/ui`)
- 판단 기준: 사용자 지시에 따라 **디자인을 절대 기준**으로 구현했습니다. 즉 아래 항목은
  "구현이 문서를 따르지 않은 것"이 아니라 **문서 쪽을 갱신해야 하는 목록**입니다.
- 백엔드 API 추가·변경 필요 사항은 [`design-v1-api-gaps.md`](./design-v1-api-gaps.md)로 분리했습니다.

각 항목은 `상태` 로 처리 필요도를 표시합니다.

| 상태 | 뜻 |
| --- | --- |
| 결정 필요 | 제품 판단이 있어야 진행됩니다. 코드가 잠정 상태입니다. |
| 문서 갱신 | 구현이 확정이고 문서만 맞추면 됩니다. |

---

## 1. 디자인 내부 모순 — 닉네임 수정

**상태: 결정 필요**

확정 디자인의 **설정 화면(`설정.dc.html`)에 프로필 섹션이 없습니다.** 탭이 장부·멤버·카테고리·알림 넷뿐입니다.
그런데 같은 번들의 **온보딩 화면(`온보딩.dc.html`)이 닉네임 입력 아래에 이렇게 안내합니다.**

> 두 글자에서 열두 글자까지 쓸 수 있어요. **나중에 설정에서 바꿀 수 있어요.**

디자인이 스스로 약속한 기능이 디자인에서 빠져 있습니다.

기존 문서 근거:

- `docs/design/information-architecture.md` 주요 경로 표: `/settings` = "**프로필**과 사용자별 알림 설정"

현재 구현 상태:

- `frontend/src/pages/UserSettingsPage.tsx` 에 프로필 섹션 없음
- `useUpdateProfileMutation` 이 온보딩에서만 쓰이고 설정에서는 미사용

선택지:

1. 설정에 프로필 섹션을 추가한다 (문서·IA 와 일치, 디자인에 없는 섹션을 만들어야 함)
2. 온보딩 문구를 고친다 (디자인 그대로, 닉네임은 최초 1회 확정)

---

## 2. 예비비를 상대방 개인 예산으로 이동

**상태: 결정 필요**

디자인의 예산 설정 화면은 예비비 이동 대상으로 **공동 예산 + 두 사람의 개인 예산 전부**를 제시합니다.
문서는 본인 것만 허용합니다.

기존 문서 근거:

- `docs/product/v1-scope.md` 예비비 절: "예비비가 필요하면 **본인 할당 예산이나 공동 예산으로** 옮긴 뒤 사용합니다."
- `docs/engineering/permissions.md` 예산 표: 예비비는 "이동으로만 변경", 상대방 개인 할당에 대한 직접 조작 권한 없음

현재 구현 상태:

- 디자인대로 세 대상을 모두 노출합니다. 상대방 개인 예산을 고르면 백엔드가 거부하고 오류 토스트가 뜹니다.

이건 단순 누락이 아니라 **제품 원칙(감시가 아니라 공유) 문제**로 보입니다.
상대방 예산에 임의로 돈을 넣을 수 있어야 하는지 판단이 필요합니다.

선택지:

1. 디자인에서 상대방 개인 예산 선택지를 뺀다 (문서·권한 모델 유지)
2. 백엔드를 열고 `permissions.md` 와 `v1-scope.md` 를 함께 고친다

---

## 3. 새 화면이 생겼습니다 — 기간 종료 요약

**상태: 문서 갱신**

디자인에 `기간 종료 요약.dc.html` 이 독립 화면으로 있습니다. 기존 IA 에는 별도 화면이 아니라
예산 화면 하위 경로로 잡혀 있었습니다.

| | 기존 (`information-architecture.md`) | 확정 디자인 |
| --- | --- | --- |
| 경로 | `/budget/periods/:periodId` — "지난 기간 예산과 종료 요약" | 독립 화면 |
| 구현 경로 | — | `/periods/:startDate/summary` |

`:periodId` 가 아니라 **기간 시작일(`startDate`)** 로 식별합니다.
백엔드 `GET /api/ledgers/{ledgerId}/budget-periods/{startDate}/summary` 가 그렇게 정의돼 있어 맞춘 것입니다.

**진입점이 아직 없습니다.** 라우트만 만들어 둔 상태라 어디서 이 화면으로 들어갈지 정해야 합니다
(예산 화면의 지난 기간 목록 / 기간 종료 알림 딥링크 등).

---

## 4. 화면이 오버레이로 바뀌었습니다 — 라우트 4개 소멸

**상태: 문서 갱신**

디자인에서 독립 화면이던 것들이 오버레이가 됐습니다. 라우트를 갖지 않습니다.

| 기존 경로 (`information-architecture.md`) | 확정 디자인 | 근거 |
| --- | --- | --- |
| `/transactions/import` | **중앙 모달** | `이미지 업로드.dc.html`: `position:fixed; inset:0; place-items:center` + 스크림, 사이드바 참조 없음 |
| `/transactions/:transactionId` | 가계부 화면 내 **모달** | `가계부.dc.html`, README "행 클릭 → 거래 상세 모달" |
| `/notifications` | 대시보드 헤더 **팝오버** | `알림함.dc.html`: `position:fixed; top:78px; right:36px; width:436px`, 종 아이콘이 14화면 중 대시보드에만 존재 |
| (신규) 거래 추가 | 우측 **드로어 560px** | `거래 추가.dc.html`: `position:fixed; top:0; right:0; bottom:0; width:560px; border-left`, 사이드바 참조 없음 |

기존 링크가 죽지 않도록 리다이렉트를 걸어 뒀습니다 (`frontend/src/App.tsx`).

- `/transactions/import`, `/transactions/:transactionId`, `/transactions/uncategorized` → `/transactions`
- `/notifications` → `/dashboard`

**`/transactions/uncategorized` 는 디자인에 대응 화면이 없습니다.** IA 에는 "미분류 거래 일괄 분류"로 정의돼 있는데
`가계부.dc.html` 에 해당 모드가 없습니다. **결정: 전용 화면은 두지 않고, 가계부 화면(`TransactionsPage`)의 필터 칩으로
"미분류"를 추가해 `unclassified=true` 서버 파라미터로 연결했습니다.**

---

## 5. 설정 화면 3개가 1개로 통합됐습니다

**상태: 문서 갱신**

| 기존 경로 | 확정 디자인 |
| --- | --- |
| `/settings` — 프로필과 사용자별 알림 설정 | **설정 한 화면의 4개 탭**: 장부 · 멤버 · 카테고리 · 알림 |
| `/ledgers/:ledgerId/settings` — 장부 이름, 링크 초대, 멤버와 공유 설정 | → 장부·멤버 탭으로 흡수 |
| `/categories` — 고정 대분류 표시 여부와 소분류 관리 | → 카테고리 탭으로 흡수 |

기존 경로는 `/settings` 로 리다이렉트합니다. 페이지 파일과 죽은 `LedgerSettingsRoute` 는 삭제했습니다.

**흡수되지 못한 기능 2개:**

1. **프로필 수정** — 위 1번 항목
2. **새 대분류(카테고리 그룹) 추가** — 디자인 문구가 "대분류를 선택해서 원하는 소분류를 추가할 수 있어요"라
   대분류는 고정으로 봤습니다. IA 도 "**고정** 대분류 표시 여부와 소분류 관리"라고 적고 있어 방향은 일치하지만,
   `useCreateCategoryGroupMutation` 이 미사용 상태가 됐습니다. 의도한 것인지 확인이 필요합니다.

---

## 6. 사이드바 내비게이션 구성이 달라졌습니다

**상태: 문서 갱신**

| | 기존 (`information-architecture.md`) | 확정 디자인 (`README.md` 앱 셸 절) |
| --- | --- | --- |
| 항목 | 홈 / 거래 / 예산 / 분석 (4개) | **홈 / 가계부 / 반복 거래 / 예산 설정 / 분석** (5개) |
| 거래 기록 | 별도 탭 없이 **전역 `+` 행동** | 헤더의 "거래 추가" 버튼 → 우측 드로어 |
| 반복 거래 | "보조 메뉴에서 진입" | **주 내비게이션으로 승격** |
| 알림·설정 | 보조 메뉴 | 알림은 대시보드 팝오버, 설정은 사이드바 하단 |

라벨도 바뀌었습니다: `거래` → `가계부`, `예산` → `예산 설정`.
`frontend/src/App.test.tsx` 의 "uses only the documented primary navigation" 테스트를 새 구성으로 갱신했습니다.

---

## 7. 데스크톱 전용 — 반응형 계획과 충돌

**상태: 결정 필요**

확정 디자인은 **데스크톱 폭 전용**입니다.

> `README.md` 반응형 절: 현재 화면은 **데스크톱 폭 전용**입니다(사이드바 232px + 본문 최소 1080px).
> 랜딩과 온보딩만 좁은 폭에서도 자연스럽게 접힙니다. **모바일 레이아웃은 별도 디자인 작업이 필요합니다.**

기존 문서는 375px 부터 대응하는 반응형입니다.

| | 기존 (`frontend-implementation.md` Responsive Mapping) | 확정 디자인 |
| --- | --- | --- |
| `0-760px` | top bar + 5개 bottom navigation, single column | 미정의 |
| `761-1040px` | top bar + 5개 bottom navigation, 1-2 column | 미정의 |
| `1041px+` | 240px sidebar | **232px sidebar + 본문 최소 1080px** |
| 브라우저 검수 | 375 / 390 / 768 / 1024 / 1440px | 데스크톱만 |

**현재 구현은 모바일 대응이 없습니다.** 사용자 지시(데스크톱 먼저, 모바일은 이후 별도 진행)에 따른 것이며,
기존 모바일 하단 내비게이션은 앱 셸 교체 과정에서 제거됐습니다.

모바일 디자인이 나오기 전까지 **좁은 폭에서는 가로 스크롤이 발생합니다.**

---

## 8. 예산 막대 경고 임계값이 바뀌었습니다

**상태: 문서 갱신**

디자인 시스템 readme 의 "알려진 차이"에 명시돼 있습니다.

> 예산 막대의 경고 임계값을 원본(80% / 100%)에서 **60% / 90%** 로 통일했습니다.
> `Progress` 와 `StatBlock` 이 같은 규칙을 씁니다.

현재 `frontend/src/shared/ui/Progress.tsx` 가 60/90 규칙을 갖고 있고, 이걸 쓰는 화면 전부에 적용됩니다.
`docs/design/design-system.md` 에 이 임계값이 다르게 적혀 있으면 갱신이 필요합니다.

---

## 9. 디자인 시스템 자체의 결함 3건

이식 중 발견한, **Claude Design 원본 쪽을 고쳐야 하는** 항목입니다.
프론트엔드에서는 우회했지만 원본을 고치지 않으면 다음 동기화 때 되돌아옵니다.

### 9-1. 누름 피드백이 핸드오프 문서와 어긋남

- 핸드오프 `README.md` 인터랙션 표: **"모든 버튼 `:active { transform: scale(0.97) }`, `transition: transform 160ms`"**
- 그런데 디자인 시스템 `styles/globals.css` 는 `button:active { opacity: .86 }`

→ 이식본(`frontend/src/styles/base/globals.css`)은 **문서를 따라 `scale(0.97)`** 로 고쳤습니다.

### 9-2. 정의되지 않은 토큰 참조

`patterns/overlay.css` 가 `--wl-shadow-overlay` 와 `--wl-layer-overlay` 를 참조하는데 토큰 파일에 그 이름이 없습니다
(실제 이름은 `--wl-shadow-modal`, `--wl-z-modal`). 그대로 두면 모달 그림자와 z-index 가 비어버립니다.

→ 이식본은 fallback 을 걸어 두었습니다: `var(--wl-shadow-overlay, var(--wl-shadow-modal))`

### 9-3. `DonutChart` 의 렌더 중 변수 변형

`DonutChart.jsx` 가 `map` 콜백 안에서 `offset` 변수를 누적합니다. 렌더 도중 변수를 변형하는 방식이라
재렌더 시 조각 위치가 어긋납니다. eslint `react-hooks/immutability` 가 error 로 잡습니다.

→ 이식본은 누적을 렌더 전 prefix-sum 으로 빼서 같은 결과를 안전하게 만들었습니다.

---

## 10. 디자인 시스템에 없는 컴포넌트

디자인에는 반복 등장하는데 디자인 시스템 컴포넌트가 없어 화면마다 직접 만든 것들입니다.
공용으로 올릴 후보입니다.

| 없는 것 | 쓰이는 곳 | 현재 처리 |
| --- | --- | --- |
| `Switch` (토글) | 반복 거래(고정비·자동등록), 설정(알림) | 두 화면이 같은 모양으로 인라인 구현 |
| 꺾은선·막대 차트 | 분석, 기간 종료 요약 | 인라인 SVG + 텍스트 범례로 직접 구현 (차트 라이브러리 미추가) |
| 마케팅용 디스플레이 타입 | 랜딩 히어로 (30~54px) | 역할 클래스가 26px 까지라 인라인 값 사용 |

---

## 11. 필요한 사진 에셋 2장

핸드오프 `README.md` Assets 절이 랜딩에 **사진 자리표시자 2곳**이 있다고 명시합니다.
현재 `frontend/src/pages/LandingPage.tsx` 에 `<!-- TODO(asset) -->` 로 표시돼 있습니다.

| 위치 | 필요한 사진 | 비율 |
| --- | --- | --- |
| 기능 섹션 첫 카드 | 영수증 여러 장을 모아 둔 사진 | 5:3 |
| 기능 섹션 마지막 카드 | 일요일 저녁 집 안 분위기 사진 | 16:10 |

히어로 배경은 기존 `frontend/src/assets/landing/landing-desk-bg.jpg` 를 재사용합니다.

---

## 갱신이 필요한 문서

위 항목이 정리되면 아래 문서를 함께 고쳐야 합니다.

| 문서 | 갱신 대상 항목 |
| --- | --- |
| `docs/design/information-architecture.md` | 3, 4, 5, 6 — 주요 경로 표와 주 이동 구조 |
| `docs/design/frontend-implementation.md` | 6, 7 — Responsive Mapping, Current Implementation |
| `docs/design/design-system.md` | 8, 9, 10 — 임계값, 토큰, 없는 컴포넌트 |
| `docs/design/screen-specs.md` | 3, 4, 5 — 화면 목록과 오버레이 여부 |
| `docs/product/v1-scope.md` | 2 — 예비비 이동 대상 |
| `docs/engineering/permissions.md` | 2 — 예비비 권한 표 |
