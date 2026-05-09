# T43 — Gameplay loop status

**Author:** `engine` / Warspite
**Date:** 2026-05-09
**Status:** Wired end-to-end, builds green, **not yet playtested in browser.**

Calvin's directive 2026-05-09 (handed off via Zuikaku) — implement the full
English-language gameplay loop so a demo-seed run plays from prologue to
leave/stay ending without manual intervention. Five phases shipped over five
commits; every trigger lines up against every preceding side effect on paper,
but the loop has not been walked through in a live browser session.

## What's wired

### Intended loop
1. **Crash beach** — prologue plays (~17s, any-key skip after Beat 1) → Pemi walks in → click her → pick option → `met_pemi` set + anchors `hi`/`me`/`you`/`go`.
2. **Walk south** to the village.
3. **Talk to all four villagers** (Naro / Lemu / Toka / Senu) in any order — Phase A sets `met_<npc>`, Phase B AWAITING tells you where to fetch.
4. **Walk into the forest band** (south-west of village) — auto-pickup `fruit` and `rope` tiles. Walk back to the well (north-west) — auto-pickup `water` and `basket`. Top-right inventory HUD updates live.
5. **Hand over to the matching NPC** — Phase C GIVE/HANDOVER fires, sets `holds_item_<x>` and `fetch_done_<npc>`, clears `holding_<filler>`. After all four handovers you hold wood + oil + flint.
6. **Walk west** to the hut — journal auto-opens on first entry, three pages, sets `has_visited_hut` (which unlocks `{{predecessorName}}`-flavoured branches everywhere).
7. **Walk south** to the lighthouse, click Hala — with all three critical items, `HAL_DOOR_OPENS` fires (highest-priority entry) → 13-node climax → "Boat comes at first light. You go, or you stay?" → `END_LEAVE` / `END_STAY` → 2.4s pause for Hala's last line → ending screen fades in.

### Phase landings (commits on `main`)
| Phase | Commit | Brief |
|---|---|---|
| 2  | `7f08fdf` | Crash Site prologue + Pemi-on-beach spawn |
| 3a | `9829c43` | DialogueNode v3 schema + state-flag store |
| 3b | `5ae2a26` | Pemi tree ported (Phase A + B follower menu) |
| 3c | `3a901d7` | Naro / Lemu / Toka / Senu trees ported in full |
| 4  | `9129930` | Fetch-quest pickup tiles + inventory HUD |
| 5  | `0f21a7e` | Hut journal + Hala climax tree + leave/stay end screens |

### Files added / touched
- `src/sim/dialogueTypes.ts` — v3 contract per §A. `set_flag` extended with optional `value` (default true) so trees can clear flags on node entry.
- `src/sim/dialogueTrees.ts` — all five non-climax NPCs in full + Hala's full Phase A→D climax.
- `src/sim/pickupTiles.ts` — tile-walk auto-pickup for the four fillers per §11 Q2.
- `src/state/dialogueFlags.ts` — localStorage-backed flag store with `matchesTrigger()`.
- `src/scenes/CrashPrologue.ts` — 5-beat English prologue per §4.0.
- `src/scenes/HutScene.ts` — auto-opens journal on first entry.
- `src/ui/JournalOverlay.ts` — 3-page predecessor's note that sets `has_visited_hut`.
- `src/ui/InventoryHud.ts` — fixed top-right panel, subscribes to flag changes.
- `src/ui/EndScreen.ts` — listens for `END_LEAVE` / `END_STAY` encounter events; queues the screen with a reading delay; offers reload-to-title.
- `src/ui/DialogueOverlay.ts` — node-entry sideEffect application, gesture vs utterance render.
- `src/main.ts` — wires NPC spawn + pickup tiles + EndScreen + InventoryHud per scene.

## Things to specifically eyeball on first playthrough

- **Pickup tile positions.** Hard-coded coords (`well: (240, 380) / (300, 380)`, `forest: (100, 600) / (220, 540)`) without seeing the scene rendered. May overlap a landmark, a road, or sit just inside a wall.
- **Pyre menu vs Hala dialogue.** `holds_item_<x>` is set by dialogue side effects, while the existing `LighthouseMenu` (clickable pyre) reads `GameRegistry.itemsCollected`. The bridge in `handovers.ts` keeps both in sync via the `HANDOVER_<X>` encounter pattern. Both paths to lighting the beacon should work, but I haven't confirmed they don't visually fight each other.
- **Ending screen reload.** Dismissing the end screen reloads the page; localStorage flags persist. To replay, the user needs `localStorage.clear()` in devtools (or we add a reset on dismiss — deferred).
- **Pemi's Phase B (`PEM_FOLLOW`) is unreachable.** She's suppressed at the crash site after `met_pemi` (`main.ts handlePemiAtBeach`), and she doesn't follow the player into the village. Phase B nodes exist in the tree but no sprite to click them through. Lore-flavour only — doesn't block the loop, but it's a gap vs the §4.1 spec.
- **Movement keys still pass through during dialogue.** WASD/arrows can move the player while the dialogue overlay is open. Not a blocker, but the player can technically walk away mid-conversation.
- **Talking to an NPC mid-dialogue with another.** The dialogue overlay is a singleton, but I haven't tested clicking NPC B while NPC A's tree is open. Probably fine via the Phaser hit-test gating, but worth a poke.

## Caveats that didn't fit the hackathon window

- **`{{predecessorName}}` is hardcoded** as `"Maren"` via a `PREDECESSOR_NAME` const in `dialogueTrees.ts`. Runtime substitution from `worldState.predecessorName` is a follow-up — search the file for the const to wire it.
- **NPC react animations** are placeholder sprite-scale tweens. The `AnimKey` enum is plumbed through every option; actual per-NPC sprite frames come from the `genmedia` lane.
- **All NPC lines render in English.** The `language` lane (T11) replaces the `line` strings with Telopa at runtime via the diary surface; the dialogue contract is shaped to allow it without tree changes.
- **Beacon visual on climax.** `HAL_QUESTION` narrates "the lighthouse lamp turns and throws a beam out to sea" but no scene-side ignition fires from the dialogue path. The pyre menu still works as a parallel ignite trigger.
- **Side quests** (Pemi pebble, Senu second-axe, Toka shrine offering) deferred per §10.

## Definition of done — REQUIREMENTS.md §6 Group A

| Item | Status |
|---|---|
| Crash cutscene plays on launch | Placeholder English prologue |
| Player walks 4 directions, animates correctly | Pre-existing (Enterprise) |
| All 6 NPCs render at correct positions, fire Phase A on first proximity | Wired; positions hard-coded, eyeball needed |
| Translation pad / diary surface deferred but state flags update on dialogue side-effects | Flags update; diary surface is Enterprise's lane |
| Hut shows journal page with predecessor's name placeholder | Done — 3 pages, signed `— Maren` |
| Picking a valid option triggers item handover | Done — Phase C GIVE/HANDOVER |
| Three items collected → lighthouse door opens | Done — `HAL_DOOR_OPENS` trigger requires all three `holds_item_<x>` |
| Hala's Phase D plays; END_LEAVE / END_STAY resolve to distinct end screens | Done — 13-node climax, two distinct ending screens |
| Demo seed runs end-to-end under 10 min, no manual intervention | **Unverified — needs a live playthrough.** |

## Next moves

1. `npm run dev` and walk the loop. File whatever breaks back at me.
2. If pickup tiles are visually misplaced, the coords in `src/sim/pickupTiles.ts:PICKUP_DEFS` are the only thing to nudge.
3. If Pemi's follower phase becomes important for the demo, `main.ts handlePemiAtBeach` needs to also drop her into the village scene after `met_pemi`, or a separate village-Pemi roster entry needs adding.
