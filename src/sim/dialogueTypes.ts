// v3 dialogue contract — see app/agents/story-dialogue-trees.md §A.
// v3.1 (2026-05-09): canonical authoring is FilledFrame[]; the renderer encodes
// each speech segment into the active language's surface form per §8.2.

import type { FilledFrame } from '../lang/frames';

export type NpcId = 'pemi' | 'naro' | 'lemu' | 'toka' | 'senu' | 'hala';

export type AnchorWord = 'hi' | 'me' | 'you' | 'want' | 'go';

export type AnimKey =
  | 'nod' | 'shake_head' | 'puzzle' | 'laugh' | 'frown'
  | 'point' | 'wave' | 'bow'
  | 'gesture_self' | 'gesture_other' | 'none';

export type ItemKind = 'wood' | 'oil' | 'flint';
// Filler items the player picks up to satisfy NPC fetch quests, before
// receiving the critical wood/oil/flint in exchange.
export type FillerItem = 'fruit' | 'water' | 'rope' | 'basket';

export type StateFlag =
  | 'has_visited_hut'
  | `holds_item_${ItemKind}`
  | `holding_${FillerItem}`
  | `fetch_done_${NpcId}`
  | `met_${NpcId}`
  | `anchor_known.${AnchorWord}`;

export type NodeSideEffect =
  | { kind: 'set_anchor'; anchor: AnchorWord }
  | { kind: 'set_flag'; flag: StateFlag; value?: boolean } // value defaults true
  | { kind: 'log_hint'; hint: string };

export interface NodeTrigger {
  requires?: StateFlag[];
  excludes?: StateFlag[];
}

// A node's `line` is a sequence of segments.
//
// Speech segments display as the NPC's spoken text. When `frames` is present
// the renderer encodes each frame via encodeFrame (lang/encoder) and emits the
// concatenated Telopa surface — that's the §8.2 contract. When `frames` is
// absent, the renderer falls back to `english` verbatim. The fallback path
// exists so trees can be migrated incrementally; once Pemi/Naro are framed,
// Lemu/Toka/Senu/Hala stay english-only until their turn.
//
// Stage segments are English directives (sprite anim cues, scene beats); they
// are never displayed as text and never reach the diary.
export type LineSegment =
  | { kind: 'speech'; english: string; frames?: FilledFrame[] }
  | { kind: 'stage'; text: string };

export interface PlayerOption {
  // English label — the canonical surface for gestures, the §8.2
  // first-encounter overlay on utterance options, and the fallback when
  // `frames` is absent (incremental-migration escape hatch).
  english: string;
  // Present for utterances that have been framed. Renderer encodes each frame
  // and concatenates for the Telopa surface. Omitted for gestures and for
  // unmigrated utterance options (which render as plain English).
  frames?: FilledFrame[];
  kind: 'utterance' | 'gesture';
  react: AnimKey;             // NPC reaction played after pick, before next node
  next: string | 'END';
  gatedBy?: StateFlag;         // option hidden unless flag is set
}

export interface DialogueNode {
  id: string;                  // NPC_PURPOSE_INDEX, e.g. 'PEM_BEACH_INTRO'
  speaker: NpcId;
  line: LineSegment[];
  options: PlayerOption[];
  stockLine?: boolean;         // true for Hala's Phase D climax fallback pool
  sideEffects?: NodeSideEffect[]; // fire on node entry
  trigger?: NodeTrigger;       // entry condition
}

export interface DialogueTree {
  npcId: NpcId;
  // Entry node IDs in priority order (most-specific phase first). The engine
  // picks the first whose trigger matches current state — that becomes the
  // root of the conversation when the player initiates Talk.
  entries: string[];
  nodes: Record<string, DialogueNode>;
}
