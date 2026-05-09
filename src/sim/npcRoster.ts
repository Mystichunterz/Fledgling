import type { NpcId, NpcArchetype, ItemKind } from './dialogueTypes';

export type NpcSceneKey = 'village' | 'crash_site' | 'hut' | 'lighthouse';

export interface NpcDef {
  id: NpcId;
  displayName: string;
  archetype: NpcArchetype;
  occupation?: string;
  scene: NpcSceneKey;
  spawn: { x: number; y: number };
  holdsItem?: ItemKind;
  isClimaxNpc?: boolean;
  dialogueRootId: string;
  spriteColor: number;
}

// Spawn coords align with VillageScene landmarks (1280x720 world):
//   bakery (240,180), guard (800,180), shrine (240,380), play (800,380), farm (320,580).
// Each NPC sits a few pixels south of their landmark so they're visually "in front".
export const NPC_ROSTER: NpcDef[] = [
  {
    id: 'npc.pemi',
    displayName: 'Pemi',
    archetype: 'child',
    scene: 'village',
    spawn: { x: 640, y: 200 },
    dialogueRootId: 'PEM_INITIAL',
    spriteColor: 0xf5d97a,
  },
  {
    id: 'npc.naro',
    displayName: 'Naro',
    archetype: 'elder_woman',
    occupation: 'baker',
    holdsItem: 'wood',
    scene: 'village',
    spawn: { x: 240, y: 220 },
    dialogueRootId: 'NAR_INITIAL',
    spriteColor: 0xe5a07a,
  },
  {
    id: 'npc.lemu',
    displayName: 'Lemu',
    archetype: 'elder_woman',
    occupation: 'farmer',
    holdsItem: 'oil',
    scene: 'village',
    spawn: { x: 340, y: 610 },
    dialogueRootId: 'LEM_INITIAL',
    spriteColor: 0xc4d76a,
  },
  {
    id: 'npc.toka',
    displayName: 'Toka',
    archetype: 'man',
    occupation: 'guard',
    holdsItem: 'flint',
    scene: 'village',
    spawn: { x: 800, y: 220 },
    dialogueRootId: 'TOK_INITIAL',
    spriteColor: 0x9aa3c7,
  },
  {
    id: 'npc.hala',
    displayName: 'Hala',
    archetype: 'chief',
    occupation: 'shrine-tender',
    scene: 'village',
    spawn: { x: 240, y: 410 },
    isClimaxNpc: true,
    dialogueRootId: 'HAL_INITIAL',
    spriteColor: 0xb893d4,
  },
];

export const npcById = (id: NpcId): NpcDef => {
  const found = NPC_ROSTER.find(n => n.id === id);
  if (!found) throw new Error(`NPC not found: ${id}`);
  return found;
};
