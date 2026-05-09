// Engine-side mirror of the Convex schema shapes. We re-declare them here
// rather than importing the generated `Doc<>` types directly so scene code can
// depend on a stable surface even if the Convex schema is refactored.

import type { Id } from '../../convex/_generated/dataModel';

export type Scene = 'beach' | 'village' | 'forest' | 'hut' | 'lighthouse';
export type ItemKind = 'wood' | 'oil' | 'flint';
export type EndingChoice = 'leave' | 'stay';
export type NpcRole = 'child' | 'elder_woman' | 'man' | 'chief';

export interface NpcDoc {
  _id: Id<'npcs'>;
  _creationTime: number;
  slug: string;
  name: string;
  role: NpcRole;
  occupation?: string;
  scene: Scene;
  spriteKey: string;
  spriteColor?: number;
  x: number;
  y: number;
  currentAction: string;
  currentLocation: Scene;
  routineId?: Id<'routines'>;
  routineStepIndex: number;
  holdsItem: ItemKind | null;
  itemGiven: boolean;
  isClimaxNpc: boolean;
  dialogueRootId: string;
}

export interface DialogueEventDoc {
  _id: Id<'dialogueEvents'>;
  _creationTime: number;
  speakerId: Id<'npcs'>;
  listenerIds: Id<'npcs'>[];
  procText: string;
  glossText: string;
  wordIds: string[];
  location: Scene;
  gameTime: number;
  voiceLineId?: string;
}

export interface WorldStateDoc {
  _id: Id<'worldState'>;
  _creationTime: number;
  currentTime: number;
  tickIntervalMs: number;
  inGameMinutesPerTick: number;
  itemsCollected: ItemKind[];
  beaconLit: boolean;
  endingChoice: EndingChoice | null;
  predecessorName: string;
  demoSeed: string;
  currentScene: Scene;
}

export type NpcSlug =
  | 'npc.pemi'
  | 'npc.naro'
  | 'npc.lemu'
  | 'npc.toka'
  | 'npc.senu'
  | 'npc.hala';

export const ALL_NPC_SLUGS: readonly NpcSlug[] = [
  'npc.pemi',
  'npc.naro',
  'npc.lemu',
  'npc.toka',
  'npc.senu',
  'npc.hala',
] as const;
