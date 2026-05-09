## Context

`src/lang` already has a strong executable core: `LanguageSpec` defines the language contract, `randomLanguage()` materializes a seeded language, and the encoder/decoder/gloss tests prove that generated languages round-trip. The project also already uses LLMs for `parseEnglishToFrame()` and `respondToFrame()`, but those integrations are advisory wrappers around locally-validated `FilledFrame` data rather than freeform runtime truth.

The missing piece is generation quality and end-to-end integration. Current language generation relies on seeded procedural choices over a fixed inventory, so it is reliable but stylistically narrow. Separately, authored NPC dialogue remains English-first with empty `conlang` slots, so the generated language is not yet the language players actually encounter in story scenes.

Constraints:
- `LanguageSpec` and `FilledFrame` must remain the authoritative runtime schema.
- `simple` and `full` difficulty modes must remain supported.
- `OPENAI_KEY` must stay server-side; browser code must not access it directly.
- The system must never ship a language the local runtime cannot encode, decode, gloss, and use in dialogue.
- Seed repeatability matters, but LLM calls are not inherently deterministic.

## Goals / Non-Goals

**Goals:**
- Use OpenAI to generate a structured language-design artifact that meaningfully increases linguistic distinctiveness.
- Compile that artifact into a valid executable `LanguageSpec` rather than letting the model emit unchecked runtime data.
- Preserve round-trip compatibility with the existing encoder, decoder, gloss, and tests.
- Add metadata and caching so LLM-backed generation is inspectable and repeatable per accepted seed artifact.
- Extend the language inventory and dialogue bridge enough that generated languages can drive NPC dialogue rendering for authored encounters.

**Non-Goals:**
- Replacing the local encoder/decoder with an LLM.
- Letting the model invent arbitrary grammar features that the current runtime cannot execute.
- Solving every future conlang feature from `conlang-plan.md` in one change.
- Rewriting all authored dialogue into a final long-term DSL in this pass.

## Decisions

### 1. Introduce a two-stage generation pipeline: LLM design artifact -> local compiler -> `LanguageSpec`

The generator will no longer ask the model for a full executable language spec. Instead it will request a strict JSON artifact, tentatively named `LanguageDesignArtifact`, containing only high-level, schema-bounded choices the runtime can safely compile: phonological flavor, typology selections, lexical semantics, naming style, irregularity budget, and quest-critical concept priorities.

The local compiler will translate that artifact into a runtime `LanguageSpec`, fill in any derived details, enforce uniqueness constraints, and reject or repair model output that violates runtime invariants.

Why this over full-spec LLM output:
- keeps `src/lang` authoritative
- reduces hallucinated schema drift
- preserves current validation and test leverage
- still gives more variation than pure RNG

Alternative considered: ask OpenAI for a complete `LanguageSpec`. Rejected because it would couple runtime correctness to fragile model output and make round-trip failures much harder to diagnose.

### 2. Add a dedicated OpenAI-backed generator service instead of overloading client-side `randomLanguage()`

The OpenAI call will live behind a server-side module and Vite middleware route, parallel to current parse/respond integrations. Client code will request generation through an async API such as `generateLanguageFromSeed(seed, difficulty)` while the existing synchronous `randomLanguage()` remains available as the procedural fallback/compiler substrate.

Why this over replacing `randomLanguage()` directly:
- keeps browser secrets out of the client
- avoids turning a synchronous utility into a surprise network call everywhere
- preserves existing tests and demos that expect deterministic procedural generation

Alternative considered: make `randomLanguage()` async and API-backed. Rejected because it would ripple through too many current call sites and blur the boundary between procedural runtime logic and remote generation.

### 3. Treat repeatability as artifact-based, not raw-model deterministic

Because model completions are not reliably deterministic, the system will define repeatability around the accepted design artifact. The first successful generation for a `(seed, difficulty, promptVersion, model)` tuple produces and stores an artifact plus metadata; subsequent requests for the same tuple reuse that artifact rather than re-querying the model.

Metadata stored with generated languages will include:
- seed
- difficulty
- model id
- prompt version
- accepted `LanguageDesignArtifact`
- compiler version
- generated `LanguageSpec` id/version

Why this over pretending seed alone is enough:
- honest about LLM behavior
- gives reproducible debugging and snapshots
- supports future migrations by invalidating via prompt/compiler version

Alternative considered: rely on temperature `0` and seed text alone. Rejected because it does not provide reliable reproducibility across providers or model updates.

### 4. Make uniqueness explicit and measurable in the artifact schema

Uniqueness will not be left to vague prompt wording. The artifact schema will require explicit fields that shape language identity within current runtime limits: preferred syllable shapes, marked phoneme set, pronoun flavor, compounding tendency, affix profile, particle style, name-shape rules, taboo/repetition constraints, and an irregularity budget.

The compiler will enforce minimum distinctness heuristics between generated languages by checking collisions and low-variety outputs in:
- phoneme inventory signature
- affix inventory signature
- lexicon stem diversity
- generated person/name stems
- dialogue-critical concepts and verbs

Why this over pure prompt engineering:
- makes the model legible and debuggable
- lets tests verify generator variety structurally
- prevents the model from collapsing into generic pseudo-language outputs

Alternative considered: prompt for “more unique” languages without structured fields. Rejected because it is untestable and tends to regress into stylistic mush.

### 5. Expand the runtime schema only where dialogue integration needs it

The change will add just enough schema/runtime surface to support generated dialogue in the current authored trees. That includes:
- generator metadata fields alongside `LanguageSpec`
- inventory coverage for quest-critical NPC and world concepts
- additional frame support where authored NPC speech acts cannot be expressed today
- a dialogue-frame bridge that resolves authored nodes into canonical frame data before rendering surface text

Why this over a full authoring-system rewrite:
- keeps the change scoped to generation plus immediate dialogue payoff
- uses the existing `DialogueTree` content as the source of truth for now
- avoids blocking on a full frame-tree authoring migration

Alternative considered: rewrite all dialogue content into a new DSL first. Rejected because it would dominate the change and delay the generator work the user asked to prioritize.

## Risks / Trade-offs

- [LLM output validates syntactically but produces bland languages] -> Mitigation: require explicit uniqueness fields, add structural diversity checks, and snapshot approved artifacts for regression review.
- [LLM output conflicts with runtime invariants] -> Mitigation: compile through local validators, repair only bounded fields, and fail closed if the artifact cannot produce a round-trip-valid `LanguageSpec`.
- [Caching semantics become confusing after prompt/compiler changes] -> Mitigation: version prompt and compiler metadata explicitly and treat version changes as cache-key changes.
- [Dialogue coverage grows beyond current frame inventory] -> Mitigation: scope this change to authored quest-critical speech acts and document remaining gaps as follow-up capabilities.
- [Network-backed generation slows iteration] -> Mitigation: keep the procedural generator available, cache accepted artifacts, and reuse compiled outputs aggressively.
- [Two generation paths drift apart] -> Mitigation: keep both paths compiling through the same `LanguageSpec` validation and shared encoder/decoder/gloss test suite.

## Migration Plan

1. Introduce the `LanguageDesignArtifact` schema, compiler, metadata shape, and server-side OpenAI generation route without changing existing callers.
2. Add artifact caching/loading and an async generation entry point for workbench/game consumers.
3. Extend concept/frame coverage needed for quest-critical dialogue and compile those concepts into generated languages.
4. Add the dialogue bridge that maps authored dialogue nodes into canonical frame-backed render data.
5. Switch NPC dialogue rendering to use generated conlang output for covered nodes, keeping English only as an authoring/debug fallback during rollout.
6. Verify round-trip, cache reuse, and authored dialogue coverage with automated tests and targeted fixtures.

Rollback strategy:
- disable the OpenAI-backed entry point and fall back to procedural `randomLanguage()`
- keep dialogue rendering on existing English fallback if frame-backed generation proves incomplete
- invalidate cached artifacts by version if a bad compiler/prompt release escapes

## Open Questions

- Should the accepted `LanguageDesignArtifact` be persisted in-repo for curated seeds, on disk cache only, or both?
- Do we want one shared provider abstraction for parse/respond/generate now, or is generation-specific OpenAI wiring enough for this change?
- How much of the authored dialogue should be converted to canonical frame data in this pass: all quest-critical nodes only, or every currently reachable node?
- Should custom hand-authored languages such as `Malay` also grow metadata/artifact wrappers for uniformity, or remain direct `LanguageSpec` fixtures?
