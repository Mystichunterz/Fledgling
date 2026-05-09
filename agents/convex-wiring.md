---
Author: backend / Impero
Date: 2026-05-09
Status: live (schema deployed; bootstrap+tick deferred to T52 until roster lands)
---

# convex-wiring.md

How the Phaser engine subscribes to Convex state. Read this before opening `app/src/integration/convex-client.ts`.

## Setup status

- ✅ `convex` installed in `app/`
- ✅ `app/convex/` populated: `schema.ts`, `npcs.ts`, `dialogue.ts`, `world.ts`, `tick.ts`, `seed.ts`
- ✅ Schema aligned with REQUIREMENTS.md §5 Rev 2 (`role` enum, `occupation`, `beach | village | forest | hut | lighthouse` scenes)
- ⏳ `npx convex dev` — pending (needs Calvin's first-run browser auth)
- ⏳ `seed:bootstrap` and `tick:start` — **deliberately not run** (T52 — waits on Zuikaku/Warspite finalising NPC roster + dialogue templates). When you subscribe, expect empty arrays until then; do not assume the deploy is broken.

## Env

After `npx convex dev` first run, Vite picks up `VITE_CONVEX_URL` from `app/.env.local`. Already documented in `app/.env.example`.

## Client wiring (paste into `app/src/integration/convex-client.ts` when scaffolded)

```ts
import { ConvexClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

export const convex = new ConvexClient(import.meta.env.VITE_CONVEX_URL!);

export const subscribeNpcs = (cb: (npcs: any[]) => void) =>
  convex.onUpdate(api.npcs.list, {}, cb);

export const subscribeRecentDialogue = (cb: (events: any[]) => void) =>
  convex.onUpdate(api.dialogue.recent, { limit: 20 }, cb);

export const subscribeWorld = (cb: (world: any) => void) =>
  convex.onUpdate(api.world.get, {}, cb);
```

Phaser scenes call subscribers in `create()` and stash the unsubscribe handle to call in `shutdown()` — otherwise you leak WebSocket subscriptions on scene transitions.

## Subscription surface

| Function | Purpose | Returns |
|---|---|---|
| `api.npcs.list` | All NPCs | `NpcDoc[]` (see §5.2) |
| `api.npcs.byScene({ scene })` | NPCs in current scene | `NpcDoc[]` |
| `api.npcs.byLocation({ location })` | NPCs at runtime location | `NpcDoc[]` |
| `api.npcs.bySlug({ slug })` | One NPC by `'npc.naro'`-style ID | `NpcDoc \| null` |
| `api.dialogue.recent({ limit? })` | Newest-first event window | `DialogueEvent[]` |
| `api.dialogue.bySpeaker({ speakerId, limit? })` | History per NPC | `DialogueEvent[]` |
| `api.world.get` | Singleton world clock + items + beacon + ending | `WorldState \| null` |

## Mutation surface

| Function | When to call |
|---|---|
| `api.npcs.updateState({ id, x?, y?, currentAction?, ... })` | If engine ever drives NPC position client-side (currently tick-driven server-side) |
| `api.npcs.giveItem({ id })` | When player completes an item exchange — sets `itemGiven: true` |
| `api.dialogue.emit({ ... })` | Engine-side dialogue events (e.g. player-driven proximity triggers Blücher's earshot logic) |
| `api.world.collectItem({ item })` | After successful exchange — adds to `itemsCollected` |
| `api.world.lightBeacon` | T17 — when Enterprise's pyre interaction completes |
| `api.world.setEndingChoice({ choice: "leave" \| "stay" })` | After Hala's climax dialogue |
| `api.world.setCurrentScene({ scene })` | On scene transition |

## Slug ↔ ID mapping

The dialogue trees in `app/src/sim/dialogueTrees.ts` reference NPCs by slug (`'npc.naro'`). Convex docs use auto-generated `_id`s. Resolve on the client:

```ts
const naro = await convex.query(api.npcs.bySlug, { slug: "npc.naro" });
// naro._id is the Id<"npcs"> for mutation calls
```

Or cache slug→id at scene boot from `api.npcs.list`.

## Tick behaviour (when T52 lands)

- `worldState.tickIntervalMs` (default 2000) — wall-clock ms per tick
- `worldState.inGameMinutesPerTick` (default 30) — in-game minutes advanced per tick
- Default = 30 in-game min per 2s wall-clock = 15× real-time, ~96s per in-game day
- Tick is self-rescheduling (`ctx.scheduler.runAfter`); kicked off once via `api.tick.start`
- Idempotent against duplicate `start` calls only because `start` schedules immediately — multiple calls = multiple parallel tick chains. **Don't call `tick:start` twice without first calling `seed:reset`.**

## `_creationTime` vs `createdAt`

REQUIREMENTS.md §5.3 shows a `createdAt` field on dialogue events. Convex auto-provides `_creationTime` (ms epoch) on every doc — that **is** the `createdAt`. Engine should read `event._creationTime`, not look for a separate `createdAt` field.

## Gotchas

- Schema is `schemaValidation: false` for hackathon velocity. Don't rely on Convex to reject malformed inserts. Tighten before any post-event work.
- `npcs.routineId` is `optional` — until routines are seeded, every NPC has `routineId === undefined` and the tick loop is a no-op for them.
- The `slug` field is **not** Convex-enforced unique; the index just makes lookup fast. Seed must guarantee uniqueness.
- Subscription callbacks fire on **every** matching mutation. If you're rendering NPC sprites from `api.npcs.list`, debounce or diff before mutating Phaser game objects, or you'll thrash on tick events.

## See also

- `../convex/` — the source
- `../../research/convex-npc-state.md` — design rationale (free-tier sums, alternatives considered)
- `../../REQUIREMENTS.md` §5 — data contracts
- `../../TASKS.md` — T29 (this), T46 (engine wiring), T52 (deferred bootstrap+tick)
