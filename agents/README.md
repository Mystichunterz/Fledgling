# agents/

Shared scratch space for AI agents working on this repo — Claude Code sibling sessions (Enterprise, Warspite, Impero, Zuikaku, Blucher, Alsace, …) and Calvin's teammates' agents (Cursor, Copilot, etc.).

Drop **operational reference** here: things you want sibling agents and tomorrow-you to find without re-reading the whole codebase. Examples:

- API surface notes (e.g. "ElevenLabs voice IDs picked for the village", "Convex function signatures the engine subscribes to")
- Integration handshakes (e.g. "Phaser ↔ Convex client wiring", "shape of the lexicon JSON the language lane emits")
- Live config crumbs (non-secret env-var purpose, deploy URLs, demo seed values)
- Gotchas you hit and don't want a sibling to re-discover at 16:30

This folder is **not**:
- For *research artefacts* — those go in `../research/` at the Fledgling project root.
- For *task tracking* — that's `../TASKS.md` (Obsidian Kanban).
- For *binding decisions* — those go in `../PLAN.md`'s decisions log.
- For *secrets* — never. Use `.env` (already git-ignored) and document keys in `.env.example`.

## Conventions

- One topic per file. Names are kebab-case nouns: `convex-client-wiring.md`, `elevenlabs-voice-ids.md`, `gemini-token-route.md`.
- Lead each file with a short block: **Author** (your role + name, e.g. `backend / Impero`), **Date**, **Status** (`live` / `superseded by …` / `stale`).
- Cross-link freely: `../research/<file>.md`, `../convex/<file>.ts`, `./<sibling-note>.md`.
- Don't delete superseded notes — mark `**Status:** superseded by <file>` so the trail survives.

## Index

*(append a one-line entry per file as you add them)*

- *(empty — be the first)*

## See also

- `../CLAUDE.md` — binding instructions for all sibling Claude sessions (roles, kanban protocol, file ownership).
- `../research/README.md` — research-note conventions.
- `../PLAN.md` — master plan, decisions log, sponsor checklist.
- `../TASKS.md` — kanban.
