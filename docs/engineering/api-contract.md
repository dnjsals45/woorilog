# API Contract

이 문서는 V1 API 계약의 목차와 공통 규칙입니다. 구현이 진행되면서 endpoint별 request/response 예시를 채웁니다.

## Common Rules

- API prefix: `/api`
- Protected API는 JWT 기반 인증을 요구합니다.
- JWT 전달 방식은 Auth Foundation 단계에서 [Auth Session](./auth-session.md)에 확정합니다.
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

### Ledger

- `GET /api/ledgers`
- `POST /api/ledgers/personal`
- `POST /api/ledgers/group`
- `POST /api/ledgers/{ledgerId}/use`
- `PUT /api/ledgers/{ledgerId}/months/{budgetMonth}`
- `POST /api/ledgers/{ledgerId}/months/{budgetMonth}/close`
- `POST /api/ledgers/{ledgerId}/months/{budgetMonth}/reopen`

### Transaction

- `POST /api/ledgers/{ledgerId}/transactions`
- `POST /api/ledgers/{ledgerId}/quick-transactions`
- `GET /api/ledgers/{ledgerId}/months/{budgetMonth}/transactions`
- `GET /api/transactions/{transactionId}`
- `PUT /api/transactions/{transactionId}`

### Transaction Import

- `POST /api/ledgers/{ledgerId}/transaction-imports/preview`

V1 OCR uses Tesseract.js in the web layer. The import preview API should accept extracted text and client-side OCR metadata when needed, then return transaction candidates.

### Category

- `GET /api/ledgers/{ledgerId}/categories`
- `POST /api/ledgers/{ledgerId}/categories`

### Dashboard

- `GET /api/dashboard/current`

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
- `POST /api/recurring-transactions/{templateId}/pause`
- `POST /api/recurring-transactions/{templateId}/resume`
- `GET /api/ledgers/{ledgerId}/recurring-transactions/due`
- `POST /api/ledgers/{ledgerId}/recurring-transactions/generate`

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
