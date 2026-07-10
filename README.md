# woorilog

우리로그는 개인 장부에서 시작해 공동 장부까지 확장할 수 있는 예산 운영 가계부 서비스입니다.

이 저장소는 실제로 사용할 예산 운영 가계부 서비스를 만들기 위한 프로젝트입니다.
제품 판단, 화면 설계, API 계약, 테스트, 구현 기준을 잊지 않기 위해 문서와 코드를 함께 관리합니다.

## V1 Goal

- 사용자는 로그인 후 기본 개인 장부에서 거래를 기록할 수 있습니다.
- 사용자는 추가 개인 장부와 공동 장부를 만들고 전환할 수 있습니다.
- 사용자는 월 예산, 카테고리 예산, 거래 내역, 통계를 확인할 수 있습니다.
- 사용자는 공동 장부에 다른 사용자를 초대할 수 있습니다.
- 사용자는 빠른 입력, 반복 거래, 이미지 기반 거래 가져오기로 기록 비용을 줄일 수 있습니다.

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
  AGENTS.md
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

## V1 Implementation Status

- Auth/Ledger: developer login, protected session, personal/group ledger creation and switching.
- Transaction: categories, transaction create/update/detail/month list, quick transaction.
- Budget/Dashboard: month budget settings, close/reopen, dashboard summary, monthly statistics.
- Invitation: direct invitation, link invitation, pending invitations, accept/reject/cancel.
- Recurring Transaction: weekly/monthly templates, pause/resume, due query, duplicate-safe generation.
- Transaction Import: Tesseract.js web OCR entry point and backend text preview candidates.

## Known Limitations

- Refresh token rotation currently returns an explicit not-implemented response.
- Kakao login requires a Kakao Developers REST API key, client secret, and registered redirect URI in the deployment environment.
- Invitation links are single-use in the current V1 implementation.
- Transaction import preview creates candidates only; confirmed persistence uses the normal transaction create API.

## Development Plan

V1 구현은 [Implementation Plan](./docs/planning/implementation-plan.md)을 참고하되, 실제 작업 시점의 analysis를 통해 기능 단위로 나눠 진행합니다.
