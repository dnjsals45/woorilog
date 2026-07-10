# Domain Model

이 문서는 V1 도메인 규칙을 정리합니다. 구현 과정에서 실제 entity와 API 계약에 맞춰 갱신합니다.

## Core Concepts

### User

- OAuth provider 계정으로 식별됩니다.
- 로그인 후 사용할 수 있는 장부를 가집니다.
- 사용 가능한 장부가 없으면 기본 개인 장부가 생성됩니다.
- Auth Foundation 구현에서는 `provider`, `providerUserId`, `email`, `nickname`, `lastUsedLedgerId`를 저장합니다.

### Ledger

- 개인 장부 또는 공동 장부입니다.
- 사용자는 여러 장부에 속할 수 있습니다.
- 사용자는 마지막으로 사용한 장부를 가질 수 있습니다.
- Auth Foundation 구현에서는 `name`, `type`, `ownerId`를 저장합니다.

### Ledger Member

- 장부와 사용자의 관계입니다.
- 공동 장부에서는 결제자, 멤버별 지출, 초대 권한 판단의 기준이 됩니다.
- 같은 사용자와 장부 조합은 한 번만 저장됩니다.
- Auth Foundation 구현에서는 `OWNER`, `MEMBER` role을 구분합니다.

### Ledger Month

- 장부의 월 단위 예산 운영 상태입니다.
- 월 예산, 마감 상태, 멤버별 할당, 카테고리별 예산을 묶습니다.
- Budget/Dashboard 구현에서는 `budgetMonth`를 `YYYY-MM` 문자열로 저장합니다.
- 같은 장부 안에서 같은 `budgetMonth`는 하나만 존재합니다.
- 마감된 월은 예산 설정을 수정할 수 없고, reopen 후 다시 수정할 수 있습니다.

### Category Budget

- 특정 `Ledger Month`와 장부 카테고리의 월 예산 금액입니다.
- 금액은 원화 정수 `Long`으로 저장하며 음수일 수 없습니다.
- 카테고리는 해당 장부에 속해야 합니다.

### Member Allocation

- 특정 `Ledger Month`에서 장부 멤버에게 배정한 예산 금액입니다.
- 금액은 원화 정수 `Long`으로 저장하며 음수일 수 없습니다.
- 할당 대상 사용자는 해당 장부의 멤버여야 합니다.

### Category

- 장부별 거래 분류입니다.
- 기본 카테고리를 제공하고, 장부별 커스텀 카테고리를 허용합니다.
- Transaction Core 구현에서는 장부 생성 시 기본 카테고리 `식비`, `카페`, `교통`, `생활`, `급여`를 생성합니다.
- 카테고리는 `EXPENSE`, `INCOME` type을 가지며, 같은 장부 안에서 이름은 중복될 수 없습니다.

### Transaction

- 장부에 속한 수입 또는 지출 기록입니다.
- 금액, 일자, 카테고리, 메모, 결제자 정보를 가집니다.
- 월별 거래 목록, 대시보드, 통계 계산의 기준입니다.
- Transaction Core 구현에서는 금액을 원화 정수 `Long`으로 저장합니다.
- 거래 type과 카테고리 type은 일치해야 합니다.
- 결제자는 해당 장부의 멤버여야 하며, 요청에서 생략하면 현재 사용자로 저장합니다.

### Transaction Import Preview

- OCR 또는 직접 입력 텍스트에서 거래 후보를 만드는 임시 결과입니다.
- preview는 실제 `Transaction`을 저장하지 않습니다.
- 후보는 금액, 날짜, type, 카테고리 힌트, 메모, 원문 줄, confidence를 가집니다.
- 후보를 확정 저장할 때는 일반 거래 생성 API 규칙을 따릅니다.

### Recurring Transaction Template

- 반복적으로 생성될 거래의 템플릿입니다.
- 중복 생성을 방지하는 generation 기록이 필요합니다.
- Recurring Transaction 구현에서는 `WEEKLY`, `MONTHLY` frequency를 지원합니다.
- 템플릿은 장부, 결제자, 카테고리, 거래 type, 금액, 메모, 시작일, 다음 생성 예정일, 종료일, 일시정지 여부를 가집니다.
- 생성 대상 여부는 `paused = false`이고 `nextDueDate <= asOf`이며, 종료일이 없거나 `nextDueDate <= endDate`일 때 판단합니다.
- 반복 거래 생성은 실제 `Transaction`과 `RecurringTransactionGeneration` 기록을 함께 만들고, `(template_id, generated_date)`로 중복 생성을 방지합니다.
- 생성 후 `nextDueDate`는 frequency에 따라 다음 주 또는 다음 달로 전진합니다.

### Invitation

- 공동 장부 참여 요청입니다.
- 직접 초대와 링크 초대를 지원합니다.
- pending, accepted, rejected, cancelled, expired 같은 상태를 구분합니다.
- Invitation 구현에서는 `DIRECT`, `LINK` type과 `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `EXPIRED` status를 사용합니다.
- 직접 초대는 invitee user를 가지며, 초대받은 사용자만 수락/거절할 수 있습니다.
- 링크 초대는 token을 가지며, 현재 구현은 수락되면 `ACCEPTED`가 되는 단일 사용 링크입니다.
- 공동 장부 `OWNER`만 초대 생성, 초대 가능 사용자 조회, 초대 목록 조회, 초대 취소를 할 수 있습니다.
- 초대 수락 시 사용자는 해당 장부의 `MEMBER`가 되고, 마지막 사용 장부가 해당 장부로 변경됩니다.

## Key Rules

- 모든 사용자는 최소 1개의 기본 개인 장부를 가져야 합니다.
- 최근 사용 장부에 접근할 수 없으면 기본 개인 장부로 fallback합니다.
- 거래 생성/수정은 최근 사용 장부 선택 상태를 임의로 바꾸지 않습니다.
- 개인/공동 장부는 UI에서 하나의 목록으로 표시합니다.
- API response는 JPA entity를 직접 노출하지 않습니다.
- 돈은 부동소수점으로 다루지 않습니다.
- 월 기준은 `YYYY-MM` 형식으로 표현합니다.
- 대시보드의 현재 월은 서버 clock 기준이며, 지출 집계는 `EXPENSE` 거래만 합산합니다.
- 월별 통계는 요청한 `from`부터 `to`까지의 모든 월을 포함하고, 거래가 없는 월은 0원으로 반환합니다.
- 초대는 공동 장부에만 생성할 수 있습니다.
- 같은 장부와 invitee 조합에 만료되지 않은 직접 초대가 이미 있으면 새 직접 초대를 만들 수 없습니다.
- 반복 거래 템플릿의 카테고리 type은 거래 type과 일치해야 합니다.
- 반복 거래 템플릿의 결제자는 해당 장부의 멤버여야 합니다.
