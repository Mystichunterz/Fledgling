# Story dialogue trees — six NPCs, BG3-style branching with hybrid runtime

**Author:** `story` / Zuikaku
**Date:** 2026-05-09
**Status:** **live (v3)** — merges the teammate's locked runtime-UX layer (NPC lines in Telopa, hover-diary, react animations, English prologue) with v2's cast and structure (six NPCs incl. Senu, fetch-quest layer, lighthouse climax, anchor-word teaching). Calvin called the merge 2026-05-09.
**Canonical source:** [`../../research/story-dialogue-trees.md`](../../research/story-dialogue-trees.md). This file is the operational mirror — kept here so sibling agents working in `app/` can pick up the dialogue contract without leaving the engineering tree.
**Supersedes:** the v1 + naive-rename revision and the locked-2026-05-09 all-foreign-player-options revision (both preserved in git). v3 keeps the teammate's runtime contract for NPC lines and the diary, but **rejects the all-foreign-player-options supersede**: player options stay English with first-encounter Telopa overlay (see §8.2). Rationale at top of TL;DR.

---

## For sibling agents — what to read first

| Lane | Section | What you need |
|---|---|---|
| `engine` (Warspite, T42) | §A integration contract, §1 conventions, §8 runtime contract | Node IDs, state flags, `{react}` enum, hover-diary surface, hybrid render rules. Wire `attachInteraction(scene, sprite, npcId)` to the per-NPC tree in §4. |
| `voice` (Warspite, T36) | §6 Mode C fallback pool | The 11 stock-line node IDs to pre-render. Manifest IDs: `line_climax_<NODE_ID>`. |
| `language` (Zuikaku-on-rotation, T11) | §7 lexicon coverage | 5-lexeme swap proposal + anchor-word table. Update [`../../research/language-generation.md`](../../research/language-generation.md) §5 + the GPT-5.5 prompt + [`../../research/lexicon.fallback.json`](../../research/lexicon.fallback.json). |
| `sim` (Blücher, T12) | §2 cast routine context, §11 Q1–Q3 | Routine schedules for 6 NPCs, sign rendering, filler-item pickup mechanic. |
| `genmedia` (lane TBD, T30) | §2 cast sprite keys, §1.1 `{react}` enum | NPC sprites + held-object variants for fetch-quest fillers + per-NPC animation sets for the react enum. |
| `orchestrator` (Alsace) | §6 stock lines, §4.6 Hala phases | Stock lines feed the Gemini Live system prompt as priming material. |

> **Mechanic note** — Player input is a **BG3-style multiple-choice menu**. Player option labels render in **English** with a first-encounter Telopa overlay (§8.2 progressive disclosure). NPC lines, by contrast, render fully in Telopa with hover-to-diary translation (§8.3). The "all-foreign player options" framing in the prior revision is rejected; the migration to a composition UI (§9) is preserved as future work.

## A. Integration contract (engine handshake)

Targeting `app/src/sim/dialogue/` (Warspite/Enterprise, T42 to land):

```ts
type NpcId = 'pemi' | 'naro' | 'lemu' | 'toka' | 'senu' | 'hala';
type AnchorWord = 'hi' | 'me' | 'you' | 'want' | 'go';
type AnimKey =
  | 'nod' | 'shake_head' | 'puzzle' | 'laugh' | 'frown'
  | 'point' | 'wave' | 'bow'
  | 'gesture_self' | 'gesture_other' | 'none';

interface DialogueNode {
  id: string;                        // e.g. 'NAR_INITIAL'
  speaker: NpcId;
  line: string;                      // English authoring layer; resolved to Telopa at runtime
  options: PlayerOption[];
  stockLine?: boolean;               // climax fallback pool flag (§6)
  sideEffects?: NodeSideEffect[];    // anchor-word sets, hint logs, item handovers
  trigger?: NodeTrigger;             // entry condition; cf. §3 state model
}

interface PlayerOption {
  text: string;                      // English label; rendered with first-encounter Telopa overlay
  kind: 'utterance' | 'gesture';     // utterances translate to Telopa; gestures drive player sprite only
  react: AnimKey;                    // NPC sprite reaction played AFTER pick, BEFORE next node
  next: string | 'END';
  gatedBy?: StateFlag;
}

type StateFlag =
  | 'has_visited_hut'
  | `holds_item_${'wood'|'oil'|'flint'}`
  | `fetch_done_${NpcId}`
  | `met_${NpcId}`
  | `anchor_known.${AnchorWord}`;
```

**Conventions:**
- Node IDs are `NPC_PURPOSE_INDEX` in `SCREAMING_SNAKE_CASE`. Prefixes: `PEM_`, `NAR_`, `LEM_`, `TOK_`, `SEN_`, `HAL_`.
- `END` exits the conversation; the NPC returns to routine.
- `→ NODE_ID` in the prose body is an unconditional edge; numbered "Player options" are user-controlled edges and require `{react: <animKey>}`.
- Re-approaching an NPC in the same phase replays the most recent node — don't burn unique copy on repeat visits.
- Render rules: NPC lines and utterance options render in Telopa; gesture options render in italicised English; first-encounter overlay drops once `anchor_known.<word>=true` for every word in the option.

## TL;DR — what changed from v2 and from the locked-2026-05-09 revision

v3 is a **merge**. Kept from v2:
- **Six NPCs incl. Senu** (man, forest, holds wood). Archetype labels (child / 2 elder women / 2 men / chief).
- **Pemi as first NPC at the beach**, teaching `hi` / `me` / `you` (Calvin confirmed).
- **Fetch-quest layer in Phase B** (NPC asks for filler → player fetches → NPC hands critical item).
- **Anchor-word teaching schedule** Hi/Me/You/Want/Go.
- **Lighthouse climax with chief Hala**.
- **BG3-style English player options** with first-encounter Telopa overlay.

Adopted from teammate's locked-2026-05-09 revision:
- **§4.0 English prologue** — 17-second beach intro that explains crash, language barrier, hover-diary affordance.
- **`{react: <animKey>}` on every player option**.
- **`{{predecessorName}}` and `{{npcName_<sprite_key>}}` template tokens**.
- **Echo-heuristic guard** on Pemi's tree.
- **Diary contract (§8.3)** — auto-population of seen Telopa tokens, hover popover for free-text glosses, no game-side confirmation.
- **All-foreign rendering for NPC lines.**

Rejected from teammate's revision:
- **All-foreign player options.** Hybrid (English + first-encounter Telopa overlay) keeps the menu legible while still exposing the player to the foreign tokens.
- **v1 cast revert.** Senu, archetype labels, fetch quests stay (PLAN.md row 2026-05-09 locks them).

## 1. Document conventions

### 1.1 Node syntax

```
### NODE: NPC_NODE_ID [trigger and gating conditions]
**NPC:** *(stage direction)* "Spoken line in English."
**Player options:**
  1. "Player option line."  {react: nod}     → NEXT_NODE_ID  *[gated by: flag]*
  2. *Player gesture, italicised.*  {react: puzzle}  → NEXT_NODE_ID
  3. (leave) {react: wave} → END
```

- Node IDs are `NPC_PURPOSE_INDEX` in `SCREAMING_SNAKE_CASE`. NPC prefixes: `PEM_`, `NAR_`, `LEM_`, `TOK_`, `SEN_`, `HAL_`.
- *Italics* mark stage directions (NPC posture, animation, held object) — never spoken.
- "Quoted text" is a player **utterance** — at runtime renders in Telopa with first-encounter English overlay (§8.2).
- *Italic player options* are **gestures** — drive the player sprite, do not get translated. Permitted in Phase A only when player vocabulary is too small to compose meaningfully (Pemi's beach intro uses gestures exclusively for this reason; from Naro onward, options are predominantly utterances).
- A `→` is a tree edge. `END` exits the conversation; the NPC returns to routine.
- `[gated by: <flag>]` means the option is hidden / greyed unless the flag is true.
- **`{react: <animKey>}` is required on every player option.** AnimKey enum in §A integration contract; pick from there, add to enum (don't invent inline).

### 1.2 State flags (read by the engine)

| Flag | Set when | Used by |
|---|---|---|
| `has_visited_hut` | Player enters predecessor's hut + reads journal page | All NPCs (unlocks `{{predecessorName}}`-flavour branches in Phase B/C) |
| `holds_item_wood` / `_oil` / `_flint` | Item-NPC hands item over; mirrored in Convex `npcs.itemGiven=true` | Lighthouse scene + post-item branches |
| `fetch_done_<npc>` | Player has returned the requested filler item | Per-NPC: gates Phase C (item handover) |
| `met_<npc>` | First time within 3 tiles | Switches per-NPC `INITIAL` → `RETURN` greeting |
| `anchor_known.<word>` | Player has seen the anchor word at least once in dialogue | First-encounter overlay (§8.2) renders only when `false` |
| `journal_words` | Set of 3-4 lexicon IDs (`seedWords`) pre-seeded in pad | Used in §7 to mark which option lines lean on already-known vocab |

### 1.3 No fail states

Per [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) §3, **no option is wrong**. A "wrong" pick loops back or yields colour, never penalises. Closest thing to a soft fail is a *confused look* (sprite reacts `puzzle`) when the player tries to claim a critical item before completing the fetch.

## 2. Cast

Six NPCs aligned with [`../../PLAN.md`](../../PLAN.md) decisions log row 2026-05-09. **Calvin confirmed Senu's name stays.**

| Placeholder | Archetype | Location | Sprite key | Critical item | Filler asked | `isClimaxNpc` | Demo posture |
|---|---|---|---|---|---|---|---|
| **Pemi** | child | Beach (start) → follows player | `npc_child` | — | — | false | Fearless, fastest to greet, parrot-repeats anchor words. |
| **Naro** | elder woman | Well | `npc_elder_well` | — *(side-quest only)* | `fruit` (from forest) | false | Warm, maternal. The tutorial NPC. |
| **Lemu** | elder woman | Firepit | `npc_elder_firepit` | **oil** | `water` (from well) | false | Taciturn, sun-leathered, watches the sea. |
| **Toka** | man | Shrine *(driftwood statue)* | `npc_man_shrine` | **flint** | `rope` (from forest, Senu's stash) | false | Wary not hostile. Carries a fire-striker. |
| **Senu** | man | Forest | `npc_man_forest` | **wood** | `basket` (from well, Naro's weave) | false | Quiet, strong, smells of resin. |
| **Hala** | **chief** | Lighthouse (final) | `npc_chief` | — *(takes the three items)* | — | **true** | Old, kind, knowing. Predecessor's closest friend. |

Predecessor's name (`predecessorName` in `worldState`) is procedurally generated. Body uses `{{predecessorName}}`; literal NPC names are placeholders that the engine substitutes via `{{npcName_<sprite_key>}}`.

## 3. State model

| Phase | Entered when | Tree size | Notes |
|---|---|---|---|
| **A — First meet** | First proximity, `met_<npc>=false` | 2-4 nodes | Greeting; teaches one or more anchor words; plants side-quest hook (item-NPCs only). |
| **B — Fetch open** | `met_<npc>=true`, `fetch_done_<npc>=false` | 2-3 nodes | NPC restates the want; hint on where to go. |
| **C — Hand-over** | `fetch_done_<npc>=true`, `holds_item_<x>=false` | 2-3 nodes | Player gives filler; NPC hands critical item. |
| **D — Post-item** | `holds_item_<x>=true` (or `fetch_done_naro=true`) | 1-2 nodes | Cosy farewell, hint toward next location. |
| **D' — Climax (Hala only)** | All three items + first lighthouse approach | 11 nodes | Predecessor's story → leave/stay → ending. |

### 3.1 Anchor-word teaching schedule

| Word | First teacher | Mechanism | Reinforced by |
|---|---|---|---|
| `hi` | Pemi (beach) | Wave + says it twice | Every NPC opens Phase A with it |
| `me` | Pemi | Self-pointing (`{react: gesture_self}`) | Naro Phase A, then everyone |
| `you` | Pemi | Player-pointing (`{react: gesture_other}`) | Same |
| `want` | Naro (well) | "Me want fruit. You go forest." | Lemu / Toka / Senu Phase B |
| `go` | Naro (well) | Same line; pairs with a sign | Sign at every new location echoes the word |

## 4. Per-NPC trees

### 4.0 Prologue — pre-village English ramp

> **Renders in English.** Only English-displayed surface besides ending screens. Triggered on player spawn at the Crash Site; press any key to advance after Beat 1, or skip the rest. ~17 seconds total.

```
Beat 1 (3s, fade-in over beach + plane wreck):
  You wake on the sand.

Beat 2 (3s):
  The plane is in pieces.
  There is a village past the dunes.

Beat 3 (4s):
  The people there don't speak your language.
  You don't speak theirs.

Beat 4 (4s):
  Listen. Watch what they do.
  Hover any word to write what you think it means.

Beat 5 (3s, then control unlocks):
  Your guesses are the only translation you'll have.
  A child runs across the sand toward you.
```

**Sets up:** crash, language barrier, diary affordance, Pemi's incoming approach.
**Does not cover:** scene controls, side-quests, NPC names, anchor-word list, predecessor — those emerge in-world.

### 4.1 Pemi — the child (beach → follows player)

**First-NPC special case:** Pemi's Phase A uses **gesture options exclusively** (per §1.1). Player has no Telopa vocabulary at this moment, so utterance options would be unreadable. Body-language exchange teaches `hi` / `me` / `you` through visual matching.

#### Phase A — Beach intro

##### NODE: PEM_BEACH_INTRO [trigger: prologue ends + first player movement; `met_pemi=false`]
**Pemi:** *(scampers across the sand, stops a few paces away, points at themself)* "**Hi!** Hi-hi. Me Pemi. Me — you?"

**Player options:**
  1. *Wave back.* {react: laugh} → PEM_WAVE_BACK
  2. *Point at yourself, mime your own name.* {react: laugh} → PEM_NAME_MIME
  3. *Stay silent.* {react: puzzle} → PEM_QUIET

##### NODE: PEM_WAVE_BACK [side effect: anchor `hi` / `me` / `you` set]
**Pemi:** *(beams)* "Hi-hi. You hi me. Me hi you. *Good!*" *(twirls, then points south past the dunes)* "Go — go village. Naro. Go!"
→ END *(sets `met_pemi=true`, hint logged: village_south, anchor `go` partial-set)*

##### NODE: PEM_NAME_MIME [side effect: anchor `me` / `you` set]
**Pemi:** *(laughs)* "You! Me Pemi, you… *you*. Hi, you. Go village, follow me!"
→ END *(sets `met_pemi=true`, anchor `hi` set, anchor `go` partial-set)*

##### NODE: PEM_QUIET
**Pemi:** *(tilts head, then shrugs cheerfully)* "Quiet you. Hi anyway. Me Pemi. Follow."
→ END *(sets `met_pemi=true`, anchor `hi` / `me` set)*

#### Phase B — Wandering follower

> **Echo-heuristic compliant** (§8.1 rule 7): Pemi's opener `"Me with you. Where go?"` shares no tokens with the seven option labels below.

##### NODE: PEM_FOLLOW [trigger: re-approach, `met_pemi=true`]
**Pemi:** *(falls into step beside you)* "Me with you. Where go?"

**Player options:**
  1. "Who is at the well?" {react: point} → PEM_TELL_NARO
  2. "Who is at the firepit?" {react: point} → PEM_TELL_LEMU
  3. "Who is at the shrine?" {react: point} → PEM_TELL_TOKA
  4. "Who is in the forest?" {react: point} → PEM_TELL_SENU
  5. "Tell me about the lighthouse." {react: frown} → PEM_TELL_HALA  *[gated by: `has_visited_hut`]*
  6. "Tell me about {{predecessorName}}." {react: nod} → PEM_TELL_MAREN  *[gated by: `has_visited_hut`]*
  7. (leave) {react: wave} → END

##### NODE: PEM_TELL_NARO
**Pemi:** "Naro. Big bread. Naro want fruit. Go." *(mimes biting an apple)*
→ PEM_FOLLOW

##### NODE: PEM_TELL_LEMU
**Pemi:** "Lemu. Fire. Sea-eyes. Lemu want water." *(mimes pouring)*
→ PEM_FOLLOW

##### NODE: PEM_TELL_TOKA
**Pemi:** "Toka. Stone-house. Strict. Toka want rope." *(mimes tying)*
→ PEM_FOLLOW

##### NODE: PEM_TELL_SENU
**Pemi:** "Senu. Trees. Quiet. Senu want basket." *(mimes carrying)*
→ PEM_FOLLOW

##### NODE: PEM_TELL_HALA
**Pemi:** *(suddenly serious)* "Hala. Lighthouse. Big-house, fire-on-top. Wait, wait, wait — me only seven winters. Hala will say. *Bring fire to her.*"
→ PEM_FOLLOW

##### NODE: PEM_TELL_MAREN
**Pemi:** "Before. The other one. Boat. Letter. Hala read it every winter. Same day."
→ PEM_FOLLOW

---

### 4.2 Naro — elder woman, the well (side-quest only)

#### Phase A — First meet

##### NODE: NAR_INITIAL [trigger: first proximity, `met_naro=false`]
**Naro:** *(she sets down a half-woven basket; she looks up, unsurprised)* "**Hi.** Me Naro. You?"

**Player options:**
  1. "Hi. Me — me." *(point at self)* {react: nod} → NAR_GREETING
  2. *Stay silent, look around the well.* {react: puzzle} → NAR_QUIET
  3. (leave) {react: wave} → END

##### NODE: NAR_GREETING [side effect: anchor `hi` / `me` / `you` set]
**Naro:** *(small smile)* "Good. *Hi, you.* Sea brings who it brings." *(beat)* "Me **want** fruit. You **go** forest. Bring."
→ NAR_BREAD *(sets `met_naro=true`, anchor `want` / `go` set, hint logged: forest_for_fruit)*

##### NODE: NAR_QUIET
**Naro:** *(she resumes weaving without rushing you)* "All right. **Me** weave, **you** look. When you ready: me **want** fruit. **Go** forest." *(she points west with her chin)*
→ END *(sets `met_naro=true`, anchor `me` / `you` / `want` / `go` set)*

##### NODE: NAR_BREAD
**Naro:** *(she gestures at a small stack of loaves)* "Bread for fruit. Fair?" *(she breaks off a piece, hands it to you to eat now)* "*Hi, you.*"
→ END

#### Phase B — Fetch open

##### NODE: NAR_AWAITING [trigger: re-approach, `met_naro=true`, `fetch_done_naro=false`]
**Naro:** *(without lifting her eyes)* "Me want fruit. Go forest. Bring."

**Player options:**
  1. "Forest — where?" {react: point} → NAR_POINT_FOREST
  2. "Fruit — what?" {react: puzzle} → NAR_DESCRIBE_FRUIT
  3. (leave) {react: wave} → END

##### NODE: NAR_POINT_FOREST
**Naro:** *(points west and slightly south with the basket-needle)* "Path past shrine. Sign there. Go."
→ NAR_AWAITING

##### NODE: NAR_DESCRIBE_FRUIT
**Naro:** *(makes a round shape with both hands, hums)* "Round. Red. Tree." *(taps her cheek)* "Sweet."
→ NAR_AWAITING

#### Phase C — Hand-over

##### NODE: NAR_GIVE_FRUIT [trigger: re-approach, `fetch_done_naro=true`, holding fruit]
**Naro:** *(she takes the fruit, weighs it, smells it)* "*Good*. You learn fast." *(presses a fresh loaf into your hands)* "Bread. Yours."

**Player options:**
  1. "What now?" {react: nod} → NAR_NEXT_HINT
  2. "Tell me about {{predecessorName}}." {react: nod} → NAR_ABOUT_MAREN  *[gated by: `has_visited_hut`]*
  3. (leave) {react: wave} → NAR_POST_FRUIT

##### NODE: NAR_NEXT_HINT
**Naro:** "Lemu, firepit. Want water. Toka, shrine. Want rope. Senu, forest. Want basket. **And** — you go west, cliff path. Hut. Read what is there."
→ NAR_POST_FRUIT *(hint logged: hut_west, hut_has_journal)*

##### NODE: NAR_ABOUT_MAREN
**Naro:** "{{predecessorName}} sat at this well a year before they could ask for water without pointing. We sang to teach them — daft songs, mostly about the weather." *(she smiles)* "You? Faster."
→ NAR_GIVE_FRUIT

#### Phase D — Post-fetch

##### NODE: NAR_POST_FRUIT [trigger: re-approach, `fetch_done_naro=true`]
**Naro:** *(she hands you a small linen-wrapped crust each time)* "Bread, yours. Lighthouse, south. Hala wait."
→ END

---

### 4.3 Lemu — elder woman, the firepit (oil)

#### Phase A — First meet

##### NODE: LEM_INITIAL [trigger: first proximity, `met_lemu=false`]
**Lemu:** *(she's leaning on the stone press, watching the sea past the firepit smoke)* "Hi. Lemu. **Plane brought you.** Loud thing."

**Player options:**
  1. "You — see?" {react: nod} → LEM_SAW_PLANE
  2. *Mime the plane falling.* {react: nod} → LEM_SAW_PLANE
  3. *Look at the press with her.* {react: none} → LEM_SEA
  4. (leave) {react: wave} → END

##### NODE: LEM_SAW_PLANE
**Lemu:** "Heard it. Like the last one — twenty winters. Me knew before me looked." *(she nods toward the firepit)* "Me want **water**. Go well. Naro know."
→ END *(sets `met_lemu=true`, hint logged: lemu_wants_water)*

##### NODE: LEM_SEA
**Lemu:** *(after a long beat)* "Boats come every two months. Next one will see your fire if you light it." *(taps the press)* "**Oil for fire.** Me want water first. Go well."
→ END *(sets `met_lemu=true`, hint logged: lemu_wants_water, hint logged: lighthouse_signal)*

#### Phase B — Fetch open

##### NODE: LEM_AWAITING [trigger: re-approach, `met_lemu=true`, `fetch_done_lemu=false`]
**Lemu:** "Water." *(small head-tilt toward the well)* "Go."

**Player options:**
  1. "Why water?" {react: nod} → LEM_WHY_WATER
  2. "Well — where?" {react: point} → LEM_POINT_WELL
  3. (leave) {react: wave} → END

##### NODE: LEM_WHY_WATER
**Lemu:** "Press is dry. Olives need water in the screw. Old trick." *(half-smile)* "Naro will give. She likes you."
→ LEM_AWAITING

##### NODE: LEM_POINT_WELL
**Lemu:** *(jerks her chin north-west)* "Two stones over. Naro there. Sign on the path."
→ LEM_AWAITING

#### Phase C — Hand-over

##### NODE: LEM_GIVE_OIL [trigger: re-approach, `fetch_done_lemu=true`, holding water]
**Lemu:** *(she pours your water into the press, turns the wheel three times in silence, then unstoppers a clay flask and fills it from the spout)* "Three measures. Enough to start any fire and keep it through wet wind." *(she stoppers it, offers it across the press)*
→ LEM_HANDOVER_OIL

##### NODE: LEM_HANDOVER_OIL [side effect: `holds_item_oil=true`, audio: NPC ack line]
**Lemu:** "Don't drop it. Cliff is slick after morning fog."

**Player options:**
  1. "{{predecessorName}} press oil too?" {react: nod} → LEM_MAREN_PRESS  *[gated by: `has_visited_hut`]*
  2. "{{predecessorName}} — at the end?" {react: frown} → LEM_MAREN_END  *[gated by: `has_visited_hut`]*
  3. (leave) {react: wave} → LEM_POST_ITEM

##### NODE: LEM_MAREN_PRESS
**Lemu:** "Every press-day for years. They had a hand for the wheel. Could keep the rhythm without watching, which is rare." *(half-smile)*
→ LEM_HANDOVER_OIL

##### NODE: LEM_MAREN_END
**Lemu:** *(her face closes)* "Hala will tell you. Me held them at the press for the goodbye. Words belong to her."
→ LEM_HANDOVER_OIL

#### Phase D — Post-item

##### NODE: LEM_POST_ITEM [trigger: re-approach, `holds_item_oil=true`]
**Lemu:** "Flint? Toka, shrine. Wood? Senu, forest. Then lighthouse. Hala wait."
→ END

---

### 4.4 Toka — man, the shrine (flint)

#### Phase A — First meet

##### NODE: TOK_INITIAL [trigger: first proximity, `met_toka=false`]
**Toka:** *(rests a hand on the staff propped beside him; doesn't stand)* "Hi. Stop. Hands open."

**Player options:**
  1. *Show empty hands.* {react: nod} → TOK_HANDS_OPEN
  2. *Mime the plane crash.* {react: nod} → TOK_CRASHED
  3. (leave) {react: wave} → END

##### NODE: TOK_HANDS_OPEN
**Toka:** *(grunts, half-satisfied)* "All right. You're new wreck. Stay out of me way until me see what you are." *(taps the striker on his belt)* "Me want **rope**. Go forest. Senu has."
→ END *(sets `met_toka=true`, hint logged: toka_wants_rope)*

##### NODE: TOK_CRASHED
**Toka:** *(eyes you, then nods once)* "Like the last one. Walk west, find their hut, read what they wrote. Then come back. Me want rope, you bring." *(small slap on his belt)* "Then talk."
→ END *(sets `met_toka=true`, hint logged: toka_wants_rope, hint logged: hut_west, hut_has_journal)*

#### Phase B — Fetch open

##### NODE: TOK_AWAITING [trigger: re-approach, `met_toka=true`, `fetch_done_toka=false`]
**Toka:** "Rope. Senu. Forest." *(taps his striker)* "Me wait."

**Player options:**
  1. "Why rope?" {react: nod} → TOK_WHY_ROPE
  2. "Senu — where?" {react: point} → TOK_POINT_FOREST
  3. (leave) {react: wave} → END

##### NODE: TOK_WHY_ROPE
**Toka:** "Shrine roof. Wind tore the binding. Old rope is salt-rot. Need new — Senu cuts good fibre."
→ TOK_AWAITING

##### NODE: TOK_POINT_FOREST
**Toka:** *(points south-west, past the shrine and down a path)* "Trees. Sign at fork. *Go.*"
→ TOK_AWAITING

#### Phase C — Hand-over

##### NODE: TOK_GIVE_FLINT [trigger: re-approach, `fetch_done_toka=true`, holding rope]
**Toka:** *(takes the rope, weighs it, ties a quick test-knot, then unties)* "Good. Senu's hand still." *(unties the striker, weighs it in his palm, then closes your hand around it)* "Don't lose it. Second-oldest thing on this island. After Hala." *(half-grin)*
→ TOK_HANDOVER_FLINT

##### NODE: TOK_HANDOVER_FLINT [side effect: `holds_item_flint=true`, audio: NPC ack line]
**Toka:** "Strike sharp, not hard. Wind on the cliff will do half the work."

**Player options:**
  1. "{{predecessorName}} ask you too?" {react: laugh} → TOK_MAREN_FLINT  *[gated by: `has_visited_hut`]*
  2. "Why you say like that?" {react: frown} → TOK_WHY_LIKE_THAT  *[gated by: `has_visited_hut`]*
  3. (leave) {react: wave} → TOK_POST_ITEM

##### NODE: TOK_MAREN_FLINT
**Toka:** "They asked me three times before me gave it. Each time more politely. The third was almost a song." *(quiet laugh)*
→ TOK_HANDOVER_FLINT

##### NODE: TOK_WHY_LIKE_THAT
**Toka:** *(looks past you, toward the lighthouse)* "Because Hala will not have an easy week. Light the lamp anyway. We owed {{predecessorName}} their leaving and we owe you yours."
→ TOK_HANDOVER_FLINT

#### Phase D — Post-item

##### NODE: TOK_POST_ITEM [trigger: re-approach, `holds_item_flint=true`]
**Toka:** "Lighthouse, south. Path forks at the shrine — you know the way. Hala will be inside. Door opens for fire."
→ END

---

### 4.5 Senu — man, the forest (wood)

#### Phase A — First meet

##### NODE: SEN_INITIAL [trigger: first proximity, `met_senu=false`]
**Senu:** *(he straightens from the splitting block, axe head down, palms wide)* "Hi."

**Player options:**
  1. "Hi. Me — me." *(point at self)* {react: nod} → SEN_GREETING
  2. *Look at the woodpile.* {react: nod} → SEN_WOODPILE
  3. (leave) {react: wave} → END

##### NODE: SEN_GREETING
**Senu:** *(nods slowly)* "Senu. You — new. Plane?" *(small grunt of confirmation when you nod)* "Me want **basket**. Go well. Naro weave. Bring."
→ END *(sets `met_senu=true`, hint logged: senu_wants_basket)*

##### NODE: SEN_WOODPILE
**Senu:** *(taps a stack of seasoned logs)* "Wood. Dry, season. For lighthouse, yes? Last one took some too." *(beat)* "Me want basket first. Naro has. Go well."
→ END *(sets `met_senu=true`, hint logged: senu_wants_basket, hint logged: lighthouse_needs_wood)*

#### Phase B — Fetch open

##### NODE: SEN_AWAITING [trigger: re-approach, `met_senu=true`, `fetch_done_senu=false`]
**Senu:** "Basket. Naro." *(picks up another log)* "Me wait."

**Player options:**
  1. "Why basket?" {react: nod} → SEN_WHY_BASKET
  2. "Naro — where?" {react: point} → SEN_POINT_WELL
  3. (leave) {react: wave} → END

##### NODE: SEN_WHY_BASKET
**Senu:** "Carry seasoned wood without splinter-drop. My old one cracked." *(shrugs)* "Naro weaves better. Trade fair: basket, wood."
→ SEN_AWAITING

##### NODE: SEN_POINT_WELL
**Senu:** *(jerks his chin north-east)* "Past shrine. Up the path. Sign there. *Go.*"
→ SEN_AWAITING

#### Phase C — Hand-over

##### NODE: SEN_GIVE_WOOD [trigger: re-approach, `fetch_done_senu=true`, holding basket]
**Senu:** *(takes the basket, runs a thumb along the weave, nods once)* "Good hand still." *(loads a bundle of seasoned logs into the basket and lifts it back into your arms)* "Wood. For the lighthouse." *(steps back, dusts his palms)*
→ SEN_HANDOVER_WOOD

##### NODE: SEN_HANDOVER_WOOD [side effect: `holds_item_wood=true`, audio: NPC ack line]
**Senu:** "Mind your steps. Path bends near the bramble."

**Player options:**
  1. "{{predecessorName}} cut wood with you?" {react: nod} → SEN_MAREN_WOOD  *[gated by: `has_visited_hut`]*
  2. "Why so quiet today?" {react: frown} → SEN_QUIET_TODAY  *[gated by: `has_visited_hut`]*
  3. (leave) {react: wave} → SEN_POST_ITEM

##### NODE: SEN_MAREN_WOOD
**Senu:** "Three winters they came every dawn. Quiet like me. We cut, we did not need words." *(small, real smile)* "When they left, the woodpile felt loud."
→ SEN_HANDOVER_WOOD

##### NODE: SEN_QUIET_TODAY
**Senu:** *(beat; looks toward the lighthouse over the trees)* "Because today there will be a fire there again. Twenty winters since the last."
→ SEN_HANDOVER_WOOD

#### Phase D — Post-item

##### NODE: SEN_POST_ITEM [trigger: re-approach, `holds_item_wood=true`]
**Senu:** "Oil, Lemu. Flint, Toka. Then lighthouse. Hala open the door for fire, not for talk."
→ END

---

### 4.6 Hala — chief, the lighthouse (climax)

#### Phase A — First lighthouse approach

##### NODE: HAL_INITIAL [trigger: first proximity to lighthouse door, no items]
**Hala:** *(her voice through the closed lighthouse door)* "Not yet."

**Player options:**
  1. "Not yet — what?" {react: puzzle} → HAL_NOT_YET
  2. *Try the door.* {react: shake_head} → HAL_DOOR_LOCKED
  3. (leave) {react: none} → END

##### NODE: HAL_NOT_YET
**Hala:** *(through the door)* "Not yet your turn to talk to me. Walk west first. Read what was left for you. Then ask the four for what me need."
→ END *(sets `met_hala=true`, hint logged: hut_west, ask_four_npcs)*

##### NODE: HAL_DOOR_LOCKED
**Hala:** *(through the door)* "Door opens for fire. Bring it."
→ END *(sets `met_hala=true`)*

#### Phase B — Some items, not all

##### NODE: HAL_SOME_ITEMS [trigger: re-approach, ≥1 item, not all 3]
**Hala:** *(through the door, slight smile in her voice)* "Almost. Bring me a *fire*, not three things in your arms."
→ END

#### Phase C — All three items

##### NODE: HAL_DOOR_OPENS [trigger: re-approach with wood + oil + flint]
*(The lighthouse door creaks open. A warm light spills out. Inside, an old woman stands beside a stone hearth. She is the chief — Hala. Lyria's track warms.)*

**Hala:** *(she steps aside to let you in)* "Come."
→ HAL_BEACON_OPEN *(sets `lighthouse_unlocked=true`, audio cue: door creak + music swell)*

#### Phase D — Climax tree

> **For the engine team:** every node below is a Mode C *fallback line* — if Gemini Live is >3s, swap to deterministic. Stock-line nodes flagged below.

##### NODE: HAL_BEACON_OPEN [stock-line]
**Hala:** *(stands beside the unlit hearth; lays a hand on the stone ring)* "There. Same fire. Same air. Twenty winters and the same wind through the chimney."

**Player options:**
  1. "You knew {{predecessorName}}." {react: nod} → HAL_KNEW_MAREN
  2. "{{predecessorName}} go home?" {react: nod} → HAL_DID_MAREN
  3. "Why you cry?" {react: frown} → HAL_WHY_CRYING
  4. *(silent, place the wood)* {react: none} → HAL_WAIT

##### NODE: HAL_KNEW_MAREN [stock-line]
**Hala:** "Knew. We sat together every dusk for nineteen years. They learned our words. Me never learned theirs — not really. We didn't need to." *(she meets your eyes for the first time)*

**Player options:**
  1. "Tell me — the end." {react: nod} → HAL_END_STORY
  2. "Letter — still come?" {react: nod} → HAL_LETTER
  3. "Were you — love?" {react: nod} → HAL_LOVE

##### NODE: HAL_DID_MAREN [stock-line]
**Hala:** "Yes. Boat saw the fire that night. They went up the rope ladder and turned once at the top to look back. Then ship went on." *(beat)* "A year later, wind brought a folded paper in a fishing net."
→ HAL_LETTER

##### NODE: HAL_WHY_CRYING [stock-line]
**Hala:** "Because the fire reminds me. Because *you* remind me. Because me always thought there'd only be one." *(she touches the stone of the hearth)*
→ HAL_BEACON_OPEN

##### NODE: HAL_WAIT
**Hala:** *(after a long quiet)* "It's all right. There's no rush now. Boat that comes for you won't come until first light."
→ HAL_BEACON_OPEN

##### NODE: HAL_END_STORY [stock-line]
**Hala:** "They woke one morning and said *it's time, isn't it.* Me said yes, because it was. We lit this lighthouse together. Boat came at dawn. They left me a smooth river-stone and a name they'd written down — *yours and mine on the same page* — and they went."

**Player options:**
  1. "Right choice?" {react: nod} → HAL_RIGHT_CHOICE
  2. "Did they want to stay?" {react: frown} → HAL_WANTED_STAY
  3. "Me — same question?" {react: nod} → HAL_QUESTION

##### NODE: HAL_LETTER [stock-line]
**Hala:** "Six lines. They had taught their family our words. They said the bread on their side of the world was the wrong shape. They said the sea was *louder there.*" *(small laugh)* "We read it once a year. Whole village."
→ HAL_END_STORY

##### NODE: HAL_LOVE [stock-line]
**Hala:** *(long beat; she is honest)* "Me don't know what your word for it is. Me don't even know if me have one in mine. We were *each other's*. That is what me have."
→ HAL_END_STORY

##### NODE: HAL_RIGHT_CHOICE
**Hala:** "It was the choice they could live with. Both choices are real. Neither is *better*. The wrong one is the one you can't believe in."
→ HAL_QUESTION

##### NODE: HAL_WANTED_STAY
**Hala:** *(tilts her head)* "Some days. So did me, want them to. They went anyway. They were right to."
→ HAL_QUESTION

##### NODE: HAL_QUESTION [stock-line, *the* climax beat]
**Hala:** *(she takes both your hands; the hearth catches behind her, oil flaring; the lighthouse lamp turns and throws a beam out to sea)* "So me ask you, the way me asked them. Boat comes at first light. **You go, or you stay?**"

**Player options:**
  1. **"Me go."** {react: nod} → END_LEAVE
  2. **"Me stay."** {react: nod} → END_STAY
  3. "Wait — me think." {react: nod} → HAL_MOMENT

##### NODE: HAL_MOMENT
**Hala:** *(nods)* "Take it. The fire will keep."
→ HAL_QUESTION

#### Endings

##### NODE: END_LEAVE [stock-line, sets `endingChoice="leave"`]
**Hala:** *(she lets go of your hands and steps back)* "Then go. Take a memory of us with you. We'll read your letter, when it comes."

*Cut to end screen: ship sailing at dawn under the lighthouse beam. **Renders in English** (only English-displayed surface besides §4.0 prologue).*
→ END

##### NODE: END_STAY [stock-line, sets `endingChoice="stay"`]
**Hala:** *(her face cracks into a smile she didn't expect)* "Then come. Bread is still warm at Naro's. There's a stool at Lemu's press for you. Senu has a second axe."

*Cut to end screen: village hearth glowing through the dusk, smoke rising, lighthouse beam sweeping past. **Renders in English.***
→ END

---

## 5. Tree summary

| NPC | Phase A | Phase B | Phase C | Phase D / D' | Total nodes | Stock-line nodes |
|---|---|---|---|---|---|---|
| Pemi | 4 | 7 | — | — | 11 | — |
| Naro | 3 | 3 | 3 | 1 | 10 | — |
| Lemu | 4 | 3 | 4 | 1 | 12 | — |
| Toka | 3 | 3 | 4 | 1 | 11 | — |
| Senu | 3 | 3 | 4 | 1 | 11 | — |
| Hala | 3 | 1 | 1 | 13 | 18 | 11 |
| **Total** | **20** | **20** | **16** | **17** | **73 nodes** | **11 stock lines** |

Plus §4.0 prologue (5 beats, English, ~17s).

## 6. Mode C fallback pool

11 stock-line nodes in Hala's Phase D. Pre-render via ElevenLabs at build-time (`scripts/gen-voices.ts`, T36). Manifest IDs: `line_climax_<NODE_ID>`.

The hybrid render rule (§8.2) applies to live and fallback alike: Gemini Live returns are treated as English, sent through the language module, and tokens enter the diary on first appearance.

## 7. Lexicon coverage

### 7.1 Anchor words

| English | In locked lexicon? | Telopa form | Notes |
|---|---|---|---|
| **hi / talk** | No | (TBD) | Recommend overload `say` (existing verb) — `aloha`/`shalom` precedent. |
| **me / I** | Yes (`I`) | `na` | |
| **you (sg)** | Yes (`you`) | `ke` | |
| **want** | Yes | `sela` | |
| **go** | Yes | `huna` | |

Only `hi` is genuinely new.

### 7.2 Plot-specific words required

True new lexemes: **wood, oil, flint, fire, boat** (5 entries). Plus `lighthouse` as compound `house+fire`. Filler items overload existing slots: `fruit`→`food`, `rope`/`basket`→`tool`.

### 7.3 Recommended swap

| Drop | Add |
|---|---|
| `gift` | `wood` |
| `key` | `oil` |
| `door` | `flint` |
| `food` (overload `fruit`) | `fire` |
| `drink` | `boat` |

Five-row swap. `language` lane (Zuikaku on rotation) updates [`../../research/language-generation.md`](../../research/language-generation.md) §5 + GPT-5.5 prompt + [`../../research/lexicon.fallback.json`](../../research/lexicon.fallback.json).

### 7.4 First-encounter overlay

When an utterance option is shown for the first time and any token in it is `anchor_known.<word>=false`, render Telopa-with-English-overlay. Once every word is anchored, drop the overlay. Per-render check is cheap; reactive to diary state.

## 8. Runtime presentation — hybrid contract

> **Locked v3, 2026-05-09.** Merges teammate's all-foreign UX (NPC lines + diary) with v2's English-menu legibility (player options + first-encounter Telopa overlay).

### 8.1 Authoring rules (apply to every node in §4)

1. **Player options can be utterances OR gestures.** Utterances render in Telopa with first-encounter overlay; gestures drive the player sprite and don't translate. Gestures are restricted to Phase A where vocab is too small (Pemi's beach intro is the canonical case).
2. **NPC stage directions stay in italics.** They drive sprite animation, never reach the player as text.
3. **Names use `{{predecessorName}}` and `{{npcName_<sprite_key>}}` template tokens.** Engine substitutes at runtime.
4. **Player utterance options must be composable from the locked lexicon.** §7's coverage applies to *both* NPC lines and player utterance options.
5. **First-NPC bootstrap budget.** Pemi's Phase A uses no more than `hi` / `me` / `you`. The §4.0 prologue does role-and-mechanic onboarding; Pemi does *vocabulary* onboarding.
6. **Every player option needs a `{react: <animKey>}` annotation.** Pick from §A enum; add new keys to enum (don't invent inline).
7. **Echo-heuristic guard on Pemi's tree.** Beyond Pemi's first turn, no player option may string-match a token in the most-recent NPC line.

### 8.2 What renders in what language

| Surface | Language at runtime | Notes |
|---|---|---|
| §4.0 prologue (5 beats) | **English** | The only English-displayed surface besides ending screens. |
| NPC line | Telopa tokens | Translation of §4's English copy. Hover any token → diary popover. |
| NPC stage direction | (not displayed) | Drives sprite animation only. |
| Player option — **utterance** | Telopa **+ first-encounter English overlay** | Overlay drops once `anchor_known.<word>=true` for every word in the option. Hover any token → diary popover. |
| Player option — **gesture** | English (italicised) | Doesn't translate; sprite does the body-language work. |
| Speaker name | Telopa | Substituted from `{{npcName_<sprite_key>}}`. |
| Diary entry | Player's free-text guess | Player owns this. Game never validates. |
| Sprite reaction | (visual, no text) | From `{react: ...}`; plays after pick, before next node. |
| End-screen text | English | Out of scene. |

**Why hybrid for player options.** Pure all-foreign menus (teammate's earlier proposal) maximise immersion but risk a "stall on first NPC" failure mode at demo time. The first-encounter overlay gives the same Telopa exposure (player still reads the foreign tokens, still adds them to the diary on hover) without leaving them illiterate at the menu. Once anchored, overlay drops. Progressive disclosure.

### 8.3 Diary contract

- **Auto-population.** Every Telopa token the player has *seen* — NPC line OR option button — added to diary on first appearance, source-tagged.
- **Mid-conversation editing.** Hover token → inline popover for free-text gloss. Conversation pauses while open.
- **No confirmation, ever.** Game never marks a guess right or wrong. Implicit confirmation only — if "I want wood" works (NPC hands wood), the gloss is implicitly validated by world behaviour.
- **Demo ships analytical mode only.** Each surface form is its own diary entry. No stem-splitting; that's post-demo.

### 8.4 Mode C implications

The hybrid render rule applies to live and fallback alike. Gemini Live returns are treated as English, translated via the language module, and tokens enter the diary on first appearance. Player options at the climax follow §8.2's hybrid: utterance options render in Telopa with English overlay until anchored.

## 9. Migration to composition UI (preserved as future work)

Not on the demo path. Every utterance option above is shaped to compose from word tiles; the same tree can drive a future composition layer post-demo.

## 10. Side quests (deferred)

Three plug-in points if afternoon slack permits: Pemi pebble exchange, Senu second-axe, Toka shrine offering. None required for demo path.

## 11. Open questions

1. **Sign system mechanic.** Engine renders direction signs at fork points to anchor `go`. Small wooden plaques + Telopa word + compass icon? Recommend yes.
2. **Filler-item pickup.** Tile-walk auto-pickup vs. prop interaction vs. NPC interaction? Recommend tile-walk auto-pickup.
3. **Pemi's pacing on the beach.** §4.0 prologue ends with "A child runs across the sand toward you" — engine holds Pemi in spawn until prologue's last beat fades.
4. **Demo-seed determinism.** Hide `END_STAY` on demo seed; show all branches on re-rolls.
5. **`hi` / `say` polysemy.** §7.1 proposes overloading `say`. `language` lane confirms on rotation.
6. **First-encounter overlay duration.** §8.2 says drop once `anchor_known.<word>=true` for every word. Engine: per-render check or pre-compute on instantiation? Suggest per-render — cheap and reactive.
7. **Echo guard scope.** §8.1 rule 7 currently constrains only Pemi. Should it extend to other NPCs' Phase A (small-vocab) trees? Worth piloting.

## 12. What this doc does NOT cover

- **Telopa translations** — `language` lane on rotation, after T11 produces `lexicon.json`.
- **Voice IDs / manifest entries** — `voice` (Warspite/Impero) builds from §6 stock-line list.
- **Composition word-tile UI** — preserved as future work in §9.
- **Climax NPC system prompt for Gemini Live** — `orchestrator` (Alsace) per [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) §8.
- **Sprite assignment + held-object variants + animKey animation sets** — `genmedia` lane.
- **SFX / Lyria cue points** — `genmedia`; Hala's Phase D is the music-warm anchor.
- **Daily routines for Senu** — `sim` (Blücher) per [`../../research/npc-routines-and-comms.md`](../../research/npc-routines-and-comms.md).
- **Diary UI surface** — `engine` per §8.3.

## Sources

- [`../../research/narrative-design.md`](../../research/narrative-design.md) — Revision 2, the brief.
- [`../../research/npc-routines-and-comms.md`](../../research/npc-routines-and-comms.md) — Blücher's NPC count, sample spec, earshot model.
- [`../../research/language-generation.md`](../../research/language-generation.md) — locked 50-word lexicon and GPT-5.5 prompt.
- [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) — §2 (8-beat loop), §5 (data contracts), §6 (acceptance), §8 (Mode C pool).
- [`../../PLAN.md`](../../PLAN.md) — decisions log row 2026-05-09.
- *Baldur's Gate 3* (Larian, 2023), *Disco Elysium* (ZA/UM, 2019), *Outer Wilds: Echoes of the Eye* (Mobius, 2021), *Chants of Senaar* (Focus Entertainment, 2023).
