# ADR-001: 세션, 스키마 변경, 정산 기준

## Status

Accepted

## Context

- access token만 localStorage에 저장하면 XSS 노출과 30분 후 강제 로그아웃 문제가 있습니다.
- Hibernate `ddl-auto=update`는 장기 보관 데이터의 변경 이력을 보장하지 못합니다.
- 정산 UI가 예산 할당 차이를 임시 정산액으로 표시해 실제 의미와 달랐습니다.

## Options

- 브라우저 저장소 token과 메모리 access token + HttpOnly refresh cookie.
- Hibernate 자동 갱신과 Flyway migration.
- 예산 할당 차이와 실제 결제액/분담 비율 기반 정산.

## Decision

- access token은 프론트엔드 메모리에만 보관합니다.
- refresh token은 `HttpOnly`, `SameSite=Lax` cookie로 발급하고 갱신 때마다 회전합니다.
- Flyway를 사용하고 운영 JPA schema mode는 `validate`로 둡니다.
- 정산 분담액은 멤버 할당 비율을 사용하며, 할당 합계가 0이면 균등 분담합니다. 실제 결제액과 분담액의 차이로 송금 방향을 계산하고 완료 기록을 반영합니다.

## Consequences

- 보호 화면 새로고침 시 refresh endpoint를 먼저 호출합니다.
- 운영 환경은 `JWT_SECRET`, DB credential, secure cookie 설정을 반드시 제공해야 합니다.
- 모든 schema 변경은 새 migration으로 추가합니다.
- 정산 완료 기록은 취소할 수 있으며 이후 남은 정산액을 다시 계산합니다.
