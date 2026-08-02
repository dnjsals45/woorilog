# 확정 디자인 이식으로 드러난 백엔드 API 작업 목록

Claude Design **Crisp Calm V1** 디자인 14화면을 프론트엔드에 이식하면서,
디자인이 요구하지만 현재 API 로는 채울 수 없는 데이터를 정리한 문서입니다.

- 작성 시점: 2026-08-02
- 원칙: **값을 지어내지 않았습니다.** 데이터가 없는 자리는 UI 구조만 만들고
  빈 상태(`EmptyState`)나 비활성 컨트롤로 두고 코드에 `// TODO(api):` 주석을 남겼습니다.
- 화면 구조·기획 문서와의 불일치는 [`design-v1-divergences.md`](./design-v1-divergences.md)로 분리했습니다.

## 분류

| 종류 | 뜻 | 개수 |
| --- | --- | --- |
| **A. 프론트 배선만 필요** | 백엔드에 이미 있고 문서에도 있는데 프론트엔드 API 클라이언트에 없음 | 3 |
| **B. 문서 ↔ 백엔드 불일치** | 문서에 적힌 필드를 백엔드가 받지 않음 | 1 |
| **C. 백엔드 신규 작업** | 응답에 필드 자체가 없음 | 8 |

---

# A. 프론트엔드 배선만 하면 되는 것

백엔드가 이미 지원합니다. 프론트엔드 `api/*.ts` 에 타입·함수가 없어서 UI 가 비활성 상태입니다.
**백엔드 작업 불필요.**

## A-1. 예산 기간 시작일 변경 (`budgetCycle`)

- 문서: `docs/engineering/api-contract.md` — `GET /api/ledgers` 응답 항목과 `PATCH /api/ledgers/{ledgerId}` 요청에 모두 정의됨
- 프론트 공백: `frontend/src/features/ledger/api/ledgerApi.ts` 의 `LedgerSummary` 타입에 없고, `renameLedger()` 가 보내지 않음
- 화면 영향: **설정 > 장부 탭의 "예산 기간 시작일" 날짜 그리드가 비활성**

## A-2. 카테고리 그룹 숨김 (`hidden`)

- 문서: `PATCH /api/ledgers/{ledgerId}/category-groups/{groupCode}` 에 `{ hidden: true }`, 그룹 조회 응답에 `hidden`
- 프론트 공백: `frontend/src/features/category/api/categoryApi.ts` 에 해당 함수·필드 없음
- 화면 영향: **설정 > 카테고리 탭의 "이 장부에서 숨기기" 토글이 비활성**

## A-3. 카테고리 이름을 과거 거래에 적용 (`applyNameToPastTransactions`)

- 문서: `PATCH /api/categories/{categoryId}` 가 지원
- 프론트 공백: `UpdateCategoryRequest` 에 필드 없음
- 화면 영향: 디자인의 "바꾼 이름을 과거 거래에도 적용" 체크박스를 **죽은 컨트롤로 두지 않으려고 생략**했습니다

> 참고로 아래 두 건은 이번 작업에서 **이미 배선을 마쳤습니다.**
>
> - `PUT /api/scheduled-plans/{planId}` — 백엔드에 있는데 프론트에 없었음 → `useUpdateScheduledPlanMutation` 추가
> - `GET /api/ledgers/{ledgerId}/budget-periods/{startDate}/summary` 와
>   `POST .../copy` — 클라이언트 함수는 있었으나 훅이 없어 미사용 → 기간 종료 요약 화면에 연결

---

# B. 문서와 백엔드 구현이 어긋난 것

## B-1. `PUT /api/scheduled-plans/{planId}` 요청 필드 불일치

`CLAUDE.md` 의 "코드와 문서가 충돌하면 구현하지 말고 충돌 지점을 먼저 정리한다" 규칙에 따라 보고합니다.

| | `api-contract.md` (1013행~) | `UpdateScheduledPlanApiRequest.kt` 실제 |
| --- | --- | --- |
| scope | 있음 | 있음 |
| name / amount | 있음 | 있음 |
| nextDueDate / endDate | 있음 | 있음 |
| 고정비 여부 | `isFixedExpense` | **`fixedExpense`** (이름 다름) |
| `categoryId` | 있음 | **없음** |
| `budgetSource` | 있음 | **없음** |
| `frequency` | 있음 | **없음** |

**화면 영향 (반복 거래):**

- 저장됨: 이름, 금액, 다음 예정일, 종료일, 고정비 여부
- **저장 안 됨: 반복 주기(frequency) 변경, 카테고리, 차감 예산**

반복 주기 변경은 사용자가 실제로 원할 기능으로 보입니다.
**백엔드를 문서에 맞출지, 문서를 구현에 맞출지 결정이 필요합니다.**

프론트엔드는 현재 **실제 구현 기준**으로 배선해 두었습니다
(`frontend/src/features/scheduled/api/scheduledPlanApi.ts` 에 이유를 주석으로 남김).

---

# C. 백엔드 신규 작업

## C-1. 대시보드 예산 상세 모달 — 3개 필드

**엔드포인트:** `GET /api/dashboard/current` (`DashboardSummary`)

디자인은 예산 카드를 누르면 모달에 아래 넷을 보여줍니다. 현재 응답은 요약값만 반환합니다.

| 필요한 것 | 현재 상태 | 제안 |
| --- | --- | --- |
| 예산 주체별 카테고리 사용액 | `categorySpending` 이 장부 전체 합산 | `sharedCategorySpending` / `myCategorySpending` 으로 분리 |
| **일별 소비 흐름** | 데이터 자체가 없음 | `dailySpending: { date, amount }[]` (주체별 스코프 포함) |
| 남은 고정비·할부 **항목 목록** | `scheduledRecurringExpenseAmount` 총액만 | `upcomingFixedExpenses: { label, amount }[]` |
| 해당 예산의 거래 목록 | `recentTransactions` 를 스코프로 필터링 중 | 전용 목록이 더 정확 (현재는 개수 제한에 걸림) |

**현재 화면**: 모달은 뜨지만 위 영역이 `EmptyState` 입니다.

## C-2. 반복 거래·기간 종료 요약 공통 — `ScheduledPlan` 필드 부족

**엔드포인트:** `GET /api/ledgers/{ledgerId}/scheduled-plans` (및 상세, `/budget-periods/{startDate}/summary`)

현재 `ScheduledPlan` 타입:
`{ id, type, name, amount, frequency, status, nextDueDate, isFixedExpense }`

| 필요한 것 | 화면 영향 |
| --- | --- |
| `categoryId` (또는 카테고리명) | **모든 행이 "기타" 카테고리 마크로 표시됨** |
| `budgetSource` | 차감 예산 칩이 "확인 불가"로 비활성 |
| `totalAmount` (할부 전체 금액) | 할부 지표 4칸이 전부 `-` |
| `round` / `totalRounds` (회차) | 목록의 "4/12회차" 표기 불가, "할부" 뱃지로만 표시 |
| `principalAmount` (회차 원금) | 위와 같음 |
| `monthlyInterest` (월 이자) | 위와 같음 |

기간 종료 요약의 "다음 기간에 이어지는 고정비와 할부" 항목별 목록도 같은 이유로 만들 수 없습니다
(`nextPeriodScheduledAmount` 총액 하나만 존재). 다른 API 로 조합하는 것도 불가능합니다.

## C-3. 분석 — 카테고리별 기간 비교

**엔드포인트:** `GET /api/ledgers/{ledgerId}/analytics`

- 필요: `categoryDistribution[].previousAmount` (또는 동등한 이전 기간 값)
- 현재: 이번 기간 `amount` 만 있음. 전체 총지출 증감(`changeAmount`)은 있으나 **카테고리 단위 증감은 계산 불가**
- 화면 영향: **"지난 기간과 비교" 카드가 통째로 `EmptyState`**

## C-4. 분석 — 서버 측 집계 필요

**엔드포인트:** `GET /api/ledgers/{ledgerId}/transactions`

현재 분석 화면이 거래 목록을 `limit=200` 한 페이지만 가져와 프론트에서 집계합니다.
**한 예산 기간에 거래가 200건을 넘으면 아래 값이 실제보다 적게 나옵니다.**

- "최근 기록" 목록 (선택 카테고리 상세 포함)
- **미분류 거래 건수**
- **수입 합계**

또한 이 엔드포인트에는 `scope`(전체/공동/내 예산) 파라미터가 없어 프론트에서 직접 필터링합니다.

제안: analytics 응답에 `unclassifiedCount`(scope별), `incomeBreakdown` 등 집계 필드를 추가하거나,
거래 목록에 `scope` 파라미터를 추가합니다.

## C-5. 예산 설정 — 지난 기간 사용액

**엔드포인트:** `GET /api/ledgers/{id}/budget-periods/{startDate}`

- 필요: `categoryBudgets[].previousSpentAmount`
- 현재: 이번 기간 `spentAmount` 만 있음
- 화면 영향: 디자인 문구 "**지난 기간** X 사용" 을 "**이번 기간** X 사용" 으로 낮춰 표기 중

## C-6. 알림 — 타입 세분화

**엔드포인트:** `GET /api/notifications` (`UserNotification`)

디자인은 알림을 **6종**으로 구분해 아이콘·톤을 다르게 씁니다.

| 디자인 이벤트 | 아이콘 / 톤 |
| --- | --- |
| 예산 초과 | `triangle-alert` / danger |
| 80% 경고 | `circle-alert` / amber |
| 예산 변경 | `sliders-horizontal` / brand |
| 예비비 이동 | `wallet` / brand |
| 주간 가이드 | `chart-pie` / blue |
| 기간 종료 | `chart-pie` / brand |

현재 `type` 은 `INVITATION | BUDGET | MONTH_CLOSED | SYSTEM` **4종**뿐입니다.
→ **BUDGET 알림 4종(초과·80%경고·예산변경·예비비이동)이 화면에서 전부 똑같이 보입니다.**

부수적으로 **알림 설정 화면의 진입 경로가 정의돼 있지 않아** 톱니 버튼을 `/settings` 로 보냈습니다.

## C-7. 초대 확인 — 상태 5종 구분 불가

**엔드포인트:** `GET /api/invitations/links/{token}`, `POST .../accept`

디자인은 상태 5종(정상 초대 / 참여 완료 / 링크 만료 / 정원 초과 / 이미 멤버)을 구분해 다른 화면을 보여줍니다.

현재 백엔드 동작:

- `requireUsableLink()` 가 **"없음 / 타입 오류 / 이미 처리됨(수락·거절·교체) / 진짜 만료"를 전부
  같은 `INVITATION_EXPIRED`(410)** 로 던집니다. → 조회 단계에서 세분화 불가
- **"정원 초과"(`LEDGER_MEMBER_LIMIT_REACHED`)와 "이미 멤버"(`ALREADY_LEDGER_MEMBER`)는
  참여 버튼을 눌러 accept 를 호출한 뒤에야** 알 수 있습니다. 첫 진입 시엔 정상 초대와 구분되지 않습니다.
- `DIFFERENT_PARTNER_NOT_ALLOWED`(409) 는 **디자인에 대응 상태가 없습니다.** 현재 만료 화면으로 폴백합니다.

추가로 필요한 필드:

- 디자인 문구 "매월 1일부터 시작하는 예산 기간 · 참여 인원 1명" 을 그리려면
  조회 응답에 **예산 기간 시작일**과 **현재 참여 인원**이 필요합니다.
- 사전 판별(참여 버튼을 누르기 전에 상태를 알려면)을 원하면 `currentMemberCount`, `viewerAlreadyMember` 가 필요합니다.

## C-8. 이미지 업로드 — 소스 타입과 중복 판정 근거

**엔드포인트:** `POST /transaction-imports/previews`

| 필요한 것 | 현재 상태 | 화면 영향 |
| --- | --- | --- |
| **이미지별 `sourceType`** | 요청 전체에 **하나만** 적용 | 디자인은 영수증·카드앱 캡처를 한 드롭존에 **섞어 올리는 전제**인데 소스 타입 선택 UI 가 없습니다. 현재 `RECEIPT` 로 고정했습니다. 이미지별 지정 또는 자동 판별이 필요합니다. |
| **중복 판정 근거** | `duplicateSuspected` 불리언만 있음 | 디자인 문구 "이미 저장된 거래와 날짜·금액·사용처가 같아요" 를 후보별로 못 씁니다. 어떤 기존 거래와 겹치는지(`reason`, 대상 거래 id)가 필요합니다. |

일괄 수정 관련 필드(`categoryId` / `budgetSource` / `selected`)는 이미 충분해 **추가 불필요**합니다.

## C-9. 거래 상세 — 할부 조건 조회

**엔드포인트:** `GET /api/transactions/{id}` 및 목록 항목

- 필요: `installment.monthlyInterest`
- 현재: 개월 수(`totalCount`)는 있으나 월 이자가 없음
- 화면 영향: **거래 상세 모달이 기존 할부 거래의 개월·월이자 조건을 보여주지 못합니다.**
  (백엔드가 수정 시 할부 전환을 막고 있어 저장에는 영향 없음 — **조회 표시만 불가**)

## C-10. 거래 폼 — 부가 정보 2건 (해결됨)

| 필요한 것 | 상태 |
| --- | --- |
| 최근 사용처 자동완성 | `GET /api/ledgers/{ledgerId}/merchant-suggestions` 배선 완료. `TransactionForm` 이 `ledgerId` prop을 받아 입력한 사용처로 실시간 조회합니다. |
| 저장된 결제수단(카드명) 목록 | `GET /api/ledgers/{ledgerId}/cards` 배선 완료. 결제수단을 카드로 고르면 저장된 카드 이름 칩에서 고를 수 있고, 그 이름이 기존 `paymentMethod.displayName` 자유 텍스트 입력에 채워집니다(요청 형식은 그대로). |

---

# 우선순위 제안

화면이 **비어 보이거나 잘못 보이는 정도** 기준입니다.

| 순위 | 항목 | 이유 |
| --- | --- | --- |
| 1 | C-2 `ScheduledPlan` 필드 | 반복 거래 화면의 **모든 행이 "기타"로 표시**되고 할부 지표가 전부 `-`. 두 화면에 영향 |
| 2 | C-1 대시보드 예산 상세 | 디자인의 핵심 상호작용인데 모달 내용이 대부분 비어 있음 |
| 3 | B-1 `PUT scheduled-plans` | **사용자가 바꾼 값이 조용히 사라짐**. 데이터 손실은 아니지만 오동작으로 보임 |
| 4 | C-7 초대 상태 구분 | 사용자가 잘못된 안내를 받음 (정원 초과인데 정상 초대로 보임) |
| 5 | C-6 알림 타입 | BUDGET 알림 4종이 구분 안 됨 |
| 6 | C-3 분석 기간 비교 | 카드 하나가 통째로 빈 상태 |
| 7 | A-1~3 프론트 배선 | **백엔드 작업 불필요.** 프론트만 고치면 됨 |
| 8 | C-4 서버 집계 | 거래 200건 넘는 사용자에게만 영향 |
| 9 | C-5, C-8, C-9 | 표기·편의 수준 (C-10은 해결됨) |
