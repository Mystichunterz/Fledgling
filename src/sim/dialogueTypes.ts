// v3 dialogue contract — see app/agents/story-dialogue-trees.md §A.

export type NpcId = 'pemi' | 'naro' | 'lemu' | 'toka' | 'senu' | 'hala';

export type AnchorWord = 'hi' | 'me' | 'you' | 'want' | 'go';

export type AnimKey =
  | 'nod' | 'shake_head' | 'puzzle' | 'laugh' | 'frown'
  | 'point' | 'wave' | 'bow'
  | 'gesture_self' | 'gesture_other' | 'none';

export type ItemKind = 'wood' | 'oil' | 'flint';

export type StateFlag =
  | 'has_visited_hut'
  | `holds_item_${ItemKind}`
  | `fetch_done_${NpcId}`
  | `met_${NpcId}`
  | `anchor_known.${AnchorWord}`;

export type NodeSideEffect =
  | { kind: 'set_anchor'; anchor: AnchorWord }
  | { kind: 'set_flag'; flag: StateFlag }
  | { kind: 'log_hint'; hint: string };

export interface NodeTrigger {
  requires?: StateFlag[];
  excludes?: StateFlag[];
}

export interface PlayerOption {
  text: string;
  // Utterances render quoted (would be Telopa once T11 lands); gestures render
  // italicised English (player-sprite directives, never translated).
  kind: 'utterance' | 'gesture';
  react: AnimKey;             // NPC reaction played after pick, before next node
  next: string | 'END';
  gatedBy?: StateFlag;        // option hidden unless flag is set
}

export interface DialogueNode {
  id: string;                 // NPC_PURPOSE_INDEX, e.g. 'PEM_BEACH_INTRO'
  speaker: NpcId;
  line: string;               // English authoring layer
  options: PlayerOption[];
  stockLine?: boolean;        // true for Hala's Phase D climax fallback pool
  sideEffects?: NodeSideEffect[]; // fire on node entry
  trigger?: NodeTrigger;      // entry condition
}

export interface DialogueTree {
  npcId: NpcId;
  // Entry node IDs in priority order (most-specific phase first). The engine
  // picks the first whose trigger matches current state — that becomes the
  // root of the conversation when the player initiates Talk.
  entries: string[];
  nodes: Record<string, DialogueNode>;
}
