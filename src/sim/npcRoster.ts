import type { NpcId, ItemKind } from './dialogueTypes';

export type NpcSceneKey = 'crash_site' | 'village' | 'hut' | 'lighthouse';

export type NpcArchetype = 'child' | 'elder_woman' | 'man' | 'chief';

export interface NpcDef {
  id: NpcId;
  displayName: string;
  archetype: NpcArchetype;
  scene: NpcSceneKey;
  spawn: { x: number; y: number };
  // The critical item this NPC hands over (Lemu/Toka/Senu only).
  holdsItem?: ItemKind;
  // The filler item this NPC asks for, fetched from elsewhere.
  wantsItem?: 'fruit' | 'water' | 'rope' | 'basket';
  isClimaxNpc?: boolean;
  spriteColor: number;
}

// Cast per agents/story-dialogue-trees.md §2. Spawn coords are placeholders
// for the village landmarks (bakery/well/firepit/shrine/play); engine T13 owns
// the canonical layout and may move these.
export const NPC_ROSTER: NpcDef[] = [
  {
    id: 'pemi',
    displayName: 'Pemi',
    archetype: 'child',
    scene: 'crash_site',
    spawn: { x: 350, y: 270 },
    spriteColor: 0xf5d97a,
  },
  {
    id: 'naro',
    displayName: 'Naro',
    archetype: 'elder_woman',
    wantsItem: 'fruit',
    scene: 'village',
    spawn: { x: 240, y: 380 },   // well
    spriteColor: 0xe5a07a,
  },
  {
    id: 'lemu',
    displayName: 'Lemu',
    archetype: 'elder_woman',
    holdsItem: 'oil',
    wantsItem: 'water',
    scene: 'village',
    spawn: { x: 800, y: 380 },   // firepit
    spriteColor: 0xc4d76a,
  },
  {
    id: 'toka',
    displayName: 'Toka',
    archetype: 'man',
    holdsItem: 'flint',
    wantsItem: 'rope',
    scene: 'village',
    spawn: { x: 640, y: 380 },   // shrine
    spriteColor: 0x9aa3c7,
  },
  {
    id: 'senu',
    displayName: 'Senu',
    archetype: 'man',
    holdsItem: 'wood',
    wantsItem: 'basket',
    scene: 'village',
    spawn: { x: 160, y: 540 },   // forest (south-west)
    spriteColor: 0x7a8a6a,
  },
  {
    id: 'hala',
    displayName: 'Hala',
    archetype: 'chief',
    scene: 'lighthouse',
    spawn: { x: 240, y: 200 },
    isClimaxNpc: true,
    spriteColor: 0xb893d4,
  },
];

export const npcById = (id: NpcId): NpcDef => {
  const found = NPC_ROSTER.find(n => n.id === id);
  if (!found) throw new Error(`NPC not found: ${id}`);
  return found;
};
