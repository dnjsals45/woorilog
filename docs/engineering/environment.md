# Environment

이 문서는 로컬 개발과 로컬 홈 배포에서 필요한 환경 변수 기준을 정리합니다.
실제 키 목록은 backend/frontend scaffold 이후 `.env.example`과 `frontend/.env.example`을 함께 갱신하며 확정합니다.

## Principles

- 실제 secret, 개인 토큰, 운영 credential은 git에 커밋하지 않습니다.
- 환경 변수가 추가되거나 이름이 바뀌면 `.env.example`과 이 문서를 함께 갱신합니다.
- frontend에서 브라우저에 노출되는 값과 backend-only secret을 구분합니다.
- local/test-only developer login은 운영 배포에서 활성화하지 않습니다.

## Current Status

- Backend scaffold 전이므로 backend 환경 변수 이름은 예시 수준입니다.
- Frontend scaffold 전이므로 frontend 환경 변수 이름은 예시 수준입니다.
- Kakao OAuth, JWT secret, MySQL 접속 정보, local/test developer login 활성화 여부는 Auth Foundation 단계에서 실제 구현에 맞춰 검증합니다.

## Example Files

- `.env.example`: backend, MySQL, Kakao OAuth, JWT, CORS, local/test developer login 예시
- `frontend/.env.example`: frontend runtime config 예시

## Expected Areas

- MySQL connection
- Kakao OAuth client configuration
- JWT signing and expiration settings
- CORS / allowed origins for local home deployment
- local/test-only developer login toggle
- frontend API base URL
