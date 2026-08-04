# Scheduled Transactions

이 문서는 할부, 반복 지출, 고정비와 주간 권장액의 자동 기록 실행 기준을 정의합니다.

## 공통 원칙

- 모든 자동 기록 실행은 중복 방지 key를 가지고 재시도에 안전해야 합니다.
- 날짜 계산은 가계부 예산 기간, 실행 시각은 사용자 시간대를 사용합니다.
- 미래 예정액과 생성된 실제 거래를 동시에 합산하지 않습니다.
- 일시정지·삭제해도 이미 생성된 과거 거래는 유지합니다.
- 반복 수입은 V1에서 생성할 수 없습니다.

## 반복 지출

- 주기는 `WEEKLY`, `MONTHLY`, `YEARLY`입니다.
- 시작일이 오늘 또는 과거이면 아직 생성되지 않은 첫 발생분을 즉시 생성할 수 있습니다.
- 월간·연간 반복일이 대상 월에 없으면 그 달의 말일을 사용합니다.
- 고정비는 별도 생성 방식이 아니라 반복 지출의 `isFixedExpense=true` 표시입니다.
- 고정비 목록은 활성 반복 지출 중 표시된 계획과 현재 기간 예정 합계를 반환합니다.

## 할부

- 전체 원금, 회차 수, 월 이자와 첫 결제일을 입력합니다.
- 기본 원금은 정수 나눗셈으로 계산하고 나머지 1원은 앞 회차부터 배분합니다.
- 각 회차 금액은 `principalForSequence + monthlyInterest`입니다.
- 첫 거래를 즉시 생성한 경우 해당 회차 occurrence를 `GENERATED`로 함께 기록합니다.
- 상세 응답에는 전체 원금, 현재 회차, 전체 회차와 월 이자를 표시합니다.

## Occurrence 상태 전이

```text
SCHEDULED -> GENERATED
SCHEDULED -> SKIPPED
SCHEDULED -> CANCELLED
```

- `(planId, dueDate, sequence)`는 유일합니다.
- 생성 작업은 occurrence를 잠그고 거래 생성과 `GENERATED` 전이를 같은 DB transaction에서 커밋합니다.
- 이미 `GENERATED`인 occurrence 재실행은 기존 transaction id를 반환하고 새 거래를 만들지 않습니다.
- 계획 수정의 `FUTURE` 범위는 아직 생성되지 않은 occurrence만 다시 계산합니다.
- 생성된 거래 한 건 수정은 원본 계획을 바꾸지 않습니다.

## 일시정지와 재개

- 사용자 일시정지는 `USER_REQUEST`, 탈퇴·내보내기는 `MEMBERSHIP_CHANGED` 사유를 사용합니다.
- 일시정지 중에는 occurrence와 거래를 자동 생성하지 않습니다.
- 재개 시 이미 지난 발생일을 무제한 소급 생성하지 않습니다. 사용자가 확인한 다음 예정일부터 재개합니다.
- 멤버십 변경으로 멈춘 계획은 남은 사용자가 접근 가능한 본인 또는 공동 예산으로 대상이 유효한지 확인한 뒤 재개합니다.

## 사용 가능액

현재 예산 기간의 한 allocation에 대해 다음과 같이 계산합니다.

```text
currentBalance = allocationAmount - generatedExpenseAmount
availableAmount = currentBalance - scheduledRemainingAmount
```

- `scheduledRemainingAmount`는 현재 기간에 속한 `SCHEDULED` occurrence만 포함합니다.
- `GENERATED`, `SKIPPED`, `CANCELLED` occurrence는 예정액에서 제외합니다.
- 금액이 음수이면 0으로 제한하지 않고 초과 상태와 함께 반환합니다.

## 예산 기간 작업

- 다음 기간 시작 3일 전까지 설정이 없으면 설정 권한이 있는 사용자에게 준비 알림을 한 번 생성합니다.
- 기간 시작 시 다음 설정이 없으면 직전 기간의 전체·개인·공동·카테고리 예산 설정을 복사합니다.
- 잔액과 초과액은 복사하지 않습니다.
- 같은 가계부와 기간에 작업이 재실행돼도 `BudgetPeriod`와 알림을 중복 생성하지 않습니다.

## 예산 임계 알림

- 거래 생성·수정·삭제와 자동 거래 생성 후 관련 allocation과 category budget의 단계를 다시 계산합니다.
- 80%와 100%를 한 번에 넘으면 100% 단계만 알립니다.
- 같은 단계에서는 반복하지 않고 아래로 내려갔다 재진입할 때 다시 알립니다.
- 과거 기간에는 단계 상태만 재계산하고 새 알림을 만들지 않습니다.

## 주간 권장액

- 매주 일요일 21:00 사용자 현지 시각에 생성합니다.
- 월요일부터 일요일을 한 주로 봅니다.
- 공동 allocation과 본인 personal allocation만 계산합니다.
- 기본 권장액은 `기간 예산 / 기간 일수 * 다음 주에 포함되는 기간 일수`입니다.
- 현재까지 누적 사용액이 같은 시점의 누적 기준을 초과하면 그 차이를 다음 주 권장액에서 뺍니다.
- 적게 사용한 금액은 여유분으로 표시하지만 다음 주 권장액을 늘리지 않습니다.
- 결과가 음수이면 권장액은 0원이고 남은 초과분을 이후 계산에 반영합니다.
- 예산이 없으면 가이드와 알림을 생성하지 않습니다.
- `(userId, ledgerId, weekStartDate, budgetPeriodId)`로 중복을 방지합니다.

## 운영과 테스트

- scheduler는 짧은 고정 주기로 due 작업을 찾고 DB 기준 중복 방지로 여러 instance 실행을 견딥니다.
- clock과 timezone을 주입해 월말, 윤년, DST와 예산 기간 경계를 테스트합니다.
- 실패 occurrence는 재시도 가능하게 남기고 사용자에게 부분 생성된 결과를 성공으로 표시하지 않습니다.
- 관측 지표에는 due 수, generated 수, duplicate skip 수, 실패 수와 지연 시간을 포함하되 거래 내용은 포함하지 않습니다.
