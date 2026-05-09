## ADDED Requirements

### Requirement: Schema-first LLM generation
The system SHALL generate languages through a schema-bounded `LanguageDesignArtifact` produced by an LLM, and SHALL compile that artifact into a runtime-valid `LanguageSpec` locally.

#### Scenario: Successful LLM generation
- **WHEN** a caller requests LLM-backed generation for a seed and difficulty with a configured OpenAI provider
- **THEN** the system returns a generated language whose accepted design artifact validates against the artifact schema and whose compiled `LanguageSpec` validates against the runtime schema

#### Scenario: Model output violates runtime constraints
- **WHEN** the LLM returns an artifact that cannot compile into a valid `LanguageSpec`
- **THEN** the system MUST reject or repair the artifact locally and MUST NOT expose an invalid executable language to callers

### Requirement: Runtime compatibility preservation
The system SHALL preserve compatibility with the existing encoder, decoder, gloss, and frame round-trip invariants for all LLM-generated languages.

#### Scenario: Round-trip verification
- **WHEN** an LLM-generated language is accepted
- **THEN** the system MUST verify that representative and exhaustive frame fixtures still encode and decode according to existing runtime correctness rules before the language is marked usable

#### Scenario: Difficulty compatibility
- **WHEN** a language is requested in `simple` or `full` difficulty
- **THEN** the compiled `LanguageSpec` MUST preserve the behavioral guarantees already defined by those difficulty modes

### Requirement: Unique language identity controls
The system SHALL represent language distinctiveness with explicit structured fields rather than freeform prompt-only guidance.

#### Scenario: Artifact contains uniqueness levers
- **WHEN** the system requests a `LanguageDesignArtifact`
- **THEN** the artifact schema MUST include structured fields for phonological flavor, lexical style, naming style, morphological profile, and irregularity budget

#### Scenario: Low-variety output detection
- **WHEN** a generated language collapses into low-diversity or collision-prone inventories under local heuristics
- **THEN** the system MUST reject the result or request regeneration rather than silently accepting a bland or unsafe language

### Requirement: Generation metadata and repeatability
The system SHALL attach metadata to each accepted LLM-generated language so the result is inspectable and reusable for the same accepted generation tuple.

#### Scenario: Metadata recorded
- **WHEN** a language generation request succeeds
- **THEN** the returned artifact MUST include seed, difficulty, model id, prompt version, compiler version, and the accepted `LanguageDesignArtifact`

#### Scenario: Cached artifact reuse
- **WHEN** a subsequent request matches a previously accepted generation tuple
- **THEN** the system MUST reuse the cached accepted artifact instead of relying on a fresh model completion for repeatability

### Requirement: Server-side OpenAI integration
The system SHALL use `OPENAI_KEY` only in server-side generation code and SHALL expose LLM-backed generation through a server-mediated API.

#### Scenario: Browser caller requests generation
- **WHEN** a client-side workbench or game screen requests an LLM-generated language
- **THEN** the request MUST go through a server endpoint or server-side module that reads `OPENAI_KEY`

#### Scenario: Missing OpenAI credentials
- **WHEN** an LLM-backed generation path is invoked without `OPENAI_KEY`
- **THEN** the system MUST fail with a clear configuration error or explicitly fall back to a documented non-LLM generation mode

### Requirement: Quest-critical concept coverage in generated languages
The system SHALL ensure that generated languages include the concept and frame coverage required for quest-critical authored dialogue and NPC interactions.

#### Scenario: Generated language covers required inventory
- **WHEN** a language is accepted for gameplay use
- **THEN** its compiled lexicon and frame inventory MUST include every quest-critical concept and speech-act frame required by the authored NPC dialogue bridge
