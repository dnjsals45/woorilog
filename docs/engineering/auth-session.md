# Auth Session

이 문서는 인증과 세션 유지 기준을 정리합니다.
Endpoint별 상세 계약은 [API Contract](./api-contract.md)를 따릅니다.

## Decisions

- 사용자-facing 로그인은 Kakao OAuth만 지원합니다.
- local/test 환경에서는 Playwright와 수동 UI 검증을 위해 developer login을 허용할 수 있습니다.
- developer login은 운영 배포에서 활성화하지 않습니다.
- 세션은 JJWT 기반 access token과 refresh token으로 유지합니다.
- JWT 전달 방식은 Auth Foundation 구현 시점에 cookie 방식과 Authorization header 방식 중 하나로 확정합니다.

## Local / Test Login

- `POST /api/auth/dev-login`은 local/test 환경 전용입니다.
- production profile에서는 endpoint가 비활성화되어야 합니다.
- 테스트용 사용자는 실제 Kakao 계정이나 운영 credential에 의존하지 않아야 합니다.

## Open Decisions

- access token 전달 위치
- refresh token 저장 위치와 rotation 정책
- token 만료 시간
- local home deployment에서 허용할 origin과 cookie 정책
- logout 시 refresh token 무효화 방식
