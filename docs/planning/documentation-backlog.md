# Documentation Backlog

새 [V1 Scope](../product/v1-scope.md)의 제품·화면·엔지니어링 목표 문서는 정리되어 있습니다. 현재 코드는 이전 제품 범위의 기준선이므로 구현 단계마다 목표 문서의 `현재 구현` 표기와 실제 계약을 함께 갱신합니다.

## 완료된 V1 기준 문서

- [Domain Model](../engineering/domain-model.md): 예산 기간, 배분, 거래 snapshot, 공개 범위와 예약 모델
- [API Contract](../engineering/api-contract.md): 목표 endpoint, DTO, 오류, 권한과 구형 API 전환
- [Permissions](../engineering/permissions.md): active/former member와 개인·공동 거래 권한
- [Privacy](../engineering/privacy.md): 개인 거래, 결제수단, OCR 이미지와 로그 원칙
- [Data Migration](../engineering/data-migration.md): 월 예산·카테고리·장부·legacy 기능의 단계별 전환
- [Transaction Import](../engineering/transaction-import.md): 후보 품질, 중복 판정과 batch 저장
- [Scheduled Transactions](../engineering/scheduled-transactions.md): 할부·반복·고정비·주간 가이드 중복 방지
- [Testing Strategy](../engineering/testing-strategy.md): 두 사용자 권한, 기간 경계, 개인정보와 자동 거래 검증

## 구현과 함께 갱신할 문서

- `docs/design/frontend-implementation.md`: 새 route와 화면이 실제 React 코드로 전환될 때 current baseline 갱신
- `README.md`: 목표 기능이 실제로 완료될 때 current implementation baseline 갱신
- `docs/engineering/api-contract.md`: 구현된 DTO/OpenAPI와 optional·nullable 최종 대조
- `docs/engineering/data-migration.md`: 실제 Flyway version, 검증 query와 rollback artifact 연결
- `docs/engineering/environment.md`, `.env.example`: scheduler, upload 또는 storage 설정이 실제로 추가될 때 함께 갱신

## 출시 전 추가 문서

- `docs/engineering/deployment.md`: 배포 환경, schema 전환 순서, secret 주입과 rollback
- `docs/engineering/backup-restore.md`: 금융 데이터 백업, 복구 리허설과 보존 주기
- `docs/engineering/observability.md`: scheduler·OCR·API 오류 지표와 개인정보 없는 로그 기준
- README 화면 이미지: 새 V1 화면 구현 후 핵심 흐름만 추가

## 검수 기록

- 접근성: keyboard, focus, screen reader label, reduced motion
- 반응형: 긴 장부명, 큰 금액, 많은 거래와 category
- 개인정보: 상대방 비공개 거래가 목록·홈·분석·알림·API에 노출되지 않는지 확인
- 경계 조건: 예산 기간 시작일, 월말 반복 거래, 기간 전환과 재알림
- OCR: 저신뢰 후보 숨김, 중복 후보 기본 제외, batch 수정·저장
- migration: 전후 거래 수·금액 합계, 멤버십과 snapshot 무결성

## 결정 기록 후보

실제 구현에서 여러 선택지의 장기 영향이 확인되면 `docs/engineering/adr/`에 남깁니다.

- category snapshot 물리 저장 구조와 대량 이름 변경 방식
- scheduler 다중 instance lock과 실패 재처리 방식
- OCR session 원본 저장소와 확정 보존 시간
- 알림 scheduler의 사용자 timezone 처리 방식
- 구형 API 호환 기간과 제거 시점
