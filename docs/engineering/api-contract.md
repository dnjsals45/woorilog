# API Contract

이 문서는 V1 API 계약의 목차와 공통 규칙입니다. 구현이 진행되면서 endpoint별 request/response 예시를 채웁니다.

## Common Rules

- API prefix: `/api`
- Protected API는 JWT Bearer token 인증을 요구합니다.
- Authorization header: `Authorization: Bearer <accessToken>`
- response DTO는 내부 entity를 직접 노출하지 않습니다.
- date는 ISO-8601 형식을 사용합니다.
- budget month는 `YYYY-MM` 형식을 사용합니다.
- money는 정수 minor unit 또는 decimal 계열로 표현하고, endpoint별 단위를 명시합니다.

## Error Format

초기 기준:

```json
{
  "code": "INVALID_REQUEST",
  "message": "요청 값이 올바르지 않습니다."
}
```

## Endpoint Groups

### Health

- `GET /health`

### Auth

- `GET /api/auth/kakao/login-url`
- `POST /api/auth/kakao/callback`
- `GET /api/me`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/dev-login`

`POST /api/auth/dev-login` is available only in local/test environments. It exists for local UI verification and Playwright automation, not as a production login method.

## POST /api/auth/dev-login

### Purpose

- local/test 환경에서 실제 Kakao 계정 없이 보호 화면에 진입합니다.
- DEV provider user를 upsert하고 기본 개인 장부를 보장합니다.

### Auth

- public
- production에서는 비활성화되어야 합니다.

### Request

Body:

```json
{
  "email": "dev@woorilog.local",
  "nickname": "우리로그 개발자"
}
```

### Response

Success status:

```text
200 OK
```

Body:

```json
{
  "accessToken": "jwt-access-token",
  "expiresInSeconds": 1800,
  "user": {
    "id": 1,
    "email": "dev@woorilog.local",
    "nickname": "우리로그 개발자",
    "lastUsedLedgerId": 1
  },
  "currentLedger": {
    "id": 1,
    "name": "우리로그 개발자의 개인 장부",
    "type": "PERSONAL",
    "ownerId": 1,
    "recurringSummaryClosingDay": 31
  }
}
```

### Errors

| status | code | when |
| --- | --- | --- |
| 400 | INVALID_REQUEST | email or nickname validation failed |
| 403 | FORBIDDEN | developer login disabled |

## GET /api/me

### Purpose

- 현재 인증된 사용자와 현재 사용 장부를 조회합니다.

### Auth

- authenticated

### Response

```json
{
  "user": {
    "id": 1,
    "email": "dev@woorilog.local",
    "nickname": "우리로그 개발자",
    "lastUsedLedgerId": 1
  },
  "currentLedger": {
    "id": 1,
    "name": "우리로그 개발자의 개인 장부",
    "type": "PERSONAL",
    "ownerId": 1,
    "recurringSummaryClosingDay": 31
  }
}
```

## POST /api/auth/logout

### Auth

- refresh cookie가 있으면 해당 세션을 폐기합니다. access token이 만료된 상태에서도 호출할 수 있습니다.

### Response

```text
204 No Content
```

## POST /api/auth/refresh

### Purpose

- HttpOnly refresh cookie로 새 access token을 발급하고 refresh token을 회전합니다.
- 사용한 refresh token은 즉시 폐기되며 재사용할 수 없습니다.

### Response

Success status: `200 OK`

```json
{
  "accessToken": "jwt-access-token",
  "expiresInSeconds": 1800,
  "user": {
    "id": 1,
    "email": "dev@woorilog.local",
    "nickname": "우리로그 개발자",
    "lastUsedLedgerId": 1
  },
  "currentLedger": {
    "id": 1,
    "name": "우리로그 개발자의 개인 장부",
    "type": "PERSONAL",
    "ownerId": 1,
    "recurringSummaryClosingDay": 31
  }
}
```

응답은 회전된 `woorilog.refreshToken` HttpOnly, SameSite=Lax cookie를 함께 설정합니다. 운영 HTTPS 환경에서는 `REFRESH_COOKIE_SECURE=true`를 사용합니다.

### Errors

| status | code | when |
| --- | --- | --- |
| 401 | REFRESH_TOKEN_REQUIRED | refresh cookie가 없음 |
| 401 | INVALID_REFRESH_TOKEN | token이 유효하지 않거나 만료·폐기·재사용됨 |

## GET /api/auth/kakao/login-url

### Purpose

- Kakao authorization code 요청 URL을 반환합니다.
- `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI`가 모두 설정되어야 합니다.

### Response

```json
{
  "loginUrl": "https://kauth.kakao.com/oauth/authorize?..."
}
```

### Errors

| status | code | when |
| --- | --- | --- |
| 501 | `NOT_CONFIGURED` | Kakao OAuth 환경 변수가 설정되지 않았을 때 |

## POST /api/auth/kakao/callback

### Purpose

- Kakao authorization code를 교환하고 우리로그 access token을 반환합니다.

### Request

```json
{
  "code": "kakao-authorization-code"
}
```

### Response

- `POST /api/auth/dev-login`과 같은 인증 응답을 반환합니다.

### Errors

| status | code | when |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | authorization code가 비어 있을 때 |
| 502 | `KAKAO_AUTH_FAILED` | Kakao token 또는 user API 호출이 실패했을 때 |
| 501 | `NOT_CONFIGURED` | Kakao OAuth 환경 변수가 설정되지 않았을 때 |

## GET /api/ledgers

### Purpose

- 인증 사용자가 접근 가능한 장부 목록과 현재 사용 장부 id를 조회합니다.

### Auth

- authenticated

### Response

```json
{
  "currentLedgerId": 1,
  "ledgers": [
    {
      "id": 1,
      "name": "우리로그 개발자의 개인 장부",
      "type": "PERSONAL",
      "ownerId": 1,
      "recurringSummaryClosingDay": 31
    }
  ]
}
```

## GET /api/ledgers/{ledgerId}/members

### Purpose

- 장부 멤버를 조회합니다. 거래 결제자 선택과 월별 멤버 할당에 사용합니다.

### Auth

- authenticated
- current user must be a member of the ledger.

### Response

```json
[
  {
    "userId": 1,
    "nickname": "우리로그 개발자",
    "role": "OWNER"
  }
]
```

## POST /api/ledgers/personal

### Purpose

- 추가 개인 장부를 생성하고 현재 사용 장부로 전환합니다.

### Auth

- authenticated

### Request

```json
{
  "name": "생활비 장부"
}
```

### Response

```json
{
  "id": 2,
  "name": "생활비 장부",
  "type": "PERSONAL",
  "ownerId": 1,
  "recurringSummaryClosingDay": 31
}
```

## POST /api/ledgers/group

### Purpose

- 공동 장부를 생성하고 현재 사용 장부로 전환합니다.

### Auth

- authenticated

### Request

```json
{
  "name": "가족 장부"
}
```

### Response

```json
{
  "id": 3,
  "name": "가족 장부",
  "type": "GROUP",
  "ownerId": 1,
  "recurringSummaryClosingDay": 31
}
```

## POST /api/ledgers/{ledgerId}/use

### Purpose

- 접근 가능한 장부를 현재 사용 장부로 전환합니다.

### Auth

- authenticated
- current user must be a member of the ledger.

### Response

```json
{
  "id": 2,
  "name": "생활비 장부",
  "type": "PERSONAL",
  "ownerId": 1,
  "recurringSummaryClosingDay": 31
}
```

## PATCH /api/ledgers/{ledgerId}

### Purpose

- 장부 이름 또는 반복 거래 집계 마감일을 변경합니다.

### Auth

- authenticated
- current user must be the ledger owner.

### Request

```json
{
  "recurringSummaryClosingDay": 10
}
```

- `name`, `recurringSummaryClosingDay` 중 하나 이상을 전송합니다.
- 집계 마감일은 `1`~`31`입니다. `10`이면 매월 11일부터 다음 달 10일까지를 하나의 반복 거래 집계 기간으로 계산하고, `31`이면 달력 월 단위로 계산합니다.

### Response

- 변경된 ledger response.

### Errors

| status | code | when |
| --- | --- | --- |
| 403 | FORBIDDEN | user is not a ledger member |
| 404 | NOT_FOUND | ledger does not exist |

## GET /api/ledgers/{ledgerId}/categories

### Purpose

- 장부의 거래 카테고리 목록을 sort order 기준으로 조회합니다.

### Auth

- authenticated
- current user must be a ledger member.

### Response

```json
[
  {
    "id": 1,
    "ledgerId": 1,
    "name": "식비",
    "type": "EXPENSE",
    "categoryGroupId": 1,
    "categoryGroupName": "식비",
    "sortOrder": 1,
    "defaultCategory": true
  }
]
```

## POST /api/ledgers/{ledgerId}/categories

### Purpose

- 장부에 커스텀 카테고리를 추가합니다.

### Auth

- authenticated
- current user must be a ledger member.

### Request

```json
{
  "name": "여행",
  "type": "EXPENSE",
  "categoryGroupId": 1
}
```

### Response

```json
{
  "id": 6,
  "ledgerId": 1,
  "name": "여행",
  "type": "EXPENSE",
  "categoryGroupId": 1,
  "categoryGroupName": "식비",
  "sortOrder": 6,
  "defaultCategory": false
}
```

## GET/POST /api/ledgers/{ledgerId}/category-groups

### Purpose

- 거래 세부 카테고리를 묶어 통계와 대시보드에 표시할 대분류를 조회하거나 생성합니다.

### Auth

- authenticated
- current user must be a ledger member.

### POST Request

```json
{
  "name": "주거·통신",
  "type": "EXPENSE"
}
```

### Response

```json
{
  "id": 7,
  "ledgerId": 1,
  "name": "주거·통신",
  "type": "EXPENSE"
}
```

세부 카테고리를 생성할 때는 같은 `type`의 `categoryGroupId`를 지정해야 합니다.

## PATCH /api/categories/{categoryId}

### Purpose

- 기존 카테고리의 이름과 통계 대분류를 수정합니다. 카테고리의 수입/지출 유형은 기존 거래의 일관성을 위해 수정하지 않습니다.

### Auth

- authenticated
- current user must be a member of the category's ledger.

### Request

```json
{
  "name": "외식",
  "categoryGroupId": 1
}
```

### Response

- `POST /api/ledgers/{ledgerId}/categories`와 같은 category response.

## DELETE /api/categories/{categoryId}

### Purpose

- 미사용 카테고리를 삭제합니다.
- 거래, 월 예산, 고정 예산 또는 반복 거래 템플릿에서 사용 중인 카테고리는 과거 내역과 예산 계획을 보존하기 위해 삭제할 수 없습니다.

### Auth

- authenticated
- current user must be a member of the category's ledger.

### Response

- `204 No Content`

### Errors

- `400 BAD_REQUEST`: 사용 중인 카테고리를 삭제하려는 경우.
- `404 NOT_FOUND`: 카테고리가 없는 경우.

## GET/POST /api/ledgers/{ledgerId}/fixed-budgets

### Purpose

- 장부의 월 고정비 예산 템플릿을 조회하거나 생성합니다. 고정비는 실제 거래를 생성하지 않습니다.

### Auth

- authenticated
- current user must be a ledger member.

### POST Request

```json
{
  "name": "월세",
  "categoryId": 3,
  "amount": 700000,
  "active": true
}
```

### Response

```json
{
  "id": 1,
  "ledgerId": 1,
  "name": "월세",
  "categoryId": 3,
  "categoryName": "주거",
  "amount": 700000,
  "active": true
}
```

`categoryId`는 해당 장부의 `EXPENSE` 카테고리여야 하며 `amount`는 양수입니다.

## PUT/DELETE /api/fixed-budgets/{fixedBudgetId}

- `PUT`은 생성 요청과 같은 body로 이름, 카테고리, 금액, 사용 여부를 수정합니다.
- `DELETE`는 고정비 템플릿을 삭제하고 `204 No Content`를 반환합니다.
- authenticated; current user must be a member of the fixed budget's ledger.

## POST /api/ledgers/{ledgerId}/transactions

### Purpose

- 장부에 수입 또는 지출 거래를 등록합니다.

### Auth

- authenticated
- current user must be a ledger member.
- `payerUserId` is optional and defaults to the current user.

### Request

```json
{
  "type": "EXPENSE",
  "amount": 12000,
  "transactionDate": "2026-07-09",
  "categoryId": 1,
  "memo": "점심",
  "payerUserId": null,
  "paymentMethod": "CARD",
  "cardId": 1,
  "installmentMonths": null
}
```

### Response

```json
{
  "id": 1,
  "ledgerId": 1,
  "type": "EXPENSE",
  "amount": 12000,
  "transactionDate": "2026-07-09",
  "category": {
    "id": 1,
    "name": "식비",
    "type": "EXPENSE"
  },
  "payer": {
    "id": 1,
    "nickname": "우리로그 개발자"
  },
  "memo": "점심",
  "paymentMethod": "CARD",
  "card": {
    "id": 1,
    "name": "생활비 카드"
  },
  "installment": null
}
```

### Installment

- `installmentMonths`는 선택 값입니다. 생략하거나 `null`, `1`을 보내면 일시불로 등록합니다.
- `paymentMethod`는 `CASH` 또는 `CARD`입니다. 생략하거나 `null`이면 `CASH`입니다. `CARD`에는 현재 장부의 `cardId`가 필요하며 카드 결제는 지출 거래에만 사용할 수 있습니다.
- `2`~`60`을 보내면 `CARD` `EXPENSE` 거래의 총 결제 금액을 해당 개월 수로 나누어 시작일과 이후 매월 같은 일자에 회차별 거래를 생성합니다. 나머지 원 단위는 앞선 회차부터 1원씩 더합니다.
- 응답은 첫 회차 거래를 반환합니다. 할부 거래의 `installment`는 아래 형식이며, 일시불 거래에서는 `null`입니다.

```json
{
  "planId": "a9f5c8f7-0ef4-4c05-a517-8d532c584942",
  "sequence": 1,
  "totalCount": 3
}
```

### Errors

| status | code | when |
| --- | --- | --- |
| 400 | INVALID_REQUEST | amount is not positive, transaction/category type mismatch, or installment months are invalid |
| 403 | FORBIDDEN | user or payer is not a ledger member |
| 404 | NOT_FOUND | ledger, category, or payer not found |

## Card APIs

### GET/POST /api/ledgers/{ledgerId}/cards

- 장부 멤버가 등록 카드를 조회하거나 추가합니다.
- `POST` body: `{ "name": "생활비 카드", "statementClosingDay": 25 }`
- response: `{ "id": 1, "ledgerId": 1, "name": "생활비 카드", "statementClosingDay": 25 }`
- `statementClosingDay`는 1~31 사이의 매월 결제금액 확정일입니다.

### PUT/DELETE /api/cards/{cardId}

- 장부 멤버가 카드 이름과 확정일을 수정하거나 사용하지 않은 카드를 삭제합니다.
- 거래에 연결된 카드를 삭제하면 `400 INVALID_REQUEST`를 반환합니다.

## POST /api/ledgers/{ledgerId}/quick-transactions

### Purpose

- 짧은 텍스트에서 금액을 파싱해 지출 거래를 빠르게 등록합니다.

### Auth

- authenticated
- current user must be a ledger member.

### Request

```json
{
  "text": "커피 4500",
  "transactionDate": "2026-07-09"
}
```

### Response

- `POST /api/ledgers/{ledgerId}/transactions`와 같은 transaction response.

### Notes

- 현재 parser는 숫자 또는 `원` suffix를 기준으로 금액을 추출합니다.
- 카테고리는 첫 번째 EXPENSE 기본 카테고리를 fallback으로 사용합니다.

## GET /api/ledgers/{ledgerId}/months/{budgetMonth}/transactions

### Purpose

- 장부의 월별 거래 목록을 조회합니다.

### Auth

- authenticated
- current user must be a ledger member.

### Response

```json
[
  {
    "id": 1,
    "ledgerId": 1,
    "type": "EXPENSE",
    "amount": 12000,
    "transactionDate": "2026-07-09",
    "category": {
      "id": 1,
      "name": "식비",
      "type": "EXPENSE"
    },
    "payer": {
      "id": 1,
      "nickname": "우리로그 개발자"
    },
    "memo": "점심"
  }
]
```

### Notes

- `budgetMonth`는 `YYYY-MM` 형식입니다.
- 정렬은 `transactionDate desc, id desc`입니다.

## GET /api/transactions/{transactionId}

### Purpose

- 거래 상세를 조회합니다.

### Auth

- authenticated
- current user must be a member of the transaction ledger.

### Response

- `POST /api/ledgers/{ledgerId}/transactions`와 같은 transaction response.

## PUT /api/transactions/{transactionId}

### Purpose

- 거래를 수정합니다.

### Auth

- authenticated
- current user must be a member of the transaction ledger.

### Request

```json
{
  "type": "INCOME",
  "amount": 50000,
  "transactionDate": "2026-07-10",
  "categoryId": 5,
  "memo": "보너스",
  "payerUserId": 1,
  "paymentMethod": "CASH",
  "cardId": null
}
```

### Response

- `POST /api/ledgers/{ledgerId}/transactions`와 같은 transaction response.

### Notes

- `payerUserId`를 생략하거나 `null`로 보내면 기존 결제자를 유지합니다. 새 거래 생성에서만 생략 시 현재 사용자를 결제자로 사용합니다.

## DELETE /api/transactions/{transactionId}

### Purpose

- 거래를 삭제합니다.

### Auth

- authenticated
- current user must be a member of the transaction ledger and the transaction payer.

### Response

```text
204 No Content
```

### Errors

| status | code | when |
| --- | --- | --- |
| 403 | FORBIDDEN | current user is not the transaction payer |
| 404 | NOT_FOUND | transaction does not exist |
| 409 | MONTH_CLOSED | transaction month is closed |

### Notes

- 정기 거래가 생성한 개별 거래도 삭제할 수 있습니다. 해당 발생 이력은 남겨 같은 회차가 다시 생성되지 않도록 합니다.

## GET /api/ledgers/{ledgerId}/months/{budgetMonth}

### Purpose

- 장부의 월 예산 설정, 카테고리별 예산, 멤버별 할당을 조회합니다.
- 저장된 월 설정이 없어도 장부 카테고리와 멤버를 기준으로 반환합니다. 활성 고정비가 있으면 해당 카테고리 예산은 합계 금액으로 미리 채웁니다.

### Auth

- authenticated
- current user must be a member of the ledger.

### Response

```json
{
  "ledgerId": 1,
  "budgetMonth": "2026-07",
  "totalBudgetAmount": 1000000,
  "fixedBudgetTotalAmount": 700000,
  "closed": false,
  "categoryBudgets": [
    {
      "categoryId": 1,
      "name": "식비",
      "type": "EXPENSE",
      "categoryGroupId": 1,
      "categoryGroupName": "식비",
      "amount": 400000
    }
  ],
  "memberAllocations": [
    {
      "userId": 1,
      "nickname": "우리로그 개발자",
      "amount": 600000
    }
  ]
}
```

## PUT /api/ledgers/{ledgerId}/months/{budgetMonth}

### Purpose

- 장부의 월 총 예산, 카테고리별 예산, 멤버별 할당을 저장합니다.

### Auth

- authenticated
- current user must be a member of the ledger.

### Request

```json
{
  "totalBudgetAmount": 1000000,
  "categoryBudgets": [
    {
      "categoryId": 1,
      "amount": 400000
    }
  ],
  "memberAllocations": [
    {
      "userId": 1,
      "amount": 600000
    }
  ]
}
```

### Response

- `GET /api/ledgers/{ledgerId}/months/{budgetMonth}`와 같은 budget month settings response.

### Errors

| status | code | when |
| --- | --- | --- |
| 400 | INVALID_REQUEST | budgetMonth format is invalid, any amount is negative, the month is closed, category is not in ledger, or user is not a ledger member |
| 403 | FORBIDDEN | current user is not a ledger member |
| 404 | NOT_FOUND | ledger, category, or user does not exist |

## POST /api/ledgers/{ledgerId}/months/{budgetMonth}/close

### Purpose

- 월 예산을 마감 상태로 전환합니다.

### Auth

- authenticated
- current user must be a member of the ledger.

### Response

- `GET /api/ledgers/{ledgerId}/months/{budgetMonth}`와 같은 budget month settings response with `closed: true`.

## POST /api/ledgers/{ledgerId}/months/{budgetMonth}/reopen

### Purpose

- 마감된 월 예산을 다시 수정 가능한 상태로 전환합니다.

### Auth

- authenticated
- current user must be a member of the ledger.

### Response

- `GET /api/ledgers/{ledgerId}/months/{budgetMonth}`와 같은 budget month settings response with `closed: false`.

## GET /api/dashboard/current

### Purpose

- 현재 사용 장부의 선택 월 예산, 지출 합계, 남은 예산, 최근 거래, 카테고리별/멤버별 지출을 조회합니다.

### Auth

- authenticated

### Query

| name | required | example | notes |
| --- | --- | --- | --- |
| budgetMonth | no | `2026-07` | 생략하면 서버 clock의 현재 월 |

### Response

```json
{
  "currentLedger": {
    "id": 1,
    "name": "우리로그 개발자의 개인 장부",
    "type": "PERSONAL",
    "ownerId": 1,
    "recurringSummaryClosingDay": 31
  },
  "budgetMonth": "2026-07",
  "totalBudgetAmount": 1000000,
  "totalExpenseAmount": 45000,
  "scheduledRecurringExpenseAmount": 13900,
  "remainingBudgetAmount": 941100,
  "recentTransactions": [
    {
      "id": 3,
      "ledgerId": 1,
      "type": "INCOME",
      "amount": 200000,
      "transactionDate": "2026-07-12",
      "category": {
        "id": 5,
        "name": "급여",
        "type": "INCOME"
      },
      "payer": {
        "id": 1,
        "nickname": "우리로그 개발자"
      },
      "memo": "보너스"
    }
  ],
  "categorySpending": [
    {
      "categoryGroupId": 1,
      "name": "식비",
      "totalSpent": 30000
    }
  ],
  "memberSpending": [
    {
      "userId": 1,
      "nickname": "우리로그 개발자",
      "totalSpent": 45000
    }
  ],
  "cardPaymentSummaries": [
    {
      "cardId": 1,
      "cardName": "생활비 카드",
      "statementClosingDate": "2026-07-25",
      "expectedPaymentMonth": "2026-08",
      "totalAmount": 120000
    }
  ]
}
```

### Notes

- `budgetMonth`가 없으면 집계 기준 월은 서버 clock의 현재 `YearMonth`입니다.
- `totalExpenseAmount`, `categorySpending`, `memberSpending`은 실제 `EXPENSE` 거래만 합산합니다. `categorySpending`은 세부 카테고리가 아닌 통계 대분류 기준입니다.
- `scheduledRecurringExpenseAmount`는 선택 월에 발생하는 활성 지출 정기 거래 중 아직 실제 거래로 생성되지 않은 금액 합계입니다. 일시정지, 종료된 템플릿과 수입 정기 거래는 제외합니다.
- `remainingBudgetAmount`는 `totalBudgetAmount - totalExpenseAmount - scheduledRecurringExpenseAmount`입니다. 이미 생성된 정기 거래는 실제 지출에만 포함되어 중복 차감하지 않습니다.
- `recentTransactions`는 현재 월 거래를 `transactionDate desc, id desc` 순서로 최대 5개 반환합니다.
- `cardPaymentSummaries`는 카드별로 직전 확정일 다음 날부터 다음 확정일까지의 카드 지출을 합산합니다. `expectedPaymentMonth`는 다음 확정일의 다음 달입니다.

## GET /api/ledgers/{ledgerId}/statistics/monthly

### Purpose

- 지정한 월 범위의 월별 예산, 지출 합계, 수입 합계를 조회합니다.

### Auth

- authenticated
- current user must be a member of the ledger.

### Query

| name | required | example |
| --- | --- | --- |
| from | yes | `2026-06` |
| to | yes | `2026-07` |

### Response

```json
[
  {
    "month": "2026-06",
    "totalBudgetAmount": 500000,
    "totalExpenseAmount": 80000,
    "totalIncomeAmount": 40000,
    "categorySpending": [
      { "categoryGroupId": 1, "name": "식비", "totalSpent": 50000 }
    ]
  },
  {
    "month": "2026-07",
    "totalBudgetAmount": 1200000,
    "totalExpenseAmount": 250000,
    "totalIncomeAmount": 500000
  }
]
```

### Errors

| status | code | when |
| --- | --- | --- |
| 400 | INVALID_REQUEST | from/to month format is invalid or from is after to |
| 403 | FORBIDDEN | current user is not a ledger member |
| 404 | NOT_FOUND | ledger does not exist |

## GET /api/ledgers/{ledgerId}/invitable-user

### Purpose

- 공동 장부에 직접 초대할 수 있는 기존 사용자를 이메일로 확인합니다.

### Auth

- authenticated
- current user must be `OWNER` of the ledger.
- ledger must be `GROUP`.

### Query

| name | required | example |
| --- | --- | --- |
| email | yes | `friend@woorilog.local` |

### Response

```json
{
  "user": {
    "id": 2,
    "email": "friend@woorilog.local",
    "nickname": "친구",
    "lastUsedLedgerId": 2
  },
  "invitable": true,
  "reason": null
}
```

### Notes

- `reason` values: `SELF_INVITATION`, `ALREADY_MEMBER`, `PENDING_INVITATION`.

## POST /api/ledgers/{ledgerId}/invitations/users

### Purpose

- 공동 장부에 기존 사용자를 직접 초대합니다.

### Auth

- authenticated
- current user must be `OWNER` of the ledger.
- ledger must be `GROUP`.

### Request

```json
{
  "userId": 2
}
```

### Response

```json
{
  "id": 1,
  "ledgerId": 10,
  "ledgerName": "가족 장부",
  "ledgerType": "GROUP",
  "inviter": {
    "id": 1,
    "email": "owner@woorilog.local",
    "nickname": "장부주인",
    "lastUsedLedgerId": 10
  },
  "invitee": {
    "id": 2,
    "email": "friend@woorilog.local",
    "nickname": "친구",
    "lastUsedLedgerId": 2
  },
  "type": "DIRECT",
  "status": "PENDING",
  "token": null,
  "expiresAt": null,
  "respondedAt": null,
  "createdAt": "2026-07-09T15:00:00Z"
}
```

## POST /api/ledgers/{ledgerId}/invitations/links

### Purpose

- 공동 장부에 참여할 수 있는 단일 사용 초대 링크를 생성합니다.

### Auth

- authenticated
- current user must be `OWNER` of the ledger.
- ledger must be `GROUP`.

### Request

```json
{
  "expiresInDays": 7
}
```

### Response

- `POST /api/ledgers/{ledgerId}/invitations/users`와 같은 invitation response.
- `type`은 `LINK`, `invitee`는 `null`, `token`은 링크 토큰입니다.

### Notes

- `expiresInDays`를 생략하면 7일입니다.
- 현재 구현은 1-30일 범위로 보정합니다.
- 링크 초대는 수락되면 `ACCEPTED`가 되어 재사용할 수 없습니다.

## GET /api/ledgers/{ledgerId}/invitations

### Purpose

- 장부의 직접/링크 초대 목록을 최신순으로 조회합니다.

### Auth

- authenticated
- current user must be `OWNER` of the ledger.

### Response

- invitation response array.

## DELETE /api/ledgers/{ledgerId}/invitations/{invitationId}

### Purpose

- 대기 중인 초대를 취소합니다.

### Auth

- authenticated
- current user must be `OWNER` of the ledger.

### Response

```text
204 No Content
```

## GET /api/invitations/pending

### Purpose

- 현재 사용자에게 온 만료되지 않은 직접 초대 목록을 조회합니다.

### Auth

- authenticated

### Response

- invitation response array.

## POST /api/invitations/{invitationId}/accept

### Purpose

- 직접 초대를 수락하고 장부 멤버로 참여합니다.

### Auth

- authenticated
- current user must be the direct invitation invitee.

### Response

- invitation response with `status: "ACCEPTED"`.

## POST /api/invitations/{invitationId}/reject

### Purpose

- 직접 초대를 거절합니다.

### Auth

- authenticated
- current user must be the direct invitation invitee.

### Response

- invitation response with `status: "REJECTED"`.

## GET /api/invitations/links/{token}

### Purpose

- 초대 링크의 장부와 초대자 정보를 조회합니다.

### Auth

- authenticated

### Response

```json
{
  "ledgerId": 10,
  "ledgerName": "가족 장부",
  "ledgerType": "GROUP",
  "inviterNickname": "장부주인",
  "status": "PENDING",
  "expired": false
}
```

## POST /api/invitations/links/{token}/accept

### Purpose

- 초대 링크를 수락하고 장부 멤버로 참여합니다.

### Auth

- authenticated

### Response

- invitation response with `status: "ACCEPTED"`.

### Common Invitation Errors

| status | code | when |
| --- | --- | --- |
| 400 | BAD_REQUEST | ledger is not GROUP, target is self/already member, duplicate pending invitation exists, invitation is not pending, invitation is expired, or link was already accepted |
| 403 | FORBIDDEN | current user is not owner or direct invitation invitee |
| 404 | NOT_FOUND | ledger, user, invitation, or link token does not exist |

## GET /api/ledgers/{ledgerId}/recurring-transactions

### Purpose

- 장부의 반복 거래 템플릿 목록을 최신순으로 조회합니다.

### Auth

- authenticated
- current user must be a ledger member.

### Response

```json
[
  {
    "id": 1,
    "ledgerId": 1,
    "type": "EXPENSE",
    "amount": 10000,
    "category": {
      "id": 1,
      "name": "식비",
      "type": "EXPENSE"
    },
    "payer": {
      "id": 1,
      "nickname": "우리로그 개발자"
    },
    "memo": "주간 식비",
    "frequency": "WEEKLY",
    "startDate": "2026-07-01",
    "nextDueDate": "2026-07-08",
    "endDate": null,
    "paused": false
  }
]
```

## POST /api/ledgers/{ledgerId}/recurring-transactions

### Purpose

- 반복 거래 템플릿을 생성합니다.

### Auth

- authenticated
- current user must be a ledger member.

### Request

```json
{
  "type": "EXPENSE",
  "amount": 10000,
  "categoryId": 1,
  "memo": "주간 식비",
  "payerUserId": null,
  "frequency": "WEEKLY",
  "startDate": "2026-07-01",
  "endDate": null
}
```

### Response

- recurring transaction template response.

### Notes

- 시작일이 오늘 또는 과거면 해당 발생분을 실제 거래로 바로 등록하고, 미래 시작일이면 발생일까지 예정으로 유지합니다.
- 이후 발생분은 서버가 자동으로 생성합니다. 같은 템플릿과 발생일 조합은 한 번만 기록됩니다.
- 실제 거래를 생성하는 시작일이 마감된 월에 속하면 `409 MONTH_CLOSED`를 반환합니다.

## PUT /api/recurring-transactions/{templateId}

### Purpose

- 반복 거래 템플릿을 수정합니다.

### Auth

- authenticated
- current user must be a member of the template ledger.

### Request

- `POST /api/ledgers/{ledgerId}/recurring-transactions`와 같은 request body.

### Response

- recurring transaction template response.

### Notes

- `startDate` 또는 `frequency`가 바뀌면 `nextDueDate`는 새 `startDate`로 재설정됩니다.

## DELETE /api/recurring-transactions/{templateId}

### Purpose

- 더 이상 필요 없는 반복 거래 템플릿을 삭제합니다.

### Auth

- authenticated
- current user must be a member of the template ledger.

### Response

- `204 No Content`

### Notes

- 이미 가계부에 등록된 과거 거래는 삭제하지 않습니다.
- 이후 자동 생성될 거래와 중복 생성 방지 이력만 제거합니다.

## POST /api/recurring-transactions/{templateId}/pause

### Purpose

- 반복 거래 템플릿을 일시정지합니다.

### Auth

- authenticated
- current user must be a member of the template ledger.

### Response

- recurring transaction template response with `paused: true`.

## POST /api/recurring-transactions/{templateId}/resume

### Purpose

- 일시정지된 반복 거래 템플릿을 재개합니다.

### Auth

- authenticated
- current user must be a member of the template ledger.

### Response

- recurring transaction template response with `paused: false`.

## GET /api/ledgers/{ledgerId}/recurring-transactions/due

### Purpose

- 지정일 기준 생성 예정인 반복 거래 발생분을 조회합니다.

### Auth

- authenticated
- current user must be a ledger member.

### Query

| name | required | example |
| --- | --- | --- |
| asOf | no | `2026-07-10` |

### Response

```json
[
  {
    "template": {
      "id": 1,
      "ledgerId": 1,
      "type": "EXPENSE",
      "amount": 10000,
      "category": null,
      "payer": {
        "id": 1,
        "nickname": "우리로그 개발자"
      },
      "memo": "주간 식비",
      "frequency": "WEEKLY",
      "startDate": "2026-07-01",
      "nextDueDate": "2026-07-01",
      "endDate": null,
      "paused": false
    },
    "dueDate": "2026-07-01"
  }
]
```

## POST /api/ledgers/{ledgerId}/recurring-transactions/generate

### Purpose

- 지정일 기준 생성 예정인 반복 거래를 실제 거래로 생성합니다.

### Auth

- authenticated
- current user must be a ledger member.

### Query

| name | required | example |
| --- | --- | --- |
| asOf | no | `2026-07-10` |

### Response

- generated transaction response array.

### Notes

- overdue 발생분이 여러 개면 `asOf`까지 각각 생성합니다.
- 생성 이력은 `(template_id, generated_date)` 기준으로 중복 생성을 방지합니다.
- 생성 후 템플릿의 `nextDueDate`는 다음 발생 예정일로 전진합니다.

### Common Recurring Transaction Errors

| status | code | when |
| --- | --- | --- |
| 400 | INVALID_REQUEST | amount is not positive, startDate is after endDate, or transaction/category type mismatch |
| 403 | FORBIDDEN | current user or payer is not a ledger member |
| 404 | NOT_FOUND | ledger, category, payer, or template does not exist |

### Ledger

- `GET /api/ledgers`
- `GET /api/ledgers/{ledgerId}/members`
- `POST /api/ledgers/personal`
- `POST /api/ledgers/group`
- `POST /api/ledgers/{ledgerId}/use`
- `PATCH /api/ledgers/{ledgerId}`
- `POST /api/ledgers/{ledgerId}/archive`
- `DELETE /api/ledgers/{ledgerId}/members/{userId}`
- `DELETE /api/ledgers/{ledgerId}/members/me`
- `PUT /api/ledgers/{ledgerId}/months/{budgetMonth}`
- `POST /api/ledgers/{ledgerId}/months/{budgetMonth}/close`
- `POST /api/ledgers/{ledgerId}/months/{budgetMonth}/reopen`

### Transaction

- `POST /api/ledgers/{ledgerId}/transactions`
- `POST /api/ledgers/{ledgerId}/quick-transactions`
- `GET /api/ledgers/{ledgerId}/months/{budgetMonth}/transactions`
- `GET /api/transactions/{transactionId}`
- `PUT /api/transactions/{transactionId}`
- `DELETE /api/transactions/{transactionId}`

### Card

- `GET /api/ledgers/{ledgerId}/cards`
- `POST /api/ledgers/{ledgerId}/cards`
- `PUT /api/cards/{cardId}`
- `DELETE /api/cards/{cardId}`

### Transaction Import

- `POST /api/ledgers/{ledgerId}/transaction-imports/preview`

V1 OCR uses Tesseract.js in the web layer. The import preview API should accept extracted text and client-side OCR metadata when needed, then return transaction candidates.

## POST /api/ledgers/{ledgerId}/transaction-imports/preview

### Purpose

- 이미지 OCR 또는 직접 입력으로 추출된 텍스트를 거래 후보로 파싱합니다.
- 후보 생성만 수행하며 실제 거래는 저장하지 않습니다.

### Auth

- authenticated
- current user must be a ledger member.

### Request

```json
{
  "text": "2026-07-09 식비 점심 12,000원\n급여 입금 500000원",
  "transactionDate": "2026-07-10",
  "ocrEngine": "tesseract.js",
  "sourceName": "receipt.png"
}
```

### Response

```json
{
  "candidates": [
    {
      "id": "candidate-1",
      "type": "EXPENSE",
      "amount": 12000,
      "transactionDate": "2026-07-09",
      "categoryId": 1,
      "categoryName": "식비",
      "memo": "2026-07-09 식비 점심 12,000원",
      "rawText": "2026-07-09 식비 점심 12,000원",
      "confidence": 0.82
    }
  ],
  "rejectedLines": 0
}
```

### Notes

- OCR은 프론트엔드에서 Tesseract.js로 수행하고, 백엔드는 추출 텍스트를 파싱합니다.
- 금액은 `원`, `₩`, 쉼표 포함 숫자를 우선 파싱합니다.
- 날짜가 줄 안에 없으면 request의 `transactionDate`를 사용하고, 둘 다 없으면 서버 현재일을 사용합니다.
- `급여`, `입금`, `수입`, `환급`, `이자`, `bonus`, `salary`가 포함된 줄은 `INCOME`으로 추론하고 나머지는 `EXPENSE`로 봅니다.

### Category

- `GET /api/ledgers/{ledgerId}/categories`
- `POST /api/ledgers/{ledgerId}/categories`

### Dashboard

- `GET /api/dashboard/current?budgetMonth=YYYY-MM`

### Statistics

- `GET /api/ledgers/{ledgerId}/statistics/monthly`

### Invitation

- `GET /api/ledgers/{ledgerId}/invitable-user`
- `POST /api/ledgers/{ledgerId}/invitations/users`
- `POST /api/ledgers/{ledgerId}/invitations/links`
- `GET /api/ledgers/{ledgerId}/invitations`
- `DELETE /api/ledgers/{ledgerId}/invitations/{invitationId}`
- `GET /api/invitations/pending`
- `POST /api/invitations/{invitationId}/accept`
- `POST /api/invitations/{invitationId}/reject`
- `GET /api/invitations/links/{token}`
- `POST /api/invitations/links/{token}/accept`

### Recurring Transaction

- `GET /api/ledgers/{ledgerId}/recurring-transactions`
- `POST /api/ledgers/{ledgerId}/recurring-transactions`
- `PUT /api/recurring-transactions/{templateId}`
- `DELETE /api/recurring-transactions/{templateId}`
- `POST /api/recurring-transactions/{templateId}/pause`
- `POST /api/recurring-transactions/{templateId}/resume`
- `GET /api/ledgers/{ledgerId}/recurring-transactions/due`
- `POST /api/ledgers/{ledgerId}/recurring-transactions/generate`

### Settlement

- `GET /api/ledgers/{ledgerId}/months/{budgetMonth}/settlements`
- `POST /api/ledgers/{ledgerId}/months/{budgetMonth}/settlements`
- `DELETE /api/settlements/{paymentId}`

### Notification

- `GET /api/notifications`
- `POST /api/notifications/{notificationId}/read`
- `POST /api/notifications/read-all`

## Ledger Management APIs

- `PATCH /api/ledgers/{ledgerId}` body: `{ "name": "새 장부 이름" }` 또는 `{ "recurringSummaryClosingDay": 10 }`; 장부 OWNER만 변경할 수 있습니다.
- `POST /api/ledgers/{ledgerId}/archive`; 공동 장부 OWNER만 보관할 수 있고 보관된 장부는 목록에서 제외됩니다.
- `DELETE /api/ledgers/{ledgerId}/members/{userId}`; OWNER가 일반 멤버를 내보냅니다.
- `DELETE /api/ledgers/{ledgerId}/members/me`; 일반 멤버가 공동 장부에서 탈퇴합니다.
- 성공한 삭제 요청은 `204 No Content`, 이름 변경과 보관은 `LedgerDto`를 반환합니다.

## Transaction Mutation Guard

- `DELETE /api/transactions/{transactionId}`는 현재 사용자가 결제자인 거래만 삭제할 수 있고, 성공 시 `204 No Content`를 반환합니다.
- 마감된 월의 거래 생성·빠른 입력·수정·삭제와 반복 거래 생성은 `409 MONTH_CLOSED`를 반환합니다.

## GET/POST /api/ledgers/{ledgerId}/months/{budgetMonth}/settlements

### Purpose

- 멤버별 실제 지출, 할당 비율에 따른 부담액, 잔액, 필요한 송금과 기존 송금 기록을 조회합니다.
- `POST`는 송금을 일부 또는 전액 기록한 뒤 다시 계산된 동일 응답을 반환합니다.

### POST Request

```json
{ "fromUserId": 2, "toUserId": 1, "amount": 35000 }
```

### Response

```json
{
  "ledgerId": 10,
  "budgetMonth": "2026-07",
  "totalExpenseAmount": 100000,
  "members": [
    { "userId": 1, "nickname": "민지", "paidAmount": 85000, "owedAmount": 50000, "balanceAmount": 35000 },
    { "userId": 2, "nickname": "현우", "paidAmount": 15000, "owedAmount": 50000, "balanceAmount": -35000 }
  ],
  "transfers": [
    { "fromUserId": 2, "fromNickname": "현우", "toUserId": 1, "toNickname": "민지", "amount": 35000 }
  ],
  "payments": []
}
```

- 송금액은 0보다 커야 하며 현재 남은 송금액을 초과할 수 없습니다.
- `DELETE /api/settlements/{paymentId}`는 기록을 취소하고 `204 No Content`를 반환합니다.

## Notification APIs

`GET /api/notifications` response:

```json
{
  "unreadCount": 1,
  "notifications": [
    {
      "id": 3,
      "type": "INVITATION",
      "title": "새 장부 초대",
      "message": "생활비 장부에 초대받았습니다.",
      "targetPath": "/settings",
      "readAt": null,
      "createdAt": "2026-07-12T03:00:00Z"
    }
  ]
}
```

- `POST /api/notifications/{notificationId}/read`는 읽음 처리된 알림을 반환합니다.
- `POST /api/notifications/read-all`은 모든 알림을 읽음 처리하고 `204 No Content`를 반환합니다.

## Endpoint Template

```markdown
## METHOD /api/path

### Purpose

-

### Auth

-

### Request

-

### Response

-

### Errors

-

### Notes

-
```
