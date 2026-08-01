# woorilog

우리로그는 커플과 부부가 공동 생활비와 각자의 예산을 함께 운영하는 가계부 서비스입니다.

이 저장소는 실제로 사용할 예산 운영 가계부 서비스를 만들기 위한 프로젝트입니다.
제품 판단, 화면 설계, API 계약, 테스트, 구현 기준을 잊지 않기 위해 문서와 코드를 함께 관리합니다.

## V1 Goal

- 사용자는 로그인 후 기본 개인 장부에서 거래를 기록할 수 있습니다.
- 사용자는 두 사람이 쓰는 공동 장부를 만들고 30분 링크로 상대방을 초대할 수 있습니다.
- 사용자는 예산 기간별 전체·멤버별·공동·대분류 예산을 운영할 수 있습니다.
- 사용자는 공동 예산과 본인 예산의 사용 가능액을 우선 확인할 수 있습니다.
- 사용자는 빠른 입력과 이미지 일괄 가져오기로 여러 거래를 적은 단계로 기록할 수 있습니다.
- 사용자는 개인 거래 공개 범위를 유지하면서 공동 예산과 소비 흐름을 함께 관리할 수 있습니다.

## Documentation

- [Product Brief](./docs/product/product-brief.md)
- [V1 Scope](./docs/product/v1-scope.md)
- [User Flows](./docs/product/user-flows.md)
- [Information Architecture](./docs/design/information-architecture.md)
- [Design System](./docs/design/design-system.md)
- [Design References](./docs/design/references.md)
- [Landing Page Direction](./docs/design/landing-page.md)
- [Frontend Design Implementation](./docs/design/frontend-implementation.md)
- [Screen Specs](./docs/design/screen-specs.md)
- [Tech Stack](./docs/engineering/tech-stack.md)
- [Domain Model](./docs/engineering/domain-model.md)
- [API Contract](./docs/engineering/api-contract.md)
- [Permissions](./docs/engineering/permissions.md)
- [Privacy](./docs/engineering/privacy.md)
- [Data Migration](./docs/engineering/data-migration.md)
- [Transaction Import](./docs/engineering/transaction-import.md)
- [Scheduled Transactions](./docs/engineering/scheduled-transactions.md)
- [Auth Session](./docs/engineering/auth-session.md)
- [Environment](./docs/engineering/environment.md)
- [Testing Strategy](./docs/engineering/testing-strategy.md)
- [Implementation Plan](./docs/planning/implementation-plan.md)
- [Documentation Backlog](./docs/planning/documentation-backlog.md)

## Structure

```text
woorilog/
  backend/   # Kotlin/Spring Boot API
  frontend/  # React/Vite web client
  docs/
  assets/
  CLAUDE.md   # 에이전트 작업 원칙 단일 기준
  AGENTS.md   # CLAUDE.md를 가리키는 포인터
  README.md
```

## Local Development

로컬 환경 변수 예시는 `.env.example`과 `frontend/.env.example`에 있습니다.
실제 secret 값은 `.env`에만 두고 git에 커밋하지 않습니다.

처음 실행하거나 Dockerfile을 바꾼 뒤에는 이미지를 빌드합니다.

```bash
docker compose up --build
```

이후에는 재빌드 없이 실행합니다.

```bash
docker compose up
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080 (`/health` 포함)
- MySQL: localhost:3306

소스는 각 컨테이너에 마운트됩니다. frontend는 Vite HMR로 브라우저에 즉시 반영되고,
backend는 저장 시 Gradle이 자동 컴파일한 뒤 Spring Boot DevTools가 애플리케이션을 재시작합니다.
이미지를 다시 빌드할 필요는 없습니다. `package-lock.json` 변경은 frontend 컨테이너 시작 시 자동으로
의존성을 다시 설치하며, `build.gradle.kts` 변경은 `docker compose restart backend`로 반영합니다.

종료하되 MySQL 데이터 볼륨은 유지하려면:

```bash
docker compose down
```

MySQL 데이터까지 삭제하려면:

```bash
docker compose down --volumes
```

백엔드 테스트:

```bash
cd backend
./gradlew test
```

프론트엔드 실행과 검증:

```bash
cd frontend
npm install
npm run dev
```

```bash
cd frontend
npm run lint
npm run test
npm run build
npm run test:e2e
```

Health check endpoint:

```bash
curl http://localhost:8080/health
```

전체 로컬 검증:

```bash
cd backend
./gradlew test
```

```bash
cd frontend
npm run lint
npm run test
npm run build
```

## Current Implementation Baseline

현재 코드는 이전 제품 범위를 구현한 기준선이며 새 [V1 Scope](./docs/product/v1-scope.md)의 완료 상태를 의미하지 않습니다.
새 V1 구현에서는 현재 기능을 재사용하되 제품 정책과 충돌하는 동작을 교체합니다.

- Auth/Ledger: developer login, rotating refresh-cookie session, personal/group ledger creation, switching, rename, archive, member removal/leave.
- Transaction: category groups and categories, cash/card payment methods, installments, create/update/detail/month list, single and bulk delete, quick transaction, closed-month mutation guard.
- Budget/Dashboard: personal category budgets, fixed budget templates, group member allocations, close/reopen, selected-month dashboard summary, category-aware monthly statistics, next card payment estimate.
- Invitation: direct invitation, link invitation, pending invitations, accept/reject/cancel.
- Recurring Transaction: weekly/monthly templates, pause/resume, summary closing day, scheduled generation, duplicate-safe generation.
- Transaction Import: backend Native Tesseract OCR and image preprocessing, editable text/image preview candidates, single or selected bulk persistence.
- Settlement/Notification: monthly member settlement with reversible payment history, invitation/month-close/budget-overrun notifications, individual/all read state.

## Known Limitations

- Kakao login requires a Kakao Developers REST API key, client secret, and registered redirect URI in the deployment environment.
- Invitation links are single-use in the current implementation baseline.
- OCR accuracy depends on image quality; candidates must be reviewed before saving.
- Native Tesseract OCR requires the `kor` and `eng` traineddata files when the backend runs outside Docker.

## Development Plan

새 V1 구현 순서는 [Implementation Plan](./docs/planning/implementation-plan.md)을 기준으로 하며, 각 단계는 API 계약·도메인 문서·테스트와 함께 갱신합니다.
