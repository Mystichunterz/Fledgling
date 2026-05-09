# Language → dialogue integration — progress log

**Status:** Live tracker, 2026-05-09.
**Companion to:** `agents/language-integration.md` (design), `agents/dialogue-frame-parses.md` (parse-validation refinements).

This doc tracks where the integration work stands so a future cold session can resume. The two companion docs hold the *what* and *why*; this doc holds the *where*.

---

## Build order (from `language-integration.md` §7, with parse-doc overrides)

1. ✅ **Frames + lexicon** — commit `bdeece7`
2. ⬜ **`polarQuestion` flag on `FilledFrame`**
3. ⬜ Frame-tree types (`src/sim/frameDialogueTypes.ts`)
4. ⬜ Phase resolver (extends `GameRegistry` with flags + endingChoice)
5. ⬜ First NPC end-to-end (Naro)
6. ⬜ Diary tooltip in `DialogueOverlay` (partial — `src/sim/diary.ts` already exists; check before reimplementing)
7. ⬜ Roll out remaining 4 NPCs
8. ⬜ Hut journal pre-seed + beacon flag wiring

---

## Step 1 — what landed in `bdeece7`

5 new frames in `src/lang/frames.ts`:

| Frame | Roles | Category | Notes |
|---|---|---|---|
| GREET | greeter (subj) / addressee (obl) | state | Phatic opener AND closer; sprite anim disambiguates hello/goodbye. Imperative is illegal (state category). |
| AFFIRM | agreer (subj) / proposition (obj, allowsNested) | state | Workhorse `…` / "yes" / reassurance. proposition typically `reference` or nested frame. |
| DENY | disagreer (subj) / proposition (obj, allowsNested) | state | Mirror of AFFIRM. DENY ≠ negated AFFIRM. |
| DECIDE | decider (subj) / choice (obj, ABSTRACT) | action | Endings — choice = LEAVING/STAYING. `applyChoice` reads it. |
| KNOW | knower (subj) / object (obj, allowsNested) | state | Promoted from optional; Hala's whole arc needs it. |

Type widenings on existing frames:

```
SAY.content    += ANIMATE                   ("tell me about Maren")
WANT.desired   += ABSTRACT, ANIMATE, EVENT  (allowsNested) — LEAVING/STAYING; love
HAVE.theme     += ANIMATE, LOCATION         ("we had each other"; "Maren had a hut")
BE_AT.figure   += LOCATION                  ("the hut is west")
SEE.target     += EVENT (allowsNested)      ("saw them leave")
```

Lexicon additions (in tovari `example-language.ts`, Malay `custom-languages.ts`, and the random generator):

```
ITEMS:     WOOD OIL FRUIT PEBBLE JOURNAL LETTER FIRE
LOCATIONS: BEACH VILLAGE HUT LIGHTHOUSE SHRINE HOME
ANIMATES:  PREDECESSOR BAKER FARMER GUARD CHILD SHRINE_KEEPER
ABSTRACTS: LEAVING STAYING
```

Other touches:
- `templates.ts` — registered canonical + alternative templates for all 5 new frames.
- `random-language.ts` — extended VERB/ITEM/LOCATION/ANIMATE constant arrays; added ABSTRACT_CONCEPTS branch in `generateLexicon`; added `WH_ABSTRACT` wh-word so `DECIDE.choice = unknown` encodes.
- `custom-languages.ts` (Malay) — added `WH_ABSTRACT` (`bagaimana`).

THANK was deliberately omitted — the parse exercise found zero authored uses; defer to v1.1 if a playtest reveals it's missed.

All 43 tests pass; `tsc --noEmit` clean.

---

## Step 2 — what to do next

**Goal:** Add a `polarQuestion?: boolean` flag to `FilledFrame` so yes/no questions ("Did Maren ask you?", "You saw it?", "Are you hungry?") have a representable form. Currently questions only ride on `unknown` fillers, which can only express wh-questions.

**Why this is needed:** The parse exercise found ~9 nodes that need polar Qs — see `dialogue-frame-parses.md` §8.2 #1. The current model degrades them to wh-Qs ("did you see X?" → "what did you see?"), which loses the meaning.

**Files to touch:**

1. `src/lang/frames.ts`
   - Extend `FilledFrame` type and Zod schema with `polarQuestion?: boolean | undefined`
   - Extend `validateFilledFrame`: reject `polarQuestion: true` together with any `unknown` filler (a frame is *either* polar Q *or* wh-Q, never both)

2. `src/lang/encoder.ts`
   - Find the place that picks the `Q` mood tag (currently triggered by `hasUnknown`). Make it also fire when `filled.polarQuestion === true`.

3. `src/lang/decoder.ts`
   - When the `Q` mood tag is present but no `unknown` filler is recovered, set `polarQuestion: true` on the decoded frame so encode/decode round-trips.

4. `src/lang/gloss.ts`
   - Tag the verb with `Q` morpheme tag when `polarQuestion === true` (matching encoder behavior).

**Validator hint:** the constraint `polarQuestion ⊕ unknown-fillers` is the same kind of mutually-exclusive check that already exists for `unknown` filler count (max 1). Same shape, same place.

**Test surface to add:** in `v2-features.test.ts`, a small `describe("polar questions", …)` block that:
- Encodes a polar Q (e.g. SEE with no `unknown`, `polarQuestion: true`) and checks the surface contains the language's `Q` mood marker.
- Round-trips it through decode and asserts `polarQuestion: true` survives.
- Asserts the validator rejects a frame with both `polarQuestion: true` *and* an `unknown` filler.

Estimated effort per the design doc: ~30 min.

---

## Step 3 — frame-tree types (preview)

After step 2, the next standalone-no-runtime change is `src/sim/frameDialogueTypes.ts` per `language-integration.md` §5.1, **with the parse-doc revision**:

```ts
export interface FrameNode {
  id: string;
  speaker: NpcId;
  frames: FilledFrame[];   // PLURAL — was `frame: FilledFrame` in design doc.
  stage?: NpcStage;
  choices: FrameChoice[];
}
```

The `frames` plural change is mandatory — 36% of authored nodes use multiple speech acts (see `dialogue-frame-parses.md` §8.4(a)). Renderer concatenates surface forms with sentence-boundary punctuation, gloss tokens flatten into one array.

Effects table for choices: `dialogue-frame-parses.md` §8.5 has the canonical mapping.

Effect-placement convention: `+give:item` lives on the choice that **exits** a handover sequence (e.g. `NAR_HANDOVER_WOOD.continue`), not the choice that enters it. See parse doc §8.4(c).

---

## Steps 4–8 — see `language-integration.md` §7

No revisions needed beyond what's in the design doc. Diary work is partial — `src/sim/diary.ts` and `src/ui/DiaryOverlay.ts` already exist (committed in `e3039b0` "Re-add diary system and handovers wiring"). Read what's there before reimplementing step 6.

---

## State at last update

- `git log -1`: `bdeece7` (step 1)
- `origin/main`: behind by step 1 — push when ready
- Working tree: unrelated edits in `src/ui/App.tsx`, `src/ui/styles.css`, `src/sim/village-ui.ts`, `village.html` (touched by other work, not part of this stream)
- Tests: 43 passing
- Date: 2026-05-09
