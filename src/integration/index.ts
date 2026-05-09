export {
  getConvexClient,
  hasConvexUrl,
  closeConvex,
  disposeOnShutdown,
  rafCoalesce,
  safeFire,
  type Disposer,
} from './convex-client';

export {
  subscribeNpcs,
  subscribeNpcsInScene,
  subscribeRecentDialogue,
  subscribeWorld,
  resolveNpcIdBySlug,
  lookupNpcId,
  primeSlugCacheFromList,
  type NpcDelta,
  type DialogueDelta,
} from './convex-subscriptions';

export {
  emitDialogue,
  markItemGiven,
  patchNpcState,
  collectItem,
  lightBeacon,
  setEndingChoice,
  setCurrentScene,
  ensureWorld,
  logDialogue,
  type EmitDialogueArgs,
  type NpcStatePatch,
} from './convex-mutations';

// Engine SceneKey → Convex Scene enum. 'crash_site' is the engine's name for
// the beach scene per REQUIREMENTS.md §5.4. 'forest' has no engine scene yet
// (Senu lives inside VillageScene's forest band).
import type { Scene } from './convex-types';
export function engineSceneToConvex(key: string): Scene | null {
  switch (key) {
    case 'crash_site': return 'beach';
    case 'village':    return 'village';
    case 'hut':        return 'hut';
    case 'lighthouse': return 'lighthouse';
    default:           return null;
  }
}

export type {
  Scene,
  ItemKind,
  EndingChoice,
  NpcDoc,
  NpcRole,
  NpcSlug,
  DialogueEventDoc,
  WorldStateDoc,
} from './convex-types';
