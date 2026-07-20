# V1 Scope

V1은 우리로그를 실제 생활에서 사용할 수 있게 만드는 첫 완성 범위입니다.
개인 장부와 공동 장부를 함께 지원하는 예산 운영 가계부를 목표로 합니다.

## Goals

- 개인 장부와 공동 장부를 모두 지원합니다.
- 거래 기록, 예산 운영, 통계, 초대, 반복 거래, 거래 가져오기를 하나의 완성된 흐름으로 제공합니다.
- 문서, API 계약, 테스트, CI를 기능과 함께 정리합니다.

## Included Features

### Auth

- Kakao OAuth login
- local/test-only developer login for UI automation and local verification
- access/refresh token 기반 세션 유지
- logout
- `GET /api/me` 사용자 조회

### Ledger

- 기본 개인 장부 자동 생성
- 추가 개인 장부 생성
- 공동 장부 생성
- 장부 목록 조회
- 마지막 사용 장부 저장
- 접근 불가 장부 fallback
- 개인/공동 장부 라벨 단순화
- 반복 거래 집계 마감일 설정
- 공동 장부 이름 변경, 장부 보관, 멤버 내보내기와 탈퇴

### Invitation

- 초대 가능 사용자 조회
- 사용자 직접 초대
- 초대 링크 생성
- 장부 초대 목록 조회
- 초대 취소
- 받은 초대 조회
- 초대 수락/거절
- 초대 링크 조회/수락

### Transaction

- 거래 등록
- 거래 수정
- 거래 삭제
- 현금/카드 결제수단과 사용 카드 기록
- 카드 할부 등록과 회차별 월 거래 자동 생성
- 거래 상세 조회
- 월별 거래 목록 조회
- 빠른 거래 입력
- Tesseract.js OCR 기반 거래 가져오기 preview
- 가져오기 후보 수정과 선택 저장

### Category

- 장부별 카테고리 조회
- 통계용 대분류 조회·생성
- 장부별 카테고리 생성
- 장부별 카테고리 이름·통계 대분류 수정
- 기본 카테고리 제공

### Budget Month

- 월 예산 설정
- 카테고리별 월 예산 설정
- 장부별 고정비 템플릿 관리와 신규 월 예산의 기본값 반영
- 멤버별 월 분담/할당 설정
- 월 마감
- 월 재오픈
- 마감 월의 예산·거래·반복 거래 변경 차단

### Settlement

- 월별 멤버 정산 계산
- 일부/전체 송금 기록
- 송금 기록 취소와 잔액 재계산

### Notification

- 직접 초대, 월 마감, 예산 초과 알림
- 알림 목록과 개별/전체 읽음 처리

### Recurring Transaction

- 반복 거래 목록 조회
- 반복 거래 생성
- 반복 거래 수정
- 반복 거래 삭제(이미 등록된 과거 거래 유지)
- 시작일 거래 자동 등록과 이후 발생분 자동 등록
- 집계 마감일 기준 반복 지출·수입 합계 표시

### Dashboard And Statistics

- 현재 장부의 선택 월 대시보드 조회
- 예산/지출 요약
- 최근 거래
- 카테고리별 지출
- 멤버별 사용 현황
- 카드별 다음 청구 예상 금액
- 월별 통계 조회

### Card

- 장부별 카드 등록, 수정, 삭제
- 카드 결제금액 확정일 관리

### Frontend

- landing
- login
- OAuth callback
- dashboard
- calendar/ledger
- transaction edit
- ledger month settings
- statistics
- settings
- notifications
- help / not found
- invitation link page
- protected navigation layout

## Completion Criteria

- README만 보고 프로젝트 목적, 실행, 검증 방법을 이해할 수 있습니다.
- 주요 API는 `docs/engineering/api-contract.md`에 계약이 정리되어 있습니다.
- 주요 도메인 규칙은 `docs/engineering/domain-model.md`에 정리되어 있습니다.
- 백엔드 주요 use case와 controller는 테스트를 가집니다.
- 프론트엔드 주요 사용자 흐름은 React Testing Library 테스트를 가집니다.
- CI에서 백엔드 테스트와 프론트엔드 lint/test/build가 실행됩니다.
- `.codex`, 개인 작업 스킬, local-only 문서는 git 이력에 포함하지 않습니다.
