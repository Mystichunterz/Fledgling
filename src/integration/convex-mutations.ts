// Typed mutation wrappers. Engine call sites should reach for these instead
// of poking the raw `api.*` surface — the wrappers normalise slug↔id
// translation and apply optimistic local-state updates where appropriate.

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { getConvexClient } from './convex-client';
import { resolveNpcIdBySlug } from './convex-subscriptions';
import type {
  EndingChoice,
  ItemKind,
  NpcSlug,
  Scene,
} from './convex-types';

export interface EmitDialogueArgs {
  speakerSlug: NpcSlug;
  listenerSlugs?: NpcSlug[];
  procText: string;
  glossText: string;
  wordIds: string[];
  location: Scene;
  gameTime: number;
  voiceLineId?: string;
}

export async function emitDialogue(args: EmitDialogueArgs): Promise<void> {
  const speakerId = await resolveNpcIdBySlug(args.speakerSlug);
  const listenerIds: Id<'npcs'>[] = [];
  for (const slug of args.listenerSlugs ?? []) {
    listenerIds.push(await resolveNpcIdBySlug(slug));
  }
  await getConvexClient().mutation(api.dialogue.emit, {
    speakerId,
    listenerIds,
    procText: args.procText,
    glossText: args.glossText,
    wordIds: args.wordIds,
    location: args.location,
    gameTime: args.gameTime,
    ...(args.voiceLineId !== undefined && { voiceLineId: args.voiceLineId }),
  });
}

export async function markItemGiven(slug: NpcSlug): Promise<void> {
  const id = await resolveNpcIdBySlug(slug);
  await getConvexClient().mutation(api.npcs.giveItem, { id });
}

export interface NpcStatePatch {
  x?: number;
  y?: number;
  currentAction?: string;
  currentLocation?: Scene;
  routineStepIndex?: number;
}

export async function patchNpcState(
  slug: NpcSlug,
  patch: NpcStatePatch,
): Promise<void> {
  const id = await resolveNpcIdBySlug(slug);
  await getConvexClient().mutation(api.npcs.updateState, { id, ...patch });
}

export async function collectItem(item: ItemKind): Promise<void> {
  await getConvexClient().mutation(api.world.collectItem, { item });
}

export async function lightBeacon(): Promise<void> {
  await getConvexClient().mutation(api.world.lightBeacon, {});
}

export async function setEndingChoice(choice: EndingChoice): Promise<void> {
  await getConvexClient().mutation(api.world.setEndingChoice, { choice });
}

export async function setCurrentScene(scene: Scene): Promise<void> {
  await getConvexClient().mutation(api.world.setCurrentScene, { scene });
}

export async function ensureWorld(): Promise<void> {
  await getConvexClient().mutation(api.world.ensure, {});
}

export async function logDialogue(args: {
  speakerSlug: string;
  speakerName: string;
  line: string;
  nodeId: string;
  scene: Scene;
}): Promise<void> {
  await getConvexClient().mutation(api.dialogueLog.log, args);
}
