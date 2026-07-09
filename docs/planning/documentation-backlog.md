# Documentation Backlog

이 문서는 지금 당장 확정하지 않아도 되지만, 구현 단계가 오면 추가하거나 확장해야 할 문서를 정리합니다.

## Add Before Scaffold

- `docs/engineering/architecture.md`: backend package 구조, frontend 폴더 구조, API client/query/component 책임 분리 기준

## Add During Auth Foundation

- `docs/engineering/auth-session.md`: Kakao OAuth, local/test-only developer login, JWT access/refresh token, cookie/header 전달 방식, logout/refresh 흐름 상세화
- `docs/engineering/api-contract.md`: Auth endpoint별 request/response/errors 예시 확장

## Add During Ledger And Transaction

- `docs/engineering/data-model.md`: 실제 entity 기준 ERD, 주요 index, unique 제약, cascade 정책
- `docs/design/wireframes.md`: Dashboard, Calendar/Ledger, Transaction Edit, Budget Month Settings의 저해상도 화면 구조가 asset만으로 부족해질 때 추가
- `docs/engineering/api-contract.md`: Ledger, Category, Transaction endpoint 예시 확장

## Add During Collaboration

- `docs/engineering/permissions.md`: 장부 멤버 role, 초대 가능 조건, 접근 불가 fallback, 링크 초대 만료 정책
- `docs/design/invitation-flow.md`: 초대 생성, pending invitation, link accept의 화면 상태

## Add During Import And OCR

- `docs/engineering/transaction-import.md`: Tesseract.js OCR 입력/출력, parser 입력/출력, preview 저장 여부, 실패 처리
- `docs/engineering/privacy.md`: 영수증/거래 이미지, 거래 메모, 사용자 식별 정보 보관 기준

## Add Before Real Use

- `docs/engineering/deployment.md`: 배포 환경, DB migration, secret 주입, rollback 기준
- `docs/engineering/backup-restore.md`: 개인 금융 데이터 백업, 복구, export 기준
- README screenshots: 실제 화면이 생긴 뒤 핵심 사용 흐름만 캡처

## Decision Log Candidates

큰 선택이 생기면 `docs/engineering/decisions/` 아래 ADR로 남깁니다.

- JWT cookie/header 전달 방식 세부 결정
- Flyway 도입 시점 결정
- 차트 라이브러리 도입 여부
- 로컬 홈 배포 운영 방식 결정
