# API Contract

이 문서는 [V1 Scope](../product/v1-scope.md)의 호출자 계약입니다. V1 화면은 이 계약의 endpoint와 DTO를 사용하며, 마이그레이션 검증을 위해 남아 있는 이전 구현의 내부 read model과 전환 대상은 [이전 API 전환](#이전-api-전환)에서 별도로 관리합니다. 데이터 구조와 권한은 [Domain Model](./domain-model.md)과 [Permissions](./permissions.md)를 따릅니다.

## 공통 규칙

### Base와 인증

- API prefix는 `/api`입니다. `GET /health`만 prefix 밖에 둡니다.
- 인증 API와 공개 초대 조회를 제외한 API는 `Authorization: Bearer <accessToken>`을 요구합니다.
- access token은 response body, refresh token은 `HttpOnly`, `SameSite=Lax` cookie로 전달합니다.
- HTTPS 운영 환경의 refresh cookie는 `Secure`를 사용합니다.
- resource id만 받는 endpoint도 resource가 속한 장부의 권한을 다시 검사합니다.

### 형식

| 값 | 형식 |
| --- | --- |
| id | JSON number, 서버 `Long` |
| money | 원화 정수 number |
| date | `YYYY-MM-DD` |
| instant | UTC ISO-8601, 예: `2026-07-31T12:30:00Z` |
| timezone | IANA zone id, 예: `Asia/Seoul` |
| percentage | 0 이상 decimal number, 예: `82.5` |
| cursor | 서버가 발급한 opaque string |

- `null`은 필드가 개념상 존재하지만 현재 값이 없거나 적용되지 않을 때 사용합니다.
- optional 필드는 권한에 따라 숨겨야 하는 민감 정보에만 사용합니다. 예를 들어 상대방이 거래를 볼 때 `paymentMethod.displayName`은 key 자체를 반환하지 않습니다.
- 빈 목록은 `[]`, 내용 없는 성공은 `204 No Content`를 사용합니다.
- enum은 이 문서에 적힌 대문자 문자열만 사용합니다. 알 수 없는 enum을 조용히 기본값으로 바꾸지 않습니다.

### Pagination

거래·알림·기간 목록은 cursor pagination을 사용합니다.

```json
{
  "items": [],
  "nextCursor": null
}
```

- `limit` 기본값은 20, 최댓값은 100입니다.
- `nextCursor`가 `null`이면 다음 페이지가 없습니다.
- 정렬은 endpoint에 명시하며 cursor는 정렬 조건과 filter가 같을 때만 재사용합니다.

### Error

```json
{
  "code": "INVALID_REQUEST",
  "message": "요청 값이 올바르지 않습니다.",
  "fieldErrors": {
    "amount": "0보다 커야 합니다."
  }
}
```

- `fieldErrors`는 validation 실패에서만 optional입니다.
- malformed JSON과 validation 실패는 `400 INVALID_REQUEST`입니다.
- 인증이 없거나 만료되면 `401 UNAUTHORIZED`, 권한이 없으면 `403 FORBIDDEN`입니다.
- 존재하지만 조회할 수 없는 개인 거래 등은 존재 여부를 숨기기 위해 `404 RESOURCE_NOT_FOUND`를 사용합니다.
- 처리하지 못한 오류는 `500 INTERNAL_SERVER_ERROR`이고 내부 exception message를 공개하지 않습니다.

공통 오류:

| status | code | 의미 |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | body, query 또는 상태 전이 validation 실패 |
| 401 | `UNAUTHORIZED` | 인증 필요 또는 access token 오류 |
| 403 | `FORBIDDEN` | 알려진 장부 자원에 대한 동작 권한 없음 |
| 404 | `RESOURCE_NOT_FOUND` | 자원이 없거나 조회 사실을 숨겨야 함 |
| 409 | `CONFLICT` | 현재 상태와 충돌하거나 중복 요청 |
| 410 | `RESOURCE_EXPIRED` | 초대·import session 등 만료된 임시 자원 |
| 500 | `INTERNAL_SERVER_ERROR` | 공개할 수 없는 서버 오류 |

## 공통 DTO

### UserSummary

```json
{
  "id": 1,
  "nickname": "민지"
}
```

`email`과 OAuth provider 식별자는 일반 사용자 요약에 노출하지 않습니다.

### LedgerSummary

```json
{
  "id": 10,
  "name": "우리 생활비",
  "type": "SHARED",
  "role": "OWNER",
  "accessState": "ACTIVE",
  "partner": {
    "id": 2,
    "nickname": "준호"
  },
  "budgetCycle": {
    "startType": "DAY_OF_MONTH",
    "startDay": 10
  }
}
```

- `type`: `PERSONAL`, `SHARED`
- `role`: `OWNER`, `MEMBER`; 개인 장부 소유자는 `OWNER`
- `accessState`: `ACTIVE`, `FORMER_READ_ONLY`
- `partner`는 상대방이 없거나 개인 장부면 `null`입니다.
- `startType`: `DAY_OF_MONTH`, `LAST_DAY_OF_MONTH`; 후자는 `startDay=null`입니다.

### BudgetSource

```json
{
  "type": "PERSONAL",
  "ownerUserId": 1
}
```

- `type`: `PERSONAL`, `SHARED`
- `SHARED`이면 `ownerUserId=null`입니다.
- 사용자는 본인 `PERSONAL` 또는 `SHARED`만 거래 차감 대상으로 제출할 수 있습니다.

### TransactionScope

구조와 enum은 `BudgetSource`와 같습니다. 공동 장부의 모든 거래에 적용하며, 예산을 차감하지 않는 수입과 이체도 개인·공동 공개 범위를 잃지 않게 합니다. 개인 장부는 항상 소유자의 `PERSONAL` scope입니다.

### CategorySnapshot

```json
{
  "categoryId": 31,
  "groupCode": "FOOD",
  "groupName": "식비",
  "categoryName": "장보기"
}
```

미분류 거래는 `categoryId`, `groupCode`, `groupName`, `categoryName`이 모두 `null`입니다.

### TransactionSummary

```json
{
  "id": 501,
  "ledgerId": 10,
  "type": "EXPENSE",
  "transferType": null,
  "amount": 32400,
  "merchant": "동네마트",
  "occurredOn": "2026-07-31",
  "occurredAt": null,
  "memo": "주말 장보기",
  "category": {
    "categoryId": 31,
    "groupCode": "FOOD",
    "groupName": "식비",
    "categoryName": "장보기"
  },
  "scope": {
    "type": "SHARED",
    "ownerUserId": null
  },
  "budgetSource": {
    "type": "SHARED",
    "ownerUserId": null
  },
  "payer": {
    "id": 1,
    "nickname": "민지"
  },
  "paymentMethod": {
    "type": "CARD",
    "displayName": "생활비 카드"
  },
  "sharedWithPartner": null,
  "schedule": null,
  "lastModifiedBy": {
    "id": 1,
    "nickname": "민지"
  },
  "lastModifiedAt": "2026-07-31T12:30:00Z"
}
```

- `type`: `EXPENSE`, `INCOME`, `TRANSFER`
- `transferType`: `OWN_ACCOUNTS`, `OUTBOUND`, `INBOUND`; `TRANSFER`가 아니면 `null`
- `budgetSource`: 예산을 차감하지 않는 수입과 일부 이체면 `null`
- `scope`: 공동 장부의 개인·공동 공개 범위입니다. 개인 장부는 소유자의 `PERSONAL`입니다.
- `sharedWithPartner`: 공동 장부의 개인 scope 거래면 boolean, 공동 scope와 개인 장부 거래면 `null`
- `schedule`: 일반 거래면 `null`, 자동 거래면 `{kind, planId, sequence, totalSequences}`
- `installment`: 할부 거래가 아니면 `null`, 할부 거래면 `{planId, sequence, totalCount, monthlyInterest}`.
  `monthlyInterest`는 예약 할부 계획(`ScheduledPlan.monthlyInterestAmount`)이 있을 때만 값이 채워지고, 없으면 `null`입니다.
- `paymentMethod`: 미입력이면 `null`. 조회자가 결제자가 아니면 `displayName` key를 생략합니다.

## Health와 인증

### `GET /health`

- public
- `200 OK`

```json
{
  "status": "UP"
}
```

### `GET /api/auth/kakao/login-url`

- public
- Kakao authorization URL을 반환합니다.

```json
{
  "loginUrl": "https://kauth.kakao.com/oauth/authorize?..."
}
```

| status | code | 조건 |
| --- | --- | --- |
| 501 | `NOT_CONFIGURED` | Kakao OAuth 환경 변수 누락 |

### `POST /api/auth/kakao/callback`

- public
- authorization code를 한 번 교환하고 기본 개인 장부를 보장합니다.

```json
{
  "code": "authorization-code"
}
```

`200 OK`:

```json
{
  "accessToken": "jwt-access-token",
  "expiresInSeconds": 1800,
  "user": {
    "id": 1,
    "nickname": "민지",
    "nicknameConfirmed": false,
    "timezone": "Asia/Seoul"
  },
  "currentLedger": {
    "id": 1,
    "name": "민지의 개인 장부",
    "type": "PERSONAL",
    "role": "OWNER",
    "accessState": "ACTIVE",
    "partner": null,
    "budgetCycle": {
      "startType": "DAY_OF_MONTH",
      "startDay": 1
    }
  }
}
```

신규 사용자는 `nicknameConfirmed=false`여도 인증 상태이며, 닉네임 확정과 초대 확인을 제외한 제품 쓰기 API는 `409 NICKNAME_CONFIRMATION_REQUIRED`를 반환합니다.

### `POST /api/auth/dev-login`

- local/test 전용 public endpoint입니다.
- request: `{ "email": "dev@woorilog.local", "nickname": "개발자" }`
- response는 Kakao callback과 같고 닉네임은 확정된 상태입니다.
- 운영에서 `403 DEV_LOGIN_DISABLED`를 반환합니다.

### `POST /api/auth/refresh`

- refresh cookie로 access token을 재발급하고 refresh token을 회전합니다.
- response body는 callback 응답과 같습니다.

| status | code | 조건 |
| --- | --- | --- |
| 401 | `REFRESH_TOKEN_REQUIRED` | cookie 없음 |
| 401 | `INVALID_REFRESH_TOKEN` | 만료·폐기·재사용 |

### `POST /api/auth/logout`

- 현재 refresh token을 폐기하고 cookie를 만료시킵니다.
- `204 No Content`; access token이 만료됐어도 refresh cookie로 호출할 수 있습니다.

### `GET /api/me`

- authenticated
- callback과 같은 `user`, `currentLedger`를 반환합니다. `accessToken`과 `expiresInSeconds`는 반환하지 않습니다.

### `PATCH /api/me/profile`

- authenticated
- 최초 서비스 닉네임 확정 또는 이후 닉네임 변경입니다.

```json
{
  "nickname": "민지",
  "timezone": "Asia/Seoul"
}
```

- `200 OK`: 갱신된 user
- 닉네임은 공백 제거 후 1~20자입니다.

## 장부와 멤버십

### `GET /api/ledgers`

- authenticated
- 기본 개인 장부를 먼저, 활성 공동 장부를 최근 사용 순으로, 과거 읽기 전용 장부를 마지막에 반환합니다.

```json
{
  "items": [
    {
      "id": 1,
      "name": "민지의 개인 장부",
      "type": "PERSONAL",
      "role": "OWNER",
      "accessState": "ACTIVE",
      "partner": null,
      "budgetCycle": {
        "startType": "DAY_OF_MONTH",
        "startDay": 1
      }
    }
  ]
}
```

### `POST /api/ledgers/shared`

- authenticated, nickname confirmed
- 공동 장부를 만들고 요청 사용자를 `OWNER`로 추가하며 현재 기간 전체 예산을 생성합니다.

```json
{
  "name": "우리 생활비",
  "totalBudget": 2000000,
  "budgetCycle": {
    "startType": "DAY_OF_MONTH",
    "startDay": 10
  }
}
```

- `201 Created`: `{ "ledger": LedgerSummary, "currentBudgetPeriod": BudgetPeriodDetail }`
- `name`은 공백 제거 후 1~30자, `totalBudget`은 0 이상입니다.
- `LAST_DAY_OF_MONTH`이면 `startDay`는 `null`, `DAY_OF_MONTH`이면 1~28입니다.

### `POST /api/ledgers/{ledgerId}/use`

- active 또는 former read-only member
- 마지막 사용 장부를 바꾸고 `{ "currentLedger": LedgerSummary }`를 반환합니다.

### `PATCH /api/ledgers/{ledgerId}`

- active member

```json
{
  "name": "신혼 생활비",
  "budgetCycle": {
    "startType": "LAST_DAY_OF_MONTH",
    "startDay": null
  }
}
```

- 필드는 optional이며 하나 이상 필요합니다.
- 예산 기간 규칙 변경은 다음 시작하지 않은 기간부터 적용합니다.

### `GET /api/ledgers/{ledgerId}/members`

- active member; former member에게는 본인 참여 정보와 과거 조회 표시에 필요한 닉네임만 반환합니다.

```json
{
  "items": [
    {
      "user": { "id": 1, "nickname": "민지" },
      "role": "OWNER",
      "status": "ACTIVE",
      "joinedAt": "2026-07-01T00:00:00Z",
      "leftAt": null
    }
  ]
}
```

### `POST /api/ledgers/{ledgerId}/ownership-transfer`

- owner only; 활성 member가 있어야 합니다.

```json
{
  "newOwnerUserId": 2
}
```

- `200 OK`: 갱신된 member 목록
- `409 ACTIVE_MEMBER_REQUIRED`, `409 ALREADY_OWNER`

### `DELETE /api/ledgers/{ledgerId}/members/{userId}`

- owner only; owner 본인은 대상으로 지정할 수 없습니다.
- 멤버를 내보내고 예약 거래를 일시정지합니다.
- `204 No Content`
- `409 MEMBER_NOT_ACTIVE`

### `DELETE /api/ledgers/{ledgerId}/members/me`

- active member only. owner는 소유권 이전 전 호출할 수 없습니다.
- `204 No Content`
- `409 OWNER_TRANSFER_REQUIRED`

## 링크 초대

### `POST /api/ledgers/{ledgerId}/invitations/links`

- owner only
- 기존 활성 링크를 `REPLACED`로 바꾸고 30분 링크를 만듭니다.

`201 Created`:

```json
{
  "invitationId": 71,
  "url": "https://app.example.com/invitations/token-value",
  "expiresAt": "2026-07-31T13:00:00Z"
}
```

원문 token은 생성 응답과 공유 URL에서만 제공하며 DB에는 hash를 저장합니다.

| status | code | 조건 |
| --- | --- | --- |
| 409 | `LEDGER_MEMBER_LIMIT_REACHED` | 활성 멤버가 이미 두 명 |

### `DELETE /api/ledgers/{ledgerId}/invitations/{invitationId}`

- owner only, pending 링크 취소
- `204 No Content`

### `GET /api/invitations/links/{token}`

- public. 로그인 상태면 `Authorization` 헤더로 뷰어를 식별해 사전 판별 필드를 채웁니다.

```json
{
  "invitationId": 71,
  "ledgerName": "우리 생활비",
  "inviter": { "id": 1, "nickname": "민지" },
  "status": "PENDING",
  "expiresAt": "2026-07-31T13:00:00Z",
  "authenticationRequired": true,
  "currentMemberCount": 1,
  "viewerAlreadyMember": null,
  "budgetCycle": { "startType": "DAY_OF_MONTH", "startDay": 1 }
}
```

- `currentMemberCount`: 링크가 걸린 장부의 현재 활성 멤버 수. 2명이면 참여 버튼을 누르기 전에 정원 초과를 안내할 수 있습니다.
- `viewerAlreadyMember`: 비로그인 조회(`authenticationRequired: true`)에서는 판별 불가이므로 `null`입니다. 로그인 상태에서는 뷰어가 해당 장부의 활성 멤버인지 여부(`true`/`false`)입니다.
- `budgetCycle`: 장부의 예산 기간 시작 규칙(`BudgetCycleResponse`, `ledger.budgetCycle`과 동일 형식).
- 상태 판별은 조회 단계에서 세 가지로 구분합니다.

| status | code | 조건 |
| --- | --- | --- |
| 404 | `NOT_FOUND` | token이 존재하지 않거나 LINK 타입이 아님 |
| 409 | `INVITATION_ALREADY_PROCESSED` | 이미 수락·거절·취소되었거나 새 링크로 교체됨 |
| 410 | `INVITATION_EXPIRED` | PENDING 상태에서 유효 시간이 지남 |

### `POST /api/invitations/links/{token}/accept`

- authenticated, nickname confirmed
- 수락과 멤버십 생성, 마지막 사용 장부 변경을 한 트랜잭션에서 처리합니다.
- `200 OK`: `{ "ledger": LedgerSummary }`
- 조회와 같은 token 상태 검증(`requireUsableLink`)을 공유하므로 아래 404/409/410 코드도 동일하게 발생합니다.

| status | code | 조건 |
| --- | --- | --- |
| 404 | `NOT_FOUND` | token이 존재하지 않거나 LINK 타입이 아님 |
| 409 | `ALREADY_LEDGER_MEMBER` | 이미 활성 멤버 |
| 409 | `LEDGER_MEMBER_LIMIT_REACHED` | 동시 수락 등으로 두 명 도달 |
| 409 | `DIFFERENT_PARTNER_NOT_ALLOWED` | 과거 상대방과 다른 사용자 |
| 409 | `INVITATION_ALREADY_PROCESSED` | 이미 수락·거절·취소되었거나 새 링크로 교체됨 |
| 410 | `INVITATION_EXPIRED` | PENDING 상태에서 유효 시간이 지남 |

### `POST /api/invitations/links/{token}/reject`

- authenticated, nickname confirmed
- pending 링크를 `REJECTED`로 바꾸고 `204 No Content`를 반환합니다.

## 예산 기간

### BudgetPeriodDetail

```json
{
  "id": 81,
  "ledgerId": 10,
  "startDate": "2026-07-10",
  "endDate": "2026-08-09",
  "status": "CURRENT",
  "totalBudget": 2000000,
  "allocations": [
    {
      "id": 811,
      "source": { "type": "PERSONAL", "ownerUserId": 1 },
      "owner": { "id": 1, "nickname": "민지" },
      "amount": 400000,
      "spentAmount": 150000,
      "currentBalance": 250000,
      "scheduledAmount": 50000,
      "availableAmount": 200000
    },
    {
      "id": 812,
      "source": { "type": "SHARED", "ownerUserId": null },
      "owner": null,
      "amount": 1200000,
      "spentAmount": 500000,
      "currentBalance": 700000,
      "scheduledAmount": 100000,
      "availableAmount": 600000
    }
  ],
  "reserveAmount": 400000,
  "prepared": true,
  "copiedFromPeriodId": null
}
```

- `status`: `UPCOMING`, `CURRENT`, `PAST`
- allocation은 상위 금액이므로 상대방 개인 allocation도 포함합니다.
- 상대방 개인 allocation의 대분류 예산과 거래 상세는 포함하지 않습니다.
- 첫 배분 전에는 `allocations=[]`, `reserveAmount=null`, `prepared=false`입니다.
- 개인 장부에서는 소유자의 personal allocation이 `totalBudget`과 같고 shared allocation과 예비비를 사용하지 않습니다.

### `GET /api/ledgers/{ledgerId}/budget-periods/current`

- active member
- query `at` optional, 기본은 서버 clock의 오늘입니다.
- 해당 날짜를 포함하는 `BudgetPeriodDetail`을 반환합니다.

### `GET /api/ledgers/{ledgerId}/budget-periods`

- active 또는 former read-only member
- query: `cursor`, `limit`; 최신 시작일 순
- former member에게는 참여 구간과 겹치는 기간만 반환합니다.

### `GET /api/ledgers/{ledgerId}/budget-periods/{startDate}`

- active 또는 해당 기간 former member
- `BudgetPeriodDetail`과 조회자에게 허용된 category budgets를 반환합니다.

응답은 `BudgetPeriodDetail`이며 `categoryBudgets`는 그 안의 필드입니다(별도 `period` 래핑 없음):

```json
{
  "id": 1,
  "ledgerId": 1,
  "startDate": "2026-07-10",
  "endDate": "2026-08-09",
  "status": "CURRENT",
  "totalBudget": 2000000,
  "allocations": [],
  "reserveAmount": 600000,
  "prepared": true,
  "copiedFromPeriodId": null,
  "categoryBudgets": [
    {
      "source": { "type": "SHARED", "ownerUserId": null },
      "groupCode": "FOOD",
      "groupName": "식비",
      "amount": 400000,
      "spentAmount": 320000,
      "previousSpentAmount": 280000
    }
  ]
}
```

개인 category budget은 본인 것만 반환합니다.

- `previousSpentAmount`는 같은 장부에서 이 기간 바로 이전 기간의 같은 대분류·source 사용액입니다.
- 이전 기간이 없거나(첫 기간), 이전 기간에 같은 scope/owner의 allocation 자체가 없었으면 `null`입니다.
- 이전 기간에 해당 allocation은 있었지만 그 대분류 지출이 없었으면 `0`입니다.

### `PUT /api/ledgers/{ledgerId}/budget-periods/{startDate}`

- active member
- 현재 또는 미래 기간 설정입니다.

```json
{
  "totalBudget": 2000000,
  "personalAllocations": [
    { "userId": 1, "amount": 400000 },
    { "userId": 2, "amount": 400000 }
  ],
  "sharedAllocation": 1000000,
  "categoryBudgets": [
    {
      "source": { "type": "SHARED", "ownerUserId": null },
      "groupCode": "FOOD",
      "amount": 400000
    },
    {
      "source": { "type": "PERSONAL", "ownerUserId": 1 },
      "groupCode": "LEISURE",
      "amount": 100000
    }
  ],
  "increaseTotalBudgetIfNeeded": false,
  "applyToFutureDefaults": true
}
```

- 상대방 개인 category budget은 요청할 수 없습니다.
- 배분 합계가 전체 예산보다 크고 `increaseTotalBudgetIfNeeded=false`이면 `409 TOTAL_BUDGET_INCREASE_CONFIRMATION_REQUIRED`입니다.
- category budget 합계가 allocation보다 큰 경우도 같은 방식으로 명시적 증액이 필요합니다.
- `200 OK`: 갱신된 `BudgetPeriodDetail`

### `POST /api/ledgers/{ledgerId}/budget-periods/{startDate}/copy`

- active member, target은 미래 기간

```json
{
  "sourceStartDate": "2026-07-10"
}
```

- 전체·개인·공동·대분류 예산 설정만 복사하고 잔액·초과액은 복사하지 않습니다.
- 이미 준비된 기간이면 `409 BUDGET_PERIOD_ALREADY_PREPARED`입니다.

### `POST /api/ledgers/{ledgerId}/budget-periods/{startDate}/reserve-transfers`

- active member

```json
{
  "amount": 100000,
  "target": { "type": "SHARED", "ownerUserId": null }
}
```

- 본인 개인 allocation 또는 공동 allocation만 target으로 허용합니다.
- `201 Created`: transfer와 갱신된 period
- `409 INSUFFICIENT_RESERVE`

### `GET /api/ledgers/{ledgerId}/budget-periods/{startDate}/reserve-transfers`

- active 또는 해당 기간 former member
- 생성 시각 오름차순으로 `{id, amount, target, actor, createdAt}` 목록을 반환합니다.
- 두 활성 멤버와 해당 기간에 참여한 former member가 같은 이전 기록을 조회합니다.

### `GET /api/ledgers/{ledgerId}/budget-periods/{startDate}/summary`

- active 또는 해당 기간 former member
- 공동·본인 allocation 결과, 대분류 지출, 미분류 건수와 다음 기간 예정 고정비·할부를 반환합니다.
- 상대방 개인 allocation 세부 내역은 반환하지 않습니다.

## 카테고리

### `GET /api/ledgers/{ledgerId}/category-groups`

- ledger read access

```json
{
  "items": [
    {
      "code": "FOOD",
      "name": "식비",
      "transactionType": "EXPENSE",
      "hidden": false,
      "sortOrder": 10
    }
  ]
}
```

### `PATCH /api/ledgers/{ledgerId}/category-groups/{groupCode}`

- active member
- request: `{ "hidden": true }`
- 이름·code·type은 바꿀 수 없습니다.

### `GET /api/ledgers/{ledgerId}/categories`

- ledger read access
- query: `transactionType`, `includeInactive=false`

```json
{
  "items": [
    {
      "id": 31,
      "groupCode": "FOOD",
      "groupName": "식비",
      "name": "장보기",
      "active": true,
      "defaultCategory": true
    }
  ]
}
```

### `POST /api/ledgers/{ledgerId}/categories`

- active member
- request: `{ "groupCode": "FOOD", "name": "데이트 외식" }`
- `201 Created`
- `409 CATEGORY_NAME_DUPLICATED`

### `PATCH /api/categories/{categoryId}`

- active member

```json
{
  "name": "주간 장보기",
  "applyNameToPastTransactions": false
}
```

- `applyNameToPastTransactions=true`이면 접근 가능한 해당 장부 거래 snapshot도 변경합니다.

### `DELETE /api/categories/{categoryId}`

- active member
- category를 비활성화하고 과거 snapshot을 유지합니다.
- `204 No Content`

## 거래

### `GET /api/ledgers/{ledgerId}/transactions`

- active 또는 former read-only member
- 최신 `occurredOn`, `occurredAt`, id 순
- query:

| 이름 | 형식 | 설명 |
| --- | --- | --- |
| `periodStart` | date | 예산 기간 시작일 |
| `query` | string | 사용처·메모 검색 |
| `types` | comma enum | `EXPENSE,INCOME,TRANSFER` |
| `categoryGroupCodes` | comma string | 대분류 filter |
| `scopes` | comma enum | `PERSONAL,SHARED` |
| `kinds` | comma enum | `NORMAL,FIXED_EXPENSE,INSTALLMENT` |
| `shared` | boolean | 개인 거래 공유 여부 |
| `unclassified` | boolean | 미분류만 조회 |
| `cursor`, `limit` | pagination | cursor paging |

- 공동 장부에서 공동 거래와 본인 개인 거래를 반환합니다.
- 상대방 개인 거래는 예산 상세의 전용 endpoint에서 공유 건만 반환합니다.
- former member는 참여 기간의 본인 거래와 공동 거래만 반환합니다.
- 응답에는 현재 장부의 `unclassifiedCount`를 별도 필드로 포함해 분류 배지를 갱신합니다.

### `POST /api/ledgers/{ledgerId}/transactions`

- active member

```json
{
  "type": "EXPENSE",
  "transferType": null,
  "amount": 32400,
  "merchant": "동네마트",
  "occurredOn": "2026-07-31",
  "occurredAt": null,
  "memo": "주말 장보기",
  "categoryId": 31,
  "scope": { "type": "SHARED", "ownerUserId": null },
  "budgetSource": { "type": "SHARED", "ownerUserId": null },
  "payerUserId": 1,
  "paymentMethod": {
    "type": "CARD",
    "displayName": "생활비 카드"
  },
  "sharedWithPartner": null,
  "installment": null
}
```

- `merchant`, `categoryId`는 빠른 기록에서 필수입니다.
- `EXPENSE`와 `TRANSFER/OUTBOUND`는 budget source가 필수입니다.
- `INCOME`, `TRANSFER/OWN_ACCOUNTS`, `TRANSFER/INBOUND`는 budget source가 `null`입니다.
- 공동 장부에서는 `scope`가 필수이고, 예산 차감 거래의 scope와 budget source는 같아야 합니다.
- 개인 source이면 `ownerUserId`는 인증 사용자여야 합니다.
- 개인 거래의 `sharedWithPartner` 생략 시 장부별 공유 기본값을 사용합니다.
- 저장 성공 시 이 거래의 유효한 budget source를 사용자·장부별 마지막 차감 대상으로 기억합니다.
- `201 Created`: `TransactionSummary`

할부 request:

```json
{
  "amount": 1200000,
  "occurredOn": "2026-07-31",
  "installment": {
    "months": 12,
    "monthlyInterest": 0
  }
}
```

- 할부 요청의 `amount`는 사용자가 입력한 전체 원금이고 `occurredOn`은 첫 결제일입니다. 서버가 회차별 원금을 계산하며 생성된 첫 거래의 `amount`는 첫 회차 원금과 월 이자의 합입니다.
- `months`는 2 이상이며 상한은 서버 validation으로 명시합니다.

### `GET /api/transactions/{transactionId}`

- 거래 조회 권한
- `TransactionSummary`와 계획·공개 상태 상세를 반환합니다.
- 상대방 공유 개인 거래에서는 민감 결제수단 식별 필드를 생략합니다.

### `PUT /api/transactions/{transactionId}`

- 개인 거래는 소유자, 공동 거래는 active member
- create body와 같은 최종 상태를 받습니다. 자동 생성 거래의 plan 수정은 이 endpoint가 아니라 예약 거래 API를 사용합니다.
- `200 OK`: 갱신된 `TransactionSummary`

### `PATCH /api/transactions/{transactionId}/visibility`

- 개인 거래 소유자 only
- request: `{ "sharedWithPartner": true }`
- `200 OK`: 갱신된 거래

### `PUT /api/ledgers/{ledgerId}/transaction-sharing-default`

- active member

```json
{
  "shareNewPersonalTransactions": true,
  "shareExistingPersonalTransactions": true
}
```

- 켤 때 `shareExistingPersonalTransactions=true`가 필요합니다.
- 끌 때 기존 거래는 바꾸지 않으므로 `shareExistingPersonalTransactions`는 `false`여야 합니다.

### `GET /api/ledgers/{ledgerId}/transaction-entry-defaults`

- active member

```json
{
  "budgetSource": { "type": "PERSONAL", "ownerUserId": 1 },
  "shareNewPersonalTransactions": false
}
```

- 저장된 source가 현재 기간에 유효하지 않으면 본인 personal source를 반환합니다.

### `GET /api/ledgers/{ledgerId}/merchant-suggestions`

- active member
- query: `query` 1자 이상, `limit` 기본 10·최대 20
- 인증 사용자와 현재 장부의 확정 거래만 사용합니다.

```json
{
  "items": [
    {
      "merchant": "동네마트",
      "suggestedCategoryId": 31
    }
  ]
}
```

- 상대방 거래와 다른 장부 거래, 삭제된 category는 추천 근거에서 제외합니다.

### `DELETE /api/transactions/{transactionId}`

- 수정과 같은 권한
- 거래와 예산 반영을 제거하고 `204 No Content`를 반환합니다.

### `POST /api/ledgers/{ledgerId}/transactions/bulk-classify`

- 모든 거래의 수정 권한 필요

```json
{
  "transactionIds": [501, 502],
  "categoryId": 31
}
```

- 최대 100건, 전체 성공 또는 전체 실패
- `200 OK`: 갱신된 거래 id 목록

## 예산 상세·대시보드·분석

### `GET /api/dashboard/current`

- authenticated
- query: `ledgerId` optional(없으면 현재 장부), `periodStart` optional(없으면 현재 기간)
- 공동 장부 응답은 공동 allocation, 본인 allocation, 기간 수입 합계, 공동·본인 최근 거래, 최신 주간 가이드와 empty-state code를 반환합니다.

```json
{
  "ledger": {},
  "period": {},
  "sharedBudget": {},
  "myBudget": {},
  "incomeAmount": 3000000,
  "recentTransactions": [],
  "weeklyGuide": null,
  "emptyState": "READY"
}
```

- `emptyState`: `INVITE_PARTNER`, `ALLOCATE_BUDGET`, `ADD_FIRST_TRANSACTION`, `READY`
- 상대방 allocation과 거래는 홈 응답에 포함하지 않습니다.

### `GET /api/ledgers/{ledgerId}/budget-periods/{startDate}/allocations/{allocationId}`

- allocation 상세
- 본인·공동 allocation은 전체 거래를, 상대방 개인 allocation은 공유 거래만 반환합니다.
- 금액 요약, 대분류 사용액, 일별 흐름, 남은 예약 지출과 거래 cursor page를 반환합니다.

### `GET /api/ledgers/{ledgerId}/analytics`

- active 또는 former read-only member
- query: `periodStart`, `scope=ALL|SHARED|MINE`
- 총지출, 미분류 포함 대분류 분포, 일별·누적 흐름, 이전 기간 증감과 6·12개 기간 추세를 반환합니다.
- `ALL`은 공동 거래와 본인 개인 거래만 포함합니다. 상대방 개인 거래는 공유 여부와 관계없이 제외합니다.
- `INCOME`, `TRANSFER/OWN_ACCOUNTS`, `TRANSFER/INBOUND`는 총지출에서 제외합니다.
- `categoryDistribution`의 각 항목은 `{ groupCode, groupName, amount, previousAmount }`입니다.
  `previousAmount`는 조회 중인 기간 바로 이전 기간(같은 `scope` 필터 적용)의 같은 대분류 지출액입니다.
  이전 기간 자체가 없으면(첫 기간) `null`이고, 이전 기간은 있지만 해당 대분류 지출이 없었으면 `0`입니다.

## 이미지 가져오기

세부 품질·중복 기준은 [Transaction Import](./transaction-import.md)를 따릅니다.

### `POST /api/ledgers/{ledgerId}/transaction-imports/previews`

- active member
- `multipart/form-data`
- fields: `sourceTypes=RECEIPT|CARD_APP_SCREENSHOT` (반복 필드, `images[]`와 같은 개수·순서로 이미지별 종류를 지정합니다), `images[]`

`200 OK`:

```json
{
  "sessionId": "imp_opaque_id",
  "expiresAt": "2026-07-31T14:00:00Z",
  "omittedCount": 2,
  "candidates": [
    {
      "candidateId": 1,
      "amount": 32400,
      "occurredOn": "2026-07-31",
      "merchant": "동네마트",
      "suggestedCategoryId": 31,
      "defaultBudgetSource": { "type": "PERSONAL", "ownerUserId": 1 },
      "duplicateSuspected": false,
      "duplicateReason": null,
      "duplicateTransactionId": null,
      "selectedByDefault": true,
      "sourceType": "RECEIPT"
    }
  ]
}
```

- `duplicateSuspected=true`인 후보는 `duplicateReason`이 항상 `"DATE_AMOUNT_MERCHANT"`(날짜·금액·정규화한 사용처 일치)입니다.
- `duplicateTransactionId`는 그 후보가 겹치는 **기존에 저장된 거래**의 id입니다. 같은 업로드 배치 안의 다른 후보와만 겹치는 경우(아직 저장되지 않음)에는 `duplicateSuspected=true`이지만 `duplicateTransactionId`는 `null`입니다.
- `sourceType`은 그 후보가 만들어진 원본 이미지에 대해 요청에서 지정한 값입니다.

| status | code | 조건 |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | `sourceTypes` 개수가 `images[]` 개수와 다름 |
| 400 | `UNSUPPORTED_MEDIA` | 지원하지 않는 파일 |
| 413 | `UPLOAD_LIMIT_EXCEEDED` | 장수 또는 크기 제한 초과 |

### `POST /api/ledgers/{ledgerId}/transaction-imports`

- active member

```json
{
  "sessionId": "imp_opaque_id",
  "candidates": [
    {
      "candidateId": 1,
      "amount": 32400,
      "occurredOn": "2026-07-31",
      "merchant": "동네마트",
      "categoryId": 31,
      "budgetSource": { "type": "SHARED", "ownerUserId": null },
      "paymentMethod": null,
      "sharedWithPartner": null
    }
  ]
}
```

- 선택한 후보 전체를 한 트랜잭션에서 저장합니다.
- `201 Created`: `{ "created": [{ "candidateId": 1, "transaction": TransactionSummary }] }`
- 같은 session 재전송은 기존 성공 결과를 반환하고 중복 생성하지 않습니다.

| status | code | 조건 |
| --- | --- | --- |
| 400 | `INVALID_IMPORT_CANDIDATE` | 최종 후보 validation 실패 |
| 410 | `IMPORT_SESSION_EXPIRED` | 만료 또는 사용할 수 없는 session |

## 반복 거래·고정비·할부

세부 생성 규칙은 [Scheduled Transactions](./scheduled-transactions.md)를 따릅니다.

### `GET /api/ledgers/{ledgerId}/scheduled-plans`

- active member
- query: `status=ACTIVE|PAUSED`, `kind=RECURRING_EXPENSE|INSTALLMENT`, `fixedExpense`
- 결제수단 식별 정보는 계획 소유자에게만 반환합니다.
- 응답 항목은 `categoryId`, `categoryName`, `budgetSource`를 포함합니다.
- `INSTALLMENT` 계획은 `totalAmount`(할부 전체 원금), `round`(현재까지 발생 처리된 회차), `totalRounds`(총 회차),
  `principalAmount`(현재 회차 원금), `monthlyInterest`(월 이자)를 함께 반환합니다. `RECURRING_EXPENSE` 계획은 이 다섯 필드를 `null`로 반환합니다.

### `POST /api/ledgers/{ledgerId}/scheduled-plans/recurring-expenses`

- active member

```json
{
  "name": "월세",
  "amount": 800000,
  "merchant": "임대인",
  "categoryId": 41,
  "budgetSource": { "type": "SHARED", "ownerUserId": null },
  "frequency": "MONTHLY",
  "startDate": "2026-08-01",
  "endDate": null,
  "isFixedExpense": true,
  "paymentMethod": null
}
```

- `frequency`: `WEEKLY`, `MONTHLY`, `YEARLY`
- `201 Created`: plan과 즉시 생성한 첫 거래가 있으면 그 거래

### `PUT /api/scheduled-plans/{planId}`

- 계획의 차감 대상 수정 권한

```json
{
  "scope": "FUTURE",
  "name": "월세",
  "amount": 820000,
  "categoryId": 41,
  "budgetSource": { "type": "SHARED", "ownerUserId": null },
  "frequency": "MONTHLY",
  "nextDueDate": "2026-09-01",
  "endDate": null,
  "isFixedExpense": true
}
```

- `scope`는 V1에서 `FUTURE`만 허용합니다. 이미 생성된 한 거래는 거래 API에서 수정합니다.

### `POST /api/scheduled-plans/{planId}/pause`

- request: `{ "reason": "USER_REQUEST" }`
- `200 OK`: paused plan

### `POST /api/scheduled-plans/{planId}/resume`

- request: `{ "nextDueDate": "2026-09-01" }`
- 지난 발생분을 자동 소급 생성하지 않습니다.

### `DELETE /api/scheduled-plans/{planId}`

- 미래 occurrence를 취소하고 과거 생성 거래는 유지합니다.
- `204 No Content`

### `GET /api/ledgers/{ledgerId}/fixed-expenses`

- active member
- `isFixedExpense=true`인 반복 지출과 현재 기간 예정 합계를 반환합니다.

## 알림

### `GET /api/notifications`

- authenticated
- query: `ledgerId` optional, `unreadOnly=false`, `cursor`, `limit`
- 최신 생성 순

```json
{
  "items": [
    {
      "id": 901,
      "type": "BUDGET_THRESHOLD_80",
      "title": "공동 예산을 80% 사용했어요",
      "message": "남은 사용 가능액을 확인해 보세요.",
      "ledgerId": 10,
      "budgetPeriodStart": "2026-07-10",
      "targetPath": "/budgets?period=2026-07-10",
      "read": false,
      "createdAt": "2026-07-31T12:30:00Z"
    }
  ],
  "unreadCount": 3,
  "nextCursor": null
}
```

### `POST /api/notifications/{notificationId}/read`

- 수신 사용자 only
- `204 No Content`, 이미 읽었어도 성공

### `POST /api/notifications/read-all`

- 인증 사용자의 모든 현재 알림을 읽음 처리합니다. 현재 page에 제한되지 않습니다.
- `204 No Content`

### `GET /api/notification-preferences`

```json
{
  "budgetWarning80Enabled": true,
  "weeklyGuideEnabled": true
}
```

### `PUT /api/notification-preferences`

- 두 boolean을 모두 받습니다.
- 100%·초과와 공동 예산 변경 알림은 필수이므로 설정 필드가 없습니다.

## 이전 API 전환

현재 구현 endpoint는 새 V1 구현이 배포될 때 아래처럼 처리합니다.

| 현재 endpoint/기능 | V1 처리 |
| --- | --- |
| `POST /api/ledgers/personal` | 제거; 기본 개인 장부만 허용 |
| `POST /api/ledgers/group` | `POST /api/ledgers/shared`로 교체 |
| `POST /api/ledgers/{id}/archive` | 제거; 공동 장부 보관 미지원 |
| `/api/ledgers/{id}/invitable-user` | 제거; 사용자 검색 미지원 |
| `/api/ledgers/{id}/invitations/users` | 제거; 직접 초대 미지원 |
| pending 직접 초대 API | 제거 |
| `/api/ledgers/{id}/months/{YYYY-MM}` | budget-period endpoint로 교체 |
| 월 `close`, `reopen` | 제거; 수동 마감 미지원 |
| 월 settlement API | 쓰기 제거, migration 후 legacy 보존 |
| card 관리 API | 화면·새 쓰기 제거; 거래 snapshot으로 전환 |
| fixed-budget API | `scheduled-plans`의 fixed expense로 교체 |
| 월 거래 목록·통계 | budget period 기반 거래·analytics로 교체 |
| text import preview | 제거; 영수증·카드 앱 이미지 preview로 통합 |
| recurring `due`, `generate` public API | 사용자 API에서 제거하고 내부 scheduler로 전환 |
| transaction bulk delete | V1 화면에서 제거; 필요 시 별도 계약 후 재도입 |

- 구형 endpoint를 새 의미로 조용히 재사용하지 않습니다.
- 호환 기간이 필요하면 응답에 `Deprecation`과 `Sunset` header를 추가하고 제거일을 배포 문서에 확정합니다.
- 구현 완료 전까지 현재 controller의 실제 동작을 확인해야 하는 개발자는 git history의 이전 API 문서와 controller/test를 함께 봅니다. 이 문서는 목표 V1 호출자 계약만 정의합니다.

## 계약 완료 체크리스트

- endpoint마다 인증·권한·상태 코드가 구현과 테스트에 반영됩니다.
- optional과 nullable이 DTO/OpenAPI schema와 일치합니다.
- 상대방 비공개 거래와 결제수단 식별 정보가 query 단계에서 제외됩니다.
- 예산 기간 경계와 과거 기간 알림 억제가 고정 clock 테스트로 검증됩니다.
- 초대 수락, import save, 예약 거래 생성은 동시 요청과 재시도에도 중복되지 않습니다.
- 제거 endpoint는 프론트엔드 참조가 사라진 뒤에만 삭제합니다.
