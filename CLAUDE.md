# CLAUDE.md

우리로그 저장소의 **작업 원칙 단일 기준(single source of truth)** 입니다.
Claude Code가 메인 에이전트이고, Codex를 비롯한 다른 에이전트는 서브 에이전트로 이 문서를 따릅니다.

`AGENTS.md`는 이 문서를 가리키는 포인터이며, 원칙을 중복 서술하지 않습니다.
작업 원칙이 바뀌면 이 문서를 먼저 고칩니다.

## 기본 원칙

- 작업은 저장소 루트에서 시작합니다.
- 구현 전에 관련 문서와 가까운 코드를 먼저 확인합니다.
- 변경은 요청 범위 안에서 작게 유지합니다.
- 관련 없는 리팩터링, 포맷 변경, 파일 이동을 섞지 않습니다.
- 코드와 문서가 충돌하면 구현하지 말고 충돌 지점을 먼저 정리합니다.
- 동작이 바뀌면 테스트나 검증 방법을 함께 갱신합니다.
- secret, 개인 토큰, 실제 credential은 커밋하지 않습니다.
- 환경 변수나 secret을 바꾸면 `docs/engineering/environment.md`와 `.env.example`을 함께 확인합니다.

## 프로젝트 개요

커플·부부가 공동 생활비와 각자 예산을 함께 운영하는 가계부 서비스입니다.
제품 목표는 [`README.md`](./README.md), V1 범위는 [`docs/product/v1-scope.md`](./docs/product/v1-scope.md)를 봅니다.

```text
backend/   Kotlin 2.1 / Spring Boot 3.5 / JPA / Flyway / MySQL (JDK 21)
frontend/  React 19 / Vite / TypeScript / TanStack Query / React Router / Tailwind v4 / RHF + Zod
docs/      product · design · engineering · planning
.claude/   Claude Code skill 원본, git 미추적
.codex/    .claude/skills 사본 (Codex 서브 에이전트용), git 미추적
.agent/    개인 워크플로(Analysis → Implementation → QA), git 미추적
```

백엔드 패키지는 `com.woorilog` 아래 `controller / service / domain / security / config / exception`,
프론트엔드는 `src/pages`, `src/features/<도메인>`, `src/shared/{api,lib,ui}`, `src/components/layout` 구조입니다.

현재 코드는 이전 제품 범위를 구현한 기준선이며 새 V1의 완료 상태가 아닙니다.
새 V1 구현 순서는 [`docs/planning/implementation-plan.md`](./docs/planning/implementation-plan.md)를 따릅니다.

## 주요 문서

- 제품 범위: `docs/product/v1-scope.md`
- 사용자 흐름: `docs/product/user-flows.md`
- 화면 구조: `docs/design/information-architecture.md`
- API 계약: `docs/engineering/api-contract.md`
- 인증/세션: `docs/engineering/auth-session.md`
- 환경 변수: `docs/engineering/environment.md`
- 도메인 모델: `docs/engineering/domain-model.md`
- 권한/개인정보: `docs/engineering/permissions.md`, `docs/engineering/privacy.md`
- 데이터 이전: `docs/engineering/data-migration.md`
- 거래 가져오기/예약 실행: `docs/engineering/transaction-import.md`, `docs/engineering/scheduled-transactions.md`
- 테스트 전략: `docs/engineering/testing-strategy.md`
- 구현 계획: `docs/planning/implementation-plan.md`

## Subproject 라우팅

서브프로젝트 작업 시 해당 `CLAUDE.md`도 함께 따릅니다.

### `backend/**` → [`backend/CLAUDE.md`](./backend/CLAUDE.md)

- API 계약이 바뀌면 `docs/engineering/api-contract.md`도 갱신합니다.
- 검증 명령은 백엔드 루트에서 실행합니다.

### `frontend/**` → [`frontend/CLAUDE.md`](./frontend/CLAUDE.md)

- 화면 구조, 시각 디자인, 접근성, 반응형 판단은 `docs/design/**` 문서를 우선합니다.
- 검증 명령은 프론트엔드 루트에서 실행합니다.

### `docs/**`

- 문서는 현재 구현, 확정된 제품 판단, 검증 가능한 계획을 기준으로 작성합니다.
- 확정되지 않은 내용은 정책처럼 쓰지 않습니다.

## Skill 사용

`.claude/skills/`가 skill 원본입니다. 작업 유형별로 다음 skill을 사용합니다.

| 작업 | Skill |
| --- | --- |
| 백엔드 Kotlin/Spring | `kotlin-spring-backend` |
| 프론트엔드 React/Vite | `react-vite-frontend` |
| 테스트 범위 결정 | `testing-strategy` |
| 커밋/브랜치/PR/CI | `git-workflow` |
| UI/UX 디자인 판단 | `design-taste-frontend` |
| 인터랙션·모션 다듬기 | `emil-design-eng` |
| 라이브러리 선택 (명시 호출 전용) | `pick-ui-library` |

디자인 계열 skill의 역할 분담은 다음과 같습니다.

- `design-taste-frontend`가 **디자인 작업의 메인 규칙**입니다. 화면 구조, 레이아웃, 타이포, 색 판단은 여기를 기준으로 합니다.
  단 이 저장소에는 확정된 디자인 시스템이 있으므로, 충돌하면 `docs/design/**`와 `frontend/src/styles/tokens.css`가 우선합니다.
- `emil-design-eng`는 **인터랙션을 다듬을 때** 사용합니다. 전환, 상태 피드백, 타이밍·이징, 마이크로 인터랙션처럼
  화면이 정해진 뒤의 결을 다룹니다. 새 화면을 처음 설계할 때는 쓰지 않습니다.
- `pick-ui-library`는 `disable-model-invocation: true`라 **사용자가 명시적으로 호출할 때만** 동작합니다.
  기존 코드로 해결이 안 되는 문제(가상 스크롤, 드래그앤드롭, 커맨드 메뉴 등)를 만났을 때 후보를 받는 용도이며,
  결과는 제안일 뿐입니다. 실제 의존성 추가는 아래 "하지 말 것"에 따라 **별도 기술 결정과 사용자 승인**을 거칩니다.

skill과 reference는 필요한 것만 읽습니다. 어떤 파일을 고를지는
[`.agent/workflows/skill-routing.md`](./.agent/workflows/skill-routing.md)의 라우팅 표를 따릅니다.
"모든 문서를 읽어라" 식의 컨텍스트 확장은 하지 않습니다.

skill 내용을 고칠 때는 `.claude/skills/`를 원본으로 고친 뒤 `.codex/skills/`에 동기화합니다.

```bash
for s in git-workflow kotlin-spring-backend react-vite-frontend testing-strategy \
         design-taste-frontend emil-design-eng pick-ui-library; do
  rsync -a --delete --exclude '__pycache__' ".claude/skills/$s/" ".codex/skills/$s/"
done
```

## 서브 에이전트 위임

Codex와 subagent는 서브 에이전트로 사용하고, 최종 QA와 커밋 판단은 메인 에이전트인 Claude Code가 합니다.

- 위임할 때 읽어야 할 skill·reference·프로젝트 파일 경로를 정확히 지정합니다.
- Codex에게 넘길 때는 `.codex/skills/` 경로를 지정합니다. 사본이 최신인지 먼저 확인합니다.
- 서브 에이전트는 기본적으로 커밋하지 않고 변경 결과와 검증 결과만 보고합니다.
- 서브 에이전트 결과는 diff와 검증 명령으로 확인한 뒤 반영합니다.

## 검증

동작이 바뀌면 해당하는 명령을 실행하고 결과를 그대로 보고합니다.

```bash
cd backend && ./gradlew test
```

```bash
cd frontend && npm run lint && npm run test && npm run build
```

프론트엔드 UI/화면 변경은 [`.agent/workflows/ui-qa-playwright.md`](./.agent/workflows/ui-qa-playwright.md)의 QA 체크리스트를 따르고,
필요하면 `npm run test:e2e`를 실행합니다.

문서만 바꿨으면 링크와 참조 파일 존재 여부를 확인합니다.

로컬 실행은 `docker compose up` (frontend :5173, backend :8080, MySQL :3306)입니다.

## 커밋

`git-workflow` skill이 기준이며, 핵심은 다음과 같습니다.

- solo development mode: `main`에서 직접 작업하고, PR은 기본으로 만들지 않습니다.
- 형식: `<type>: <요약>` 또는 `[back]`/`[front]` scope. type은 영어, 요약은 한국어.
  - `[back] feat: 로그인 API 추가`, `[front] feat: 로그인 화면 추가`, `docs: 기술 스택 결정 정리`
- 계층/영역별로 롤백 가능한 최소 단위로 쪼개어 커밋합니다. 스키마·서비스·API·프론트 연동·UI·문서는 서로 별도 커밋 후보입니다.
- 사용자가 요청할 때만 커밋합니다. 그 전에는 변경과 검증 결과만 보고합니다.
- 요청 범위 밖 파일을 함께 stage하지 않습니다.

## 하지 말 것

- secret, 실제 credential을 코드·문서·로그·커밋에 남기기
- 요청과 무관한 리팩터링·포맷 변경·파일 이동 섞기
- 문서와 코드가 충돌하는 상태에서 그냥 구현하기 (충돌 지점을 먼저 정리)
- 명시적 채택 없이 상태관리/UI/차트 라이브러리 추가하기
- 작업 원칙을 `AGENTS.md`에만 적고 이 문서에 반영하지 않기
