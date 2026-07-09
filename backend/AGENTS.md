# AGENTS.md

우리로그 백엔드 작업 지침입니다. 루트 `AGENTS.md`의 일반 원칙을 함께 따릅니다.

## 기본 원칙

- 백엔드 구현은 Kotlin, Spring Boot, JPA, MySQL 기준으로 진행합니다.
- 일반적인 Spring 관례보다 이 프로젝트의 가까운 코드, 테스트, API 계약을 우선합니다.
- controller는 request/response 변환과 use case 호출에 집중합니다.
- JPA entity를 API response로 직접 반환하지 않습니다.
- 돈은 부동소수점이 아니라 정수 minor unit 또는 decimal 계열로 다룹니다.
- 인증, 권한, 세션, refresh token 변경은 API 계약과 테스트를 함께 확인합니다.

## 기준 문서

- `docs/engineering/tech-stack.md`
- `docs/engineering/domain-model.md`
- `docs/engineering/api-contract.md`
- `docs/engineering/auth-session.md`
- `docs/engineering/environment.md`
- `docs/engineering/testing-strategy.md`
- `docs/planning/implementation-plan.md`

## 검증

```bash
./gradlew test
```

## 주의할 것

- 필요 없는 레이어, mapper, base abstraction을 만들지 않습니다.
- 관련 없는 리팩터링, 포맷 변경, 파일 이동을 섞지 않습니다.
- secret 값은 코드, 문서, 테스트 로그에 남기지 않습니다.
