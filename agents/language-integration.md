# Language → Game integration — frame gaps & API design

**Status:** Design draft v1, 2026-05-09.
**Companion to:** `agents/game-flow.md` (scene topology + state machine), `agents/story-dialogue-trees.md` (per-NPC English copy).
**Purpose:** Take stock of what the language module (`src/lang/`) can already say, identify the speech acts in the authored dialogue (`src/sim/dialogueTrees.ts`) that **don't** map cleanly, and design the integration API that lets the runtime render every NPC line and player option in the generated foreign language — honouring the all-foreign contract from `game-flow.md` §7.

---

## 1. TL;DR

The language module has a complete frame → surface pipeline (encode / decode / gloss / parse-via-LLM / respond-via-LLM). The 10 frames it ships with cover the *transactional* spine of the game (item handover, asking where things are, naming items). They do **not** cover the *social* and *meta* spine that the authored trees lean on — greetings, thanking, yes/no, decision-making, knowing-someone, predecessor talk.

Without filling those gaps, ~40% of the authored nodes can't be rendered as foreign frames, which forces the dialogue UI to fall back to English and breaks the `game-flow.md` §7.1 invariant 1 ("All-foreign rendering").

This doc proposes:
1. **5 new frames** (`GREET`, `THANK`, `AFFIRM`, `DENY`, `DECIDE`) plus one **soft extension** (`KNOW` — optional for v1).
2. **Lexicon additions**: 4 LOCATIONs (`HUT`, `LIGHTHOUSE`, `SHRINE`, `BEACH`), 1 ITEM (`OIL`), 6 ANIMATEs (`PREDECESSOR`, `BAKER`, `FARMER`, `GUARD`, `CHILD`, `SHRINE_KEEPER`), 2 ABSTRACTs (`LEAVING`, `STAYING`).
3. A **frame-tree authoring format** that supersedes the English-only `DialogueTree`.
4. A **6-function integration API** (`renderFrameNode`, `applyChoice`, `Diary` class + 4 methods) that the engine calls per encounter.

---

## 2. Current state of the bridge

### 2.1 Language module — what it gives us

| Function | Module | Direction |
|---|---|---|
| `encodeFrame(spec, filled)` | `src/lang/encoder.ts` | `FilledFrame` → surface string |
| `decodeText(spec, surface)` | `src/lang/decoder.ts` | surface → `FilledFrame` |
| `glossFrame(spec, filled)` | `src/lang/gloss.ts` | `FilledFrame` → `{ surface, words: GlossedWord[] }` (per-word morpheme tags) |
| `parseEnglishToFrame(text, opts)` | `src/lang/parse.ts` | English → `FilledFrame` (Groq) |
| `respondToFrame(incoming, ctx, opts)` | `src/lang/respond.ts` | `FilledFrame` + NPC ctx → `FilledFrame` (Groq) |
| `randomLanguage(seed, difficulty)` | `src/lang/random-language.ts` | seed → `LanguageSpec` |

Frames currently shipped: `GIVE`, `TAKE`, `MOVE`, `WANT`, `BE_AT`, `HAVE`, `SEE`, `SAY`, `MAKE`, `EAT`. Pronouns: `self`, `listener`, `reference`, `unknown`. Mood: `declarative`, `imperative`. Tense: `past`, `present`, `future`. Negation: yes.

### 2.2 Game side — what it has and lacks

| Thing | Status |
|---|---|
| Dialogue trees authored (5 NPCs × ~10 nodes each) | ✅ `src/sim/dialogueTrees.ts` |
| `DialogueLine` shape with `{ en, conlang? }` | ✅ — `conlang` is empty everywhere |
| Dialogue overlay renders `conlang ?? en` | ✅ — falls through to English today |
| NPC interaction wires sprite → tree open | ✅ `src/actors/NPCInteraction.ts` |
| `dialogueRootId` flag-aware phase resolver | ❌ — root is hard-pinned (`PEM_INITIAL`, etc.) |
| `giveItem()` called from a choice | ❌ — function exists in `GameRegistry`, no caller |
| `has_visited_hut` flag | ❌ — not in `GameRegistry` |
| `endingChoice` persistence | ❌ |
| Diary surface (per-token gloss popover) | ❌ |
| TTS hook | ❌ (spec'd in §7.2 of game-flow) |

The game has an **English authoring layer** but **no runtime path** from those English strings to foreign tokens. The conlang slot is a placeholder waiting to be filled — either at build time (pre-bake) or at runtime (LLM parse).

---

## 3. Frame-inventory gap analysis

I walked the 50+ nodes in `src/sim/dialogueTrees.ts` and classified every NPC line and every player choice by speech act. Three buckets: ✅ already representable, ⚠️ representable with strain, ❌ needs a new frame.

### 3.1 Already representable

| Speech act | Example | Frame |
|---|---|---|
| Item handover | "[she places a bundle of logs in your arms]" | `GIVE` imperative, agent: self, recipient: listener, theme: WOOD |
| Ask for an item | "I need a flint." / "Give me wood." | `GIVE` imperative, agent: listener, recipient: self, theme: FLINT |
| Refuse / disclaim possession | "I don't have flint." | `HAVE` declarative + negated, owner: self, theme: FLINT |
| Locate a thing | "The hut is west on the cliff path." | `BE_AT` declarative, figure: HUT, ground: WEST/CLIFF |
| Where-question | "Where's the flint?" | `BE_AT` declarative, figure: FLINT, ground: unknown |
| What-question | "What do you want?" | `WANT` declarative, wanter: listener, desired: unknown |
| Quoted speech | "Hala says you should walk west." | `SAY` declarative, content: nested `MOVE` imperative |
| Imperative motion | "Walk west." | `MOVE` imperative, agent: listener, destination: WEST/HUT |
| See / witness | "I heard the plane." | `SEE` declarative (extended for hearing — see 3.4) |

### 3.2 Speech acts that don't fit (the gap)

| Speech act | Example node | Why current frames fail |
|---|---|---|
| **Greeting** | NAR_INITIAL "Oh — one of you again", PEM "[skips up, holds out pebble]" | No frame for phatic openers. Can't shoehorn into `SAY` (requires content). |
| **Thanking / leave-taking** | NAR "[Take your leave]" after handover, TOK "[half-grin]" closing | Same — no phatic/social frame. |
| **Polar yes** | PEM_RETURN "Yes." (to "Did you read it?") | No `unknown` involved. Echoing the question's frame works but is unnatural. |
| **Polar no** | TOK_RETURN-style refusal beat | Same. |
| **Decide leave/stay** | HAL_QUESTION "I'll go." / "I'll stay." | The endings are *commitment to a future state*, not a `MOVE` (no concrete destination yet). |
| **Knowing a person** | HAL_KNEW_MAREN "We sat together every dusk for nineteen years." | No `KNOW` frame. Could roll into `SEE` past-tense, but loses meaning. |
| **Identity / who-is** | PEM "Who's Maren?" | No copula / `IDENTIFY` frame. |
| **Property predication** | NAR "You don't talk much yet." | No way to express "X is Y". |
| **Existential** | TOK "There's a hut west." | Marginal — fits as `BE_AT` (figure: HUT, ground: WEST_LOCATION). OK. |
| **Wait / silence** | HAL_WAIT "[silent, wait]" | Sprite stage direction — see 3.5 below. |

### 3.3 Proposed new frames

Five additions cover the must-haves; `KNOW` is optional for v1 if we want to keep the inventory minimal.

```ts
GREET: {
  category: "action",
  roles: [
    { name: "greeter",   types: ["ANIMATE"], grammar: "subject" },
    { name: "addressee", types: ["ANIMATE"], grammar: "oblique" },
  ],
}
// Surface: "I-NOM hello-VERB you-DAT" → in tovari "ne <greet>ka ti-ra"
// Used by: every Phase A opener. The greeter is `self` for NPCs, `listener` from
// the player's side. Imperative mood is illegal (greeting is not a command);
// declarative present is the canonical form.

THANK: {
  category: "action",
  roles: [
    { name: "thanker",     types: ["ANIMATE"],          grammar: "subject" },
    { name: "benefactor",  types: ["ANIMATE"],          grammar: "oblique" },
    { name: "reason",      types: ["ITEM", "EVENT"],    grammar: "object", allowsNested: true },
  ],
}
// Surface: "I-NOM thank-VERB you-DAT bread-ACC" or with nested EVENT for
// "thank you for giving me the bread". `reason` is optional in practice —
// validator should not require it. (Alternative: keep all roles required and
// let `reason` default to a placeholder ABSTRACT concept HELP.)
//
// Open question: do we want `reason` to be required to keep validation simple,
// or optional to let "thanks" stand alone? Recommend OPTIONAL for v1 by adding
// a `roles[].optional?: boolean` field to RoleSpec — see §6 open questions.

AFFIRM: {
  category: "state",
  roles: [
    { name: "agreer",     types: ["ANIMATE"],         grammar: "subject" },
    { name: "proposition", types: ["EVENT", "ITEM"],  grammar: "object", allowsNested: true },
  ],
}
// Surface: "I-NOM yes-VERB <proposition>" — the proposition is typically a nested
// frame echoing what was just asked. For a bare "yes", `proposition` is filled
// with `reference` (anaphor to the prior turn).
//
// Pemi: "Yes, I read it." → AFFIRM(agreer: self, proposition: nested SEE(viewer: self, target: BOOK))
// Bare "Yes." → AFFIRM(agreer: self, proposition: reference)

DENY: {
  category: "state",
  roles: [
    { name: "disagreer",   types: ["ANIMATE"],        grammar: "subject" },
    { name: "proposition", types: ["EVENT", "ITEM"],  grammar: "object", allowsNested: true },
  ],
}
// Mirror of AFFIRM. Note: DENY ≠ negated AFFIRM — DENY means "I disagree with
// the proposition", negated-AFFIRM means "I do not agree" (weaker). Keep them
// distinct so the LLM responder can pick the right register.

DECIDE: {
  category: "action",
  roles: [
    { name: "decider", types: ["ANIMATE"],   grammar: "subject" },
    { name: "choice",  types: ["ABSTRACT"],  grammar: "object" },
  ],
}
// Surface: "I-NOM decide-VERB leaving-ACC" / "I-NOM decide-VERB staying-ACC"
// Used by HAL_QUESTION endings: I'll go → DECIDE(decider: self, choice: LEAVING)
// I'll stay → DECIDE(decider: self, choice: STAYING)
// Effects-side: applyChoice() reads the `choice` value and sets endingChoice.
```

**Optional / nice-to-have**:

```ts
KNOW: {
  category: "state",
  roles: [
    { name: "knower",  types: ["ANIMATE"],                                grammar: "subject" },
    { name: "object",  types: ["ANIMATE", "ITEM", "LOCATION", "EVENT"],  grammar: "object", allowsNested: true },
  ],
}
// Hala's whole arc benefits: "I knew Maren" → KNOW(knower: self, object: PREDECESSOR).
// Without it, we collapse "knew Maren" into past-tense SEE, which is OK for v1.
// Recommendation: ship v1 without KNOW; add in v1.1 if Hala feels too thin.
```

### 3.4 Frames that should be extended, not added

`SEE` currently takes `target: ITEM|ANIMATE|LOCATION`. The Lemu line "I heard the plane" wants an EVENT-typed `target`. Trivial extension — add `EVENT` to the `target` types list. No code change beyond `frames.ts`. The decoder/encoder/gloss are type-agnostic on role types.

### 3.5 Things that are NOT new frames

Per `game-flow.md` §7.1 invariant 2 ("No stage actions in player options"), player gestures (waving, pointing, bowing) are conveyed by the **player sprite**, not by a `[Bracketed Action]` choice. So:

- `[Wave]` → in the frame tree, this becomes a `GREET` choice **plus** a sprite-trigger emitted as a side-effect.
- `[Take the bread]` → `TAKE` imperative agent: self frame, plus `give-item` effect on the choice.
- `[Bow and leave]` → `GREET` (closing variant — see §6 open question on register) plus close-dialogue effect.

NPC stage directions (`[she sets down a tray]`) stay as a separate `stage` field on the FrameNode, used for sprite animation only — never rendered as text.

---

## 4. Lexicon additions

The current lexicon (`example-language.ts`, `random-language.ts`, `custom-languages.ts`) ships these concepts:

- ITEMS: `FLINT`, `STICK`, `LIGHTER`, `BREAD`, `WATER`
- LOCATIONS: `FOREST`, `CAVE`, `FORGE`, `MEADOW`
- ANIMATES: `SMITH`, `WOODSMAN`

The game (`src/state/items.ts`, NPC roster, scene names) uses a different vocabulary. Mapping + additions:

### 4.1 ITEMS

| Game ID | Lexicon ID | Action |
|---|---|---|
| `wood` | `WOOD` | **Add** (was vaguely `STICK`; rename for clarity) |
| `oil` | `OIL` | **Add** (was vaguely `LIGHTER`) |
| `flint` | `FLINT` | Keep |
| `fruit` | `FRUIT` | **Add** |

Recommend keeping `STICK`, `LIGHTER`, `BREAD`, `WATER` in the lexicon as background vocabulary for journal page / extended dialogue, not as game items.

### 4.2 LOCATIONS

| Game scene | Lexicon ID | Action |
|---|---|---|
| `crash_site` | `BEACH` | **Add** |
| `village` | `VILLAGE` | **Add** |
| `hut` | `HUT` | **Add** |
| `lighthouse` | `LIGHTHOUSE` | **Add** |
| (sub-location) | `SHRINE` | **Add** (Hala's spot on the lighthouse path) |

Keep `FOREST`, `CAVE`, `FORGE`, `MEADOW` as flavour; the player can encounter them via journal/story without them being scene-mapped.

### 4.3 ANIMATES

| Role / NPC | Lexicon ID | Action |
|---|---|---|
| Predecessor (Maren) | `PREDECESSOR` | **Add** (the bound name is generated; this is the role concept) |
| baker (Naro) | `BAKER` | **Add** |
| farmer (Lemu) | `FARMER` | **Add** |
| guard (Toka) | `GUARD` | **Add** |
| child (Pemi) | `CHILD` | **Add** |
| shrine-keeper (Hala) | `SHRINE_KEEPER` | **Add** |

Keep `SMITH`, `WOODSMAN` as background.

> **Naming policy reminder** (from `game-flow.md`): the *roles* are concept IDs; the *names* (Naro, Pemi, etc.) are produced by the language module at run-time and substituted via `{{npcName_<sprite_key>}}` tokens. The lexicon does NOT contain `NARO` or `PEMI` — names are generated phonotactically per-language.

### 4.4 ABSTRACTs

| Concept | Used by |
|---|---|
| `LEAVING` | `DECIDE.choice` for the leave ending |
| `STAYING` | `DECIDE.choice` for the stay ending |

> The `ABSTRACT` RoleType already exists in `frames.ts`. No new role type needed.

### 4.5 Lexicon delta — concrete file changes

These are additive to `random-language.ts`'s constant arrays (so generated languages get them automatically) and to `example-language.ts` / `custom-languages.ts` (hand-crafted entries). The new frames also need a stem each (`GREET`, `THANK`, `AFFIRM`, `DENY`, `DECIDE`).

```ts
// random-language.ts — extend these constant arrays:
const VERB_CONCEPTS = [
  "GIVE", "TAKE", "MOVE", "WANT", "BE_AT", "HAVE",
  "SEE", "SAY", "MAKE", "EAT",
  "GREET", "THANK", "AFFIRM", "DENY", "DECIDE",   // NEW
] as const;
const ITEM_CONCEPTS = ["FLINT", "STICK", "LIGHTER", "BREAD", "WATER",
                       "WOOD", "OIL", "FRUIT"] as const;     // +3
const LOCATION_CONCEPTS = ["FOREST", "CAVE", "FORGE", "MEADOW",
                           "BEACH", "VILLAGE", "HUT",
                           "LIGHTHOUSE", "SHRINE"] as const;  // +5
const ANIMATE_CONCEPTS = ["SMITH", "WOODSMAN",
                          "PREDECESSOR", "BAKER", "FARMER",
                          "GUARD", "CHILD", "SHRINE_KEEPER"] as const; // +6
const ABSTRACT_CONCEPTS = ["LEAVING", "STAYING"] as const;   // NEW kind
```

`generateLexicon` needs one new branch for `ABSTRACT_CONCEPTS` mirroring the noun pattern (`semanticType: "ABSTRACT"`). Mirror the change in `example-language.ts` (hand-crafted CVCV stems) and `custom-languages.ts` (Malay equivalents — e.g. `LEAVING: "pergi"`, `STAYING: "tinggal"`, `THANK: "terima"`, `GREET: "salam"`).

---

## 5. Integration API design

The game already has a `DialogueTree` shape. We layer a **frame-tree** shape on top, plus a thin runtime that turns frame nodes into the data the existing `DialogueOverlay` already wants (foreign surface + clickable choices). The existing English trees stay as the authoring layer for now; a build-time transformer turns them into frame trees.

### 5.1 New types — `src/sim/frameDialogueTypes.ts`

```ts
import type { FilledFrame } from '../lang/frames';
import type { NpcId, ItemKind } from './dialogueTypes';

// A side-effect a choice can apply when picked. Effects run AFTER the choice
// frame is logged but BEFORE the engine advances to `next`.
export type ChoiceEffect =
  | { kind: 'set-flag'; flag: GameFlag; value: boolean }
  | { kind: 'give-item'; item: ItemKind }
  | { kind: 'set-ending'; ending: 'leave' | 'stay' }
  | { kind: 'play-anim'; sprite: 'player' | 'npc'; anim: SpriteAnim };

export type GameFlag =
  | 'has_visited_hut'
  | 'beacon_lit'
  | `met_${NpcId}`
  | `holds_item_${ItemKind}`;

export type SpriteAnim = 'wave' | 'point_west' | 'bow' | 'offer' | 'sit' | 'stand';

// NPC stage direction — drives sprite animation. Never rendered as text.
export type NpcStage = SpriteAnim | 'set_down_loaves' | 'turn_wheel' | 'close_eyes';

export interface FrameNode {
  id: string;
  speaker: NpcId;
  // The NPC line, as a frame. Encoded to surface tokens at render time.
  frame: FilledFrame;
  // Optional NPC-side sprite cue. Plays when the node is rendered.
  stage?: NpcStage;
  choices: FrameChoice[];
}

export interface FrameChoice {
  id: string;
  // The player utterance, as a frame. Must be composable from the lexicon
  // (no [Bracketed Actions]; gestures live in `effects` as play-anim).
  frame: FilledFrame;
  next: string | null;   // null = close dialogue
  effects?: ChoiceEffect[];
}

export type FrameTree = Record<string, FrameNode>;
```

### 5.2 Runtime renderer — `src/lang/gameRender.ts`

```ts
import type { LanguageSpec } from './language-spec';
import type { GlossedWord } from './gloss';
import type { FrameNode, FrameTree } from '../sim/frameDialogueTypes';
import type { NpcId } from '../sim/dialogueTypes';

export interface RenderedNode {
  speakerId: NpcId;
  speakerDisplayName: string;
  // Full surface string + per-word morpheme breakdown for the diary tooltip.
  line: { surface: string; words: GlossedWord[] };
  choices: { id: string; surface: string; words: GlossedWord[] }[];
  // Sprite cue from FrameNode.stage, surfaced verbatim for the scene to play.
  stage?: string;
}

/**
 * Encode a frame node into the foreign-rendered shape the dialogue overlay
 * displays. Side-effect: registers every token of every word with the diary
 * (auto-population per game-flow.md §7.1 invariant 4).
 *
 * The function is pure with respect to `spec` and `node`; the only mutation
 * is on `diary`.
 */
export function renderFrameNode(
  spec: LanguageSpec,
  node: FrameNode,
  diary: Diary,
): RenderedNode;
```

### 5.3 Choice resolver — `src/lang/gameChoice.ts`

```ts
import type { FrameChoice } from '../sim/frameDialogueTypes';
import type { GameRegistryShape } from '../state/GameRegistry';

export interface ChoiceResult {
  next: string | null;
  appliedEffects: ChoiceEffect[];   // echoed for logging/telemetry
}

/**
 * Apply a choice's side effects to game state, then return the next node ID.
 * The frame on the choice is PURE METADATA at this layer — it's already been
 * rendered by renderFrameNode. The semantics-of-the-utterance live in the
 * frame; the consequences-of-picking-it live in `effects`. They are deliberately
 * decoupled so a designer can author a refusal frame whose effect is still
 * give-item (sarcasm, narrative beats, etc.) without rebuilding the validator.
 */
export function applyChoice(
  choice: FrameChoice,
  registry: GameRegistryShape,
): ChoiceResult;
```

### 5.4 Diary — `src/lang/diary.ts`

```ts
import type { NpcId } from '../sim/dialogueTypes';
import type { GlossedWord } from './gloss';

export type TokenSource =
  | { kind: 'heard-from'; speaker: NpcId; nodeId: string }
  | { kind: 'option'; nodeId: string; choiceId: string }
  | { kind: 'journal'; pageId: string };   // for has_visited_hut pre-seeding

export interface DiaryEntry {
  // The exact surface form. e.g. "tovan" for tovari "tova-n" (ACC of SMITH).
  surface: string;
  // Player-written gloss. null = not guessed yet.
  guess: string | null;
  // Sources where this token has appeared, in order of first appearance.
  sources: TokenSource[];
}

export class Diary {
  /**
   * Register a token observation. If the surface is unknown to the diary,
   * creates a new entry with guess=null. If it's already known, appends the
   * source to its sources list (deduped). Idempotent for repeated identical
   * sources.
   */
  see(word: GlossedWord, source: TokenSource): void;

  /** Set the player's guess for a surface form. Empty string clears it. */
  guess(surface: string, gloss: string): void;

  /** Look up a surface form. Returns null if unseen. */
  read(surface: string): DiaryEntry | null;

  /** All entries, insertion order. */
  entries(): DiaryEntry[];

  /** Serialise for save/restore (game-flow.md §8 open question 4). */
  serialize(): { entries: DiaryEntry[] };
  static restore(data: { entries: DiaryEntry[] }): Diary;
}
```

### 5.5 Phase resolver — `src/sim/dialoguePhase.ts`

This is the missing piece from `dialogueTrees.ts:7` ("once Convex state lands, an engine-side phase resolver will pick the right entry node"). For the demo it doesn't need Convex — just reads `GameRegistry`.

```ts
import type { NpcDef } from './npcRoster';
import type { GameRegistryShape } from '../state/GameRegistry';

/**
 * Pick the right entry node for an NPC given current game state. Implements
 * the per-NPC gating table in game-flow.md §4.
 *
 *   - If !met_<npc>             → `<NPC>_INITIAL`     (Phase A)
 *   - If met && !has_visited_hut → `<NPC>_INITIAL`     (still Phase A; show hut hint variant)
 *   - If has_visited_hut && !holds_item_<x> && npc gives x → `<NPC>_RETURN` (Phase B)
 *   - If holds_item_<x> && npc.holdsItem === x  → `<NPC>_POST_ITEM`   (Phase C — soft farewell)
 *   - Climax NPC special: routes through HAL_INITIAL / HAL_POST_HUT /
 *     HAL_SOME_ITEMS / HAL_BEACON_OPEN based on beacon_lit + items count.
 */
export function resolveEntryNode(
  npc: NpcDef,
  state: GameRegistryShape,
): string;
```

### 5.6 The full per-encounter flow

This is what `NPCInteraction.ts` becomes after integration:

```ts
// Pseudocode — actual file would import the real types.
sprite.on('pointerdown', () => {
  const npc = npcById(npcId);
  const entryNodeId = resolveEntryNode(npc, GameRegistry);
  const tree: FrameTree = FRAME_TREES[npcId];

  overlay.openFrameTree(tree, entryNodeId, {
    spec: currentLanguage,           // the LanguageSpec for this run
    diary: SessionDiary,             // shared singleton
    onPickChoice: (choice) => {
      const result = applyChoice(choice, GameRegistry);
      // play-anim effects already applied by applyChoice via a sprite hook;
      // here we only read `result.next` to know where to go next.
      return result.next;
    },
  });
});
```

The `DialogueOverlay` upgrade is small:
- New method `openFrameTree(tree, rootId, opts)` that calls `renderFrameNode` per node.
- `renderNode` switches from `node.line.conlang ?? node.line.en` to using `RenderedNode.line.surface`.
- Every word in the rendered line/choices becomes a hover target — on hover, lookup `Diary.read(surface)`, show popover, allow inline edit that calls `Diary.guess`.

---

## 6. Authoring model

> The English trees in `src/sim/dialogueTrees.ts` stay as the authoring source for now. We add a build-time transformer that turns them into frame trees, with manual review.

### 6.1 Pipeline

```
src/sim/dialogueTrees.ts            (English, hand-authored)
        │
        ▼
[ scripts/encode-dialogue.ts ]      (offline; runs once, calls parseEnglishToFrame)
        │
        ▼
src/sim/frameDialogueTrees.ts       (frame, generated, hand-edited for fixes)
        │
        ▼
[ runtime: renderFrameNode ]        (per encounter)
        │
        ▼
DialogueOverlay                     (foreign surface + diary tooltips)
```

The build script writes `frameDialogueTrees.ts` once. After that it's hand-edited like any other source file — re-run only when adding new English nodes. This keeps runtime cost zero (no LLM calls during play) and gives us deterministic, testable frame literals.

### 6.2 Effects table — what each English choice maps to

For the build script and for hand-fixes, here's the canonical mapping for the existing trees. (Player-side gestures `[Wave]` etc. become `play-anim` effects on the corresponding choice; item-take gestures `[Take the bread]` add `give-item` for non-quest items, but only quest items affect `holds_item_*` flags.)

| English node | Frame predicate | Effects on pick |
|---|---|---|
| `NAR_HANDOVER_WOOD` | `GIVE` (NPC → player) | `give-item: wood` |
| `LEM_HANDOVER_OIL` | `GIVE` | `give-item: oil` |
| `TOK_HANDOVER_FLINT` | `GIVE` | `give-item: flint` |
| `PEM_PEBBLE` | `GIVE` | (no quest effect — colour) |
| Hut journal page (`HutScene` book interaction) | n/a — non-dialogue | `set-flag: has_visited_hut, true`; pre-seed `journal_words` |
| Lighthouse beacon ignition (`LIGHTHOUSE` menu) | n/a — non-dialogue | `set-flag: beacon_lit, true` |
| `END_LEAVE` | `DECIDE` choice=LEAVING | `set-ending: leave` |
| `END_STAY` | `DECIDE` choice=STAYING | `set-ending: stay` |
| Any first-encounter Phase A line | `GREET` | `set-flag: met_<npc>, true` |

### 6.3 Validation — frame trees must round-trip

For every `FrameNode` and every `FrameChoice`:

```
encode(spec, frame).then(decode).deepEqual(frame)   // up to canonical order
validateFilledFrame(frame)                           // already exists
all conceptIds present in spec.lexicon               // new check
```

Add this as a unit test (`frameDialogueTrees.test.ts`) so a malformed tree fails CI before it can ship a black hole into the dialogue UI.

---

## 7. Phase plan

A reasonable build order, each landing in its own commit:

1. **Frames + lexicon** (1 hour). Add 5 new frames to `frames.ts`; extend `SEE.target` types with `EVENT`. Add lexicon stems to `example-language.ts`, `custom-languages.ts`, `random-language.ts`. Update `v2-features.test.ts`.
2. **Frame-tree types** (30 min). New file `src/sim/frameDialogueTypes.ts` per §5.1. No transformer yet.
3. **Diary + render API** (2 hours). `diary.ts`, `gameRender.ts`. Unit tests against `EXAMPLE_LANGUAGE`.
4. **Phase resolver** (1 hour). `dialoguePhase.ts`; extend `GameRegistry` with `flags: Record<GameFlag, boolean>` and `endingChoice`.
5. **Hand-author the frame tree for ONE NPC** (1.5 hours). Pick Naro (baker) — the canonical handover loop. Keep English tree intact; add a parallel `naroFrames.ts`. Wire NPCInteraction to use the frame tree if present, fall back to English otherwise.
6. **Diary tooltip in DialogueOverlay** (2 hours). Hover-to-gloss popover with inline edit.
7. **Roll out remaining 4 NPCs** (3 hours). Hand-author or use the build script.
8. **Hut journal pre-seed + beacon flag wiring** (1 hour). Tie up the non-dialogue flag flips.

Total: ~12 hours of focused work. Steps 1–4 unblock everyone; 5 is the first end-to-end demo; 6 unlocks the diary surface that makes the language barrier playable.

---

## 8. Open questions

1. **Optional roles in `RoleSpec`.** `THANK.reason` wants to be optional. Currently the validator requires every declared role. Two options: (a) add `optional?: boolean` to `RoleSpec` and let the validator skip absent fields, (b) require a placeholder ABSTRACT concept (e.g. `HELP`). Recommend (a) — it generalises and the validator change is one branch.

2. **Greeting register variants.** Phase A "[Wave]" vs Phase C "[Take your leave]" both use `GREET`, but they're hello vs goodbye. Either (a) one frame, sprite anim disambiguates, (b) split into `GREET` + `BYE`. Recommend (a) for v1 — fewer frames, the language module doesn't lexicalise greeting/parting separately in many natural languages anyway.

3. **Pre-bake vs runtime parse.** §6 assumes pre-bake (build-time `parseEnglishToFrame`). The alternative — runtime parse on first encounter, cache in localStorage — is more flexible for editing dialogue but adds a Groq dependency to the critical path. Recommend pre-bake for v1.

4. **Diary persistence.** `serialize`/`restore` are in the API but `GameRegistry` itself isn't persisted (`game-flow.md` §8 Q4). Decide before shipping: is one playthrough one tab? If yes, the diary lives in-memory and these methods are unused for now. Recommend in-memory for the demo; revisit if we add a save button.

5. **TTS hook.** Spec'd in §7.2 of game-flow but not in this API. Cleanest place: `renderFrameNode` returns a `tts: { text, voice }` field; the scene calls `speechSynthesis.speak()` with the surface string and a per-NPC voice. Pick a voice strategy — random per-language vs per-NPC vs none — and add to the config.

6. **`KNOW` frame.** Whether to ship in v1. If Hala's arc feels thin without it (her whole Phase D is about knowing Maren), add it. Otherwise defer — `SEE.past` is good enough as a placeholder.

7. **Concept IDs for the predecessor's name.** `PREDECESSOR` is the role concept. The actual *name* (e.g. "Maren") is generated phonotactically per language at run-time and substituted into copy via `{{predecessorName}}`. Where does the substitution happen — in the build-time transformer (frame literals carry the placeholder) or at render time (encoder substitutes)? Recommend render-time, with `EntityRef.conceptId === 'PREDECESSOR'` triggering name substitution in `encodeFrame`.

---

## Sources

- `agents/game-flow.md` — scene topology, quest state machine, conversation contract.
- `agents/story-dialogue-trees.md` — English copy and node IDs.
- `src/lang/frames.ts` — current frame inventory + validator.
- `src/lang/encoder.ts`, `src/lang/decoder.ts`, `src/lang/gloss.ts` — surface ↔ frame pipeline.
- `src/lang/parse.ts`, `src/lang/respond.ts` — LLM bridges.
- `src/sim/dialogueTrees.ts` — authored English trees (50+ nodes, 5 NPCs).
- `src/state/GameRegistry.ts`, `src/state/items.ts` — runtime game state.
- `src/scenes/LighthouseScene.ts`, `src/scenes/PlayerHudScene.ts` — mechanical T17 implementation.
