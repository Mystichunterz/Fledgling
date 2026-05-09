# Dialogue tree — manual frame parses

**Status:** Worked example, 2026-05-09.
**Companion to:** `agents/language-integration.md`. This doc grounds that doc's design proposals against the real authored dialogue. Every node in `src/sim/dialogueTrees.ts` is parsed by hand below; gaps and surprises are aggregated in §7.

**Purpose:** Validate the proposed frame inventory by attempting a frame parse for every NPC line and every player choice in the existing trees. Where a clean parse is impossible, I record the closest representable form and flag the gap.

---

## 1. Conventions

**Frame literals — terse form**:

```
PRED(role:filler, role:filler, ...) [mood, tense, flags]
```

- Mood defaults to `declarative`; `imp` = imperative.
- Tense defaults to `present`; `past`, `future` written explicitly.
- Flags: `neg` = negated, `Qpolar` = polar yes/no question (proposed; see §7.1).
- Pronoun fillers: `self`, `listener`, `reference`, `unknown` (the "?" wh-pronoun).
- EntityRef fillers: bare concept ID (`WOOD`, `PREDECESSOR`).
- Nested frame: `nest{ PRED(...) }`.

**Per-node layout**:

```
NODE_ID  [stage: cue]
  → <NPC frame>                            ← what the NPC says
  + <NPC frame>                            ← additional utterance (multi-frame node)
  ? id "english label" → next_node  [+effect, +effect]
    <player frame>                          ← what the choice utterance encodes
```

**Effect notation**: `+give:wood`, `+flag:has_visited_hut`, `+ending:leave`, `+anim:wave[player|npc]`, `+set:met_<npc>`.

**Lossy markers**: `~lossy` on a frame means the parse loses meaningful English content; `~gap` means no representable form exists and the parse is a degraded substitute.

---

## 2. Quick reference — frames & lexicon assumed below

Frames (existing + proposed in `language-integration.md`):

```
existing: GIVE TAKE MOVE WANT BE_AT HAVE SEE SAY MAKE EAT
proposed: GREET THANK AFFIRM DENY DECIDE KNOW
```

Lexicon (existing + additions surfaced by this exercise):

```
ITEMS:     FLINT STICK LIGHTER BREAD WATER
           + WOOD OIL FRUIT
           + PEBBLE JOURNAL LETTER FIRE             ← surfaced by parses
LOCATIONS: FOREST CAVE FORGE MEADOW
           + BEACH VILLAGE HUT LIGHTHOUSE SHRINE
           + HOME                                    ← surfaced by parses
ANIMATES:  SMITH WOODSMAN
           + PREDECESSOR BAKER FARMER GUARD CHILD SHRINE_KEEPER
ABSTRACTS: LEAVING STAYING                          ← all new (RoleType existed; no entries used it)
```

---

## 3. NARO — baker, gives WOOD

### NAR_INITIAL  [stage: set_down_loaves]

> "Oh — one of you again."

```
→ GREET(greeter:self, addressee:listener)               ~lossy (weariness lost)
? q     "...?"                  → NAR_AGAIN
        SAY(speaker:listener, recipient:self, content:unknown)
? wave  [Wave]                  → NAR_WAVE              [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
? point [Point to the loaves]   → NAR_BREAD             [+anim:point[player]]
        WANT(wanter:self, desired:BREAD)                ~lossy (deixis → desire)
? leave [Leave]                 → null                  [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)         (farewell — same frame, sprite distinguishes)
```

### NAR_AGAIN

> "It's nothing. The sea brings who it brings. Are you hungry? [she offers a small loaf]"

The English carries (a) reassurance, (b) a polar question, and (c) a gestural offer. Polar Q is a gap (§7.1). Best representable surface = the offer:

```
→ GIVE(agent:self, recipient:listener, theme:BREAD)     ~lossy ("are you hungry?" lost; offer carries it)
? take    [Take the bread, eat]    → NAR_GIFT_BREAD    [+anim:take[player], +anim:eat[player]]
        TAKE(agent:self, theme:BREAD)
? decline [Decline politely]       → NAR_DECLINE       [+anim:bow[player]]
        DENY(disagreer:self, proposition:nest{ GIVE(agent:listener, recipient:self, theme:BREAD) })
? leave   [Leave]                  → null              [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### NAR_WAVE  [stage: wave]

> "[she waves back, smiling] You don't talk much yet. That's all right."

Property predication ("you don't talk much") doesn't fit any frame; the second sentence is reassurance:

```
→ GREET(greeter:self, addressee:listener)
+ AFFIRM(agreer:self, proposition:reference)            ~lossy ("you don't talk much" dropped)
? continue "..." → NAR_AGAIN
        AFFIRM(agreer:self, proposition:reference)
```

### NAR_BREAD  [stage: laugh]

> "Yes, bread. Take one. We always have extra."

```
→ AFFIRM(agreer:self, proposition:nest{ WANT(wanter:listener, desired:BREAD) })
+ TAKE(agent:listener, theme:BREAD) [imp]
? continue "..." → NAR_GIFT_BREAD
        AFFIRM(agreer:self, proposition:reference)
```

### NAR_GIFT_BREAD  [stage: watch_eat]

> "Mm. Maren — that one — they liked the salted ones. You'll find their hut on the cliff path, west."

```
→ GIVE(agent:self, recipient:listener, theme:BREAD)
+ BE_AT(figure:HUT, ground:reference)                   ~lossy ("west on the cliff path" → reference deictic)
? leave [Take your leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### NAR_DECLINE

> "All right. The offer stands. [she points west with her chin] Walk that way some time."

```
→ AFFIRM(agreer:self, proposition:reference)
+ MOVE(agent:listener, destination:HUT) [imp]
? leave [Take your leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### NAR_RETURN  [stage: stack_firewood]

> "You found Maren's place, then. Your face says you did."

```
→ AFFIRM(agreer:self, proposition:nest{ MOVE(agent:listener, destination:HUT, tense:past) })
                                                        ~lossy ("your face says" inference dropped)
? wood  '"I need to light a beacon. Can you spare some wood?"'
        → NAR_ASK_WOOD
        GIVE(agent:listener, recipient:self, theme:WOOD) [imp]
? maren '"Tell me about Maren."'
        → NAR_ABOUT_MAREN
        SAY(speaker:listener, recipient:self, content:PREDECESSOR) [imp]
        # SAY.content currently typed ITEM|EVENT — needs ANIMATE added.
? stay  '"Did Maren leave or stay?"'
        → NAR_LEAVE_OR_STAY
        DECIDE(decider:PREDECESSOR, choice:unknown, tense:past)
        # Wh-form of polar A-or-B question — closest representable.
? leave [Leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### NAR_ASK_WOOD  [stage: pull_logs]

> "For the headland fire? Of course. Maren took some too, in the end. [she pulls a bundle of seasoned logs and places it in your arms]"

The "for the headland fire?" is a clarifying polar Q; "Maren took some" is a past reminiscence. Core act = handover:

```
→ GIVE(agent:self, recipient:listener, theme:WOOD)
+ TAKE(agent:PREDECESSOR, theme:WOOD) [past]            ~lossy ("in the end" lost)
? continue "..." → NAR_HANDOVER_WOOD
        AFFIRM(agreer:self, proposition:reference)
```

### NAR_HANDOVER_WOOD  [stage: pat_shoulder]

> "Mind your steps. The path bends near the bramble."

```
→ MOVE(agent:listener, destination:LIGHTHOUSE) [imp]    ~lossy (caution flavor lost)
? continue "..." → NAR_POST_ITEM   [+give:wood, +flag:holds_item_wood]
        AFFIRM(agreer:self, proposition:reference)
```

> **Effect placement note:** I'm putting `+give:wood` on the choice that *exits* HANDOVER (i.e. the player commits to leaving with the wood). Alternative: place on the entering choice (`NAR_RETURN.wood`). Either works; consistency matters more than which one. Recommend exit-side because it lets the dialogue retract gracefully if the player backs out somehow.

### NAR_ABOUT_MAREN

> "They were quieter than you. Sat at this counter for a year before they could ask for bread without pointing. We sang to teach them words — daft songs, mostly about the weather."

Pure reminiscence; comparative + temporal-extent prose. Strip to the closest single act:

```
→ SAY(speaker:self, recipient:listener,
       content:nest{ WANT(wanter:reference[PREDECESSOR], desired:BREAD, tense:past) })
                                                        ~lossy (90% of flavor)
? continue "..." → NAR_RETURN
        AFFIRM(agreer:self, proposition:reference)
```

### NAR_LEAVE_OR_STAY

> "Hala was the one they told. Go ask her, by the shrine on the headland path. I'll have wood ready when you come back."

```
→ BE_AT(figure:SHRINE_KEEPER, ground:SHRINE)
+ GIVE(agent:self, recipient:listener, theme:WOOD, tense:future)
? continue "..." → NAR_RETURN
        AFFIRM(agreer:self, proposition:reference)
```

### NAR_POST_ITEM  [stage: dust_hands]

> "The farmer has oil pressed for the lamps. The guard keeps a striker. Go in any order — they'll know what you mean."

```
→ HAVE(owner:FARMER, theme:OIL)
+ HAVE(owner:GUARD, theme:FLINT)
+ MOVE(agent:listener, destination:VILLAGE) [imp]       ~lossy ("in any order" lost)
? leave [Take your leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

---

## 4. LEMU — farmer, gives OIL

### LEM_INITIAL  [stage: lean_on_press]

> "Plane brought you. Loud thing."

`PLANE` isn't a current concept. We can elide it (the *event* of arriving is what matters):

```
→ SEE(viewer:self, target:nest{ MOVE(agent:listener, destination:BEACH, tense:past) })
   [tense:past]                                         ~lossy ("loud thing" lost)
? saw  '"You saw it?"'                → LEM_SAW_PLANE
        SEE(viewer:listener, target:reference, tense:past) [Qpolar]
        # Polar Q gap. Without Qpolar, degrade to:
        #   SEE(viewer:listener, target:unknown, tense:past)  ("what did you see?")
? mime [Mime "yes, my plane"]         → LEM_SAW_PLANE   [+anim:point[player]]
        AFFIRM(agreer:self, proposition:reference)
? sea  [Look toward the sea with her] → LEM_SEA         [+anim:gaze[player]]
        SEE(viewer:self, target:BEACH)                  ~lossy ("sea" → BEACH)
? leave [Leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### LEM_SAW_PLANE

> "Heard it. Like the last one — twenty winters. I knew before I looked."

```
→ SEE(viewer:self, target:reference, tense:past)
+ KNOW(knower:self, object:reference, tense:past)        # promotes KNOW from optional
? continue "..." → LEM_OFFER
        AFFIRM(agreer:self, proposition:reference)
```

### LEM_SEA

> "Boats come every two months. The next one will see your fire if you light it. Oil's for fire."

Conditional ("if you light it") doesn't have a clean frame. Strip to the imperative core:

```
→ MAKE(agent:listener, patient:FIRE, source:OIL) [imp]   ~lossy (whole conditional lost)
? continue "..." → LEM_OFFER
        AFFIRM(agreer:self, proposition:reference)
```

### LEM_OFFER  [stage: gesture_west]

> "Walk west when you're ready. There's a hut. The other one left their book there — pages and all. Read it before you ask me anything."

```
→ MOVE(agent:listener, destination:HUT) [imp]
+ BE_AT(figure:JOURNAL, ground:HUT)
+ SEE(viewer:listener, target:JOURNAL) [imp]
? leave [Take your leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### LEM_RETURN

> "So you read it. Then you know what to ask."

```
→ AFFIRM(agreer:self, proposition:nest{ SEE(viewer:listener, target:JOURNAL, tense:past) })
+ KNOW(knower:listener, object:reference)
? oil   '"I need oil for the beacon."'         → LEM_ASK_OIL
        GIVE(agent:listener, recipient:self, theme:OIL) [imp]
? press '"Did Maren press oil with you?"'      → LEM_MAREN_PRESS
        MAKE(agent:PREDECESSOR, patient:OIL, source:unknown, tense:past)
        # Polar Q + co-agency ("with you") both gaps; degrade to wh.
? end   '"What was Maren like, near the end?"' → LEM_MAREN_END
        SEE(viewer:self, target:PREDECESSOR, tense:past)
        # Property predication ("what was X like") not representable.
? leave [Leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### LEM_ASK_OIL  [stage: fill_flask]

> "Three measures. Enough to start any fire and keep it through a wet wind."

```
→ GIVE(agent:self, recipient:listener, theme:OIL)       ~lossy (quantity / use lost)
? continue "..." → LEM_HANDOVER_OIL
        AFFIRM(agreer:self, proposition:reference)
```

### LEM_HANDOVER_OIL

> "Don't drop it. The cliff's slick after the morning fog."

```
→ MOVE(agent:listener, destination:LIGHTHOUSE) [imp]    ~lossy (caution lost)
? continue "..." → LEM_POST_ITEM   [+give:oil, +flag:holds_item_oil]
        AFFIRM(agreer:self, proposition:reference)
```

### LEM_MAREN_PRESS

> "Every press-day for years. They had a hand for the wheel. Could keep the rhythm without watching, which is rare."

Pure reminiscence; closest:

```
→ MAKE(agent:PREDECESSOR, patient:OIL, source:FRUIT, tense:past)   ~lossy (90%)
? continue "..." → LEM_RETURN
        AFFIRM(agreer:self, proposition:reference)
```

### LEM_MAREN_END

> "Hala will tell you. I held them at the press for the goodbye, but the words belong to her."

```
→ SAY(speaker:SHRINE_KEEPER, recipient:listener, content:reference, tense:future)
+ BE_AT(figure:SHRINE_KEEPER, ground:SHRINE)
? continue "..." → LEM_RETURN
        AFFIRM(agreer:self, proposition:reference)
```

### LEM_POST_ITEM

> "If you're missing flint, Toka has one on his belt. He'll fuss before he hands it over."

```
→ HAVE(owner:GUARD, theme:FLINT)
? leave [Take your leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

---

## 5. TOKA — guard, gives FLINT

### TOK_INITIAL  [stage: hand_on_staff]

> "Stop there. Hands open."

"Stop" and "hands open" are both imperative gestures with no clean frame. The *function* is establishing alertness/inspection:

```
→ GREET(greeter:self, addressee:listener)               ~lossy (challenge tone via stage only)
+ SEE(viewer:self, target:listener) [imp]               ("let me see you")
? hands [Show empty hands] → TOK_HANDS_OPEN   [+anim:show_hands[player]]
        HAVE(owner:self, theme:reference) [neg]         ~gap (HAVE.theme required, "nothing" not in lex)
                                                        # Workaround OK: render as negation alone.
? mime  [Mime "I crashed"]  → TOK_CRASHED      [+anim:point[player]]
        MOVE(agent:self, destination:BEACH, tense:past)
? leave [Leave]             → null              [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### TOK_HANDS_OPEN  [stage: tap_striker]

> "All right. You're the new wreck. Stay out of my way until I see what you are. [taps the striker on his belt — a small dark stone]"

```
→ AFFIRM(agreer:self, proposition:reference)
+ HAVE(owner:self, theme:FLINT)                          (the striker reveal — not a give)
? continue "..." → TOK_HINT
        AFFIRM(agreer:self, proposition:reference)
```

### TOK_CRASHED

> "Like the last one. Walk west, find their hut. Read what they wrote. Then come back and we can talk."

```
→ AFFIRM(agreer:self, proposition:reference)
+ MOVE(agent:listener, destination:HUT) [imp]
+ SEE(viewer:listener, target:JOURNAL) [imp]
? leave [Take your leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### TOK_HINT

> "There's a hut west. Belonged to Maren. They left a book in their own hand. Look at it before you ask me anything useful."

```
→ HAVE(owner:PREDECESSOR, theme:HUT, tense:past)
+ HAVE(owner:PREDECESSOR, theme:JOURNAL, tense:past)
+ SEE(viewer:listener, target:JOURNAL) [imp]
? leave [Take your leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### TOK_RETURN  [stage: stand]

> "Right. So you're going through with it."

```
→ AFFIRM(agreer:self, proposition:nest{ DECIDE(decider:listener, choice:LEAVING) })
                                                        ~lossy ("through with it" → DECIDE-LEAVING approx)
? flint '"I need a flint."'                  → TOK_ASK_FLINT
        GIVE(agent:listener, recipient:self, theme:FLINT) [imp]
? maren '"Did Maren ask you for one too?"'   → TOK_MAREN_FLINT
        GIVE(agent:GUARD, recipient:PREDECESSOR, theme:FLINT, tense:past) [Qpolar]
        # Polar Q gap. Degrade: GIVE(...recipient:PREDECESSOR, theme:unknown, past).
? why   '"Why do you say it like that?"'     → TOK_WHY_LIKE_THAT
        SAY(speaker:listener, recipient:self, content:unknown)
        # Manner/causal Q ("why") not representable; wh-content is closest.
? leave [Leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### TOK_ASK_FLINT  [stage: weigh_in_palm]

> "Don't lose it. It's the second-oldest thing on this island after Hala."

```
→ GIVE(agent:self, recipient:listener, theme:FLINT)     ~lossy (joke about Hala lost)
? continue "..." → TOK_HANDOVER_FLINT
        AFFIRM(agreer:self, proposition:reference)
```

### TOK_HANDOVER_FLINT

> "Strike sharp, not hard. The wind on the headland will do half the work."

```
→ MAKE(agent:listener, patient:FIRE, source:FLINT) [imp]
? continue "..." → TOK_POST_ITEM   [+give:flint, +flag:holds_item_flint]
        AFFIRM(agreer:self, proposition:reference)
```

### TOK_MAREN_FLINT

> "They asked me three times before I gave it. Each time more politely. The third was almost a song."

```
→ GIVE(agent:PREDECESSOR, recipient:GUARD, theme:FLINT, tense:past)   ~lossy (politeness arc lost)
? continue "..." → TOK_RETURN
        AFFIRM(agreer:self, proposition:reference)
```

### TOK_WHY_LIKE_THAT

> "Because Hala will not have another easy week, that's why. Light it anyway. We owed Maren their leaving and we owe you yours."

```
→ MAKE(agent:listener, patient:FIRE, source:reference) [imp]
                                                        ~lossy (whole emotional debt frame lost)
? continue "..." → TOK_RETURN
        AFFIRM(agreer:self, proposition:reference)
```

### TOK_POST_ITEM

> "Headland's south. The path forks at the shrine — Hala will be there, she's always there. Walk past her if she lets you."

```
→ BE_AT(figure:LIGHTHOUSE, ground:reference)
+ BE_AT(figure:SHRINE_KEEPER, ground:SHRINE)
+ MOVE(agent:listener, destination:LIGHTHOUSE) [imp]
? leave [Take your leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

---

## 6. PEMI — child, no quest item (color)

### PEM_INITIAL  [stage: skip_up]

> "For you! Maren gave me a stone like this once."

```
→ GIVE(agent:self, recipient:listener, theme:PEBBLE)
+ GIVE(agent:PREDECESSOR, recipient:self, theme:PEBBLE, tense:past)
? take [Take the pebble] → PEM_PEBBLE   [+anim:take[player]]
        TAKE(agent:self, theme:PEBBLE)
? who  '"Who\'s Maren?"'   → PEM_WHO_MAREN
        BE_AT(figure:PREDECESSOR, ground:unknown)        ~gap (identity-Q → location-Q)
        # "who is X?" not representable; closest is "where is X?"
? leave [Leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### PEM_PEBBLE  [stage: pocket_hands]

> "Now you have a stone. Maren had a book. It's still in their house on the cliff."

```
→ HAVE(owner:listener, theme:PEBBLE)
+ HAVE(owner:PREDECESSOR, theme:JOURNAL, tense:past)
+ BE_AT(figure:JOURNAL, ground:HUT)
? leave [Take your leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### PEM_WHO_MAREN

> "Before. The other one. They went home on a boat. Hala says they sent us a letter. We read it on the same day every year."

```
→ MOVE(agent:PREDECESSOR, destination:HOME, tense:past)
+ SAY(speaker:SHRINE_KEEPER, recipient:reference,
       content:nest{ GIVE(agent:PREDECESSOR, recipient:self, theme:LETTER, tense:past) })
+ SEE(viewer:self, target:LETTER)                       ~lossy (annual ritual lost)
? continue "..." → PEM_PEBBLE
        AFFIRM(agreer:self, proposition:reference)
```

### PEM_RETURN  [stage: walk_alongside]

> "Did you read it? The book?"

```
→ SEE(viewer:listener, target:JOURNAL, tense:past) [Qpolar]
                                                        # Polar Q gap — degrade to:
                                                        # SEE(viewer:listener, target:unknown, past)
? yes   '"Yes."'                       → PEM_KNEW_IT
        AFFIRM(agreer:self, proposition:reference)
? some  '"Some of it."'                → PEM_SOME
        AFFIRM(agreer:self, proposition:reference)      ~lossy ("some of it" partial reading)
? with  '"Will you read it with me?"'  → PEM_WITH_ME
        SEE(viewer:listener, target:JOURNAL) [imp]      ~lossy (co-agency "with me" dropped)
? leave [Leave] → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### PEM_KNEW_IT  [stage: skip]

> "I knew you would. Hala says the sea brings people who are meant to find the book."

```
→ KNOW(knower:self, object:reference, tense:past)        ~lossy (rest is sea-lore flavor)
? continue "..." → PEM_RETURN
        AFFIRM(agreer:self, proposition:reference)
```

### PEM_SOME  [stage: grin]

> "That's already more than the bird who lives in there reads."

Whimsical comparative; not representable. Strip to validation:

```
→ AFFIRM(agreer:self, proposition:reference)            ~lossy (entire joke lost)
? continue "..." → PEM_RETURN
        AFFIRM(agreer:self, proposition:reference)
```

### PEM_WITH_ME  [stage: tug_sleeve]

> "I can't read all the words. I'm only seven winters. But you can ask Hala. She knew them best."

```
→ SEE(viewer:self, target:JOURNAL) [neg]                 ~lossy (age + best-knowledge lost)
+ SAY(speaker:listener, recipient:SHRINE_KEEPER, content:unknown) [imp]
? continue "..." → PEM_RETURN
        AFFIRM(agreer:self, proposition:reference)
```

---

## 7. HALA — climax NPC, leave/stay decision

### HAL_INITIAL  [stage: close_eyes]

> "Not yet."

Two-word line; "not yet" is *temporal* refusal. Closest = a bare GREET that gets refined by the response routing in HAL_NOT_YET (Phase A's gate is a flag check, not a frame nuance).

```
→ GREET(greeter:self, addressee:listener) [neg]         ~lossy ("yet" temporal not modeled)
? what  '"Not yet what?"'        → HAL_NOT_YET
        SAY(speaker:listener, recipient:self, content:unknown) [imp]
        # "(tell me) what?"
? bow   [Bow and leave]          → null   [+anim:bow[player]]
        GREET(greeter:self, addressee:listener)
? leave [Leave]                  → null   [+anim:wave[player]]
        GREET(greeter:self, addressee:listener)
```

### HAL_NOT_YET

> "Not yet your turn to talk to me. Walk west first. Read what was left for you. Then ask the three for what you need."

```
→ MOVE(agent:listener, destination:HUT) [imp]
+ SEE(viewer:listener, target:JOURNAL) [imp]
+ GIVE(agent:reference, recipient:listener, theme:reference) [imp]
                                                        ~lossy ("the three" dropped — quantifier gap)
? leave [Take your leave] → null   [+anim:bow[player]]
        GREET(greeter:self, addressee:listener)
```

### HAL_POST_HUT

> "You read it. Now go. Bring fire to the headland. Then I will speak."

```
→ AFFIRM(agreer:self, proposition:nest{ SEE(viewer:listener, target:JOURNAL, tense:past) })
+ MOVE(agent:listener, destination:LIGHTHOUSE) [imp]
+ MAKE(agent:listener, patient:FIRE, source:reference) [imp]
+ SAY(speaker:self, recipient:listener, content:reference, tense:future)
? leave [Take your leave] → null   [+anim:bow[player]]
        GREET(greeter:self, addressee:listener)
```

### HAL_SOME_ITEMS

> "Almost. Bring me a lit fire, not three things in your arms."

```
→ AFFIRM(agreer:self, proposition:reference)            ~lossy ("almost" → bare AFFIRM)
+ GIVE(agent:listener, recipient:self, theme:FIRE) [imp]
? leave [Take your leave] → null   [+anim:bow[player]]
        GREET(greeter:self, addressee:listener)
```

### HAL_BEACON_OPEN  [stage: stand_at_firelight]

> "There. The same fire. The same air. Twenty winters and the same wind."

Pure poetry — strip to perceptual present:

```
→ SEE(viewer:self, target:FIRE)                          ~lossy (90%)
? knew   '"You knew Maren."'         → HAL_KNEW_MAREN
        KNOW(knower:listener, object:PREDECESSOR, tense:past)
? home   '"Did Maren make it home?"' → HAL_DID_MAREN
        MOVE(agent:PREDECESSOR, destination:HOME, tense:past) [Qpolar]
        # Polar Q gap. Degrade: destination:unknown
? crying '"Why are you crying?"'     → HAL_WHY_CRYING
        SEE(viewer:self, target:listener)               ~gap (no emotion-state frame)
? wait   [silent, wait]              → HAL_WAIT          [+anim:wait[player]]
        AFFIRM(agreer:self, proposition:reference)
```

### HAL_KNEW_MAREN

> "Knew. We sat together every dusk for nineteen years. They learned our words. I never learned theirs — not really. We didn't need to."

```
→ KNOW(knower:self, object:PREDECESSOR, tense:past)
+ KNOW(knower:PREDECESSOR, object:reference, tense:past)        ("they learned our words")
+ KNOW(knower:self, object:reference, tense:past) [neg]         ("I never learned theirs")
                                                        ~lossy (intimacy/temporal-extent dropped)
? end    '"Tell me what happened at the end."' → HAL_END_STORY
        SAY(speaker:listener, recipient:self, content:unknown) [imp]
? letter '"Do you still hear from them?"'      → HAL_LETTER
        SAY(speaker:PREDECESSOR, recipient:self, content:unknown) [Qpolar]
        # Polar Q gap. Degrade: content:unknown wh-form.
? love   '"Were you in love?"'                 → HAL_LOVE
        WANT(wanter:self, desired:PREDECESSOR, tense:past) [Qpolar]
        # WANT.desired currently ITEM only — needs ANIMATE added (and §7.2 ABSTRACT).
        # Polar Q gap. Degrade: desired:unknown.
```

### HAL_DID_MAREN

> "Yes. The boat saw the fire that night. They went up the rope ladder and turned once at the top to look back. And then the ship went on. A year later, the wind brought a folded paper in a fishing net."

```
→ AFFIRM(agreer:self, proposition:reference)
+ MOVE(agent:PREDECESSOR, destination:HOME, tense:past)
+ GIVE(agent:reference, recipient:self, theme:LETTER, tense:past)
                                                        ~lossy (rope ladder, fishing net imagery lost)
? continue "..." → HAL_LETTER
        AFFIRM(agreer:self, proposition:reference)
```

### HAL_WHY_CRYING  [stage: touch_shrine]

> "Because the fire reminds me. Because you remind me. Because I always thought there'd only be one."

Causal "because" + reminding (a memory-act) = double gap. Closest perceptual:

```
→ SEE(viewer:self, target:FIRE)
+ SEE(viewer:self, target:listener)
+ KNOW(knower:self, object:reference, tense:past) [neg]
                                                        ~gap (causation, reminding, expectation all lost)
? continue "..." → HAL_BEACON_OPEN
        AFFIRM(agreer:self, proposition:reference)
```

### HAL_WAIT

> "It's all right. There's no rush now. The boat that comes for you won't come until first light."

```
→ AFFIRM(agreer:self, proposition:reference)
+ MOVE(agent:reference, destination:BEACH, tense:future)
                                                        ~lossy ("first light" temporal lost)
? continue "..." → HAL_BEACON_OPEN
        AFFIRM(agreer:self, proposition:reference)
```

### HAL_END_STORY

> "They woke one morning and said it's time, isn't it. I said yes, because it was. We lit the beacon at this same headland. The boat came at dawn. They left me a smooth river-stone and a name they'd written down — yours and mine on the same page — and they went."

The densest narrative beat in the game. Eight events; pick the spine:

```
→ SAY(speaker:PREDECESSOR, recipient:self,
       content:nest{ DECIDE(decider:reference, choice:LEAVING) }, tense:past)
+ AFFIRM(agreer:self, proposition:reference, tense:past)
+ MAKE(agent:reference, patient:FIRE, source:reference, tense:past)
+ MOVE(agent:PREDECESSOR, destination:HOME, tense:past)
+ GIVE(agent:PREDECESSOR, recipient:self, theme:PEBBLE, tense:past)
                                                        ~lossy (the *name on a page* moment lost)
? right '"Was it the right choice?"'           → HAL_RIGHT_CHOICE
        DECIDE(decider:PREDECESSOR, choice:unknown, tense:past)
        # Property-predication ("right") not representable. Wh-degrade.
? stay  '"Did they want to stay?"'             → HAL_WANTED_STAY
        WANT(wanter:PREDECESSOR, desired:STAYING, tense:past) [Qpolar]
        # WANT.desired needs ABSTRACT type (proposed in language-integration.md §3.3).
        # Polar Q gap.
? q     '"I think I have to ask the same question."' → HAL_QUESTION
        AFFIRM(agreer:self, proposition:reference)      ~lossy (self-reflection lost)
```

### HAL_LETTER

> "Six lines. They had taught their family our words. They said the bread on their side of the world was the wrong shape. They said the sea was louder there. We read it once a year. The whole village."

```
→ GIVE(agent:PREDECESSOR, recipient:self, theme:LETTER, tense:past)
+ SAY(speaker:PREDECESSOR, recipient:reference, content:reference, tense:past)
+ SEE(viewer:self, target:LETTER)                        ~lossy (annual ritual + bread/sea imagery lost)
? continue "..." → HAL_END_STORY
        AFFIRM(agreer:self, proposition:reference)
```

### HAL_LOVE

> "I don't know what your word for it is. I don't even know if I have one in mine. We were each other's. That is what I have."

The whole turn is meta-linguistic + abstract possession. Close substitutes only:

```
→ KNOW(knower:self, object:reference, tense:present) [neg]
+ HAVE(owner:self, theme:PREDECESSOR, tense:past)        # HAVE.theme typed ITEM — needs ANIMATE
                                                        ~gap (whole register collapses)
? continue "..." → HAL_END_STORY
        AFFIRM(agreer:self, proposition:reference)
```

### HAL_RIGHT_CHOICE

> "It was the choice they could live with. Both choices are real. Neither is better. The wrong one is the one you can't believe in."

Pure ethical reflection — modal + comparative. Strip to commitment:

```
→ DECIDE(decider:PREDECESSOR, choice:reference, tense:past)
                                                        ~lossy (95% of moral content)
? continue "..." → HAL_QUESTION
        AFFIRM(agreer:self, proposition:reference)
```

### HAL_WANTED_STAY

> "Some days. So did I, want them to. They went anyway. They were right to."

```
→ WANT(wanter:PREDECESSOR, desired:STAYING, tense:past)
+ WANT(wanter:self, desired:nest{ DECIDE(decider:PREDECESSOR, choice:STAYING) }, tense:past)
+ MOVE(agent:PREDECESSOR, destination:HOME, tense:past)
                                                        ~lossy ("right to" lost — modal predication)
? continue "..." → HAL_QUESTION
        AFFIRM(agreer:self, proposition:reference)
```

### HAL_QUESTION  [stage: take_hands]

> "So I ask you, the way I asked them. The boat is coming at first light. Will you go on it, or will you stay?"

The actual decision moment:

```
→ MOVE(agent:reference, destination:BEACH, tense:future)
+ DECIDE(decider:listener, choice:unknown, tense:future)
? go     '"I\'ll go."'         → END_LEAVE   [+ending:leave]
        DECIDE(decider:self, choice:LEAVING)
? stay   '"I\'ll stay."'       → END_STAY    [+ending:stay]
        DECIDE(decider:self, choice:STAYING)
? moment '"I need a moment."'  → HAL_MOMENT
        WANT(wanter:self, desired:unknown)               ~lossy ("a moment" → unknown)
```

### HAL_MOMENT

> "Take it. The fire will keep."

```
→ TAKE(agent:listener, theme:reference) [imp]            ~lossy ("the fire will keep" reassurance lost)
? continue "..." → HAL_QUESTION
        AFFIRM(agreer:self, proposition:reference)
```

### END_LEAVE

> "Then go. Take a memory of us with you. We'll read your letter, when it comes."

```
→ MOVE(agent:listener, destination:HOME) [imp]
+ SEE(viewer:self, target:LETTER, tense:future)          ~lossy (memory-as-object collapses)
? leave [End — ship sailing at dawn] → null
        GREET(greeter:self, addressee:listener)         (final farewell)
```

### END_STAY

> "Then come. The bread is still warm. There's a stool at the press for you."

```
→ AFFIRM(agreer:self, proposition:nest{ DECIDE(decider:listener, choice:STAYING) })
+ GIVE(agent:self, recipient:listener, theme:BREAD, tense:future)
                                                        ~lossy (stool/press warmth lost)
? leave [End — village hearth glowing] → null
        GREET(greeter:self, addressee:listener)
```

---

## 8. Aggregated findings

### 8.1 Confirmed gaps from `language-integration.md` §3

After parsing all 50+ nodes, every proposed new frame got real use:

| Frame | NPC nodes that need it | Count |
|---|---|---|
| `GREET` | Every Phase A opener + every `[Leave]` farewell | ~50 |
| `AFFIRM` | Every "..." continuation; "All right"; reassurance beats | ~30 |
| `DENY` | NAR_DECLINE (and probably more once player options expand) | 1 |
| `DECIDE` | HAL_QUESTION endings; HAL_END_STORY narrative; multiple "did Maren stay?" beats | 8 |
| `THANK` | (proposed but **not used** in current trees — see §8.4) | 0 |
| `KNOW` | Hala's whole arc; LEM_SAW_PLANE, LEM_RETURN, PEM_KNEW_IT, more | 12 |

**Recommendation update:** `KNOW` should be **promoted from optional to firm v1**. Every beat with Hala that's about *remembering* falls back to `SEE` past-tense without it, which loses the entire intimacy register. `THANK` is **demoted to optional** — none of the authored handover beats use a thanking utterance; the player just continues with "..." (= `AFFIRM`). Could be added if a v1.1 playtest reveals the absence is jarring.

### 8.2 New gaps surfaced (not in original proposal)

These are the gaps I hit repeatedly while parsing. Listed in order of how often I had to mark `~gap` or `~lossy`:

1. **Polar yes/no questions** — 9 nodes. "Did Maren ask you?", "You saw it?", "Were you in love?", "Are you hungry?", etc. The model has no way to mark a frame as "yes/no question" — questions only ride on `unknown` fillers. **Proposed fix:** add a `polarQuestion?: boolean` flag to `FilledFrame`, parallel to `negated`. Morphology already has the `Q` mood tag (currently triggered by an `unknown` filler); the encoder/gloss would just additionally trigger it when `polarQuestion === true`. Costs ~20 lines across `frames.ts`, `encoder.ts`, `decoder.ts`, `gloss.ts`.

2. **Multi-utterance nodes** — 18 nodes. The current `FrameNode = { ..., frame: FilledFrame }` allows one frame per node. Many authored lines are multiple sentences/speech acts. **Proposed fix:** change to `frames: FilledFrame[]`. Renderer concatenates with sentence boundaries (a punctuation token, or simply a line break in the dialogue panel). Choices stay singular. Costs: type change + small render change.

3. **Property predication** — 8 nodes. "You don't talk much yet", "she's always there", "twenty winters and the same wind", "the bread was the wrong shape", "neither is better". These are `BE` + adjective constructions. No frame fits. **Proposed deferral:** acceptable casualty for v1; the demo loses these completely. If we want them in v1.1, add a `BE` frame: `figure: ANIMATE|ITEM|LOCATION; property: ABSTRACT`.

4. **Causal / manner questions** — 4 nodes. "Why are you crying?", "Why do you say it like that?", "How did they...". **Proposed deferral:** degrade to wh-content questions for v1. A `MANNER` or `CAUSE` frame is a bigger redesign and probably not worth it for the demo.

5. **`SEE.target` and others need ANIMATE / EVENT**. Cases where the listed `types` are too narrow:
   - `SAY.content` — needs `ANIMATE` (for "tell me about Maren"). Also confirmed needs `EVENT` (already there).
   - `WANT.desired` — needs `ABSTRACT` (for "want to stay") and `ANIMATE` (for HAL_LOVE "were you in love").
   - `HAVE.theme` — needs `ANIMATE` (for "we had each other"). Soft.
   - `TAKE.theme` — needs `ABSTRACT` (HAL_MOMENT "take it" referring to time). Marginal.
   These are 1-line edits to `FRAMES` in `frames.ts`.

6. **Co-agency** — "with you", "with me". 3 nodes. No frame slot for a co-agent. **Proposed deferral:** acceptable casualty; sprite animation can convey collaborative gesture.

7. **Identity questions** — "Who's Maren?". 1 node. **Proposed deferral:** degrade to "where is X?" for v1. The Pemi tree still works; it's just slightly off-meaning.

### 8.3 Lexicon additions confirmed (and additions surfaced)

The `agents/language-integration.md` §4 list is correct as far as it goes; the parses surfaced additional concepts the original list missed:

```
ITEMS — additions to language-integration.md:
  + PEBBLE      (PEM_INITIAL — Pemi's gift; not a quest item)
  + JOURNAL     (the Hut book — referenced everywhere)
  + LETTER      (Maren's letter — Hala/Pemi)
  + FIRE        (the lit beacon — referenced everywhere)
  STICK / LIGHTER / BREAD / WATER — keep as background

LOCATIONS — additions:
  + HOME        (Maren's destination — three places mention this)
  FOREST / CAVE / FORGE / MEADOW — keep as background

ABSTRACTS — confirmed (only used in DECIDE and proposed WANT.desired):
  LEAVING / STAYING

Optional / deferable (not used in current trees):
  BOAT, PLANE, SEA, STONE, WEST, WORDS, NOTHING
  → Skip for v1; the parses degrade gracefully without them.
```

Total firm additions vs. design doc: **+4 ITEMs (PEBBLE, JOURNAL, LETTER, FIRE), +1 LOCATION (HOME)**.

### 8.4 Refinements to the integration design

Based on these parses, three concrete tweaks to `language-integration.md` §5:

**(a) `FrameNode.frames: FilledFrame[]`** — must be plural.

```ts
// agents/language-integration.md §5.1 — revise:
export interface FrameNode {
  id: string;
  speaker: NpcId;
  frames: FilledFrame[];     // was: frame: FilledFrame
  stage?: NpcStage;
  choices: FrameChoice[];
}
```

Renderer concatenates surface forms with a sentence boundary (period + space) and groups all words from all frames in a single `RenderedNode.line.words` array — no UI change needed.

**(b) `FilledFrame.polarQuestion?: boolean`** — add to `frames.ts`.

```ts
// src/lang/frames.ts — extend FilledFrame:
export type FilledFrame = {
  predicate: string;
  mood: Mood;
  roles: Record<string, RoleFiller>;
  tense?: Tense | undefined;
  negated?: boolean | undefined;
  polarQuestion?: boolean | undefined;   // NEW
};
```

Encoder/decoder/gloss check this flag in addition to `hasUnknown` when picking the `Q` mood tag. Validator: `polarQuestion: true` is incompatible with `unknown` fillers (a frame is *either* a polar Q *or* a wh-Q, not both).

**(c) Effect placement convention** — placed on the choice that *exits* a handover sequence, not the one that enters it. Concretely: `+give:wood` lives on `NAR_HANDOVER_WOOD.continue` (which advances to NAR_POST_ITEM), not on `NAR_RETURN.wood` (which enters NAR_ASK_WOOD). This lets the handover dialogue describe what's happening narratively before the inventory state actually changes, and means a player who escapes mid-handover (escape key, etc.) doesn't accidentally hold a duplicate item.

### 8.5 Effect summary across all trees

For the build script and inventory wiring:

| Effect | Nodes (entering choice) |
|---|---|
| `+give:wood`, `+flag:holds_item_wood` | `NAR_HANDOVER_WOOD.continue` |
| `+give:oil`, `+flag:holds_item_oil` | `LEM_HANDOVER_OIL.continue` |
| `+give:flint`, `+flag:holds_item_flint` | `TOK_HANDOVER_FLINT.continue` |
| `+ending:leave` | `HAL_QUESTION.go` (→ END_LEAVE) |
| `+ending:stay` | `HAL_QUESTION.stay` (→ END_STAY) |
| `+set:met_<npc>` | every Phase A opener (entered via proximity, not via choice) |
| `+flag:has_visited_hut` | `HutScene` book interaction (non-dialogue) |
| `+flag:beacon_lit` | `LighthouseScene` beacon ignition (non-dialogue) |
| `+anim:wave[player]` | every `[Leave]`, `[Wave]` choice |
| `+anim:bow[player]` | every `[Bow]` choice (Hala) |
| `+anim:point[player]` | every `[Point …]`, `[Mime …]` choice |
| `+anim:take[player]` | every `[Take the …]` choice |

All effects are derivable mechanically from the existing English trees (the gesture brackets are unambiguous; the handover pattern is identical across NAR/LEM/TOK). A build script that walks the trees and applies these rules would produce the right effects table without manual annotation per node — though I'd recommend hand-review on the climax (Hala) tree before shipping.

---

## 9. What this exercise validated and what it changed

**Validated:**
- The 5 proposed frames (GREET, AFFIRM, DENY, DECIDE, KNOW) all see real use across the trees. AFFIRM is by far the most common — it's the workhorse for "..." continuations, reassurance beats, and confirming-prior-statement turns. ~30 nodes lean on it.
- The frame-tree authoring model (per-node `FilledFrame` literals) is workable for this volume of dialogue (~50 nodes × ~3 choices avg = ~200 frames total).
- The diary auto-population contract is straightforward: every `RoleFiller` that isn't a pronoun or `unknown` registers its surface form in the diary on first encoding.

**Changed:**
- `FrameNode.frame` becomes `FrameNode.frames: FilledFrame[]` (multi-utterance support — required for ~36% of nodes).
- `FilledFrame` gains `polarQuestion?: boolean` (~18% of player questions, ~10% of NPC questions).
- `KNOW` promoted from optional to firm v1; `THANK` demoted to optional (unused in current trees).
- 5 lexicon concepts surfaced beyond the original list (`PEBBLE`, `JOURNAL`, `LETTER`, `FIRE`, `HOME`).
- `SAY.content` needs `ANIMATE` added; `WANT.desired` needs `ABSTRACT` and `ANIMATE`.

**What the demo loses (acceptable casualties for v1):**
- All comparative prose ("quieter than", "more than the bird")
- All temporal extents ("for a year", "every dusk", "twenty winters")
- All emotion-state predicates ("are you crying", "in love")
- All causal explanations ("because the fire reminds me")
- Most of the warmth in Hala's late-game arc — the parses preserve the *events* but not the *reflection*

This is OK. The demo's job is to make the language barrier *playable*, not to translate the prose. Players who read the diary entries and reconstruct the meanings will get the spine of the story; the flavor is what English-language tutorials and post-credits text exist for.
