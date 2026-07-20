# Testing Strategy

## Goals

- 도메인 규칙은 빠른 단위 테스트로 검증합니다.
- API 계약과 인증/권한 흐름은 통합 테스트로 검증합니다.
- DB가 필요한 백엔드 테스트는 Testcontainers를 사용합니다.
- 프론트엔드 테스트는 구현 세부보다 사용자가 보는 결과와 상호작용을 기준으로 합니다.

## Backend

### Unit Tests

- parser
- date/month calculation
- domain invariant
- amount/budget calculation

### Integration Tests

- auth callback, refresh, logout
- default personal ledger creation
- ledger CRUD and switching
- invitation accept/reject/link flow
- transaction create/update/query
- installment transaction creation and monthly schedule
- transaction delete and closed-month mutation guard
- budget month update/close/reopen
- category creation/update, group assignment, and group-based dashboard/statistics aggregation
- fixed budget create/update/delete and initial monthly budget prefill
- recurring transaction generation
- dashboard/statistics query
- settlement calculation/payment history and ledger/member management
- notification creation/read state
- transaction import preview

### Command

```bash
cd backend
./gradlew test
```

## Frontend

### Component / Route Tests

- login flow state
- protected route behavior
- dashboard loading/empty/ready states
- transaction create/edit form behavior
- ledger month settings save behavior
- invitation decision behavior
- recurring transaction settings behavior
- month navigation, quick-entry preset, period category aggregation
- notification and settlement interaction

### Browser E2E

- desktop and mobile viewport smoke test
- login, protected navigation, dashboard month movement, quick-entry preset

### Command

```bash
cd frontend
npm run lint
npm run test
npm run build
npm run test:e2e
```

## CI

Initial CI should run on pull request and main push:

- backend test
- frontend install
- frontend lint
- frontend test
- frontend build
- Playwright Chromium smoke test

## Test Data

- 테스트 fixture는 실제 제품 용어를 사용합니다.
- 날짜는 고정 clock을 사용해 월 경계 회귀를 줄입니다.
- secret 값은 테스트 코드와 로그에 남기지 않습니다.
