# Auth Session

이 문서는 인증과 세션 유지 기준을 정리합니다.
Endpoint별 상세 계약은 [API Contract](./api-contract.md)를 따릅니다.

## Decisions

- 사용자-facing 로그인은 Kakao OAuth만 지원합니다.
- local/test 환경에서는 Playwright와 수동 UI 검증을 위해 developer login을 허용할 수 있습니다.
- developer login은 운영 배포에서 활성화하지 않습니다.
- 세션은 JJWT 기반 access token과 회전형 opaque refresh token으로 유지합니다.
- Auth Foundation 기준 access token은 `Authorization: Bearer <token>` header로 전달합니다.
- access token은 프론트엔드 메모리에만 보관합니다.
- refresh token은 `HttpOnly`, `SameSite=Lax` cookie로 전달하며 JavaScript에서 읽지 않습니다.
- `POST /api/auth/refresh`는 기존 refresh token을 폐기하고 새 access/refresh token을 발급합니다.

## Local / Test Login

- `POST /api/auth/dev-login`은 local/test 환경 전용입니다.
- production profile에서는 endpoint가 비활성화되어야 합니다.
- 테스트용 사용자는 실제 Kakao 계정이나 운영 credential에 의존하지 않아야 합니다.
- dev login은 `DEV` provider user를 upsert하고, 접근 가능한 장부가 없으면 기본 개인 장부를 생성합니다.
- dev login 응답의 `accessToken`은 프론트엔드가 이후 protected API 호출의 Bearer token으로 사용합니다.

## Current Implementation

- `GET /health`, `POST /api/auth/dev-login`, `GET /api/auth/kakao/login-url`, `POST /api/auth/kakao/callback`은 public endpoint입니다.
- 그 외 `/api/**` endpoint는 Bearer token 인증을 요구합니다.
- Kakao OAuth endpoint는 authorization URL을 만들고, callback code를 Kakao token/user API와 교환해 우리로그 access token을 발급합니다. 환경 변수가 없을 때만 `501 NOT_CONFIGURED`를 반환합니다.
- developer login은 `local` profile에서만 기본 활성화됩니다. 홈 배포 등 다른 profile에서는 `DEV_LOGIN_ENABLED=true`을 명시하지 않는 한 `403 FORBIDDEN`을 반환합니다.
- logout은 현재 refresh token을 폐기하고 cookie를 만료시킨 뒤 `204 No Content`를 반환합니다.

## Deployment

- HTTPS 배포에서는 `REFRESH_COOKIE_SECURE=true`를 사용합니다.
- CORS origin은 실제 프론트엔드 origin만 허용합니다.
- JWT signing secret은 운영 환경에서 필수이며 기본값을 제공하지 않습니다.
