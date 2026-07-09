# AGENTS.md

우리로그 저장소에서 AI 에이전트가 일관되게 작업하기 위한 루트 지침입니다.

## 기본 원칙

- 작업은 저장소 루트에서 시작합니다.
- 구현 전에 관련 문서와 가까운 코드를 먼저 확인합니다.
- 변경은 요청 범위 안에서 작게 유지합니다.
- 관련 없는 리팩터링, 포맷 변경, 파일 이동을 섞지 않습니다.
- 코드와 문서가 충돌하면 구현하지 말고 충돌 지점을 먼저 정리합니다.
- 동작이 바뀌면 테스트나 검증 방법을 함께 갱신합니다.
- secret, 개인 토큰, 실제 credential은 커밋하지 않습니다.
- 환경 변수나 secret을 바꾸면 `docs/engineering/environment.md`와 `.env.example`을 함께 확인합니다.

## 주요 문서

- 제품 범위: `docs/product/v1-scope.md`
- 사용자 흐름: `docs/product/user-flows.md`
- 화면 구조: `docs/design/information-architecture.md`
- API 계약: `docs/engineering/api-contract.md`
- 인증/세션: `docs/engineering/auth-session.md`
- 환경 변수: `docs/engineering/environment.md`
- 도메인 모델: `docs/engineering/domain-model.md`
- 테스트 전략: `docs/engineering/testing-strategy.md`
- 구현 계획: `docs/planning/implementation-plan.md`

## Subproject 라우팅

### `backend/**`

- `backend/AGENTS.md`를 함께 따릅니다.
- API 계약이 바뀌면 `docs/engineering/api-contract.md`도 갱신합니다.
- 검증 명령은 백엔드 루트에서 실행합니다.

### `frontend/**`

- `frontend/AGENTS.md`를 함께 따릅니다.
- 화면 구조, 시각 디자인, 접근성, 반응형 판단은 `docs/design/**` 문서를 우선합니다.
- 검증 명령은 프론트엔드 루트에서 실행합니다.

### `docs/**`

- 문서는 현재 구현, 확정된 제품 판단, 검증 가능한 계획을 기준으로 작성합니다.
- 확정되지 않은 내용은 정책처럼 쓰지 않습니다.

## 검증

- 백엔드 동작 변경: `cd backend && ./gradlew test`
- 프론트엔드 동작 변경: `cd frontend && npm run lint && npm run test && npm run build`
- 문서 변경: 링크와 참조 파일 존재 여부를 확인합니다.
