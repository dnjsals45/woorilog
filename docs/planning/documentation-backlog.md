# Documentation Backlog

새 [V1 Scope](../product/v1-scope.md)는 제품 목표를 설명하고, 현재 엔지니어링 문서는 이전 구현 기준선을 설명합니다.
기능 구현 단계마다 아래 문서를 코드와 함께 갱신합니다.

## 구현 전 우선 갱신

- `docs/engineering/domain-model.md`: 예산 기간, 예산 배분, 카테고리 스냅샷, 거래 공유와 탈퇴 후 접근 모델
- `docs/engineering/api-contract.md`: 링크 전용 초대, 새 예산·거래·분석·알림 계약과 제거 대상 API
- `docs/engineering/testing-strategy.md`: 두 사용자 권한, 예산 기간 경계, 개인정보와 자동 거래 테스트
- `docs/design/frontend-implementation.md`: 새 화면·라우트가 실제 코드에 반영될 때 현재 구현 기준선 갱신

## 추가할 엔지니어링 문서

- `docs/engineering/permissions.md`: `OWNER`·`MEMBER`, 개인·공동 거래와 탈퇴 후 읽기 권한
- `docs/engineering/privacy.md`: 거래 이미지, 개인 거래, 공유 상태와 보존 기준
- `docs/engineering/data-migration.md`: 기존 월 예산·카테고리 연결·보관 장부를 새 V1 모델로 옮기는 기준
- `docs/engineering/transaction-import.md`: OCR 후보 신뢰도, 중복 판단, 추천과 일괄 저장
- `docs/engineering/scheduled-transactions.md`: 할부·반복 거래·고정비 생성과 중복 방지

## 실제 사용 전

- `docs/engineering/deployment.md`: 배포 환경, 스키마 변경, secret 주입과 rollback
- `docs/engineering/backup-restore.md`: 금융 데이터 백업과 복구
- README 화면 이미지: 새 V1 화면 구현 후 핵심 흐름만 추가

## 검수 기록

- 접근성: keyboard, focus, screen reader label, reduced motion
- 반응형: 긴 장부명, 큰 금액, 많은 거래와 카테고리
- 개인정보: 상대방 비공개 거래가 홈·분석·API에 노출되지 않는지 확인
- 경계 조건: 예산 기간 시작일, 월말 반복 거래, 기간 전환과 재알림
- OCR: 저신뢰 후보 숨김, 중복 후보 기본 제외와 일괄 수정

## 결정 기록 후보

큰 기술 선택은 `docs/engineering/adr/` 아래 ADR로 남깁니다.

- 기존 데이터 마이그레이션과 호환 기간
- 카테고리 스냅샷 저장 구조
- 예산 기간 계산과 스케줄러 실행 기준
- OCR 신뢰도와 중복 판정 방식
- 알림 스케줄러와 사용자 시간대 처리
