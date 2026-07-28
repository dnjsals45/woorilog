# Documentation Backlog

이 문서는 현재 구현에 비해 아직 부족한 후속 문서를 정리합니다. 2026-07-22 기준 인증, API 계약, 도메인 모델, 환경 변수, 테스트 전략, OCR ADR은 기존 문서에 반영되어 있습니다.

## Engineering Structure

- `docs/engineering/architecture.md`: backend package 구조, frontend 폴더 구조, API client/query/component 책임 분리 기준
- `docs/engineering/permissions.md`: 장부 멤버 role, 초대·예산·정산 변경 권한, 접근 불가 fallback
- `docs/engineering/transaction-import.md`: Native Tesseract 입력/출력, 이미지 전처리, parser와 preview 저장 규칙, 실패 처리
- `docs/engineering/privacy.md`: 영수증/거래 이미지, 거래 메모, 사용자 식별 정보 보관 기준

## Data Model

- `docs/engineering/data-model.md`: 실제 entity 기준 ERD, 주요 index, unique 제약, cascade 정책

## Add Before Real Use

- `docs/engineering/deployment.md`: 배포 환경, DB migration, secret 주입, rollback 기준
- `docs/engineering/backup-restore.md`: 개인 금융 데이터 백업, 복구, export 기준
- README screenshots: 실제 화면이 생긴 뒤 핵심 사용 흐름만 캡처

## Design QA

- README screenshots: 실제 서비스 데이터가 준비되면 핵심 흐름만 캡처
- 접근성 검수 기록: keyboard, focus, screen reader label, reduced motion
- edge state 검수 기록: 긴 거래명, 큰 금액, 빈 월, 많은 거래와 많은 카테고리
- 초대 흐름 상세 명세: pending, 로그인 복귀, 만료와 이미 수락된 상태를 구현 변경 시 추가

## Decision Log Candidates

큰 선택이 생기면 `docs/engineering/decisions/` 아래 ADR로 남깁니다.

- JWT cookie/header 전달 방식 세부 결정
- Flyway 도입 시점 결정
- 차트 라이브러리 도입 여부
- 로컬 홈 배포 운영 방식 결정
