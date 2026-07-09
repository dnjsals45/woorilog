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

## Planned Structure

```text
woorilog/
  backend/
  frontend/
  docs/
  assets/
  AGENTS.md
  README.md
```

## Local Development

아직 애플리케이션 코드는 scaffold 전입니다. 초기 구현 후 아래 실행 경로를 확정합니다.

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

## Development Plan

V1 구현은 [Implementation Plan](./docs/planning/implementation-plan.md)을 참고하되, 실제 작업 시점의 analysis를 통해 기능 단위로 나눠 진행합니다.
