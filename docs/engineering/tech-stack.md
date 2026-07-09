# Tech Stack

이 문서는 V1에서 사용할 기술 스택 기준입니다. 실제 버전은 초기 scaffold 이후 확정합니다.

## Product Direction

- V1은 데스크톱 웹과 모바일 웹을 함께 지원하는 responsive web app으로 시작합니다.
- UI는 모바일 사용을 우선 고려하되, 예산 설정과 통계 확인은 데스크톱 폭에서도 편하게 사용할 수 있어야 합니다.
- 네이티브 모바일 앱은 V1 범위 밖입니다.
- PWA는 V1 구현 중 필요하면 확장 가능한 상태로 둡니다.

## Backend

- Kotlin
- Java 21
- Spring Boot 3.5.x
- Gradle Kotlin DSL
- Spring Web
- Spring Security
- Spring Validation
- Spring Data JPA
- MySQL 8.x
- JJWT
- JUnit 5
- Spring MVC Test
- Spring Security Test
- Testcontainers

Backend decisions:

- User-facing authentication is Kakao OAuth only.
- Local development and automated tests may expose a developer login path for Playwright and manual UI verification.
- Session is based on JWT access/refresh tokens using JJWT.
- MySQL migration tooling is deferred during early development because schema changes are expected to be frequent.
- Flyway is the preferred migration candidate before real long-lived data is accumulated.

## Frontend

- React
- Vite
- TypeScript
- React Router
- TanStack Query
- Tailwind CSS
- lucide-react
- React Hook Form
- Zod
- Tesseract.js
- Vitest
- React Testing Library
- ESLint

Frontend decisions:

- TanStack Query is used for server state and cache invalidation.
- lucide-react is the default icon library.
- React Hook Form and Zod are used for persisted input forms.
- Simple filters and local-only controls can use component state without React Hook Form.
- Tesseract.js is used for V1 OCR. OCR should run in the web layer first; the backend import API should focus on transaction preview parsing and persistence rules.
- Chart library adoption is deferred until dashboard/statistics implementation. Recharts is the default candidate for simple budget and spending charts.

## Local Infrastructure

- Docker Compose for MySQL and app integration
- `.env.example` for required local keys
- `frontend/.env.example` for frontend runtime config
- Local development deployment
- Local home deployment accessible from devices on the same private network

## Verification Commands

Backend:

```bash
cd backend
./gradlew test
```

Frontend:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

## CI

Initial CI should run:

- backend test
- frontend lint
- frontend test
- frontend build
