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
- 인증이 필요한 내부 경로에서 로그인으로 이동한 경우 프론트엔드는 원래의 path, query, hash를 임시 보관하고 로그인 완료 후 해당 경로로 복귀합니다.
- 로그인 복귀 경로는 `/`로 시작하는 동일 앱 내부 경로만 허용하며 외부 URL은 사용하지 않습니다.
- 최초 Kakao 로그인은 인증과 기본 개인 장부 생성을 완료한 뒤 `nicknameConfirmed=false`를 반환합니다. 사용자는 제품 쓰기 전에 서비스 닉네임을 확정합니다.
- 일반 로그인은 닉네임 확정 후 기본 개인 장부로, 초대 링크에서 시작한 로그인은 닉네임 확정 후 원래 초대 확인 경로로 돌아갑니다.
- 초대 링크를 열었다는 사실이나 로그인 완료만으로 멤버십을 만들지 않습니다. 초대 수락 API를 별도로 호출해야 합니다.

## Local / Test Login

- `POST /api/auth/dev-login`은 local/test 환경 전용입니다.
- production profile에서는 endpoint가 비활성화되어야 합니다.
- 테스트용 사용자는 실제 Kakao 계정이나 운영 credential에 의존하지 않아야 합니다.
- dev login은 `DEV` provider user를 upsert하고, 접근 가능한 장부가 없으면 기본 개인 장부를 생성합니다.
- dev login 사용자는 반복 테스트가 onboarding에서 멈추지 않도록 닉네임 확정 상태로 만듭니다.
- dev login 응답의 `accessToken`은 프론트엔드가 이후 protected API 호출의 Bearer token으로 사용합니다.

## Current Implementation Baseline

- `GET /health`, `POST /api/auth/dev-login`, `GET /api/auth/kakao/login-url`, `POST /api/auth/kakao/callback`은 public endpoint입니다.
- 그 외 `/api/**` endpoint는 Bearer token 인증을 요구합니다.
- Kakao OAuth endpoint는 authorization URL을 만들고, callback code를 Kakao token/user API와 교환해 우리로그 access token을 발급합니다. 환경 변수가 없을 때만 `501 NOT_CONFIGURED`를 반환합니다.
- developer login은 `local` profile에서만 기본 활성화됩니다. 홈 배포 등 다른 profile에서는 `DEV_LOGIN_ENABLED=true`을 명시하지 않는 한 `403 FORBIDDEN`을 반환합니다.
- logout은 현재 refresh token을 폐기하고 cookie를 만료시킨 뒤 `204 No Content`를 반환합니다.
- Kakao callback 교환이 실패하면 자동으로 반복 요청하지 않고, 사용자는 로그인 화면으로 돌아가 새 인가 코드를 발급받습니다.
- 현재 구현은 새 V1의 별도 닉네임 확정 상태를 아직 제공하지 않습니다. 목표 response와 `PATCH /api/me/profile`은 [API Contract](./api-contract.md)를 따릅니다.

## V1 Authorization Gate

- `nicknameConfirmed=false` 사용자는 `GET /api/me`, refresh/logout, `PATCH /api/me/profile`과 공개 초대 확인만 사용할 수 있습니다.
- 그 외 제품 쓰기 API는 `409 NICKNAME_CONFIRMATION_REQUIRED`를 반환합니다.
- 초대 복귀 경로는 access token이나 OAuth code와 함께 영구 저장하지 않고, 동일 앱 내부 경로로 검증한 뒤 한 번 사용합니다.
- refresh 후에도 사용자와 현재 장부, 닉네임 확정 상태를 함께 반환해 새로고침 경로가 같은 분기를 재현하게 합니다.

## Deployment

- HTTPS 배포에서는 `REFRESH_COOKIE_SECURE=true`를 사용합니다.
- CORS origin은 실제 프론트엔드 origin만 허용합니다.
- JWT signing secret은 운영 환경에서 필수이며 기본값을 제공하지 않습니다.
