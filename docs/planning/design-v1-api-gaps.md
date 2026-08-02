# 확정 디자인 이식으로 드러난 백엔드 API 작업 목록

Claude Design **Crisp Calm V1** 디자인 14화면을 프론트엔드에 이식하면서,
디자인이 요구하지만 당시 API 로는 채울 수 없었던 데이터를 정리한 문서입니다.

- 최초 작성: 2026-08-02
- **재검증·구현 완료: 2026-08-02**
- 화면 구조·기획 문서와의 불일치는 [`design-v1-divergences.md`](./design-v1-divergences.md)로 분리했습니다.

## 재검증에서 드러난 것

최초 작성분을 백엔드 코드와 대조한 결과 **13개 항목 중 4개가 사실과 달랐습니다.**
원인은 하나로 모입니다 — **백엔드에 legacy 계층과 V1 계층이 쌍으로 공존하는데,
프론트엔드가 여러 곳에서 legacy 쪽에 배선돼 있었습니다.**

`NotificationResponse` ↔ `V1NotificationResponse`, `BudgetMonthSettingsResponse` ↔ `BudgetPeriodDetailResponse`,
`TransactionImportSaveApiRequest` ↔ `LegacyTransactionImportSaveApiRequest` 같은 쌍입니다.
"백엔드에 없다"고 판단한 것들이 실제로는 V1 응답에 이미 있었습니다.

| 항목 | 최초 판단 | 실제 |
| --- | --- | --- |
| C-6 알림 타입 | "4종뿐, 백엔드 신규 필요" | **8종 존재.** `GET /api/notifications` 가 이미 V1 응답 반환. 진짜 공백은 2종뿐 |
| C-1 대시보드 예산 상세 | "3개 필드 신규 필요" | `.../allocations/{allocationId}` 가 주체별 카테고리·일별 흐름·거래 목록을 전부 반환 |
| C-4 서버 집계 | "`scope` 파라미터 없음" | analytics 에 `scope`, 거래 목록에 `scopes`·`unclassified`, 기간 요약에 `unclassifiedCount` 존재 |
| C-10 부가 정보 | "대응 엔드포인트 없음" | `merchant-suggestions` 와 `cards` 둘 다 존재. **항목 삭제** |

**교훈**: API 공백을 판단할 때 프론트 클라이언트의 부재를 백엔드의 부재로 오인하지 않도록,
컨트롤러와 응답 DTO 를 직접 확인해야 합니다.

---

# A. 프론트엔드 배선만 하면 됐던 것 — **완료**

백엔드가 이미 지원하는데 프론트엔드 `api/*.ts` 에 타입·함수가 없어 UI 가 비활성이던 것들입니다.
**백엔드 작업 없이 전부 해결했습니다.**

| 항목 | 내용 | 화면 |
| --- | --- | --- |
| A-1 | 예산 기간 시작일 (`budgetCycle`) | 설정 > 장부 탭 날짜 그리드 |
| A-2 | 카테고리 그룹 숨김 (`hidden`) | 설정 > 카테고리 탭 토글 |
| A-3 | 카테고리 이름을 과거 거래에 적용 (`applyNameToPastTransactions`) | 설정 > 카테고리 탭 체크박스 |
| C-1 | `.../budget-periods/{startDate}/allocations/{allocationId}` | 대시보드 예산 상세 모달 |
| C-4 | 거래 목록 `scopes`·`unclassified`, 기간 요약 `unclassifiedCount` | 가계부 필터, 분석 |
| C-6 | `V1NotificationListResponse` (8종 type, `targetPath`, `budgetPeriodStart`) | 알림 팝오버, 기간 종료 딥링크 |
| C-10 | `merchant-suggestions`, `cards` | 거래 폼 자동완성·결제수단 |

> A-1 은 배선 중에 **문서↔구현 불일치가 하나 더 드러나** 백엔드까지 고쳤습니다. 아래 B-2 를 보세요.

## 배선 중 발견한 필드명 불일치 2건 — 완료

프론트엔드 타입이 실제 응답 키와 달라 **런타임에 `undefined`** 가 되고 있었습니다.

| 프론트 (틀림) | 실제 백엔드 |
| --- | --- |
| `ImportSessionCandidate.id` | `candidateId` |
| `ImportSessionCandidate.suggestedAllocation` | `defaultBudgetSource` |

가져오기 후보의 id 와 추천 차감 예산이 항상 비어 있었습니다.
**`tsc` 도 기존 단위 테스트도 잡지 못합니다** — 프론트 타입끼리는 일관됐고 실제 응답을 태우는 테스트가 없기 때문입니다.
`docs/engineering/testing-strategy.md` 에 알려진 공백으로 기록했습니다.

부수적으로 `api-contract.md` 가 `candidateId` 를 문자열(`"cand_1"`)로 적고 있었으나 실제는 `Long` 이라 문서를 고쳤습니다.

## 전수 점검 결과 — 같은 종류 4건 더

프론트 `api/*.ts` 15개를 백엔드 컨트롤러·응답 DTO 와 전부 대조했습니다.

| 위치 | 프론트 | 실제 백엔드 | 증상 |
| --- | --- | --- | --- |
| `budgetPeriodApi.getReserveTransfers` | `ReserveTransfer[]` | `{ items: ReserveTransfer[] }` | **런타임 예외.** `[...객체]` 는 iterable 이 아니라 `TypeError` 를 던져 예산 화면이 렌더 중 깨졌습니다 |
| `authApi.SessionResponse.currentLedger` | 중첩 `budgetCycle` | `LedgerDto` 가 평평한 `budgetStartType`/`budgetStartDay` | 설정 화면이 `/api/ledgers` 대신 `/api/me` 로 폴백할 때 예산 기간 시작일이 항상 비었습니다 |
| `invitationApi.acceptLinkInvitation` | `{ ledger: LedgerSummary }` | `{ ledger: LedgerSummaryResponse }` (`role`·`accessState`·`partner`) | 반환값을 아직 안 읽어 화면은 멀쩡하지만 타입이 틀렸습니다 |
| `transactionImportApi.saveImportSession` | `{ transactionIds: number[] }` | `{ created: [{ candidateId, transaction }] }` | 위와 같음. **목(mock)까지 틀린 모양으로 맞춰져 있어** 테스트가 통과했습니다 |

두 번째는 **이 작업에서 만든 회귀**입니다. B-2 를 고치며 `LedgerDto` 에 평평한 필드를,
`LedgerResponse` 에 중첩 `budgetCycle` 을 넣어 같은 개념이 엔드포인트마다 다른 모양이 됐습니다.
`LedgerDto` 도 중첩으로 통일해 어느 경로로 받든 같은 키가 나오게 했습니다.

네 번째는 **이 문서가 경고한 패턴 그대로입니다.** 목이 실제 응답이 아니라 프론트 타입에 맞춰져 있으면
테스트는 통과하면서 버그를 덮습니다. 목을 백엔드 응답 모양으로 고치고 반환값 단언을 넣었습니다.

이름 불일치가 없는 것도 확인했습니다: `categoryApi`, `notificationApi`, `scheduledPlanApi`,
`transactionApi`, `cardApi`, `analyticsApi`, `budgetApi`, `allocationDetailApi`, `periodSummaryApi`.
`authApi.CurrentUser.email` 은 백엔드가 의도적으로 내보내지 않는 필드(테스트가 `doesNotExist` 로 단언)라 제거했습니다.

---

# B. 문서와 구현이 어긋난 것 — **완료**

## B-1. `PUT /api/scheduled-plans/{planId}` 요청 필드 불일치

| | `api-contract.md` | 당시 구현 |
| --- | --- | --- |
| 고정비 여부 | `isFixedExpense` | `fixedExpense` (이름 다름) |
| `categoryId` / `budgetSource` / `frequency` | 있음 | **없음** |

사용자가 반복 주기·카테고리·차감 예산을 바꿔도 **조용히 사라졌습니다.**

**결정: 백엔드를 문서에 맞춘다.** 세 필드를 받도록 추가하고 서비스까지 연결했으며 이름도 정정했습니다.

### 같은 실패 유형을 하나 더 발견 — 완료

`POST /api/ledgers/{ledgerId}/scheduled-plans/recurring-expenses` 의 `RecurringPlanApiRequest` 도
필드가 `fixedExpense` 인데 문서와 테스트는 `isFixedExpense` 를 보내고 있었습니다.
**Jackson-Kotlin 이 누락된 non-null `Boolean` 생성자 파라미터를 실패시키지 않고 `false` 로 채우기 때문에,
고정비 생성 요청이 매번 일반 지출로 저장되고 있었습니다.** 기존 통합 테스트가 해당 필드를 단언하지 않아 못 잡았습니다.

필드명을 정정하고 테스트에 단언을 추가했습니다.

### 더 깊은 문제 — 발생분이 갱신되지 않던 것 — 완료

`frequency` 를 받도록 열고 나서 드러났습니다. `generate()` 는 plan 이 아니라 **occurrence 의 `amount`·`dueDate`**
로 거래를 만드는데, 플랜 생성 시 발생분 12개(할부는 회차 수)를 미리 다 만들어 두고
`updateFuture` 는 발생분을 다시 만들지 않았습니다.

| 바꾸면 | 반영됐나 |
| --- | --- |
| 카테고리 · 차감 예산 · 고정비 여부 · 이름 · 상호 · 메모 · 결제수단 | 반영됨 (`generate()` 가 plan 에서 읽음) |
| **금액 · 반복 주기** | **반영 안 됨** |

즉 "이후 예정 거래부터 적용"조차 금액·주기에 대해서는 사실이 아니었습니다.
`updateFuture` 가 SCHEDULED 발생분을 지우고 바뀐 plan 기준으로 다시 만들도록 고쳤습니다.
이미 거래가 만들어진 GENERATED 발생분은 보존하고 회차 번호를 이어서 매깁니다.

## B-2. 장부 응답에 `budgetCycle` 이 없음 (신규 발견)

`PATCH /api/ledgers/{ledgerId}` 가 `budgetCycle` 을 받아 실제로 저장은 하는데,
응답 `LedgerResponse` 와 `GET /api/ledgers` 에 그 값이 없었습니다.
**저장은 되지만 새로고침하면 설정 화면이 선택된 시작일을 다시 보여줄 수 없습니다.**

`api-contract.md` 의 `LedgerSummary` 스펙과 실제 `LedgerResponse` 가 어긋난 지점으로, B-1 과 같은 종류입니다.
(`LedgerSummaryResult`/`LedgerSummaryResponse` 는 `POST /api/ledgers/shared` 에서만 쓰입니다.)

`LedgerDto` 와 `LedgerResponse` 에 매핑을 추가했습니다.

---

# C. 백엔드 신규 작업 — **완료**

## C-2. `ScheduledPlan` 필드 부족 — 완료

`{ id, type, name, amount, frequency, status, nextDueDate, isFixedExpense }` 뿐이라
**반복 거래 화면의 모든 행이 "기타" 카테고리로 표시되고 할부 지표 4칸이 전부 `-`** 였습니다.

`categoryId`, `categoryName`, `budgetSource`, `totalAmount`, `round`, `totalRounds`,
`principalAmount`, `monthlyInterest` 를 추가했습니다.

**전부 엔티티에 이미 있던 값이라 스키마 변경이 필요 없었습니다.** `round` 만 `GENERATED` 발생분 수로 새로 계산합니다.
반복 지출 플랜에서는 할부 관련 필드가 `null` 입니다.

## C-3 · C-5. 지난 기간 비교 값 — 완료

- 분석 `categoryDistribution[].previousAmount` — 카드가 통째로 비어 있던 원인
- 예산 기간 상세 `categoryBudgets[].previousSpentAmount` — 디자인 문구 "지난 기간 X 사용"을 "이번 기간"으로 낮춰 쓰던 원인

**`null` 은 비교할 이전 기간이 없다는 뜻이고 `0` 은 이전 기간에 그 카테고리를 쓰지 않았다는 뜻입니다.**
화면이 둘을 구분합니다.

공유 타입 `V1CategorySpendingResponse` 는 그대로 두고 분석 전용으로
`V1CategorySpendingWithComparisonResponse` 를 새로 뒀습니다. `/summary` 와 `/allocations/{id}` 응답은 바뀌지 않습니다.

## C-4. 서버 측 집계 — 배선으로 해소

분석 화면이 거래 목록을 `limit=200` 한 페이지만 가져와 프론트에서 집계하던 문제입니다.
재검증 결과 백엔드에 `scopes`·`unclassified` 파라미터와 기간 요약의 `unclassifiedCount` 가 이미 있어,
프론트 필터링을 서버 파라미터로 옮기는 것으로 해소했습니다. 백엔드 신규 작업은 없었습니다.

## C-6. 알림 타입 2종 — 완료

기존 8종에 없던 **예산 변경**과 **예비비 이동**을 추가했습니다.
재검증 결과 이 둘은 "BUDGET 으로 뭉쳐 보이는" 것이 아니라 **애초에 발행되지 않고 있었습니다.**
예산 총액이 실제로 바뀔 때(최초 설정 제외)와 예비비 이동 성공 시 발행하도록 연결했습니다.

`type` 컬럼이 네이티브 MySQL `ENUM` 이라 마이그레이션이 필요했습니다 (`V17`).

## C-7. 초대 상태 5종 구분 — 완료

`requireUsableLink()` 가 "없음 / 타입 오류 / 이미 처리됨 / 진짜 만료"를 전부 `INVITATION_EXPIRED`(410) 로 던져
조회 단계에서 구분할 수 없었고, 정원 초과와 이미 멤버는 accept 를 호출한 뒤에야 알 수 있어
**사용자가 잘못된 안내를 받았습니다.**

| 코드 | HTTP | 케이스 |
| --- | --- | --- |
| `NOT_FOUND` | 404 | token 없음, LINK 타입 아님 |
| `INVITATION_ALREADY_PROCESSED` | 409 | 수락·거절·취소·교체됨 |
| `INVITATION_EXPIRED` | 410 | 진짜 만료 |

조회 응답에 `currentMemberCount`, `viewerAlreadyMember`(비로그인 시 `null`), `budgetCycle` 을 추가해
**참여 버튼을 누르기 전에** 정원 초과와 이미 멤버를 판별합니다.

`DIFFERENT_PARTNER_NOT_ALLOWED`(409) 도 조회 단계로 끌어올렸습니다. 상대가 나간 장부는
`currentMemberCount` 가 1 이라 정상 초대와 구분되지 않아, 참여를 누른 뒤에야 거부됐습니다.
`viewerIsDifferentPartner` 를 추가해 미리 판별하고 전용 문구를 보여줍니다.
정책 자체(한 번이라도 두 사람이 쓴 장부는 원래 상대방만 재참여)는 그대로입니다 —
근거는 [`design-v1-divergences.md`](./design-v1-divergences.md) 13번에 있습니다.

## C-8. 이미지 가져오기 — 완료

`sourceType` 이 요청 전체에 하나만 적용돼, 영수증과 카드 앱 캡처를 한 드롭존에 섞어 올리는 디자인 전제를
지킬 수 없었습니다. `sourceTypes` 를 이미지 수와 1:1 로 받고 개수가 맞지 않으면 `400 INVALID_REQUEST` 로 거절합니다.
자동 판별이 아니라 이미지별 수동 지정입니다 — `sourceType` 이 OCR·파싱 분기를 만든 적이 없어 메타데이터일 뿐이었습니다.

중복 판정이 `duplicateSuspected` 불리언뿐이라 어떤 거래와 겹치는지 화면에 쓸 수 없었습니다.
`duplicateTransactionId` 를 추가했습니다. 같은 배치 안의 후보끼리 겹친 경우는 아직 저장된 거래가 없어 `null` 입니다.
**판정 기준(날짜 + 금액 + 정규화된 상호 완전일치)은 바꾸지 않았습니다.**

마이그레이션 `V18` 로 `import_candidates` 에 `source_type` 과 `duplicate_transaction_id` 를 추가했습니다.

> 이 과정에서 `transaction-import.md` 가 주장하던 "카드 승인번호 해시 기반 중복 우선순위"가
> 코드에 존재하지 않아 문서에서 지웠습니다.

## C-9. 할부 월 이자 — 완료

`InstallmentSummary` 에 `monthlyInterest` 를 추가했습니다.
`Transaction` 에 이자 필드는 없지만 이미 `scheduledPlan` 연관을 들고 있고
`ScheduledPlan.monthlyInterestAmount` 가 채워지므로 **스키마 변경 없이** 해결했습니다.

**알려진 한계**: `TransactionService` 의 legacy UUID 기반 할부 경로는 `ScheduledPlan` 을 만들지 않아
그 경로로 생성된 거래는 `monthlyInterest` 가 `null` 입니다. 실제 스키마 추가 없이는 메울 수 없는 기존 데이터 공백입니다.

## C-11. V1 거래 저장의 `cardId` 누락 (신규 발견) — 완료

대시보드의 `nextCardPaymentSummaries` 는 `transaction.card` 로 집계하는데,
V1 저장 경로(`toV1Command`)에 `cardId` 가 없어 거래의 `card` FK 가 **한 번도 채워지지 않았습니다.**
그 결과 카드를 등록하고 거래에 골라도 **카드 결제 예정 금액이 항상 0원**이었습니다.
legacy 요청(`CreateTransactionApiRequest`)에는 `cardId` 가 있고 서비스도 처리하는데 V1 만 빠져 있었습니다.

`updateV1Transaction` 은 `transaction.card = null` 로 매번 지우고 있어, 어쩌다 연결돼도 수정 한 번이면 사라졌습니다.

V1 은 저장된 카드 없이 자유 텍스트 카드명만으로도 카드 결제를 기록할 수 있으므로 `cardId` 는 선택값입니다.
값이 있으면 카드 지출 거래인지와 같은 장부의 카드인지만 확인합니다.

## C-10. ~~거래 폼 부가 정보~~ — 항목 삭제

`merchant-suggestions` 와 `cards` 엔드포인트가 처음부터 있었습니다. 프론트 배선만 하면 되는 A 류였습니다.

---

# 남은 백엔드 공백

구현하지 않았고 아직 필요한 것들입니다.

| 항목 | 내용 | 영향 |
| --- | --- | --- |
| 기간별 고정비·할부 **항목 목록** | `scheduledRecurringExpenseAmount` / `nextPeriodScheduledAmount` 총액만 있음 | 대시보드 예산 상세와 기간 종료 요약의 해당 영역이 빈 상태. C-2 로 `ScheduledPlan` 필드는 생겼으므로 목록 엔드포인트나 요약 응답 확장으로 풀 수 있음 |
| 반복 거래 적용 범위 `ALL` | `updateFuture` 가 `FUTURE` 만 지원 | 화면에서 선택지를 제거해 지금은 문제가 드러나지 않음 |
| 거래 저장 시 `cardId` | 해결됨 — 위 C-11 | — |

---

# 검증

```
backend:  ./gradlew test — 106 tests, 0 failures
frontend: npm run lint / npm run test / npm run build — 전부 통과
```

작업 중 **기존 테스트 실패 1건**도 고쳤습니다.
`TransactionImportIntegrationTest` 의 OCR 스텁이 고정 날짜(`26.07.12`)를 돌려주는데,
그 날짜가 속한 예산 기간이 지나면 저장이 `BUDGET_PERIOD_NOT_FOUND`(409) 로 실패했습니다.
**시간이 지나면 터지도록 만들어진 테스트**라 실행 시점 기준으로 바꿨습니다.
