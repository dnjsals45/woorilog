# Tech Stack

이 문서는 V1 구현에 사용하는 현재 기술 스택과 저장소 기준을 정리합니다. 정확한 버전은 `backend/build.gradle.kts`, `frontend/package.json`과 lockfile을 원본으로 사용합니다.

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
- Flyway
- JJWT
- JUnit 5
- Spring MVC Test
- Spring Security Test
- Testcontainers
- Native Tesseract 5 (`tessdata_best` `kor+eng`)

Backend decisions:

- User-facing authentication is Kakao OAuth only.
- Local development and automated tests may expose a developer login path for Playwright and manual UI verification.
- Session is based on JWT access/refresh tokens using JJWT.
- 모든 schema 변경은 Flyway migration으로 추가하고 운영 JPA schema mode는 `validate`를 사용합니다.
- 새 V1의 월 단위 데이터 전환은 [Data Migration](./data-migration.md)의 확장·backfill·전환 순서를 따릅니다.

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
- Vitest
- React Testing Library
- ESLint

Frontend decisions:

- TanStack Query is used for server state and cache invalidation.
- lucide-react is the default icon library.
- React Hook Form and Zod are used for persisted input forms.
- Simple filters and local-only controls can use component state without React Hook Form.
- 거래 이미지 OCR은 backend의 Native Tesseract로 수행하고 frontend는 multipart 업로드와 preview 편집을 담당합니다.
- Chart library adoption is deferred until dashboard/statistics implementation. Recharts is the default candidate for simple budget and spending charts.
- 새 V1의 서버 상태 query key는 사용자·장부·예산 기간을 구분해 개인정보가 다른 cache entry에 섞이지 않게 합니다.

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

현재 CI는 PR과 `main` push에서 다음을 실행합니다.

- backend test
- frontend lint
- frontend test
- frontend build
- Playwright Chromium smoke
