# Implementation Plan

이 문서는 V1 구현 순서를 미리 정리한 계획입니다.
Codex analysis 단계에서 작업 분해와 handoff packet 작성에 참고할 수 있지만, 실제 작업은 요청 시점의 코드, 문서, 우선순위를 다시 확인한 뒤 나눕니다.

## Current Status

- 2026-07-22 기준 1~9단계의 V1 기능은 백엔드와 프론트엔드에 구현되어 있습니다.
- 현재 구현 범위는 `docs/product/v1-scope.md`와 README의 `V1 Implementation Status`를 기준으로 확인합니다.
- 10단계 Product Hardening 중 README, API/도메인/인증/테스트 문서와 주요 회귀 테스트는 반영되어 있습니다.
- 배포·백업·개인정보 문서와 화면 디자인 고도화는 후속 작업이며, 남은 문서는 `docs/planning/documentation-backlog.md`에서 관리합니다.

## Principles

- 기능은 문서, API 계약, 테스트와 함께 구현합니다.
- 각 단계는 리뷰 가능한 PR/커밋 단위로 유지합니다.
- API 계약, 도메인 모델, 테스트가 함께 따라오지 않는 기능은 완료로 보지 않습니다.
- `.codex`, `.agent`, 개인 workflow 파일은 git 이력에 포함하지 않습니다.
- 처음부터 과한 추상화나 사용하지 않는 계층을 만들지 않습니다.

## Target Baseline

새 저장소는 다음을 먼저 갖춥니다.

- README
- AGENTS
- product/design/engineering/planning docs
- `.gitignore`
- backend scaffold
- frontend scaffold
- Docker Compose
- CI

## Implementation Order

### 1. Repository Baseline

- Gradle backend scaffold
- Vite frontend scaffold
- Docker Compose MySQL
- `.env.example`
- CI skeleton
- health check

Completion:

- `GET /health` works.
- backend test runs.
- frontend lint/test/build runs.
- CI runs on PR.

### 2. Auth Foundation

- Kakao OAuth login URL/callback
- access/refresh token
- session 조회
- logout/refresh
- local/test-only developer login
- frontend login/callback/protected route

Completion:

- 사용자는 로그인 후 원래 요청한 보호 경로 또는 기본 `/dashboard`에 진입할 수 있습니다.
- 로컬 개발과 Playwright 테스트에서는 개발자 로그인으로 보호 화면에 진입할 수 있습니다.
- 실제 사용자 로그인 흐름은 Kakao OAuth 기준으로 검증합니다.

### 3. Ledger Foundation

- User
- Ledger
- LedgerMember
- default personal ledger
- additional personal ledger
- group ledger
- ledger switching and fallback

Completion:

- 신규 사용자는 기본 개인 장부를 자동으로 가집니다.
- 사용자는 개인/공동 장부를 전환할 수 있습니다.

### 4. Transaction And Category

- LedgerCategory
- default categories
- transaction create/update/detail/month list
- quick transaction parser/command
- frontend calendar/ledger and transaction edit

Completion:

- 사용자는 현재 장부에 거래를 등록하고 월별로 조회할 수 있습니다.

### 5. Budget Month

- LedgerMonth
- member allocation
- category budget
- update month settings
- close/reopen month
- frontend budget month settings

Completion:

- 사용자는 월 예산과 카테고리/멤버별 설정을 저장할 수 있습니다.

### 6. Dashboard And Statistics

- dashboard summary
- recent transactions
- category spending
- member usage
- monthly statistics
- frontend dashboard/statistics

Completion:

- 사용자는 현재 장부의 월 예산 대비 지출 흐름을 확인할 수 있습니다.

### 7. Invitation

- group ledger participation model
- direct invitation
- link invitation
- pending invitation
- accept/reject/cancel
- frontend invitation modal/link page

Completion:

- 사용자는 공동 장부에 다른 사용자를 초대하고 초대를 수락할 수 있습니다.

### 8. Recurring Transaction

- recurring template
- due query
- generate
- pause/resume
- frontend recurring settings

Completion:

- 사용자는 반복 거래를 관리하고 생성할 수 있습니다.

### 9. Transaction Import

- backend Native Tesseract OCR와 이미지 전처리 integration
- parser
- preview endpoint
- frontend image import preview

Completion:

- 사용자는 이미지/텍스트 기반 거래 후보를 확인·수정하고 선택해 저장할 수 있습니다.

### 10. Product Hardening

- README update
- screenshots
- API examples complete
- deployment doc
- CI badge
- known limitations
- seed data

Completion:

- README와 docs만 보고 프로젝트 목적, 구조, 실행 방법, 핵심 구현을 다시 파악할 수 있습니다.

## Do Not Commit

- `.codex/skills`
- `.agent`
- local prompt files
- generated build output
- local env files
- IDE/cache files

## Review Checklist

- 관련 문서가 갱신되었는가?
- API 계약이 구현과 맞는가?
- backend test가 있는가?
- frontend test 또는 명확한 검증 방법이 있는가?
- secret이 포함되지 않았는가?
- 작업 범위 밖 변경이 섞이지 않았는가?
