# Language → dialogue integration — progress log

**Status:** Live tracker, 2026-05-09.
**Companion to:** `agents/language-integration.md` (design), `agents/dialogue-frame-parses.md` (parse-validation refinements).

This doc tracks where the integration work stands so a future cold session can resume. The two companion docs hold the *what* and *why*; this doc holds the *where*.

---

## Build order (from `language-integration.md` §7, with parse-doc overrides)

1. ✅ **Frames + lexicon** — commit `a43bcd1`
2. ✅ **`polarQuestion` flag on `FilledFrame`** — commit `ef3ddd9`
3. ⬜ Frame-tree types (`src/sim/frameDialogueTypes.ts`)
4. ⬜ Phase resolver (extends `GameRegistry` with flags + endingChoice)
5. ⬜ First NPC end-to-end (Naro)
6. ⬜ Diary tooltip in `DialogueOverlay` (partial — `src/sim/diary.ts` already exists; check before reimplementing)
7. ⬜ Roll out remaining 4 NPCs
8. ⬜ Hut journal pre-seed + beacon flag wiring

---

## Step 1 — what landed in `a43bcd1`

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

## Step 2 — what landed in `ef3ddd9`

`FilledFrame` now carries an optional `polarQuestion?: boolean`.

- **`frames.ts`** — type + Zod schema extended; `validateFilledFrame` rejects `polarQuestion: true` mixed with any `unknown` filler (polar Q ⊕ wh-Q).
- **`encoder.ts`** — both the verb-affix path and the simple-mode particle path now treat `polarQuestion === true` as a Q signal, identical to `hasUnknown`.
- **`decoder.ts`** — both paths recover the flag: when a Q signal is detected (verb mood tag in inflectional mode, particle in simple mode) but no role filled with `unknown`, we set `polarQuestion: true` on the result. The simple-mode `stripMoodParticleSimple` now returns a `particleQ` boolean alongside `mood`/`rest`.
- **`gloss.ts`** — Q tag fires for polar Qs the same way it does for wh-Qs.

Test surface (`v2-features.test.ts`, new `describe("polar questions", …)`):
- Encode polar SEE in tovari → `henu tovan renali` (verb gets `-li`).
- Inflectional round-trip preserves `polarQuestion: true`.
- Simple-mode round-trip (random "alpha" simple language) — Q particle appears in surface, decode recovers the flag.
- Validator rejects polarQuestion + `unknown` filler.
- Gloss tags include `Q` for polar Qs.

48 tests passing (was 43). `tsc --noEmit` clean.

---

## Step 3 — what to do next

**Goal:** Add `src/sim/frameDialogueTypes.ts` with the frame-tree node types per `language-integration.md` §5.1, **with the parse-doc revision** that `frames` is plural (not a single frame).

```ts
export interface FrameNode {
  id: string;
  speaker: NpcId;
  frames: FilledFrame[];   // PLURAL — was `frame: FilledFrame` in design doc.
  stage?: NpcStage;
  choices: FrameChoice[];
}
```

The plural is mandatory — 36% of authored nodes use multiple speech acts (see `dialogue-frame-parses.md` §8.4(a)). Renderer concatenates surface forms with sentence-boundary punctuation; gloss tokens flatten into one array.

Also define `FrameChoice` (id, label/labelFrame, target, effects, requirements). Effects table for choices: `dialogue-frame-parses.md` §8.5 has the canonical mapping.

Effect-placement convention: `+give:item` lives on the choice that **exits** a handover sequence (e.g. `NAR_HANDOVER_WOOD.continue`), not the choice that enters it. See parse doc §8.4(c).

This is a standalone-no-runtime change — just the type module. No tests required (types only); a downstream check is that `tsc --noEmit` stays clean.

---

## Steps 4–8 — see `language-integration.md` §7

No revisions needed beyond what's in the design doc. Diary work is partial — `src/sim/diary.ts` and `src/ui/DiaryOverlay.ts` already exist (committed in `e3039b0` "Re-add diary system and handovers wiring"). Read what's there before reimplementing step 6.

---

## State at last update

- `git log -1`: `ef3ddd9` (step 2)
- `origin/main`: diverged — local has 2 fresh commits (`4c0b10d` progress log, `ef3ddd9` polar Q); origin has 4 commits not yet merged. Resolve before pushing.
- Working tree: unrelated edits in `src/ui/App.tsx`, `src/ui/styles.css`, `src/sim/village-ui.ts`, `village.html` (touched by other work, not part of this stream — left unstaged)
- Tests: 48 passing
- Date: 2026-05-09
