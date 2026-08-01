# AGENTS.md

우리로그 저장소에서 AI 에이전트가 따르는 작업 원칙은 루트 [`CLAUDE.md`](./CLAUDE.md)에 있습니다.

**[`CLAUDE.md`](./CLAUDE.md)가 이 저장소 작업 원칙의 단일 기준입니다. 작업 시작 시 반드시 먼저 읽습니다.**
이 문서는 원칙을 중복 서술하지 않고, 포인터와 서브 에이전트용 경로만 제공합니다.

## 읽어야 할 문서

- 작업 원칙, 주요 문서 목록, 검증 명령, 커밋 규칙: [`CLAUDE.md`](./CLAUDE.md)
- `backend/**` 작업: [`backend/CLAUDE.md`](./backend/CLAUDE.md)
- `frontend/**` 작업: [`frontend/CLAUDE.md`](./frontend/CLAUDE.md)

## 서브 에이전트 기준

Claude Code가 메인 에이전트이고, Codex를 포함한 다른 에이전트는 서브 에이전트로 동작합니다.

- skill 원본은 `.claude/skills/`이고, `.codex/skills/`는 그 사본입니다. Codex는 `.codex/skills/` 경로를 사용합니다.
- skill 내용을 고칠 일이 생기면 사본을 고치지 말고 메인 에이전트에게 알립니다.
- 기본적으로 커밋하지 않고 변경 결과와 검증 결과만 보고합니다. stage와 커밋 판단은 메인 에이전트가 합니다.
- 읽을 파일은 위임받은 목록으로 제한합니다. "모든 문서를 읽어라" 식의 컨텍스트 확장은 하지 않습니다.
