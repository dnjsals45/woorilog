# 확정 디자인과 기존 계획의 불일치

Claude Design 에서 확정한 **Crisp Calm V1** 디자인(핸드오프 번들 `design_handoff_woorilog_v1`, 14화면)을
프론트엔드에 이식하면서 드러난, **기존 기획·설계 문서와 어긋나는 지점**을 모은 문서입니다.

- 작성 시점: 2026-08-02
- 이식 범위: 프론트엔드 화면 14개 전부 (`frontend/src/pages`, `frontend/src/features/*/ui`)
- 판단 기준: 사용자 지시에 따라 **디자인을 절대 기준**으로 구현했습니다.
- 백엔드 API 추가·변경 필요 사항은 [`design-v1-api-gaps.md`](./design-v1-api-gaps.md)로 분리했습니다.

**2026-08-02 결정 완료.** 아래 항목이 모두 정해졌고 구현·문서 반영까지 끝났습니다.
남은 미결은 [마지막 절](#남은-미결)에 모았습니다.

| 상태 | 뜻 |
| --- | --- |
| 반영 완료 | 결정이 났고 코드와 문서에 반영됐습니다. |
| 미결 | 아직 제품 판단이 필요합니다. 코드는 잠정 상태입니다. |

---

## 1. 디자인 내부 모순 — 닉네임 수정

**상태: 반영 완료 — 설정에 프로필 탭을 추가한다**

확정 디자인의 설정 화면(`settings.dc.html`)에 프로필 섹션이 없습니다. 탭이 장부·멤버·카테고리·알림 넷뿐입니다.
그런데 같은 번들의 온보딩 화면(`onboarding.dc.html`)이 닉네임 입력 아래에 이렇게 안내합니다.

> 두 글자에서 열두 글자까지 쓸 수 있어요. **나중에 설정에서 바꿀 수 있어요.**

디자인이 스스로 약속한 기능이 디자인에서 빠져 있었습니다.

**결정**: 설정에 프로필 탭을 더합니다. `information-architecture.md` 도 `/settings` 를 "프로필과 사용자별 알림 설정"으로
정의하고 있어 문서와도 일치합니다. 닉네임을 최초 1회로 잠그면 오타를 영영 못 고칩니다.

- `frontend/src/pages/UserSettingsPage.tsx` 에 프로필 탭 추가, `useUpdateProfileMutation` 연결
- 검증 규칙은 온보딩과 동일(2~12자, 예약어 목록)
- **설정 탭이 4개 → 5개**가 되어 확정 디자인과 달라집니다. Claude Design 원본의 `settings.dc.html` 에 반영 필요

---

## 2. 예비비를 상대방 개인 예산으로 이동

**상태: 반영 완료 — 공동 예산과 본인 예산만 허용한다**

디자인의 예산 설정 화면은 예비비 이동 대상으로 공동 예산 + 두 사람의 개인 예산 전부를 제시했습니다.
문서는 본인 것만 허용합니다.

- `docs/product/v1-scope.md`: "예비비가 필요하면 **본인 할당 예산이나 공동 예산으로** 옮긴 뒤 사용합니다."
- `docs/engineering/permissions.md`: 예비비는 "이동으로만 변경", 상대방 개인 할당에 대한 직접 조작 권한 없음

**결정**: 디자인에서 상대방 개인 예산 선택지를 뺍니다. 상대 예산 잔액을 임의로 바꿀 수 있는 것은
"감시가 아니라 공유"라는 제품 원칙과 결이 다릅니다. "이번 달 내 몫이 부족하다"는 실사용 시나리오는
**요청/승인 흐름**으로 다룰 문제이지 직접 이동이 아닙니다. V1 에서는 막고, 필요해지면 별도 기능으로 검토합니다.

- `frontend/src/pages/BudgetPage.tsx` 의 `moveTargetOptions` 가 공동 예산 + 본인 예산 둘만 노출
- 백엔드는 원래부터 상대방 예산을 거부했습니다. 그동안 화면이 선택지를 주고 오류 토스트만 띄우고 있었습니다
- Claude Design 원본의 `budget-setup.dc.html` 에 반영 필요

---

## 3. 새 화면이 생겼습니다 — 기간 종료 요약

**상태: 반영 완료 — 진입점은 알림 딥링크 하나**

디자인에 `period-summary.dc.html` 이 독립 화면으로 있습니다. 기존 IA 에는 예산 화면 하위 경로로 잡혀 있었습니다.

| | 기존 (`information-architecture.md`) | 확정 디자인 |
| --- | --- | --- |
| 경로 | `/budget/periods/:periodId` — "지난 기간 예산과 종료 요약" | 독립 화면 |
| 구현 경로 | — | `/periods/:startDate/summary` |

`:periodId` 가 아니라 **기간 시작일(`startDate`)** 로 식별합니다.
백엔드 `GET /api/ledgers/{ledgerId}/budget-periods/{startDate}/summary` 가 그렇게 정의돼 있어 맞춘 것입니다.

**결정**: 진입점은 **기간 종료 알림 딥링크 하나**입니다. 예산 화면에 지난 기간 목록은 두지 않습니다.

- `MONTH_CLOSED` 알림에 `targetPath` 가 있으면 그것을, 없으면 `budgetPeriodStart` 로 경로를 조립합니다
- **알려진 한계**: 알림을 지나치면 그 기간 요약을 다시 볼 방법이 없습니다.
  필요해지면 예산 화면에 지난 기간 목록을 붙이면 되므로 지금 막을 필요는 없다고 판단했습니다

---

## 4. 화면이 오버레이로 바뀌었습니다 — 라우트 4개 소멸

**상태: 반영 완료**

디자인에서 독립 화면이던 것들이 오버레이가 됐습니다. 라우트를 갖지 않습니다.

| 기존 경로 | 확정 디자인 | 근거 |
| --- | --- | --- |
| `/transactions/import` | **중앙 모달** | `image-import.dc.html`: `position:fixed; inset:0; place-items:center` + 스크림, 사이드바 참조 없음 |
| `/transactions/:transactionId` | 가계부 화면 내 **모달** | `ledger.dc.html`, README "행 클릭 → 거래 상세 모달" |
| `/notifications` | 대시보드 헤더 **팝오버** | `notifications.dc.html`: `position:fixed; top:78px; right:36px; width:436px`, 종 아이콘이 14화면 중 대시보드에만 존재 |
| (신규) 거래 추가 | 우측 **드로어 560px** | `transaction-add.dc.html`: `position:fixed; top:0; right:0; bottom:0; width:560px; border-left`, 사이드바 참조 없음 |

기존 링크가 죽지 않도록 리다이렉트를 걸어 뒀습니다 (`frontend/src/App.tsx`).

- `/transactions/import`, `/transactions/:transactionId`, `/transactions/uncategorized` → `/transactions`
- `/notifications` → `/dashboard`

**`/transactions/uncategorized` 결정**: 전용 화면은 두지 않고, 가계부 화면(`TransactionsPage`)의 필터 칩으로
"미분류"를 추가해 `unclassified=true` 서버 파라미터로 연결했습니다.
백엔드 거래 목록이 이미 이 파라미터를 지원하고 있었습니다.

---

## 5. 설정 화면 3개가 1개로 통합됐습니다

**상태: 반영 완료**

| 기존 경로 | 확정 디자인 |
| --- | --- |
| `/settings` — 프로필과 사용자별 알림 설정 | **설정 한 화면의 탭 구조** |
| `/ledgers/:ledgerId/settings` — 장부 이름, 링크 초대, 멤버와 공유 설정 | → 장부·멤버 탭으로 흡수 |
| `/categories` — 고정 대분류 표시 여부와 소분류 관리 | → 카테고리 탭으로 흡수 |

기존 경로는 `/settings` 로 리다이렉트합니다. 페이지 파일과 죽은 `LedgerSettingsRoute` 는 삭제했습니다.

**최종 탭은 5개입니다**: 프로필 · 장부 · 멤버 · 카테고리 · 알림 (프로필은 위 1번 결정으로 추가).

**대분류 추가 결정**: 대분류(카테고리 그룹)는 **고정**입니다. 사용자는 소분류만 만들고 관리하며,
대분류에 대해 할 수 있는 것은 장부별 표시/숨김뿐입니다. 디자인 문구("대분류를 선택해서 원하는 소분류를
추가할 수 있어요")와 IA("고정 대분류 표시 여부와 소분류 관리") 모두 이 방향입니다.

- 미사용 상태이던 `useCreateCategoryGroupMutation` 과 API 클라이언트 함수를 제거했습니다
- 대분류가 고정이라 분석 화면의 고정 색·아이콘 매핑도 안정적으로 유지됩니다

---

## 6. 사이드바 내비게이션 구성이 달라졌습니다

**상태: 반영 완료**

| | 기존 (`information-architecture.md`) | 확정 디자인 |
| --- | --- | --- |
| 항목 | 홈 / 거래 / 예산 / 분석 (4개) | **홈 / 가계부 / 반복 거래 / 예산 설정 / 분석** (5개) |
| 거래 기록 | 별도 탭 없이 전역 `+` 행동 | 헤더의 "거래 추가" 버튼 → 우측 드로어 |
| 반복 거래 | "보조 메뉴에서 진입" | **주 내비게이션으로 승격** |
| 알림·설정 | 보조 메뉴 | 알림은 대시보드 팝오버, 설정은 사이드바 하단 |

라벨도 바뀌었습니다: `거래` → `가계부`, `예산` → `예산 설정`.
`frontend/src/App.test.tsx` 의 "uses only the documented primary navigation" 테스트를 새 구성으로 갱신했습니다.

---

## 7. 데스크톱 전용 — 반응형 계획과 충돌

**상태: 반영 완료 — 모바일은 V1 범위 밖**

확정 디자인은 데스크톱 폭 전용입니다(사이드바 232px + 본문 최소 1080px).
랜딩과 온보딩만 좁은 폭에서도 자연스럽게 접힙니다.

| | 기존 (`frontend-implementation.md` Responsive Mapping) | 확정 디자인 |
| --- | --- | --- |
| `0-760px` | top bar + 5개 bottom navigation, single column | 미정의 |
| `761-1040px` | top bar + 5개 bottom navigation, 1-2 column | 미정의 |
| `1041px+` | 240px sidebar | **232px sidebar + 본문 최소 1080px** |
| 브라우저 검수 | 375 / 390 / 768 / 1024 / 1440px | 데스크톱만 |

**결정**: 모바일 대응은 V1 출시 범위에 넣지 않습니다. 기존 Responsive Mapping 과 좁은 폭 검수 기준은
`frontend-implementation.md` 에서 **모바일 디자인 확정 후의 작업**으로 내렸습니다.

**알려진 제약**: 모바일 하단 내비게이션은 앱 셸 교체 과정에서 제거됐고,
모바일 디자인이 나오기 전까지 **좁은 폭에서는 가로 스크롤이 발생합니다.**

---

## 8. 예산 막대 경고 임계값이 바뀌었습니다

**상태: 반영 완료**

디자인 시스템 readme 의 "알려진 차이"에 명시돼 있습니다.

> 예산 막대의 경고 임계값을 원본(80% / 100%)에서 **60% / 90%** 로 통일했습니다.
> `Progress` 와 `StatBlock` 이 같은 규칙을 씁니다.

`frontend/src/shared/ui/Progress.tsx` 가 60/90 규칙을 갖고 있고, 이걸 쓰는 화면 전부에 적용됩니다.
`docs/design/design-system.md` 에 반영했습니다.

---

## 9. 디자인 시스템 자체의 결함 3건

**상태: 이식본에서 우회 완료. Claude Design 원본 수정 필요.**

프론트엔드에서는 우회했지만 원본을 고치지 않으면 다음 동기화 때 되돌아옵니다.

### 9-1. 누름 피드백이 핸드오프 문서와 어긋남

- 핸드오프 `README.md` 인터랙션 표: 모든 버튼 `:active { transform: scale(0.97) }`, `transition: transform 160ms`
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
공용으로 올릴 후보입니다. **코드에서 한 번 정리한 뒤 원본에 올리는 순서**로 갑니다.

| 없는 것 | 쓰이는 곳 | 현재 처리 |
| --- | --- | --- |
| `Switch` (토글) | 반복 거래(고정비·자동등록), 설정(알림) | 두 화면이 같은 모양으로 인라인 구현 |
| 꺾은선·막대 차트 | 분석, 기간 종료 요약, 대시보드 예산 상세 | 인라인 SVG + 텍스트 범례로 직접 구현 (차트 라이브러리 미채택) |
| 마케팅용 디스플레이 타입 | 랜딩 히어로 (30~54px) | 역할 클래스가 26px 까지라 인라인 값 사용 |

---

## 11. 필요한 사진 에셋 2장

핸드오프 `README.md` Assets 절이 랜딩에 사진 자리표시자 2곳이 있다고 명시합니다.
현재 `frontend/src/pages/LandingPage.tsx` 에 `<!-- TODO(asset) -->` 로 표시돼 있습니다.

| 위치 | 필요한 사진 | 비율 |
| --- | --- | --- |
| 기능 섹션 첫 카드 | 영수증 여러 장을 모아 둔 사진 | 5:3 |
| 기능 섹션 마지막 카드 | 일요일 저녁 집 안 분위기 사진 | 16:10 |

히어로 배경은 기존 `frontend/src/assets/landing/landing-desk-bg.jpg` 를 재사용합니다.

---

## 12. 반복 거래 적용 범위 — 디자인에 있는데 백엔드에 없던 것

**상태: 반영 완료 — 선택지를 제거한다**

반복 거래 저장 바가 적용 범위를 "이후 예정 거래만" / "이번 거래와 이후 모두" 둘로 제시했는데,
백엔드 `ScheduledPlanService.updateFuture` 는 `FUTURE` 만 지원합니다. 어느 쪽을 골라도 같게 동작했습니다.

**결정**: 선택지를 제거하고 "이후 예정 거래부터 적용돼요"로 고정합니다.
이미 기록된 거래는 거래 상세에서 개별 수정합니다.

이 과정에서 **더 큰 문제**가 드러나 함께 고쳤습니다. `generate()` 는 plan 이 아니라 occurrence 의
`amount`·`dueDate` 로 거래를 만드는데, `updateFuture` 가 발생분을 다시 만들지 않아
**금액과 반복 주기 변경이 실제 거래에 반영되지 않았습니다.** 이제 SCHEDULED 발생분을 재생성합니다
(GENERATED 는 보존). 자세한 내용은 [`design-v1-api-gaps.md`](./design-v1-api-gaps.md) 를 보세요.

---

## 13. 페어링 제한 — 나간 자리에 다른 사람을 들일 수 없다

**상태: 반영 완료 — 현행 유지, 전용 화면 추가**

**결정**: 한 번이라도 두 사람이 쓴 장부에는 **원래 상대방만 다시 들어올 수 있습니다.**
백엔드가 이미 그렇게 동작하고 있어 규칙은 그대로 두고 화면만 고쳤습니다.

근거는 프라이버시입니다. 멤버가 나가도 `leftAt` 만 찍히고 **거래는 장부에 그대로 남습니다.**
제3자가 들어오면 두 사람이 함께 쓴 지출 내역을 전부 보게 되는데, 떠난 쪽의 동의를 받을 방법이 없습니다.
새로 시작한다면 장부를 새로 만드는 것이 맞습니다.

- 확정 디자인에 대응 화면이 없어 **"링크가 만료됐어요"로 폴백**하고 있었습니다. 링크는 멀쩡하고 정책상 막힌
  것이라 사용자가 링크를 다시 받으러 갑니다. 전용 문구를 추가했습니다
- 조회 응답에 `viewerIsDifferentPartner` 를 추가해 **참여 버튼을 누르기 전에** 판별합니다.
  기존에는 `currentMemberCount` 가 1이라 정상 초대와 구분되지 않았습니다
- 원래 상대방은 막히지 않습니다. 실수로 나갔다가 돌아오는 경우는 그대로 동작합니다

**알려진 한계**: 잘못 초대해서 바로 내보낸 장부도 영영 잠깁니다. 벗어나는 길은 새 장부뿐이라
그동안 쌓은 기록을 두고 가야 합니다. 실제로 이 경우가 생기면 "거래 없이 나간 멤버는 예외" 같은
완화를 검토합니다.

---

## 남은 미결

아직 제품 판단이 필요한 것들입니다.

| 항목 | 내용 |
| --- | --- |
| 사진 에셋 2장 | 위 11번. 랜딩 기능 섹션의 사진 자리표시자입니다. |
| 페어링 제한 완화 | 위 13번. 잘못 초대해서 바로 내보낸 장부도 영영 잠깁니다. 실제로 이 경우가 생기면 "거래 없이 나간 멤버는 예외" 같은 완화를 검토합니다. |

---

## 갱신이 완료된 문서

| 문서 | 반영한 항목 |
| --- | --- |
| `docs/design/information-architecture.md` | 3, 4, 5, 6 — 주요 경로 표와 주 이동 구조 |
| `docs/design/frontend-implementation.md` | 6, 7 — Responsive Mapping, Current Implementation |
| `docs/design/design-system.md` | 8, 9, 10 — 임계값, 토큰, 없는 컴포넌트 |
| `docs/design/screen-specs.md` | 3, 4, 5 — 화면 목록과 오버레이 여부 |
| `docs/product/v1-scope.md` | 2 — 예비비 이동 대상 |
| `docs/engineering/permissions.md` | 2, 5 — 예비비 권한, 대분류 고정 |
| `docs/engineering/api-contract.md` | 12 및 API 공백 문서의 구현분 |

**Claude Design 원본에 반영이 남은 것**: 1(프로필 탭), 2(예비비 선택지), 9-1·9-2·9-3(결함),
8(임계값), 그리고 프로젝트의 `guidelines/` 에 올라가 있는 `docs/design/**` 사본입니다.
원본을 고치지 않으면 다음 동기화 때 되돌아옵니다.
