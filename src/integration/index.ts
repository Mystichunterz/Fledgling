export {
  getConvexClient,
  hasConvexUrl,
  closeConvex,
  disposeOnShutdown,
  rafCoalesce,
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
  type EmitDialogueArgs,
  type NpcStatePatch,
} from './convex-mutations';

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
