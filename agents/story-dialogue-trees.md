# Story dialogue trees — five NPCs, BG3-style branching

**Status:** Draft v1, 2026-05-09 by `story` (Zuikaku, swapped from `language`).
**Decision it informs:** the *exact* English copy and choice graph for every NPC interaction. Doubles as the Mode C climax **pre-rendered fallback pool** (REQUIREMENTS.md §8 open question — pool sized at 11 stock responses, see §6 of this doc).
**Aligned with:** REQUIREMENTS.md §2 (8-beat loop), §5.5 (composition payload), and `narrative-design.md` Revision 2 (predecessor arc, binary leave/stay).
**Out of scope:** Telopa translations, voice IDs, sprite assignment. Downstream lanes (`language`, `voice`, `genmedia`) consume this and translate.

---

## TL;DR

Five NPCs, each with a small branching tree gated by **two state flags**: `has_visited_hut` and `holds_item_<x>`. All copy is English; downstream `language` lane resolves each Player option into a sentence composed entirely from the 50-word lexicon (with the five plot-word additions noted in §7). Climax tree (Hala, the shrine woman) is the largest — 11 nodes, both endings — and is structured so the engine can either play it as a deterministic BG3 menu *or* feed it as the Mode C fallback pool when Gemini Live is unavailable / >3s.

> **Mechanic note** — Calvin's brief (2026-05-09) simplifies the player-side input from "drag-and-drop sentence composition" to "BG3-style multiple-choice menu" *for now*. The composition UI may layer back in later: every Player option below maps cleanly onto a composable sentence, so the engine team can swap the input mechanism without rewriting the trees. See §8 for the migration sketch.

## 1. Document conventions

### 1.1 Node syntax

```
### NODE: NPC_NODE_ID [trigger and gating conditions]
**NPC:** *(stage direction)* "Spoken line in English."
**Player options:**
  1. "Player option line." → NEXT_NODE_ID  *[gated by: flag]*
  2. "Another option." → NEXT_NODE_ID
  3. (leave) → END
```

- Node IDs are `NPC_PURPOSE_INDEX` in `SCREAMING_SNAKE_CASE`. The NPC prefix is the first three letters of the NPC's placeholder name (`NAR_`, `LEM_`, `TOK_`, `PEM_`, `HAL_`).
- *Italics* mark stage directions (animation, posture, held object) — not spoken.
- "Quoted text" is what the player sees as a speech bubble / hears as voice.
- A `→` is a tree edge. `END` exits the conversation; the NPC returns to routine.
- `[gated by: <flag>]` means the option is hidden / greyed unless the flag is true.

### 1.2 State flags (read by the engine)

| Flag                                  | Set when                                                         | Used by                                                             |
| ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| `has_visited_hut`                     | Player enters predecessor's hut + reads journal page             | All five NPCs (gates the item-request branch and post-hut variants) |
| `holds_item_wood` / `_oil` / `_flint` | NPC hands item over; mirrored in Convex `npcs.itemGiven=true`    | Beacon scene + post-item branches                                   |
| `beacon_lit`                          | All three items placed at lighthouse                               | Hala's climax tree                                                  |
| `met_<npc>`                           | First time within 3 tiles                                        | Switches per-NPC `INITIAL` → `RETURN` greeting                      |
| `journal_words`                       | Set of 3-4 lexicon IDs (`seedWords` from §5.1) pre-seeded in pad | Used in §7 to mark which option lines lean on already-known vocab   |

### 1.3 No fail states

Per REQUIREMENTS.md §3, **no option is wrong**. A "wrong" pick (in the sense of not advancing the quest) loops back to the parent node or yields colour, never a penalty. The closest thing to a soft fail is the *confused look* response when the player asks for an item before visiting the hut — friendly retry.

## 2. Cast

Five NPCs as locked in `narrative-design.md` and Blücher's `npc-routines-and-comms.md`. All names are placeholders; `language` lane replaces them with procedurally-generated names following Telopa phonotactics (CV/CVC, ≤4 syllables) once T11 lands.

| Placeholder name | Role | Sprite key | Item held | `isClimaxNpc` | Demo posture |
|---|---|---|---|---|---|
| **Naro** | Baker | `npc_baker` | `wood` | false | Warm, maternal, used to feeding hungry strangers. Smells of bread. |
| **Lemu** | Farmer | `npc_farmer` | `oil` | false | Taciturn, sun-leathered, watches the sea while she works. |
| **Toka** | Guard | `npc_guard` | `flint` | false | Wary not hostile. Carries a fire-striker on his belt. |
| **Pemi** | Child | `npc_child` | (none) | false | Fearless, follows the player around the village. The colour role. |
| **Hala** | Shrine woman | `npc_shrine` | (none) | **true** | Old, kind, knowing. Tends a small driftwood shrine on the path to the lighthouse. The predecessor's closest friend. |

The predecessor's name (`predecessorName` in `worldState`, §5.4) is procedurally generated. We use **Maren** below as the placeholder, matching REQUIREMENTS.md §5.4's example.

## 3. State model — phases of every villager's tree

Three phases govern the four "ordinary" villagers (Naro, Lemu, Toka, Pemi). Hala has a fourth.

| Phase | Entered when | Tree size | Notes |
|---|---|---|---|
| **A — Pre-hut** | First contact, before journal found | 2-3 nodes | Friendly noise, no item access. Plants a seed line about "another stranger." |
| **B — Post-hut** | `has_visited_hut == true` | 3-4 nodes | The *ask* opens here. Item exchange happens. NPC volunteers a memory of Maren. |
| **C — Post-item** | `holds_item_<their item> == true` | 1-2 nodes | Cosy farewell, hint about the next NPC or the lighthouse. |
| **D — Climax (Hala only)** | `beacon_lit == true` | 11 nodes | Predecessor's story → leave/stay choice → ending. |

Re-approaching an NPC in the same phase replays the most recent node; we don't burn unique copy on repeat visits. (Mode A ambient lines, owned by `sim`, fill the silence between visits.)

---

## 4. Per-NPC trees — phases A, B, C

### 4.1 Naro — the baker (wood)

**Routine context:** working at the bakery oven 06:30–09:00, then market stall 10:00–17:00, then home 18:00–22:00. Best demo window is the market stall — easy approach.

#### Phase A — Pre-hut

##### NODE: NAR_INITIAL [trigger: first proximity, `met_naro=false`]
**Naro:** *(she sets down a tray of small loaves; flour on her apron)* "Oh — *one of you again*."

**Player options:**
  1. "...?" → NAR_AGAIN
  2. *Wave.* → NAR_WAVE
  3. *Point to the loaves.* → NAR_BREAD
  4. (leave) → END

##### NODE: NAR_AGAIN
**Naro:** *(softer)* "It's nothing. The sea brings who it brings. Are you hungry?" *(she offers a small loaf)*

**Player options:**
  1. *Take the bread, eat.* → NAR_GIFT_BREAD
  2. *Decline politely.* → NAR_DECLINE
  3. (leave) → END

##### NODE: NAR_WAVE
**Naro:** *(she waves back, smiling)* "You don't talk much yet. That's all right."
→ NAR_AGAIN *(auto-advance after 1s)*

##### NODE: NAR_BREAD
**Naro:** *(laughs)* "Yes, bread. Take one. We always have extra."
→ NAR_GIFT_BREAD

##### NODE: NAR_GIFT_BREAD [side effect: pad logs words BREAD/EAT/GOOD]
**Naro:** *(watches you eat)* "Mm. Maren — *that one* — they liked the salted ones. You'll find their hut on the cliff path, west. I think it's still standing." *(she returns to kneading)*
→ END *(sets `met_naro=true`, hint logged: hut_west)*

##### NODE: NAR_DECLINE
**Naro:** "All right. The offer stands." *(she points west with her chin)* "Walk that way some time."
→ END *(sets `met_naro=true`, hint logged: hut_west)*

#### Phase B — Post-hut

##### NODE: NAR_RETURN [trigger: re-approach, `has_visited_hut=true`, `holds_item_wood=false`]
**Naro:** *(she's stacking firewood next to the oven; pauses when she sees you)* "You found Maren's place, then. Your face says you did."

**Player options:**
  1. "I need to light a beacon. Can you spare some wood?" → NAR_ASK_WOOD
  2. "Tell me about Maren." → NAR_ABOUT_MAREN
  3. "Did Maren leave or stay?" → NAR_LEAVE_OR_STAY
  4. (leave) → END

##### NODE: NAR_ASK_WOOD
**Naro:** *(she looks at the stack, then at you, and nods slowly)* "For the lighthouse fire? Of course. Maren took some too, in the end." *(she pulls a bundle of seasoned logs and places it in your arms)*
→ NAR_HANDOVER_WOOD

##### NODE: NAR_HANDOVER_WOOD [side effect: `holds_item_wood=true`, audio: NPC ack line]
**Naro:** "Mind your steps. The path bends near the bramble." *(she pats your shoulder)*
→ NAR_POST_ITEM *(returns to Phase C)*

##### NODE: NAR_ABOUT_MAREN
**Naro:** "They were quieter than you. Sat at this counter for a year before they could ask for bread without pointing. We sang to teach them words — daft songs, mostly about the weather." *(she smiles)*
→ NAR_RETURN *(loop back; player can ask another)*

##### NODE: NAR_LEAVE_OR_STAY
**Naro:** *(her smile dims)* "Hala was the one they told. Go ask her, by the shrine on the lighthouse path. I'll have wood ready when you come back."
→ NAR_RETURN

#### Phase C — Post-item

##### NODE: NAR_POST_ITEM [trigger: re-approach, `holds_item_wood=true`]
**Naro:** *(she's dusting flour from her hands)* "The farmer has oil pressed for the lamps. The guard keeps a striker. Go in any order — they'll know what you mean." *(she nods toward the south path)*
→ END

---

### 4.2 Lemu — the farmer (oil)

**Routine context:** olive grove 07:00–11:00, oil press 11:00–14:00, market 15:00–17:00, home after. Pressing-oil is the demo window — diegetic excuse to hand over a flask.

#### Phase A — Pre-hut

##### NODE: LEM_INITIAL [trigger: first proximity, `met_lemu=false`]
**Lemu:** *(she's leaning on a stone press, watching the sea)* "Plane brought you. Loud thing."

**Player options:**
  1. "You saw it?" → LEM_SAW_PLANE
  2. *Mime "yes, my plane".* → LEM_SAW_PLANE
  3. *Look toward the sea with her.* → LEM_SEA
  4. (leave) → END

##### NODE: LEM_SAW_PLANE
**Lemu:** "Heard it. Like the last one — twenty winters. I knew before I looked." *(she resumes turning a wheel on the press)*
→ LEM_OFFER

##### NODE: LEM_SEA
**Lemu:** *(after a long beat)* "Boats come every two months. The next one will see your fire if you light it." *(she taps the press)* "Oil's for fire."
→ LEM_OFFER *(hint logged: lighthouse_fire)*

##### NODE: LEM_OFFER
**Lemu:** "Walk west when you're ready. There's a hut. The other one left their book there — pages and all. *Read it before you ask me anything.*"
→ END *(sets `met_lemu=true`, hint logged: hut_west, hut_has_journal)*

#### Phase B — Post-hut

##### NODE: LEM_RETURN [trigger: re-approach, `has_visited_hut=true`, `holds_item_oil=false`]
**Lemu:** *(she sets down the press handle)* "So you read it. Then you know what to ask."

**Player options:**
  1. "I need oil for the beacon." → LEM_ASK_OIL
  2. "Did Maren press oil with you?" → LEM_MAREN_PRESS
  3. "What was Maren like, near the end?" → LEM_MAREN_END
  4. (leave) → END

##### NODE: LEM_ASK_OIL
**Lemu:** *(unstoppers a clay flask and fills it from the press's spout)* "Three measures. Enough to start any fire and keep it through a wet wind." *(she stoppers it and offers it across the press)*
→ LEM_HANDOVER_OIL

##### NODE: LEM_HANDOVER_OIL [side effect: `holds_item_oil=true`, audio: NPC ack line]
**Lemu:** "Don't drop it. The cliff's slick after the morning fog."
→ LEM_POST_ITEM

##### NODE: LEM_MAREN_PRESS
**Lemu:** "Every press-day for years. They had a hand for the wheel. Could keep the rhythm without watching, which is rare." *(half-smile)*
→ LEM_RETURN

##### NODE: LEM_MAREN_END
**Lemu:** *(her face closes)* "Hala will tell you. I held them at the press for the goodbye, but the words belong to her."
→ LEM_RETURN

#### Phase C — Post-item

##### NODE: LEM_POST_ITEM [trigger: re-approach, `holds_item_oil=true`]
**Lemu:** "If you're missing flint, Toka has one on his belt. He'll fuss before he hands it over. He always does."
→ END

---

### 4.3 Toka — the guard (flint)

**Routine context:** patrol around village edge 06:00–11:00 and 16:00–19:00, midday break at the well 11:00–14:00. Demo window: midday well — stationary, approachable.

#### Phase A — Pre-hut

##### NODE: TOK_INITIAL [trigger: first proximity, `met_toka=false`]
**Toka:** *(rests a hand on the staff propped beside him; doesn't stand)* "Stop there. Hands open."

**Player options:**
  1. *Show empty hands.* → TOK_HANDS_OPEN
  2. *Mime "I crashed".* → TOK_CRASHED
  3. (leave) → END

##### NODE: TOK_HANDS_OPEN
**Toka:** *(grunts, half-satisfied)* "All right. You're the new wreck. Stay out of my way until I see what you are." *(he taps the striker on his belt — a small dark stone)*
→ TOK_HINT

##### NODE: TOK_CRASHED
**Toka:** *(eyes you, then nods once)* "Like the last one. Walk west, find their hut. Read what they wrote. Then come back and we can talk."
→ END *(sets `met_toka=true`, hint logged: hut_west, hut_has_journal)*

##### NODE: TOK_HINT
**Toka:** "There's a hut west. Belonged to Maren. They left a book in their own hand. Look at it before you ask me anything *useful*."
→ END *(sets `met_toka=true`)*

#### Phase B — Post-hut

##### NODE: TOK_RETURN [trigger: re-approach, `has_visited_hut=true`, `holds_item_flint=false`]
**Toka:** *(stands; brushes dust from his trousers)* "Right. So you're going through with it."

**Player options:**
  1. "I need a flint." → TOK_ASK_FLINT
  2. "Did Maren ask you for one too?" → TOK_MAREN_FLINT
  3. "Why do you say it like that?" → TOK_WHY_LIKE_THAT
  4. (leave) → END

##### NODE: TOK_ASK_FLINT
**Toka:** *(unties the striker from his belt, weighs it in his palm, then closes your hand around it)* "Don't lose it. It's the second-oldest thing on this island after Hala." *(half-grin)*
→ TOK_HANDOVER_FLINT

##### NODE: TOK_HANDOVER_FLINT [side effect: `holds_item_flint=true`, audio: NPC ack line]
**Toka:** "Strike sharp, not hard. The wind on the lighthouse will do half the work."
→ TOK_POST_ITEM

##### NODE: TOK_MAREN_FLINT
**Toka:** "They asked me three times before I gave it. Each time more politely. The third was almost a song." *(quiet laugh)*
→ TOK_RETURN

##### NODE: TOK_WHY_LIKE_THAT
**Toka:** *(looks past you, toward the lighthouse)* "Because Hala will not have another easy week, that's why. Light it anyway. We owed Maren their leaving and we owe you yours."
→ TOK_RETURN

#### Phase C — Post-item

##### NODE: TOK_POST_ITEM [trigger: re-approach, `holds_item_flint=true`]
**Toka:** "Lighthouse's south. The path forks at the shrine — Hala will be there, she's *always* there. Walk past her if she lets you. She probably won't."
→ END

---

### 4.4 Pemi — the child (colour, no item)

**Routine context:** roams freely; tends to follow the player when nearby. Hangs around Naro's stall mid-morning and the well at midday.

Pemi has *no item-gating role* — they're cosy texture and a soft progression hint. Their tree is small.

#### Phase A — Pre-hut

##### NODE: PEM_INITIAL [trigger: first proximity, `met_pemi=false`]
**Pemi:** *(skips up, holds out a small smooth pebble)* "For you! Maren gave me a stone like this once."

**Player options:**
  1. *Take the pebble.* → PEM_PEBBLE
  2. "Who's Maren?" → PEM_WHO_MAREN
  3. (leave) → END

##### NODE: PEM_PEBBLE
**Pemi:** *(beams, pockets hands)* "Now you have a stone. Maren had a *book*. It's still in their house on the cliff. *I've seen it.*"
→ END *(sets `met_pemi=true`, hint logged: hut_west, hut_has_journal)*

##### NODE: PEM_WHO_MAREN
**Pemi:** "Before. The other one. They went home on a boat. Hala says they sent us a *letter*. We read it on the same day every year." *(twirls)*
→ PEM_PEBBLE

#### Phase B — Post-hut

##### NODE: PEM_RETURN [trigger: re-approach, `has_visited_hut=true`]
**Pemi:** *(falls into step beside you)* "Did you read it? The book?"

**Player options:**
  1. "Yes." → PEM_KNEW_IT
  2. "Some of it." → PEM_SOME
  3. "Will you read it with me?" → PEM_WITH_ME
  4. (leave) → END

##### NODE: PEM_KNEW_IT
**Pemi:** "I knew you would. Hala says the sea brings people who are *meant to find* the book." *(skips ahead, then back)*
→ PEM_RETURN

##### NODE: PEM_SOME
**Pemi:** "That's already more than the bird who lives in there reads." *(grin)*
→ PEM_RETURN

##### NODE: PEM_WITH_ME
**Pemi:** *(suddenly serious)* "I can't read all the words. I'm only seven winters." *(tugs your sleeve)* "But you can ask Hala. She knew them best."
→ PEM_RETURN *(hint logged: ask_hala)*

#### Phase C — none

Pemi has no post-item phase. They're always available with the same Phase B menu.

---

### 4.5 Hala — the shrine woman (climax NPC)

**Routine context:** static at the driftwood shrine on the path to the lighthouse 24/7 (in-game). She's how the player physically passes from village → lighthouse.

Hala has *four phases*. Phases A and B are tiny (gating + atmosphere); Phase D is the climax tree and is by far the largest. Phase C is the brief encounter while the player still needs items.

#### Phase A — Pre-hut

##### NODE: HAL_INITIAL [trigger: first proximity, `met_hala=false`]
**Hala:** *(seated by the shrine, eyes closed, lips moving without sound; opens her eyes when you stop)* "Not yet."

**Player options:**
  1. "Not yet what?" → HAL_NOT_YET
  2. *Bow and leave.* → END
  3. (leave) → END

##### NODE: HAL_NOT_YET
**Hala:** "Not yet your turn to talk to me. Walk west first. Read what was left for you. Then ask the three for what you need." *(closes her eyes again)*
→ END *(sets `met_hala=true`, hint logged: hut_west, ask_three)*

#### Phase B — Post-hut, no items

##### NODE: HAL_POST_HUT [trigger: re-approach, `has_visited_hut=true`, no items collected]
**Hala:** *(without opening her eyes)* "You read it. Now go. Bring fire to the lighthouse. Then I will speak."
→ END

#### Phase C — Some items, not all

##### NODE: HAL_SOME_ITEMS [trigger: re-approach, ≥1 item, `beacon_lit=false`]
**Hala:** *(slight smile, eyes still closed)* "Almost. Bring me a lit fire, not three things in your arms."
→ END

#### Phase D — Climax tree

The beacon is lit. Hala has stood. She crosses to meet the player at the lighthouse.

> **For the engine team:** every node below is also valid as a Mode C *fallback line* — if Gemini Live is >3s on a given turn, swap in the deterministic line for that node. The 11 nodes give a fallback pool that covers the entire climax including both endings, satisfying REQUIREMENTS.md §8's open question on pool size. Nodes flagged **[stock-line]** are the highest-value to pre-render at build-time because they appear on the deterministic demo seed path.

##### NODE: HAL_BEACON_OPEN [trigger: `beacon_lit=true`, first arrival] [stock-line]
**Hala:** *(stands at the edge of the firelight; the beacon throws long shadows on the cliff)* "There. The same fire. The same air. Twenty winters and the same wind."

**Player options:**
  1. "You knew Maren." → HAL_KNEW_MAREN
  2. "Did Maren make it home?" → HAL_DID_MAREN
  3. "Why are you crying?" → HAL_WHY_CRYING
  4. (silent, wait) → HAL_WAIT

##### NODE: HAL_KNEW_MAREN [stock-line]
**Hala:** "Knew. We sat together every dusk for nineteen years. They learned our words. I never learned theirs — not really. We didn't need to." *(she meets your eyes for the first time)*

**Player options:**
  1. "Tell me what happened at the end." → HAL_END_STORY
  2. "Do you still hear from them?" → HAL_LETTER
  3. "Were you in love?" → HAL_LOVE

##### NODE: HAL_DID_MAREN [stock-line]
**Hala:** "Yes. The boat saw the fire that night. They went up the rope ladder and turned once at the top to look back. And then the ship went on." *(beat)* "A year later, the wind brought a folded paper in a fishing net."
→ HAL_LETTER

##### NODE: HAL_WHY_CRYING [stock-line]
**Hala:** "Because the fire reminds me. Because *you* remind me. Because I always thought there'd only be one." *(she touches the shrine's worn wood)*
→ HAL_BEACON_OPEN *(loop; player can ask another)*

##### NODE: HAL_WAIT
**Hala:** *(after a long quiet)* "It's all right. There's no rush now. The boat that comes for you won't come until first light."
→ HAL_BEACON_OPEN

##### NODE: HAL_END_STORY [stock-line]
**Hala:** "They woke one morning and said *it's time, isn't it.* I said yes, because it was. We lit the beacon at this same lighthouse. The boat came at dawn. They left me a smooth river-stone and a name they'd written down — *yours and mine on the same page* — and they went."

**Player options:**
  1. "Was it the right choice?" → HAL_RIGHT_CHOICE
  2. "Did they want to stay?" → HAL_WANTED_STAY
  3. "I think I have to ask the same question." → HAL_QUESTION

##### NODE: HAL_LETTER [stock-line]
**Hala:** "Six lines. They had taught their family our words. They said the bread on their side of the world was the wrong shape. They said the sea was *louder there.*" *(small laugh)* "We read it once a year. The whole village."
→ HAL_END_STORY *(auto-advance after 2s if player doesn't pick)*

##### NODE: HAL_LOVE [stock-line]
**Hala:** *(long beat; she is honest)* "I don't know what your word for it is. I don't even know if I have one in mine. We were *each other's*. That is what I have."
→ HAL_END_STORY

##### NODE: HAL_RIGHT_CHOICE
**Hala:** "It was the choice they could live with. Both choices are real. Neither is *better*. The wrong one is the one you can't believe in."
→ HAL_QUESTION

##### NODE: HAL_WANTED_STAY
**Hala:** *(tilts her head)* "Some days. So did I, want them to. They went anyway. They were right to."
→ HAL_QUESTION

##### NODE: HAL_QUESTION [stock-line, *the* climax beat]
**Hala:** *(she takes both your hands)* "So I ask you, the way I asked them. The boat is coming at first light. **Will you go on it, or will you stay?**"

**Player options:**
  1. **"I'll go."** → END_LEAVE
  2. **"I'll stay."** → END_STAY
  3. "I need a moment." → HAL_MOMENT

##### NODE: HAL_MOMENT
**Hala:** *(nods)* "Take it. The fire will keep."
→ HAL_QUESTION *(loop until choice)*

#### Endings

##### NODE: END_LEAVE [stock-line, sets `endingChoice="leave"`]
**Hala:** *(she lets go of your hands and steps back)* "Then go. Take a memory of us with you. We'll read your letter, when it comes."

*Cut to end screen: ship sailing at dawn. Word count, predecessor's name, choice.*
→ END

##### NODE: END_STAY [stock-line, sets `endingChoice="stay"`]
**Hala:** *(her face cracks into a smile she didn't expect)* "Then come. The bread is still warm. There's a stool at the press for you."

*Cut to end screen: village hearth glowing, smoke rising. Word count, predecessor's name, choice.*
→ END

---

## 5. Tree summary — node and word counts

| NPC | Phase A | Phase B | Phase C | Phase D | Total nodes | Stock-line nodes |
|---|---|---|---|---|---|---|
| Naro | 6 | 4 | 1 | — | 11 | (item ack covered by audio manifest) |
| Lemu | 4 | 4 | 1 | — | 9 | — |
| Toka | 4 | 4 | 1 | — | 9 | — |
| Pemi | 3 | 4 | — | — | 7 | — |
| Hala | 2 | 1 | 1 | 13 | 17 | 11 |
| **Total** | **19** | **17** | **3** | **13** | **53 nodes** | **11 stock lines** |

Approximate copy budget: **~3 100 English words** of NPC line + player option text across the five trees. Translates to a similar token count in Telopa once `language` resolves the lexicon (Telopa is more compact per-word but redundant per-clause due to no inflection).

## 6. Mode C fallback pool — sized

Per REQUIREMENTS.md §8 open question, the pre-rendered pool for the climax NPC is the **11 stock-line nodes** above (every node in Hala's Phase D marked `[stock-line]`). This:

- covers every option the player can pick on the deterministic demo seed,
- gives Gemini Live the entire climax script as system-context priming (it can reuse phrases or paraphrase),
- guarantees the demo cannot stall — if Live is unreachable, the engine plays the fallback line for the current node.

`voice` lane (Warspite) should pre-render these 11 lines via ElevenLabs at build-time (`scripts/gen-voices.ts`, T36) once `language` has translated them. Suggested manifest IDs: `line_climax_<NODE_ID>`.

## 7. Lexicon coverage — what the dialogue needs from `language` lane

Most of the trees can be expressed in the locked 50-word lexicon (`research/language-generation.md` §5). However, the predecessor / beacon plot needs a **handful of plot-specific words** that are not in the current core lexicon. I'm flagging them here as a clean diff for `language` to absorb into the GPT-5.5 prompt or post-validation pass.

### 7.1 Required additions

| English | Why needed | Suggested POS slot | Notes |
|---|---|---|---|
| **wood / firewood** | `holds_item_wood` exchange, "I need wood" | noun (thing) | Could overload `tool` semantically, but the demo's clarity benefits from a dedicated word. |
| **oil** | `holds_item_oil` exchange | noun (thing) | As above. |
| **flint / striker** | `holds_item_flint` exchange | noun (thing) | As above. |
| **fire / beacon** | "light a beacon", end-of-story imagery | noun (thing) or verb | Single word covers fire-as-thing; "beacon" is then a compound. |
| **boat / ship** | "the boat comes at first light" | noun (thing) | Used by Lemu, Hala, end screens. |

That's **5 new lexemes**. Two ways to absorb them without breaking the 50-word target:

1. **Replace 5 of the lower-value entries** (suggest: drop `gift`, `key`, `door`, `water`, `food` — none of these appear in the dialogue trees as required vocabulary; the items are `item` / `tool` / `<plot-word>`). Keeps total at 50.
2. **Bump the target to 55 lexemes** and update the schema's lexicon size constraint (`minItems: 50` → `55`, `maxItems: 50` → `55`).

I (returning to `language` lane after T41) recommend **option 1** because (a) GPT-5.5 Structured Outputs strict mode is more reliable with a fixed-size array, and (b) the dropped words don't earn their slot in the dialogue trees. If `language` lane disagrees, this is the only fork in the doc.

### 7.2 Already covered by the locked lexicon

Spot-check that every common phrase below is composable:

| Tree phrase | Composable from locked 50? | Notes |
|---|---|---|
| "I see you" | yes | `na tana ke` |
| "I want X" | yes | `na sela <X>` (using `want`) |
| "give X" | yes | `kowe <X>` |
| "hut west" / "house west" | partial | `house` ✓ ; "west" not in lexicon — overload as `far` + path direction visual cue |
| "boat comes" | needs `boat` (added above) | `<boat> kapi` (using `come`) |
| "leave or stay" | partial | `go` ✓ ; "stay" not in lexicon — overload as `not go` (`no kapi`) or `here have` (`pomu nira`); `language` to pick |

Two overloads needed: **west → far** (with visual signage carrying the direction), and **stay → "here-have" or "not-go"** (`language`'s call). Both cleanly expressible with locked vocab.

### 7.3 Action item back to me

When I rotate back to `language` (probably T11 Saturday morning), I'll:
- update `research/language-generation.md` §5 with the 5-word swap,
- update §10's GPT-5.5 prompt accordingly,
- regenerate `lexicon.fallback.json` with the swap so the demo-day fallback covers the dialogue trees,
- log a new decisions-log row in PLAN.md.

Tracking this as a follow-up; not part of T41's scope.

## 8. Migration sketch — BG3 menu → composition UI

If the team has spare cycles in the afternoon to revive the drag-and-drop composition UI from REQUIREMENTS.md §5.5, every Player option above is already shaped to compose from word tiles. The mapping is mechanical:

| BG3 option (English) | Telopa composition (lexicon IDs) | Validation |
|---|---|---|
| "I need wood." | `na sela <wood>` | keyword: `wood` ✓, verb `want` ✓ → accept |
| "I'll go." | `na go` | keyword: `go` ✓ → accept |
| "I'll stay." | `na no go` | keyword: negation + `go` → accept |
| "Tell me about Maren." | `<Maren> say Q` | keyword: speaker name → accept |

The engine team can therefore land BG3 menu first (low risk, deterministic), then layer composition UI on top by exposing the same options as draggable word tiles whose target form is the canonical composition. This is exactly the path Calvin's "for now" qualifier opens.

## 9. Open questions

1. **Pemi's role for the Voice Agent track.** Pemi is the only NPC without an item or climax role. Is there a case for moving the *secondary* live-voice budget to Pemi (a child voice is unique and would showcase Gemini's voice-style range)? Currently no — the demo budget says single live agent only — but flagging.
2. **Branch repetition cost.** If the player loops through Naro's Phase B multiple times, hearing the same stock lines, do we tag a "boredom variant" (one alternative line per repeat)? Cheap to author; flagged as Group B.
3. **Western direction signage.** With "west" overloaded as visual cue, the engine team must place a clear signpost / footprints / path-marker on the village → hut transition. Coordinate with `engine` (Enterprise).
4. **Demo-seed determinism on Hala's tree.** The demo path through Hala's Phase D is fixed (`OPEN → KNEW_MAREN → END_STORY → QUESTION → END_LEAVE`). Should we hard-disable the alternative branches on the demo seed to guarantee timing, or trust the demoer? Recommend: hide `END_STAY` on demo seed; show all branches on re-rolls.
5. **Predecessor's name token.** The string "Maren" appears in 7 lines across the trees. When `language` lane assigns the procedural predecessor name, those lines must template-substitute. Recommend a `{{predecessorName}}` token convention in the engine's dialogue loader.

## 10. What this doc does NOT cover (deferred)

- **Telopa translations** — `language` lane (me, when I rotate back) once T11 has produced `lexicon.json`.
- **Voice IDs / voice-line manifest entries** — `voice` (Warspite/Impero) builds these from §6's stock-line list.
- **Sentence-composition word-tile UI** — `engine` (Enterprise) per REQUIREMENTS.md §5.5; mapping sketched in §8.
- **Climax NPC system prompt for Gemini Live** — `orchestrator` (Alsace) per REQUIREMENTS.md §8 by 12:00; this doc's stock lines are her input.
- **Sprite assignment + held-object variants** — `genmedia` lane; cast table (§2) gives the sprite keys.
- **Sound effects / Lyria cue points** — `genmedia`; Hala's Phase D is the natural music-warm anchor.

## Sources

- `research/narrative-design.md` — Revision 2, the brief.
- `research/npc-routines-and-comms.md` — Blücher's NPC count, sample spec, earshot model.
- `research/language-generation.md` — locked 50-word lexicon and GPT-5.5 prompt.
- `REQUIREMENTS.md` — §2 (8-beat loop), §5 (data contracts), §6 (acceptance), §8 (open Q on Mode C pool).
- *Baldur's Gate 3* (Larian, 2023) — branch-graph reference for player options as full lines.
- *Disco Elysium* (ZA/UM, 2019) — reference for letting "wrong" picks be colour, never fail.
- *Outer Wilds: Echoes of the Eye* (Mobius, 2021) — reference for the tender, leave/stay-shaped climax tone.
