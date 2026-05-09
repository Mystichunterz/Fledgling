## ADDED Requirements

### Requirement: NPC dialogue SHALL resolve through canonical language data
The system SHALL provide a runtime bridge that resolves authored NPC dialogue lines and player choices into canonical frame-backed language data before rendering generated conlang.

#### Scenario: Covered authored node renders in generated language
- **WHEN** an NPC dialogue node has canonical frame data for its line and choices
- **THEN** the dialogue runtime MUST render the generated conlang surface from the active language rather than relying on empty `conlang` strings or English fallback

#### Scenario: Choice text uses the same active language
- **WHEN** the player is shown dialogue choices for a frame-backed encounter
- **THEN** the available player options MUST be rendered from the same active generated language as the NPC line

### Requirement: Dialogue bridge SHALL preserve gameplay semantics
The dialogue-language bridge SHALL keep gameplay truth in structured meaning and effects rather than in raw rendered text.

#### Scenario: Handover line grants item
- **WHEN** a dialogue choice or NPC node corresponds to an item handover, quest advance, or ending decision
- **THEN** the runtime MUST drive those effects from canonical frame/effect data and MUST NOT infer them from rendered strings

#### Scenario: Same meaning across different generated languages
- **WHEN** two different generated languages render the same authored dialogue node
- **THEN** the underlying frame/effect identity MUST remain stable even if the rendered surface forms differ

### Requirement: Authored dialogue coverage SHALL include current quest-critical speech acts
The system SHALL support the frame and concept coverage needed for the currently authored NPC encounters that cannot be rendered by the existing inventory.

#### Scenario: Social or decision dialogue node is authored
- **WHEN** a quest-critical dialogue node requires greeting, thanking, affirmation, denial, or leave/stay decision semantics
- **THEN** the runtime frame inventory and generated language inventory MUST represent that node without falling back to English-only semantics

#### Scenario: Quest-critical vocabulary appears in dialogue
- **WHEN** an authored node references a quest-critical NPC, item, location, or abstract decision concept
- **THEN** the active generated language MUST contain a canonical concept entry that can be rendered in dialogue

### Requirement: Dialogue rendering SHALL use one active language per session context
The system SHALL load or receive one active generated language artifact for the current session context and use it consistently across NPC dialogue rendering.

#### Scenario: Active language shared across encounter flow
- **WHEN** the player enters multiple NPC conversations in the same session using the same selected language
- **THEN** each encounter MUST render against the same active generated language artifact and metadata identity

#### Scenario: Language artifact unavailable
- **WHEN** the dialogue runtime cannot load the requested generated language artifact
- **THEN** it MUST fail through a documented fallback path rather than mixing partial language state across encounters

### Requirement: Dialogue integration SHALL remain testable
The system SHALL provide fixtures or tests that verify authored quest-critical dialogue nodes can resolve to frames and render under generated languages.

#### Scenario: Coverage regression detected
- **WHEN** a change removes frame or concept support required by a covered authored dialogue node
- **THEN** automated tests or fixtures MUST fail before the change is accepted
