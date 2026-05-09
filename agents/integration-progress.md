# Language → dialogue integration — progress log

**Status:** Live tracker, 2026-05-09.
**Companion to:** `agents/language-integration.md` (design), `agents/dialogue-frame-parses.md` (parse-validation refinements).

This doc tracks where the integration work stands so a future cold session can resume. The two companion docs hold the *what* and *why*; this doc holds the *where*.

---

## ⚠ Scope change (2026-05-09, post-step-2)

The dialogue runtime is **no longer ours to build**. The T42/T43 worker has already shipped:

- `src/sim/dialogueTypes.ts` — v3 `DialogueNode` contract (commit `9829c43`, T43 Phase 3a)
- `src/sim/dialogueTrees.ts` — authored Pemi tree, 229 lines (commits `5ae2a26`, `7f08fdf`, T43 Phase 3b + Phase 2)
- State-flag store, side-effect kinds, NPC reaction anims — all in place

**Their authoring layer is `line: string` (English), not `frames: FilledFrame[]`.** The original `language-integration.md` §5.1 design (which Steps 3–8 below were based on) is obsolete in the runtime — they did not adopt the frame-node model.

**Our scope shrinks to translation:** turn each authored English `line` into a frame-encoded surface form (Telopa) with gloss, so the renderer can show the constructed-language version of every NPC line. Steps 4–8 of the original plan are **not ours**.

See `## Step 3+ — translation work` below for the new plan.

---

## Build order — REVISED

1. ✅ **Frames + lexicon** — commit `a43bcd1` *(language expressivity baseline)*
2. ✅ **`polarQuestion` flag on `FilledFrame`** — commit `ef3ddd9` *(needed because ~9 dialogue lines are yes/no questions)*
3. ⬜ **Coordinate handoff format with T42/T43 worker** — see Step 3+ below. **Do this before any translation work.**
4. ⬜ **Coverage audit** — sweep every English `line` in `dialogueTrees.ts` for missing lexicon items and uncovered speech acts.
5. ⬜ **Translate dialogue lines** — produce `FilledFrame[]` per node, in whatever container Step 3 settles on.
6. ⬜ **Wire renderer** — encode frames → tovari surface; emit gloss tokens. (May be the other worker's job depending on Step 3 outcome.)

**Dropped** (now T42/T43 scope):
- ~~Frame-tree types (`frameDialogueTypes.ts`)~~ — superseded by their `dialogueTypes.ts`
- ~~Phase resolver~~ — they shipped `NodeTrigger` + state-flag store
- ~~Per-NPC wiring (Naro, Pemi, etc.)~~ — they author the trees
- ~~Diary tooltip~~ — `src/sim/diary.ts` + `DiaryOverlay.ts` already exist
- ~~Hut journal + beacon flag wiring~~ — game-state work, not language work

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

## Step 3+ — translation work (replaces old Steps 3–8)

### What the T42/T43 worker shipped

The runtime now centers on `src/sim/dialogueTypes.ts`:

```ts
export interface DialogueNode {
  id: string;                      // e.g. 'PEM_BEACH_INTRO'
  speaker: NpcId;
  line: string;                    // English authoring layer  ← what we translate
  options: PlayerOption[];         // each has { text, kind, react, next, gatedBy? }
  stockLine?: boolean;
  sideEffects?: NodeSideEffect[];
  trigger?: NodeTrigger;
}

export interface DialogueTree {
  npcId: NpcId;
  entries: string[];               // priority-ordered entry node IDs
  nodes: Record<string, DialogueNode>;
}
```

`PlayerOption.text` is **also English** — player utterances need translating too (kind `'utterance'`); gestures (kind `'gesture'`) stay English-italic per the type comment.

The Pemi tree (`src/sim/dialogueTrees.ts`, 229 lines) is fully authored as of `5ae2a26`. Other NPC trees will follow in T43 Phases 3c+.

Note their `line` field can contain **stage directions in parentheses** alongside quoted speech, e.g. `'(beams) "Hi-hi. You hi me. Me hi you. Good!" (twirls, then points south past the dunes) "Go — go village. Naro. Go!"'`. Only the quoted spans translate; parens are sprite-anim directives.

### Open question — handoff format (do this first)

We need to decide where translated frames live. **Don't write any translations until this is settled with the T42/T43 worker** — picking the wrong shape means redoing all of it. Options:

| Option | Shape | Pros | Cons |
|---|---|---|---|
| **A: sibling field on `DialogueNode`** | Add `frames?: FilledFrame[]` (and `optionFrames?: (FilledFrame[] \| null)[]` for player options) to the existing type | Co-located with `line`; renderer prefers `frames` if present and falls back to `line` | Mutates their type; they'd need to land it |
| **B: separate translation table** | New file `src/lang/dialogueTranslations.ts` keyed by `nodeId` → `{ frames, optionFrames }` | Doesn't touch their types; we own the file end-to-end | Two-source-of-truth risk if node IDs drift |
| **C: replace `line` entirely** | Strip `line: string`, require `frames: FilledFrame[]` | Cleanest model | Most invasive; breaks their existing renderer + author workflow |

**Recommendation:** Option B for the first pass — zero coupling to their work, easy to delete if the model changes. Migrate to A once the format proves out. Confirm with the T42/T43 worker before coding either.

Other coordination questions to surface in the same conversation:
1. **Who calls the encoder?** If we hand them `FilledFrame[]`, they need to import `encodeWithGrammar` from `src/lang/encoder.ts` and a language object — or we pre-encode and ship `{ surface, gloss }` strings instead.
2. **Stage directions** — confirm only quoted spans translate; parens stay English.
3. **Speaker stage / `KNOW`-aware Hala lines** — the parse doc flagged stage-conditional content; check if their `trigger`/`stockLine` already covers this.
4. **Player gestures** — confirm these stay English-italic (the type comment says so but worth re-confirming).

### Coverage audit (Step 4 in revised checklist)

Before translating, sweep `src/sim/dialogueTrees.ts` for:

- **Lexicon gaps** — any noun/verb/concept not yet in `src/lang/example-language.ts` (tovari) or the random-language constants. Step 1 added baseline ITEMS/LOCATIONS/ANIMATES/ABSTRACTS but story-specific words may still be missing.
- **Frame gaps** — any speech act that doesn't fit GREET/AFFIRM/DENY/DECIDE/KNOW or the existing v1 frames. THANK was deliberately deferred; if the authored trees need it, promote it now.
- **`polarQuestion` candidates** — the parse doc estimated ~9; confirm the actual count against authored content.

Output: a checklist appended to this doc (not a new file), listing the additions needed before translation can begin.

### Translation work (Step 5 in revised checklist)

For each `DialogueNode.line`:
1. Identify quoted speech spans (drop stage directions).
2. For each span, produce a `FilledFrame[]` (plural — multi-act lines are common per parse doc §8.4(a)).
3. Cross-reference `agents/dialogue-frame-parses.md` — many nodes already have parsed frames there; this is a head start, not a green field.
4. Same treatment for `PlayerOption.text` where `kind === 'utterance'`.
5. Round-trip every frame through `encodeWithGrammar` + `decodeWithGrammar` to catch validator failures early.

Deliverable shape depends on Step 3 outcome (Option A/B/C above).

---

## State at last update

- `git log -1`: `1e35976` (progress log refresh after step 2 merge)
- `origin/main`: local is **2 commits ahead** (`1e35976` progress log, `2f74f93` polar Q). Push when scope-change rewrite below is also committed.
- Working tree: unrelated edits in `src/ui/App.tsx`, `src/ui/styles.css`, `src/sim/village-ui.ts`, `village.html` (touched by other work, not part of this stream — left unstaged)
- Tests: 48 passing
- T42/T43 commits merged into main: `c8a3634` (NPC dialogue UI scaffold), `9829c43` (DialogueNode v3 schema), `5ae2a26` (Pemi tree), `7f08fdf` (Crash Site prologue + Pemi-on-beach spawn)
- Date: 2026-05-09

---

## Next session — start here

1. **Read this doc top to bottom** — the scope changed mid-stream; the `## ⚠ Scope change` section near the top is load-bearing.
2. **Open the handoff conversation** with whoever owns T42/T43 (commit author `AirrowSST`). Use the table in `## Step 3+` to frame the options. Don't write translation code until they pick.
3. **Start the coverage audit** in parallel — that doesn't depend on the handoff decision and unblocks the second the conversation closes.
4. **Don't reimplement** any of the dropped steps (frame-tree types, phase resolver, NPC wiring, diary, hut journal) — they exist or are in flight on the T42/T43 stream.
