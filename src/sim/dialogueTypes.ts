export type NpcId =
  | 'npc.pemi'
  | 'npc.naro'
  | 'npc.lemu'
  | 'npc.toka'
  | 'npc.hala';

export type NpcArchetype = 'child' | 'elder_woman' | 'man' | 'chief';

export type ItemKind = 'wood' | 'oil' | 'flint';

export interface DialogueLine {
  en: string;
  conlang?: string;
}

export interface DialogueChoice {
  id: string;
  text: DialogueLine;
  next: string | null;
}

export interface DialogueNode {
  id: string;
  speaker: NpcId;
  line: DialogueLine;
  choices: DialogueChoice[];
}

export type DialogueTree = Record<string, DialogueNode>;
