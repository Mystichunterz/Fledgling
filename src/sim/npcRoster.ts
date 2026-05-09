import type { NpcId, NpcArchetype, ItemKind } from './dialogueTypes';

export interface NpcDef {
  id: NpcId;
  displayName: string;
  archetype: NpcArchetype;
  occupation?: string;
  homeLocationTag: 'beach' | 'well' | 'firepit' | 'forest' | 'shrine' | 'hut' | 'lighthouse';
  spawn: { x: number; y: number };
  holdsItem?: ItemKind;
  isClimaxNpc?: boolean;
  dialogueRootId: string;
  spriteColor: number;
}

export const NPC_ROSTER: NpcDef[] = [
  {
    id: 'npc.pemi',
    displayName: 'Pemi',
    archetype: 'child',
    homeLocationTag: 'beach',
    spawn: { x: 480, y: 270 },
    dialogueRootId: 'pemi.greet',
    spriteColor: 0xf5d97a,
  },
  {
    id: 'npc.naro',
    displayName: 'Naro',
    archetype: 'elder_woman',
    occupation: 'baker',
    holdsItem: 'wood',
    homeLocationTag: 'forest',
    spawn: { x: 240, y: 360 },
    dialogueRootId: 'naro.greet',
    spriteColor: 0xe5a07a,
  },
  {
    id: 'npc.lemu',
    displayName: 'Lemu',
    archetype: 'elder_woman',
    occupation: 'farmer',
    holdsItem: 'oil',
    homeLocationTag: 'well',
    spawn: { x: 720, y: 200 },
    dialogueRootId: 'lemu.greet',
    spriteColor: 0xc4d76a,
  },
  {
    id: 'npc.toka',
    displayName: 'Toka',
    archetype: 'man',
    occupation: 'guard',
    holdsItem: 'flint',
    homeLocationTag: 'firepit',
    spawn: { x: 600, y: 420 },
    dialogueRootId: 'toka.greet',
    spriteColor: 0x9aa3c7,
  },
  {
    id: 'npc.hala',
    displayName: 'Hala',
    archetype: 'chief',
    occupation: 'shrine-tender',
    homeLocationTag: 'lighthouse',
    spawn: { x: 480, y: 100 },
    isClimaxNpc: true,
    dialogueRootId: 'hala.greet',
    spriteColor: 0xb893d4,
  },
];

export const npcById = (id: NpcId): NpcDef => {
  const found = NPC_ROSTER.find(n => n.id === id);
  if (!found) throw new Error(`NPC not found: ${id}`);
  return found;
};
