# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/engineering/adr/`** — read ADRs that touch the area you're about to work in. (This repo keeps ADRs under `docs/engineering/adr/`, not the skills' default `docs/adr/`. ADR 후보는 `docs/planning/documentation-backlog.md`의 "결정 기록 후보"에 쌓입니다.)

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

**This repo is single-context** — one `CONTEXT.md` at the root, ADRs under `docs/engineering/adr/`.

```
/
├── CONTEXT.md
├── docs/engineering/adr/
│   ├── 001-session-schema-and-settlement.md
│   └── 002-server-side-transaction-image-ocr.md
├── backend/
└── frontend/
```

번호는 기존 ADR을 따라 3자리(`003-...`)로 이어갑니다.

참고 — 스킬 템플릿의 기본 구조(이 저장소는 쓰지 않음):

```
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

Multi-context repo (presence of `CONTEXT-MAP.md` at the root):

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
