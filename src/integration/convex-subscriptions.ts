// Typed subscription wrappers + slug→id cache.
//
// Convex's `onUpdate` callback fires on every mutation that touches the
// underlying query. We coalesce per-frame in `convex-client.ts`; here we add
// a thin diff layer so subscribers can act on "what changed" rather than
// re-rendering the world from scratch each tick.

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { getConvexClient, rafCoalesce, type Disposer } from './convex-client';
import type {
  DialogueEventDoc,
  NpcDoc,
  NpcSlug,
  Scene,
  WorldStateDoc,
} from './convex-types';

export interface NpcDelta {
  added: NpcDoc[];
  updated: { prev: NpcDoc; next: NpcDoc }[];
  removed: NpcDoc[];
  all: NpcDoc[];
}

export interface DialogueDelta {
  appended: DialogueEventDoc[];
  all: DialogueEventDoc[];
}

const slugCache = new Map<NpcSlug, Id<'npcs'>>();

export function lookupNpcId(slug: NpcSlug): Id<'npcs'> | null {
  return slugCache.get(slug) ?? null;
}

export function primeSlugCacheFromList(npcs: NpcDoc[]): void {
  for (const npc of npcs) {
    slugCache.set(npc.slug as NpcSlug, npc._id);
  }
}

export async function resolveNpcIdBySlug(slug: NpcSlug): Promise<Id<'npcs'>> {
  const cached = slugCache.get(slug);
  if (cached) return cached;
  const npc = (await getConvexClient().query(api.npcs.bySlug, { slug })) as
    | NpcDoc
    | null;
  if (!npc) throw new Error(`[convex] no NPC with slug ${slug}`);
  slugCache.set(slug, npc._id);
  return npc._id;
}

/**
 * Subscribe to the full NPC list. Callback receives a delta against the prior
 * snapshot — handy for spawning/despawning sprites without diffing yourself.
 * The delta on first fire has every NPC in `added`.
 */
export function subscribeNpcs(cb: (delta: NpcDelta) => void): Disposer {
  let prev = new Map<string, NpcDoc>();
  const handler = rafCoalesce<NpcDoc[]>((next) => {
    primeSlugCacheFromList(next);

    const added: NpcDoc[] = [];
    const updated: { prev: NpcDoc; next: NpcDoc }[] = [];
    const nextMap = new Map<string, NpcDoc>();
    for (const npc of next) {
      nextMap.set(npc._id, npc);
      const before = prev.get(npc._id);
      if (!before) {
        added.push(npc);
      } else if (before._creationTime !== npc._creationTime || !shallowEqual(before, npc)) {
        updated.push({ prev: before, next: npc });
      }
    }
    const removed: NpcDoc[] = [];
    for (const [id, npc] of prev) {
      if (!nextMap.has(id)) removed.push(npc);
    }

    prev = nextMap;
    cb({ added, updated, removed, all: next });
  });

  return getConvexClient().onUpdate(api.npcs.list, {}, (npcs) =>
    handler(npcs as NpcDoc[]),
  );
}

export function subscribeNpcsInScene(
  scene: Scene,
  cb: (npcs: NpcDoc[]) => void,
): Disposer {
  const handler = rafCoalesce<NpcDoc[]>(cb);
  return getConvexClient().onUpdate(
    api.npcs.byScene,
    { scene },
    (npcs) => handler(npcs as NpcDoc[]),
  );
}

/**
 * Subscribe to recent dialogue. Newest events appear first in `events`. We
 * keep a small cursor on `_creationTime` so we can call back with only the
 * appended events on each fire — handy for the dialogue log UI which appends
 * rather than rerenders.
 */
export function subscribeRecentDialogue(
  cb: (delta: DialogueDelta) => void,
  limit = 20,
): Disposer {
  let lastTime = 0;
  return getConvexClient().onUpdate(
    api.dialogue.recent,
    { limit },
    (events) => {
      const all = events as DialogueEventDoc[];
      const appended = all.filter((e) => e._creationTime > lastTime);
      if (all.length > 0) {
        lastTime = Math.max(lastTime, ...all.map((e) => e._creationTime));
      }
      cb({ appended, all });
    },
  );
}

export function subscribeWorld(
  cb: (world: WorldStateDoc | null) => void,
): Disposer {
  const handler = rafCoalesce<WorldStateDoc | null>(cb);
  return getConvexClient().onUpdate(api.world.get, {}, (world) =>
    handler(world as WorldStateDoc | null),
  );
}

function shallowEqual<T extends object>(a: T, b: T): boolean {
  const ak = Object.keys(a) as (keyof T)[];
  const bk = Object.keys(b) as (keyof T)[];
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}
