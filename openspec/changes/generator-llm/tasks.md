## 1. LLM generation foundations

- [ ] 1.1 Add the OpenAI generation provider and server-side config path that reads `OPENAI_KEY` without exposing it to browser code.
- [ ] 1.2 Define the `LanguageDesignArtifact` schema and any generator metadata types needed to describe accepted LLM outputs.
- [ ] 1.3 Add an async generation entry point and Vite/server API route for requesting a generated language by seed and difficulty.

## 2. Compiler and repeatability pipeline

- [ ] 2.1 Implement the compiler that turns a validated `LanguageDesignArtifact` into a runtime-valid `LanguageSpec`.
- [ ] 2.2 Add local validation, bounded repair/retry behavior, and hard failure for artifacts that cannot satisfy runtime invariants.
- [ ] 2.3 Add metadata recording and cache-key logic for seed, difficulty, model, prompt version, compiler version, and accepted artifact reuse.

## 3. Uniqueness controls and generator quality

- [ ] 3.1 Extend generation inputs and compiler rules to encode phonological flavor, lexical style, naming style, morphological profile, and irregularity budget.
- [ ] 3.2 Add structural uniqueness heuristics that detect low-variety or collision-prone generated outputs before acceptance.
- [ ] 3.3 Update generator-facing demos or workbench entry points so users can request and inspect LLM-generated languages plus their metadata.

## 4. Quest-critical frame and concept coverage

- [ ] 4.1 Expand the concept inventory used by generated languages to cover quest-critical NPCs, items, locations, and abstract decision concepts.
- [ ] 4.2 Add or extend the frame inventory needed for quest-critical NPC speech acts that the current runtime cannot express cleanly.
- [ ] 4.3 Update hand-authored/example language fixtures and supporting tests so the expanded inventory remains executable across generation modes.

## 5. NPC dialogue language bridge

- [ ] 5.1 Define the canonical frame-backed dialogue data needed to render authored NPC lines and player choices through the active language.
- [ ] 5.2 Implement the runtime bridge that resolves covered `DialogueTree` nodes into frame/effect data and renders conlang surface text from the active generated language.
- [ ] 5.3 Wire item handovers, quest progression, and ending choices to canonical frame/effect identities instead of relying on English strings.

## 6. Verification and rollout

- [ ] 6.1 Add automated tests for artifact schema validation, compiler acceptance/rejection, cache reuse, and round-trip compatibility of LLM-generated languages.
- [ ] 6.2 Add dialogue coverage fixtures/tests proving quest-critical authored nodes resolve and render under generated languages.
- [ ] 6.3 Run typecheck, relevant vitest suites, and any targeted dialogue/generation verification before considering the change complete.
