# Fledgling — session handoff (2026-05-09)

This document captures everything from the current Claude Code session so a
different model can continue without re-deriving context. Persistent project
facts live in `~/.claude/projects/.../memory/project_fledgling.md`; this file
is the **session delta** on top of that.

---

## 1. Project recap (one-screen)

- **Fledgling** — hackathon browser game (TypeScript + Vite + Phaser 4) where
  the player decodes a procedurally-generated language to complete fetch
  quests. Pure-decipherment learning model.
- **Repo:** `C:\Users\Yaw Tia\Desktop\AIE Hackathon\Fledgling`
- **Frame system (source of truth: `src/lang/frames.ts`):**
  - 10 frames: GIVE, TAKE, MOVE, WANT, BE_AT, HAVE, SEE, SAY, MAKE, EAT.
  - 5 entity types: ANIMATE, ITEM, LOCATION, ABSTRACT, EVENT.
  - Moods: declarative / interrogative / imperative.
  - Filled frames carry optional `tense` and `negated`. Entity refs carry
    optional `number`.
  - `validateFilledFrame` enforces: every required role filled; ≤ 1 wildcard
    `?` (only in interrogative); imperative requires action category;
    nesting only where `allowsNested` (currently SAY.content); max depth 3.
- **Encoder/decoder:** `src/lang/encoder.ts` (frame → conlang surface) and
  `src/lang/decoder.ts` (conlang surface → frame) are deterministic and
  already work end-to-end. The translator workbench at
  `http://localhost:5173/workbench.html` is the existing UI for these.
- **Example fixture language:** `src/lang/example-language.ts` — id `tovari`,
  SOV, suffixing, nom-acc.
- **Stack quirks:** ESM (`"type": "module"`), `.js` extensions in TS imports,
  uses zod for schema validation. `@anthropic-ai/sdk` was already installed;
  `groq-sdk` was added this session.

---

## 2. What was built this session (and why most of it is the *wrong* shape)

User asked: "possible to set up a quick groq SLM to parse semantic frames?"

I (incorrectly) interpreted this as **English text → frame** and built that.
Late in the session the user clarified: they want **frame → frame** —
structured input (an incoming frame the NPC heard) to structured output (the
NPC's response frame). The English-language layer is **never** involved at
runtime; conlang surface ↔ frame is handled by the existing encoder/decoder.

### Code that exists (English→frame; may be salvaged or deleted)

| File | Purpose | Status |
|---|---|---|
| `src/lang/parse.ts` | `parseEnglishToFrame(text, opts)` — Groq Llama 3.3 70B in JSON-object mode, with one-retry-with-validator-error pathway. Helper `conceptIdsFromLanguage(spec)` filters lexicon to nouns+pronouns. | **Off-target.** Useful as a designer authoring tool; not on game's critical path. |
| `src/lang/parse-demo.ts` | Node CLI demo running 6 canonical sentences. | Off-target. |
| `parse.html` + `src/ui/parse-main.tsx` + `src/ui/ParsePage.tsx` | Standalone web demo at `/parse.html`. Type English, see frame JSON + tovari surface round-trip. Uses existing `styles.css`. | Off-target. UI shell can be repurposed for the frame→frame demo. |
| `vite.config.ts` | Added `groqParseApi` plugin: dev-server middleware at `POST /api/parse` that captures `GROQ_API_KEY` from `loadEnv` (never reaches browser). Also registered `parse: 'parse.html'` rollup input. | Middleware is the **right shape** — keep; just rename / add a sibling route for frame→frame. |
| `package.json` | Added `groq-sdk` dep, `demo:parse` script. | Keep groq-sdk; demo:parse should be replaced. |
| `.env.example` | Added `GROQ_API_KEY=` slot under build-time keys. | Keep. |
| `~/.claude/.../memory/project_fledgling.md` | Updated to reflect real frame inventory (10 frames not 6, 5 entity types not 3) and Phaser/web stack (not TUI). | Keep. |

A couple of side notes inherited from the original `.env.example`: prod
deployment is intended on Vercel with serverless routes minting ephemeral
tokens. The Vite middleware is dev-only; porting to a Vercel function is a
small follow-up.

---

## 3. The actual feature (what the next session should build)

**Goal:** test the SLM's accuracy at producing a valid response frame given
an incoming frame plus mock NPC context. Pure accuracy harness, no game
state plumbing yet.

### Shape of the call

```ts
respond({
  incoming: FilledFrame,        // the frame the NPC just "heard"
  context: NpcContext,          // mock — no real game state
  // optional: history?: FilledFrame[]  — start without
}): Promise<FilledFrame>
```

### Mock NpcContext (minimum viable)

Just enough that responses aren't a lookup table. Suggested fields:

```ts
interface NpcContext {
  self: string;            // conceptId of this NPC, e.g. "SMITH"
  desires: string[];       // ITEM conceptIds the NPC wants, e.g. ["FLINT"]
  inventory: string[];     // ITEM conceptIds the NPC has, e.g. ["BREAD"]
  knows: { figure: string; ground: string }[]; // BE_AT facts the NPC knows
  persona?: string;        // free-text vibe, e.g. "gruff, terse"
}
```

### Architecture decision (still open)

Two options I posed; user did not pick:

- **(a) Pure dialogue model:** SLM owns intent + frame in one shot.
- **(b) Planner + speech-act realizer:** game logic deterministically picks
  intent ("answer truthfully", "deflect", "counter-ask"); SLM only realizes
  the intent into a well-formed frame. Recommended for predictability.

For the accuracy harness, **(a) is faster to build and easier to score**;
the test cases just specify "given this frame + this NPC, here is the
expected response frame." Pivoting to (b) later is a small refactor.

### What "accuracy" means here

Suggested rubric for the eval harness:

1. **Validation** — does output pass `validateFilledFrame`? (binary)
2. **Predicate match** — same predicate as expected? (binary)
3. **Mood appropriateness** — interrogative → declarative/interrogative,
   imperative → declarative/imperative, etc. (binary)
4. **Role-filler match** — for each role, does the conceptId match (or
   match a "valid alternative" set)? (per-role)
5. **Coherence with context** — e.g. NPC said it wants flint but it has
   flint in inventory: invalid. (binary)

Easiest harness: a JSON fixture file of `[input frame, NpcContext, expected]`
triples; runner scores each and prints a summary.

---

## 4. Concrete plan for the next session

If the next model agrees with the above, suggested order:

1. **Add `src/lang/respond.ts`** mirroring `parse.ts` but taking
   `(incoming: FilledFrame, context: NpcContext)`. System prompt should:
   - List frame inventory + role types (same generator as `parse.ts`)
   - Embed the NPC context as JSON in the system prompt
   - Show 3–4 input/output frame pairs as examples
   - Instruct: emit ONE JSON object matching FilledFrame schema; pick
     conceptIds only from a vocabulary list passed in
   - Same json_object response_format + validateFilledFrame retry loop
2. **Add `src/lang/respond-eval.ts`** — a Node-side test runner with a
   fixture file. Print pass/fail per case + aggregate accuracy.
3. **Add `/api/respond` middleware** to `vite.config.ts` (alongside the
   existing `/api/parse`).
4. **Repurpose `parse.html` (or add `respond.html`)** with two columns:
   - Left: NPC context (editable JSON or form), incoming-frame picker
     (canonical buttons + optional Compose-style builder).
   - Right: response frame view + tovari surface (via `encodeFrame`) +
     raw JSON.
5. **Decide:** delete or keep `parse.ts` / `parse-demo.ts` / current
   `ParsePage.tsx`. Recommend keeping behind a feature flag — useful as a
   designer authoring tool.

---

## 5. Pitfalls / non-obvious things

- The `groq-sdk` ESM import is `import Groq from "groq-sdk";` (default
  export). Has TypeScript types built in; no `@types/groq-sdk` needed.
- `response_format: { type: "json_schema", ... }` on Groq does **not**
  reliably handle recursive `$ref` (needed for nested SAY.content). Use
  `json_object` mode and lean on `validateFilledFrame` post-hoc, with a
  retry that feeds the validator's error message back to the model.
- **Concept IDs are language-independent.** `parse.ts` already filters
  the lexicon to nouns+pronouns via `conceptIdsFromLanguage(spec)`. Reuse
  this for the respond pipeline.
- **Vite middleware loads TS via `server.ssrLoadModule('/src/lang/...')`** —
  no separate compile step needed; whatever Vite does for HMR handles it.
- `validateFilledFrame` will throw if the model emits an unknown predicate
  string, an extra/missing role, an entity ref of the wrong type, more
  than one wildcard, or wildcard outside interrogative mood. The retry
  prompt template in `parse.ts` (`messages.push({...prior...})`) already
  handles this — copy that loop into respond.ts.
- `validateFilledFrame`'s nesting depth limit is 3. The example-language
  `MAX_NESTING_DEPTH` is 3. SAY.content is the only role that allows
  nesting today.
- `.env.example` flags `GROQ_API_KEY` as "Build-time only, never shipped to
  the browser." The middleware approach respects this; do not import
  `parse.ts` from any file under `src/ui/`.
- Runtime: `npm run dev` then open `http://localhost:5173/parse.html`.
  Needs `GROQ_API_KEY` in env or in `.env.local`.
- The user prefers **terse responses** and **no scope creep**. They've
  already course-corrected once on misreading the brief — confirm shape
  before building large surfaces.

---

## 6. Files to read first when picking this up

In order:

1. `src/lang/frames.ts` — frame system & validator
2. `src/lang/example-language.ts` — vocabulary the model must use
3. `src/lang/encoder.ts` — frame → conlang surface (for round-trip display)
4. `src/lang/parse.ts` — pattern to copy into `respond.ts`
5. `vite.config.ts` — middleware plugin pattern
6. `src/ui/ParsePage.tsx` — UI shell to repurpose

Memory file `project_fledgling.md` (auto-loaded) covers the rest.
