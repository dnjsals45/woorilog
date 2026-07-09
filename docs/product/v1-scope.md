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
- 거래 상세 조회
- 월별 거래 목록 조회
- 빠른 거래 입력
- Tesseract.js OCR 기반 거래 가져오기 preview

### Category

- 장부별 카테고리 조회
- 장부별 카테고리 생성
- 기본 카테고리 제공

### Budget Month

- 월 예산 설정
- 카테고리별 월 예산 설정
- 멤버별 월 분담/할당 설정
- 월 마감
- 월 재오픈

### Recurring Transaction

- 반복 거래 목록 조회
- 반복 거래 생성
- 반복 거래 수정
- 반복 거래 일시정지/재개
- 생성 예정 반복 거래 조회
- 반복 거래 생성 실행

### Dashboard And Statistics

- 현재 장부 대시보드 조회
- 예산/지출 요약
- 최근 거래
- 카테고리별 지출
- 멤버별 사용 현황
- 월별 통계 조회

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
