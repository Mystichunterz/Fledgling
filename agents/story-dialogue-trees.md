# Story dialogue trees — five NPCs, branching (English authoring layer)

**Status:** Draft v1, 2026-05-09 by `story` (Zuikaku, swapped from `language`).
**Decision it informs:** the _exact_ English copy and choice graph for every NPC interaction. Doubles as the Mode C climax **pre-rendered fallback pool** (REQUIREMENTS.md §8 open question — pool sized at 11 stock responses, see §6 of this doc).
**Aligned with:** REQUIREMENTS.md §2 (8-beat loop), §5.5 (composition payload), and `narrative-design.md` Revision 2 (predecessor arc, binary leave/stay).
**Out of scope:** Telopa translations, voice IDs, sprite assignment. Downstream lanes (`language`, `voice`, `genmedia`) consume this and translate.

---

## TL;DR

Five NPCs, each with a small branching tree gated by **two state flags**: `has_visited_hut` and `holds_item_<x>`. The English copy below is the **authoring layer only** — at runtime every NPC line and every player-option label is rendered in the generated foreign language, and the player's only translation surface is a diary they fill in themselves (see §8 for the runtime presentation contract). Climax tree (the shrine woman) is the largest — 11 nodes, both endings — and is the Mode C fallback pool when Gemini Live is unavailable / >3s.

> **Mechanic note (locked 2026-05-09)** — Player input is a multiple-choice menu of foreign-language utterances; everything in the dialogue panel is foreign. The earlier "BG3 menu in English now, composition UI later" framing has been superseded. See §8 for the locked runtime contract; see §8.1 for the authoring rules this imposes on §4.

## 1. Document conventions

### 1.1 Node syntax

```
### NODE: NPC_NODE_ID [trigger and gating conditions]
**NPC:** *(stage direction)* "Spoken line in English."
**Player options:**
  1. "Player option line." {react: nod}      → NEXT_NODE_ID  *[gated by: flag]*
  2. "Another option."     {react: puzzle}   → NEXT_NODE_ID
  3. "Goodbye."            {react: wave}     → END
```

- Node IDs are `NPC_PURPOSE_INDEX` in `SCREAMING_SNAKE_CASE`. The NPC prefix is the first three letters of the NPC's placeholder name (`NAR_`, `LEM_`, `TOK_`, `PEM_`, `HAL_`).
- _Italics_ mark stage directions (animation, posture, held object) — not spoken.
- "Quoted text" is what the player sees as a speech bubble / hears as voice.
- A `→` is a tree edge. `END` exits the conversation; the NPC returns to routine.
- `[gated by: <flag>]` means the option is hidden / greyed unless the flag is true.
- `{react: <animKey>}` is the **NPC sprite reaction** played AFTER the option is picked, BEFORE the next node renders. Required on every option (see §8.1 rule 6). Animation keys are: `nod`, `shake_head`, `puzzle`, `laugh`, `frown`, `point`, `wave`, `bow`, `gesture_self`, `gesture_other`, `none`. Add to the enum in this section as new ones are needed.

### 1.2 State flags (read by the engine)

| Flag                                  | Set when                                                         | Used by                                                             |
| ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| `has_visited_hut`                     | Player enters predecessor's hut + reads journal page             | All five NPCs (gates the item-request branch and post-hut variants) |
| `holds_item_wood` / `_oil` / `_flint` | NPC hands item over; mirrored in Convex `npcs.itemGiven=true`    | Beacon scene + post-item branches                                   |
| `beacon_lit`                          | All three items placed at lighthouse                             | Hala's climax tree                                                  |
| `met_<npc>`                           | First time within 3 tiles                                        | Switches per-NPC `INITIAL` → `RETURN` greeting                      |
| `journal_words`                       | Set of 3-4 lexicon IDs (`seedWords` from §5.1) pre-seeded in pad | Used in §7 to mark which option lines lean on already-known vocab   |

### 1.3 No fail states

Per REQUIREMENTS.md §3, **no option is wrong**. A "wrong" pick (in the sense of not advancing the quest) loops back to the parent node or yields colour, never a penalty. The closest thing to a soft fail is the _confused look_ response when the player asks for an item before visiting the hut — friendly retry.

## 2. Cast

Five NPCs as locked in `narrative-design.md` and Blücher's `npc-routines-and-comms.md`. All names are placeholders; `language` lane replaces them with procedurally-generated names following Telopa phonotactics (CV/CVC, ≤4 syllables) once T11 lands.

| Placeholder name | Role         | Sprite key   | Item held | `isClimaxNpc` | Demo posture                                                                                                        |
| ---------------- | ------------ | ------------ | --------- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Naro**         | Baker        | `npc_baker`  | `wood`    | false         | Warm, maternal, used to feeding hungry strangers. Smells of bread.                                                  |
| **Lemu**         | Farmer       | `npc_farmer` | `oil`     | false         | Taciturn, sun-leathered, watches the sea while she works.                                                           |
| **Toka**         | Guard        | `npc_guard`  | `flint`   | false         | Wary not hostile. Carries a fire-striker on his belt.                                                               |
| **Pemi**         | Child        | `npc_child`  | (none)    | false         | Fearless, follows the player around the village. The colour role.                                                   |
| **Hala**         | Shrine woman | `npc_shrine` | (none)    | **true**      | Old, kind, knowing. Tends a small driftwood shrine on the path to the lighthouse. The predecessor's closest friend. |

The predecessor's name (`predecessorName` in `worldState`, §5.4) is procedurally generated. We use **Maren** below as the placeholder, matching REQUIREMENTS.md §5.4's example.

## 3. State model — phases of every villager's tree

Three phases govern the four "ordinary" villagers (Naro, Lemu, Toka, Pemi). Hala has a fourth.

| Phase                      | Entered when                        | Tree size | Notes                                                                          |
| -------------------------- | ----------------------------------- | --------- | ------------------------------------------------------------------------------ |
| **A — Pre-hut**            | First contact, before journal found | 2-3 nodes | Friendly noise, no item access. Plants a seed line about "another stranger."   |
| **B — Post-hut**           | `has_visited_hut == true`           | 3-4 nodes | The _ask_ opens here. Item exchange happens. NPC volunteers a memory of Maren. |
| **C — Post-item**          | `holds_item_<their item> == true`   | 1-2 nodes | Cosy farewell, hint about the next NPC or the lighthouse.                      |
| **D — Climax (Hala only)** | `beacon_lit == true`                | 11 nodes  | Predecessor's story → leave/stay choice → ending.                              |

Re-approaching an NPC in the same phase replays the most recent node; we don't burn unique copy on repeat visits. (Mode A ambient lines, owned by `sim`, fill the silence between visits.)

---

## 4. Per-NPC trees — phases A, B, C

### 4.0 Prologue — pre-village English ramp

> **Renders in English.** This is the *only* in-game text other than the ending screen that stays in English. Triggered on player spawn at the Crash Site; player can press any key to advance after Beat 1, or skip the rest. Sets up the crash, the language barrier, the hypothesis-making mechanic, and the hover affordance — all in ~17 seconds.

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
  Write what you think the words mean.

Beat 5 (3s, then control unlocks):
  Hover a word to write what you think it means.
  Your guesses are the only translation you'll have.
```

**Sets up:** crash context, language barrier, field-linguist role, the diary-via-hover affordance (named explicitly because nothing else in the dialogue UI will).

**Does not cover:** scene controls (WASD), the existence of side-quests, NPC names, or anything about the predecessor — those emerge in-world.

### 4.1 Naro — the baker (wood)

**Routine context:** working at the bakery oven 06:30–09:00, then market stall 10:00–17:00, then home 18:00–22:00. Best demo window is the market stall — easy approach.

#### Phase A — Pre-hut

##### NODE: NAR_INITIAL [trigger: first proximity, `met_naro=false`]

**Naro:** _(she sets down a tray of small loaves; flour on her apron)_ "Oh — _one of you again_."

**Player options:**

1. "...?" → NAR_AGAIN
2. _Wave._ → NAR_WAVE
3. _Point to the loaves._ → NAR_BREAD
4. (leave) → END

##### NODE: NAR_AGAIN

**Naro:** _(softer)_ "It's nothing. The sea brings who it brings. Are you hungry?" _(she offers a small loaf)_

**Player options:**

1. _Take the bread, eat._ → NAR_GIFT_BREAD
2. _Decline politely._ → NAR_DECLINE
3. (leave) → END

##### NODE: NAR_WAVE

**Naro:** _(she waves back, smiling)_ "You don't talk much yet. That's all right."
→ NAR_AGAIN _(auto-advance after 1s)_

##### NODE: NAR_BREAD

**Naro:** _(laughs)_ "Yes, bread. Take one. We always have extra."
→ NAR_GIFT_BREAD

##### NODE: NAR_GIFT_BREAD [side effect: pad logs words BREAD/EAT/GOOD]

**Naro:** _(watches you eat)_ "Mm. Maren — _that one_ — they liked the salted ones. You'll find their hut on the cliff path, west. I think it's still standing." _(she returns to kneading)_
→ END _(sets `met_naro=true`, hint logged: hut_west)_

##### NODE: NAR_DECLINE

**Naro:** "All right. The offer stands." _(she points west with her chin)_ "Walk that way some time."
→ END _(sets `met_naro=true`, hint logged: hut_west)_

#### Phase B — Post-hut

##### NODE: NAR_RETURN [trigger: re-approach, `has_visited_hut=true`, `holds_item_wood=false`]

**Naro:** _(she's stacking firewood next to the oven; pauses when she sees you)_ "You found Maren's place, then. Your face says you did."

**Player options:**

1. "I need to light a beacon. Can you spare some wood?" → NAR_ASK_WOOD
2. "Tell me about Maren." → NAR_ABOUT_MAREN
3. "Did Maren leave or stay?" → NAR_LEAVE_OR_STAY
4. (leave) → END

##### NODE: NAR_ASK_WOOD

**Naro:** _(she looks at the stack, then at you, and nods slowly)_ "For the lighthouse fire? Of course. Maren took some too, in the end." _(she pulls a bundle of seasoned logs and places it in your arms)_
→ NAR_HANDOVER_WOOD

##### NODE: NAR_HANDOVER_WOOD [side effect: `holds_item_wood=true`, audio: NPC ack line]

**Naro:** "Mind your steps. The path bends near the bramble." _(she pats your shoulder)_
→ NAR_POST_ITEM _(returns to Phase C)_

##### NODE: NAR_ABOUT_MAREN

**Naro:** "They were quieter than you. Sat at this counter for a year before they could ask for bread without pointing. We sang to teach them words — daft songs, mostly about the weather." _(she smiles)_
→ NAR_RETURN _(loop back; player can ask another)_

##### NODE: NAR_LEAVE_OR_STAY

**Naro:** _(her smile dims)_ "Hala was the one they told. Go ask her, by the shrine on the lighthouse path. I'll have wood ready when you come back."
→ NAR_RETURN

#### Phase C — Post-item

##### NODE: NAR_POST_ITEM [trigger: re-approach, `holds_item_wood=true`]

**Naro:** _(she's dusting flour from her hands)_ "The farmer has oil pressed for the lamps. The guard keeps a striker. Go in any order — they'll know what you mean." _(she nods toward the south path)_
→ END

---

### 4.2 Lemu — the farmer (oil)

**Routine context:** olive grove 07:00–11:00, oil press 11:00–14:00, market 15:00–17:00, home after. Pressing-oil is the demo window — diegetic excuse to hand over a flask.

#### Phase A — Pre-hut

##### NODE: LEM_INITIAL [trigger: first proximity, `met_lemu=false`]

**Lemu:** _(she's leaning on a stone press, watching the sea)_ "Plane brought you. Loud thing."

**Player options:**

1. "You saw it?" → LEM_SAW_PLANE
2. _Mime "yes, my plane"._ → LEM_SAW_PLANE
3. _Look toward the sea with her._ → LEM_SEA
4. (leave) → END

##### NODE: LEM_SAW_PLANE

**Lemu:** "Heard it. Like the last one — twenty winters. I knew before I looked." _(she resumes turning a wheel on the press)_
→ LEM_OFFER

##### NODE: LEM_SEA

**Lemu:** _(after a long beat)_ "Boats come every two months. The next one will see your fire if you light it." _(she taps the press)_ "Oil's for fire."
→ LEM_OFFER _(hint logged: lighthouse_fire)_

##### NODE: LEM_OFFER

**Lemu:** "Walk west when you're ready. There's a hut. The other one left their book there — pages and all. _Read it before you ask me anything._"
→ END _(sets `met_lemu=true`, hint logged: hut_west, hut_has_journal)_

#### Phase B — Post-hut

##### NODE: LEM_RETURN [trigger: re-approach, `has_visited_hut=true`, `holds_item_oil=false`]

**Lemu:** _(she sets down the press handle)_ "So you read it. Then you know what to ask."

**Player options:**

1. "I need oil for the beacon." → LEM_ASK_OIL
2. "Did Maren press oil with you?" → LEM_MAREN_PRESS
3. "What was Maren like, near the end?" → LEM_MAREN_END
4. (leave) → END

##### NODE: LEM_ASK_OIL

**Lemu:** _(unstoppers a clay flask and fills it from the press's spout)_ "Three measures. Enough to start any fire and keep it through a wet wind." _(she stoppers it and offers it across the press)_
→ LEM_HANDOVER_OIL

##### NODE: LEM_HANDOVER_OIL [side effect: `holds_item_oil=true`, audio: NPC ack line]

**Lemu:** "Don't drop it. The cliff's slick after the morning fog."
→ LEM_POST_ITEM

##### NODE: LEM_MAREN_PRESS

**Lemu:** "Every press-day for years. They had a hand for the wheel. Could keep the rhythm without watching, which is rare." _(half-smile)_
→ LEM_RETURN

##### NODE: LEM_MAREN_END

**Lemu:** _(her face closes)_ "Hala will tell you. I held them at the press for the goodbye, but the words belong to her."
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

**Toka:** _(rests a hand on the staff propped beside him; doesn't stand)_ "Stop there. Hands open."

**Player options:**

1. _Show empty hands._ → TOK_HANDS_OPEN
2. _Mime "I crashed"._ → TOK_CRASHED
3. (leave) → END

##### NODE: TOK_HANDS_OPEN

**Toka:** _(grunts, half-satisfied)_ "All right. You're the new wreck. Stay out of my way until I see what you are." _(he taps the striker on his belt — a small dark stone)_
→ TOK_HINT

##### NODE: TOK_CRASHED

**Toka:** _(eyes you, then nods once)_ "Like the last one. Walk west, find their hut. Read what they wrote. Then come back and we can talk."
→ END _(sets `met_toka=true`, hint logged: hut_west, hut_has_journal)_

##### NODE: TOK_HINT

**Toka:** "There's a hut west. Belonged to Maren. They left a book in their own hand. Look at it before you ask me anything _useful_."
→ END _(sets `met_toka=true`)_

#### Phase B — Post-hut

##### NODE: TOK_RETURN [trigger: re-approach, `has_visited_hut=true`, `holds_item_flint=false`]

**Toka:** _(stands; brushes dust from his trousers)_ "Right. So you're going through with it."

**Player options:**

1. "I need a flint." → TOK_ASK_FLINT
2. "Did Maren ask you for one too?" → TOK_MAREN_FLINT
3. "Why do you say it like that?" → TOK_WHY_LIKE_THAT
4. (leave) → END

##### NODE: TOK_ASK_FLINT

**Toka:** _(unties the striker from his belt, weighs it in his palm, then closes your hand around it)_ "Don't lose it. It's the second-oldest thing on this island after Hala." _(half-grin)_
→ TOK_HANDOVER_FLINT

##### NODE: TOK_HANDOVER_FLINT [side effect: `holds_item_flint=true`, audio: NPC ack line]

**Toka:** "Strike sharp, not hard. The wind on the lighthouse will do half the work."
→ TOK_POST_ITEM

##### NODE: TOK_MAREN_FLINT

**Toka:** "They asked me three times before I gave it. Each time more politely. The third was almost a song." _(quiet laugh)_
→ TOK_RETURN

##### NODE: TOK_WHY_LIKE_THAT

**Toka:** _(looks past you, toward the lighthouse)_ "Because Hala will not have another easy week, that's why. Light it anyway. We owed Maren their leaving and we owe you yours."
→ TOK_RETURN

#### Phase C — Post-item

##### NODE: TOK_POST_ITEM [trigger: re-approach, `holds_item_flint=true`]

**Toka:** "Lighthouse's south. The path forks at the shrine — Hala will be there, she's _always_ there. Walk past her if she lets you. She probably won't."
→ END

---

### 4.4 Pemi — the child (colour, no item)

**Routine context:** roams freely; tends to follow the player when nearby. Hangs around Naro's stall mid-morning and the well at midday.

Pemi has _no item-gating role_ — they're cosy texture and a soft progression hint. Their tree is small.

#### Phase A — Pre-hut

##### NODE: PEM_INITIAL [trigger: first proximity, `met_pemi=false`]

**Pemi:** _(skips up, holds out a small smooth pebble)_ "For you! Maren gave me a stone like this once."

**Player options:**

1. _Take the pebble._ → PEM_PEBBLE
2. "Who's Maren?" → PEM_WHO_MAREN
3. (leave) → END

##### NODE: PEM_PEBBLE

**Pemi:** _(beams, pockets hands)_ "Now you have a stone. Maren had a _book_. It's still in their house on the cliff. _I've seen it._"
→ END _(sets `met_pemi=true`, hint logged: hut_west, hut_has_journal)_

##### NODE: PEM_WHO_MAREN

**Pemi:** "Before. The other one. They went home on a boat. Hala says they sent us a _letter_. We read it on the same day every year." _(twirls)_
→ PEM_PEBBLE

#### Phase B — Post-hut

##### NODE: PEM_RETURN [trigger: re-approach, `has_visited_hut=true`]

**Pemi:** _(falls into step beside you)_ "Did you read it? The book?"

**Player options:**

1. "Yes." → PEM_KNEW_IT
2. "Some of it." → PEM_SOME
3. "Will you read it with me?" → PEM_WITH_ME
4. (leave) → END

##### NODE: PEM_KNEW_IT

**Pemi:** "I knew you would. Hala says the sea brings people who are _meant to find_ the book." _(skips ahead, then back)_
→ PEM_RETURN

##### NODE: PEM_SOME

**Pemi:** "That's already more than the bird who lives in there reads." _(grin)_
→ PEM_RETURN

##### NODE: PEM_WITH_ME

**Pemi:** _(suddenly serious)_ "I can't read all the words. I'm only seven winters." _(tugs your sleeve)_ "But you can ask Hala. She knew them best."
→ PEM_RETURN _(hint logged: ask_hala)_

#### Phase C — none

Pemi has no post-item phase. They're always available with the same Phase B menu.

---

### 4.5 Hala — the shrine woman (climax NPC)

**Routine context:** static at the driftwood shrine on the path to the lighthouse 24/7 (in-game). She's how the player physically passes from village → lighthouse.

Hala has _four phases_. Phases A and B are tiny (gating + atmosphere); Phase D is the climax tree and is by far the largest. Phase C is the brief encounter while the player still needs items.

#### Phase A — Pre-hut

##### NODE: HAL_INITIAL [trigger: first proximity, `met_hala=false`]

**Hala:** _(seated by the shrine, eyes closed, lips moving without sound; opens her eyes when you stop)_ "Not yet."

**Player options:**

1. "Not yet what?" → HAL_NOT_YET
2. _Bow and leave._ → END
3. (leave) → END

##### NODE: HAL_NOT_YET

**Hala:** "Not yet your turn to talk to me. Walk west first. Read what was left for you. Then ask the three for what you need." _(closes her eyes again)_
→ END _(sets `met_hala=true`, hint logged: hut_west, ask_three)_

#### Phase B — Post-hut, no items

##### NODE: HAL_POST_HUT [trigger: re-approach, `has_visited_hut=true`, no items collected]

**Hala:** _(without opening her eyes)_ "You read it. Now go. Bring fire to the lighthouse. Then I will speak."
→ END

#### Phase C — Some items, not all

##### NODE: HAL_SOME_ITEMS [trigger: re-approach, ≥1 item, `beacon_lit=false`]

**Hala:** _(slight smile, eyes still closed)_ "Almost. Bring me a lit fire, not three things in your arms."
→ END

#### Phase D — Climax tree

The beacon is lit. Hala has stood. She crosses to meet the player at the lighthouse.

> **For the engine team:** every node below is also valid as a Mode C _fallback line_ — if Gemini Live is >3s on a given turn, swap in the deterministic line for that node. The 11 nodes give a fallback pool that covers the entire climax including both endings, satisfying REQUIREMENTS.md §8's open question on pool size. Nodes flagged **[stock-line]** are the highest-value to pre-render at build-time because they appear on the deterministic demo seed path.

##### NODE: HAL_BEACON_OPEN [trigger: `beacon_lit=true`, first arrival] [stock-line]

**Hala:** _(stands at the edge of the firelight; the beacon throws long shadows on the cliff)_ "There. The same fire. The same air. Twenty winters and the same wind."

**Player options:**

1. "You knew Maren." → HAL_KNEW_MAREN
2. "Did Maren make it home?" → HAL_DID_MAREN
3. "Why are you crying?" → HAL_WHY_CRYING
4. (silent, wait) → HAL_WAIT

##### NODE: HAL_KNEW_MAREN [stock-line]

**Hala:** "Knew. We sat together every dusk for nineteen years. They learned our words. I never learned theirs — not really. We didn't need to." _(she meets your eyes for the first time)_

**Player options:**

1. "Tell me what happened at the end." → HAL_END_STORY
2. "Do you still hear from them?" → HAL_LETTER
3. "Were you in love?" → HAL_LOVE

##### NODE: HAL_DID_MAREN [stock-line]

**Hala:** "Yes. The boat saw the fire that night. They went up the rope ladder and turned once at the top to look back. And then the ship went on." _(beat)_ "A year later, the wind brought a folded paper in a fishing net."
→ HAL_LETTER

##### NODE: HAL_WHY_CRYING [stock-line]

**Hala:** "Because the fire reminds me. Because _you_ remind me. Because I always thought there'd only be one." _(she touches the shrine's worn wood)_
→ HAL_BEACON_OPEN _(loop; player can ask another)_

##### NODE: HAL_WAIT

**Hala:** _(after a long quiet)_ "It's all right. There's no rush now. The boat that comes for you won't come until first light."
→ HAL_BEACON_OPEN

##### NODE: HAL_END_STORY [stock-line]

**Hala:** "They woke one morning and said _it's time, isn't it._ I said yes, because it was. We lit the beacon at this same lighthouse. The boat came at dawn. They left me a smooth river-stone and a name they'd written down — _yours and mine on the same page_ — and they went."

**Player options:**

1. "Was it the right choice?" → HAL_RIGHT_CHOICE
2. "Did they want to stay?" → HAL_WANTED_STAY
3. "I think I have to ask the same question." → HAL_QUESTION

##### NODE: HAL_LETTER [stock-line]

**Hala:** "Six lines. They had taught their family our words. They said the bread on their side of the world was the wrong shape. They said the sea was _louder there._" _(small laugh)_ "We read it once a year. The whole village."
→ HAL_END_STORY _(auto-advance after 2s if player doesn't pick)_

##### NODE: HAL_LOVE [stock-line]

**Hala:** _(long beat; she is honest)_ "I don't know what your word for it is. I don't even know if I have one in mine. We were _each other's_. That is what I have."
→ HAL_END_STORY

##### NODE: HAL_RIGHT_CHOICE

**Hala:** "It was the choice they could live with. Both choices are real. Neither is _better_. The wrong one is the one you can't believe in."
→ HAL_QUESTION

##### NODE: HAL_WANTED_STAY

**Hala:** _(tilts her head)_ "Some days. So did I, want them to. They went anyway. They were right to."
→ HAL_QUESTION

##### NODE: HAL_QUESTION [stock-line, *the* climax beat]

**Hala:** _(she takes both your hands)_ "So I ask you, the way I asked them. The boat is coming at first light. **Will you go on it, or will you stay?**"

**Player options:**

1. **"I'll go."** → END_LEAVE
2. **"I'll stay."** → END_STAY
3. "I need a moment." → HAL_MOMENT

##### NODE: HAL_MOMENT

**Hala:** _(nods)_ "Take it. The fire will keep."
→ HAL_QUESTION _(loop until choice)_

#### Endings

##### NODE: END_LEAVE [stock-line, sets `endingChoice="leave"`]

**Hala:** _(she lets go of your hands and steps back)_ "Then go. Take a memory of us with you. We'll read your letter, when it comes."

_Cut to end screen: ship sailing at dawn. Word count, predecessor's name, choice._
→ END

##### NODE: END_STAY [stock-line, sets `endingChoice="stay"`]

**Hala:** _(her face cracks into a smile she didn't expect)_ "Then come. The bread is still warm. There's a stool at the press for you."

_Cut to end screen: village hearth glowing, smoke rising. Word count, predecessor's name, choice._
→ END

---

## 5. Tree summary — node and word counts

| NPC       | Phase A | Phase B | Phase C | Phase D | Total nodes  | Stock-line nodes                     |
| --------- | ------- | ------- | ------- | ------- | ------------ | ------------------------------------ |
| Naro      | 6       | 4       | 1       | —       | 11           | (item ack covered by audio manifest) |
| Lemu      | 4       | 4       | 1       | —       | 9            | —                                    |
| Toka      | 4       | 4       | 1       | —       | 9            | —                                    |
| Pemi      | 3       | 4       | —       | —       | 7            | —                                    |
| Hala      | 2       | 1       | 1       | 13      | 17           | 11                                   |
| **Total** | **19**  | **17**  | **3**   | **13**  | **53 nodes** | **11 stock lines**                   |

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

| English             | Why needed                                | Suggested POS slot   | Notes                                                                                      |
| ------------------- | ----------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------ |
| **wood / firewood** | `holds_item_wood` exchange, "I need wood" | noun (thing)         | Could overload `tool` semantically, but the demo's clarity benefits from a dedicated word. |
| **oil**             | `holds_item_oil` exchange                 | noun (thing)         | As above.                                                                                  |
| **flint / striker** | `holds_item_flint` exchange               | noun (thing)         | As above.                                                                                  |
| **fire / beacon**   | "light a beacon", end-of-story imagery    | noun (thing) or verb | Single word covers fire-as-thing; "beacon" is then a compound.                             |
| **boat / ship**     | "the boat comes at first light"           | noun (thing)         | Used by Lemu, Hala, end screens.                                                           |

That's **5 new lexemes**. Two ways to absorb them without breaking the 50-word target:

1. **Replace 5 of the lower-value entries** (suggest: drop `gift`, `key`, `door`, `water`, `food` — none of these appear in the dialogue trees as required vocabulary; the items are `item` / `tool` / `<plot-word>`). Keeps total at 50.
2. **Bump the target to 55 lexemes** and update the schema's lexicon size constraint (`minItems: 50` → `55`, `maxItems: 50` → `55`).

I (returning to `language` lane after T41) recommend **option 1** because (a) GPT-5.5 Structured Outputs strict mode is more reliable with a fixed-size array, and (b) the dropped words don't earn their slot in the dialogue trees. If `language` lane disagrees, this is the only fork in the doc.

### 7.2 Already covered by the locked lexicon

Spot-check that every common phrase below is composable:

| Tree phrase               | Composable from locked 50? | Notes                                                                                                              |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| "I see you"               | yes                        | `na tana ke`                                                                                                       |
| "I want X"                | yes                        | `na sela <X>` (using `want`)                                                                                       |
| "give X"                  | yes                        | `kowe <X>`                                                                                                         |
| "hut west" / "house west" | partial                    | `house` ✓ ; "west" not in lexicon — overload as `far` + path direction visual cue                                  |
| "boat comes"              | needs `boat` (added above) | `<boat> kapi` (using `come`)                                                                                       |
| "leave or stay"           | partial                    | `go` ✓ ; "stay" not in lexicon — overload as `not go` (`no kapi`) or `here have` (`pomu nira`); `language` to pick |

Two overloads needed: **west → far** (with visual signage carrying the direction), and **stay → "here-have" or "not-go"** (`language`'s call). Both cleanly expressible with locked vocab.

### 7.3 Action item back to me

When I rotate back to `language` (probably T11 Saturday morning), I'll:

- update `research/language-generation.md` §5 with the 5-word swap,
- update §10's GPT-5.5 prompt accordingly,
- regenerate `lexicon.fallback.json` with the swap so the demo-day fallback covers the dialogue trees,
- log a new decisions-log row in PLAN.md.

Tracking this as a follow-up; not part of T41's scope.

## 8. Runtime presentation — all-foreign rendering + diary

> **Locked 2026-05-09 (supersedes the earlier "BG3 → composition UI" migration sketch).** The conversation layer is fully immersive. The English copy in §4 is an *authoring* convenience; runtime renders every NPC line and every player-option label in the generated foreign language. The player's only translation surface is a diary they fill in themselves; the game never confirms or corrects a guess. Companion contract: `game-flow.md` §7.

### 8.1 Authoring rules this imposes on §4

These rules apply to every node added or edited in §4:

1. **No bracketed `[stage actions]` in player options.** Player gestures (waving, smiling, leaving) are handled by the player sprite, not by a menu pick. Each player option must be an utterance composable from the lexicon. The current §4 contains a number of legacy `[Wave]`, `[Smile]`, `[Take the bread, eat]`, `[Bow and leave]`, `(silent, wait)` options — these need a follow-up scrubbing pass to become utterances or be removed. Tracked in §10 as a deferred cleanup.
2. **NPC stage directions stay.** `*(she sets down a tray of small loaves; flour on her apron)*` is fine — it describes NPC sprite animation and never reaches the player as text. Continue authoring them in italics.
3. **Predecessor / NPC names use template tokens.** Replace baked-in placeholders (e.g. "Maren") with `{{predecessorName}}` and proper-name slots like `{{npcName_<sprite_key>}}`. The language module substitutes at runtime. Names appear in the diary as foreign tokens like any other word.
4. **Player options must be composable from the locked lexicon.** §7's coverage analysis applies to *both* NPC lines and player options; if a player option needs vocabulary the lexicon doesn't contain, either pick different copy or escalate to §7.1's required additions.
5. **First-NPC bootstrap budget.** The child NPC's Phase A tree (§4.4) must use no more than ~3 distinct lexemes (HI / ME / YOU). This is the player's ramp; everything else hangs on it. The prologue (§4.0) does the role-and-mechanic onboarding; the child's tree does the *vocabulary* onboarding.
6. **Every player option needs a `{react: <animKey>}` annotation.** When the player picks an option, the NPC sprite plays the named animation BEFORE the next dialogue node renders. Different animations are how the player learns which option meant what when next-node text alone isn't enough. Pick from the enum in §1.1; add new animKeys to that enum (don't invent in-line). Convention: `nod` for accepted/understood, `puzzle` for off-target/odd, `laugh` for warm-but-bemused, `frown` for disliked, `wave` for goodbye/parting, `point` when directing the player. `none` is allowed but should be rare.
7. **Echo-heuristic guard on the child's tree.** Beyond the very first NPC turn, the child's player-option set may NOT contain a token that exactly matches the most-recent NPC line (i.e. the player cannot pick simply by echoing). The first turn is allowed to use this affordance to bootstrap; from turn 2 onward the player must infer from sprite, context, and prior glosses — not from string-matching. Without this guard, the player learns "matching = correct" and the heuristic breaks the moment a real conversation arrives.

### 8.2 What renders, where, in what language

| Surface                     | Language at runtime    | Notes                                                                      |
| --------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| NPC line                    | foreign tokens         | The translation of §4's English copy via the language module               |
| NPC stage direction         | (not displayed)        | Drives sprite animation only; never appears in the dialogue panel          |
| Player option label         | foreign tokens         | Translation of §4's option text                                            |
| Hover popover over a token  | player's diary guess   | The player's own free-text guess for that surface form, or `—` if no guess |
| Speaker name above the line | foreign (NPC name)     | Substituted from `{{npcName_<sprite_key>}}`                                |
| End-screen ending text      | English (out of scene) | Ending screen is the only English-rendered surface                         |

### 8.3 Diary contract

- **Auto-population.** Every token the player has *seen* — from an NPC line OR a player-option button — is added to the diary on first appearance, source-tagged (`heard from <sprite_key>` / `seen as option`).
- **Mid-conversation editing.** Hover a foreign token in the dialogue panel → inline popover lets the player add or edit a guess without leaving the conversation. Conversation pauses while the popover is open.
- **No confirmation, ever.** The game never marks a guess right or wrong. Confirmation is implicit — if "I want wood" works (the NPC hands you wood) the player's gloss for those tokens is implicitly validated by the world's behaviour, not by a UI badge.
- **Demo ships analytical mode only.** Each surface form is its own diary entry. No stem/suffix splitting. Hard mode (player splits stems via a diary editor) is v2.

### 8.4 Implications for Mode C (live climax voice)

Hala's Phase D was previously sized as a **pre-rendered fallback pool** of 11 stock lines (§6) for when Gemini Live is >3s. That sizing stands. The all-foreign render rule applies to live and fallback alike: whatever Gemini Live returns is treated as English copy, then sent through the language module before display, and its tokens enter the diary on first appearance just like any other line. The player has no privileged English access to the climax conversation.

## 9. Open questions

1. **Pemi's role for the Voice Agent track.** Pemi is the only NPC without an item or climax role. Is there a case for moving the _secondary_ live-voice budget to Pemi (a child voice is unique and would showcase Gemini's voice-style range)? Currently no — the demo budget says single live agent only — but flagging.
2. **Branch repetition cost.** If the player loops through Naro's Phase B multiple times, hearing the same stock lines, do we tag a "boredom variant" (one alternative line per repeat)? Cheap to author; flagged as Group B.
3. **Western direction signage.** With "west" overloaded as visual cue, the engine team must place a clear signpost / footprints / path-marker on the village → hut transition. Coordinate with `engine` (Enterprise).
4. **Demo-seed determinism on Hala's tree.** The demo path through Hala's Phase D is fixed (`OPEN → KNEW_MAREN → END_STORY → QUESTION → END_LEAVE`). Should we hard-disable the alternative branches on the demo seed to guarantee timing, or trust the demoer? Recommend: hide `END_STAY` on demo seed; show all branches on re-rolls.
5. **Predecessor's name token.** The string "Maren" appears in 7 lines across the trees. When `language` lane assigns the procedural predecessor name, those lines must template-substitute. Recommend a `{{predecessorName}}` token convention in the engine's dialogue loader.

## 10. What this doc does NOT cover (deferred)

- **Telopa translations** — `language` lane (me, when I rotate back) once T11 has produced `lexicon.json`.
- **Voice IDs / voice-line manifest entries** — `voice` (Warspite/Impero) builds these from §6's stock-line list.
- **Climax NPC system prompt for Gemini Live** — `orchestrator` (Alsace) per REQUIREMENTS.md §8 by 12:00; this doc's stock lines are her input.
- **Sprite assignment + held-object variants** — `genmedia` lane; cast table (§2) gives the sprite keys.
- **Sound effects / Lyria cue points** — `genmedia`; Hala's Phase D is the natural music-warm anchor.
- **§4 player-option scrubbing pass.** Per §8.1 rule 1, every `[Wave]` / `[Smile]` / `[Take the bread, eat]` / `[Bow and leave]` / `(silent, wait)` option in §4 must become an utterance composable from the lexicon, or be removed and routed to a sprite gesture. Track as a separate authoring pass; not in this revision.
- **Predecessor-name template substitution.** Per §8.1 rule 3 + §9 Q5, replace literal "Maren" occurrences in §4 with `{{predecessorName}}`. Mechanical sweep; tracked for the same authoring pass as the bracketed-action scrub.
- **`{react: <animKey>}` annotation sweep.** Per §8.1 rule 6, every player option in §4 needs a reaction annotation. None do today. Annotate during the same authoring pass; pick from the §1.1 enum and extend the enum where the existing keys don't fit.
- **Echo-heuristic audit on §4.4 (child).** Per §8.1 rule 7, audit the child's tree for any post-turn-1 option that string-matches the NPC's most-recent line; rewrite to require inference instead.

## Sources

- `research/narrative-design.md` — Revision 2, the brief.
- `research/npc-routines-and-comms.md` — Blücher's NPC count, sample spec, earshot model.
- `research/language-generation.md` — locked 50-word lexicon and GPT-5.5 prompt.
- `REQUIREMENTS.md` — §2 (8-beat loop), §5 (data contracts), §6 (acceptance), §8 (open Q on Mode C pool).
- _Baldur's Gate 3_ (Larian, 2023) — branch-graph reference for player options as full lines.
- _Disco Elysium_ (ZA/UM, 2019) — reference for letting "wrong" picks be colour, never fail.
- _Outer Wilds: Echoes of the Eye_ (Mobius, 2021) — reference for the tender, leave/stay-shaped climax tone.
