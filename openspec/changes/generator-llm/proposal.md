## Why

The current language generator is executable and testable, but most of its distinctiveness comes from seeded RNG over a fixed schema, which limits how surprising or characterful a language can feel. The game also still authors NPC dialogue in English-first trees with empty `conlang` fields, so the generated language is not yet the runtime voice of the island.

Now is the right time to change this because the project already has a solid `LanguageSpec`/`FilledFrame` runtime, existing LLM-backed parsing and response paths, and authored NPC dialogue that exposes the remaining gap between the language system and the game.

## What Changes

- Add a schema-first, LLM-assisted language generation pipeline that uses `OPENAI_KEY` to produce a structured language design artifact, then compiles that artifact into a valid executable `LanguageSpec`.
- Preserve local authority for validation, repair, determinism metadata, difficulty handling, and frame round-tripping so the LLM shapes the language without owning runtime correctness.
- Extend language generation beyond current RNG-only typology by introducing explicit uniqueness controls for phonological flavor, lexical style, naming style, morphological profile, and irregularity budget.
- Add generator metadata so each produced language records seed, model, prompt version, accepted design artifact, and compiler/generator version.
- Introduce a runtime bridge from generated language output into NPC dialogue so authored dialogue nodes can resolve to canonical frames and render in the generated conlang instead of falling back to English.
- Expand the frame and concept inventory only where needed to support authored NPC speech acts and quest-critical vocabulary in the generated language.

## Capabilities

### New Capabilities
- `llm-language-generation`: Generate a structured, unique language design with an LLM and compile it into a validated, executable `LanguageSpec` that remains compatible with the existing encoder, decoder, gloss, and tests.
- `npc-dialogue-language-runtime`: Render NPC and player dialogue through canonical frame-backed language data so generated languages are used in authored encounters, not just in the workbench and demos.

### Modified Capabilities
- None.

## Impact

- Affected code: `src/lang/random-language.ts`, `src/lang/language-spec.ts`, `src/lang/phonology.ts`, `src/lang/encoder.ts`, `src/lang/decoder.ts`, `src/lang/gloss.ts`, `src/lang/parse.ts`, `src/lang/respond.ts`, `src/sim/dialogueTrees.ts`, `src/sim/dialogueTypes.ts`, dialogue UI/runtime modules, and any generator demos/workbench entry points.
- New dependencies or integrations: OpenAI API usage via `OPENAI_KEY`, schema validation for LLM output, persisted generator metadata, and dialogue-frame authoring/runtime bridge code.
- Affected systems: language generation, seed reproducibility, NPC dialogue rendering, concept/frame coverage, and test fixtures for round-trip and authored dialogue coverage.
