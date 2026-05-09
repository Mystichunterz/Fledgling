import type { DialogueTree, NpcId } from './dialogueTypes';

// v3 dialogue trees per app/agents/story-dialogue-trees.md §4.
// Phase 3a stubs — minimal Phase A nodes so the build compiles end-to-end.
// Phase 3b/3c will replace these with the authored content.

const pemi: DialogueTree = {
  npcId: 'pemi',
  entries: ['PEM_BEACH_INTRO'],
  nodes: {
    PEM_BEACH_INTRO: {
      id: 'PEM_BEACH_INTRO',
      speaker: 'pemi',
      line: '(scampers across the sand, points at themself) "Hi! Hi-hi. Me Pemi. Me — you?"',
      trigger: { excludes: ['met_pemi'] },
      sideEffects: [
        { kind: 'set_flag', flag: 'met_pemi' },
        { kind: 'set_anchor', anchor: 'hi' },
        { kind: 'set_anchor', anchor: 'me' },
        { kind: 'set_anchor', anchor: 'you' },
      ],
      options: [
        { text: 'Wave back.', kind: 'gesture', react: 'laugh', next: 'END' },
        { text: 'Point at yourself, mime your name.', kind: 'gesture', react: 'laugh', next: 'END' },
        { text: 'Stay silent.', kind: 'gesture', react: 'puzzle', next: 'END' },
      ],
    },
  },
};

const naro: DialogueTree = {
  npcId: 'naro',
  entries: ['NAR_INITIAL'],
  nodes: {
    NAR_INITIAL: {
      id: 'NAR_INITIAL',
      speaker: 'naro',
      line: '(at the well, balancing a basket on her hip) "Hi. Me Naro. Me want fruit. You go forest."',
      trigger: { excludes: ['met_naro'] },
      sideEffects: [
        { kind: 'set_flag', flag: 'met_naro' },
        { kind: 'set_anchor', anchor: 'want' },
        { kind: 'set_anchor', anchor: 'go' },
      ],
      options: [
        { text: 'Hi. Me — me.', kind: 'utterance', react: 'nod', next: 'END' },
        { text: 'Look around the well.', kind: 'gesture', react: 'puzzle', next: 'END' },
      ],
    },
  },
};

const lemu: DialogueTree = {
  npcId: 'lemu',
  entries: ['LEM_INITIAL'],
  nodes: {
    LEM_INITIAL: {
      id: 'LEM_INITIAL',
      speaker: 'lemu',
      line: '(stoking a low fire, watches the smoke trail) "Plane brought you. Loud thing."',
      trigger: { excludes: ['met_lemu'] },
      sideEffects: [{ kind: 'set_flag', flag: 'met_lemu' }],
      options: [
        { text: 'You — see?', kind: 'utterance', react: 'nod', next: 'END' },
        { text: 'Mime the plane falling.', kind: 'gesture', react: 'nod', next: 'END' },
      ],
    },
  },
};

const toka: DialogueTree = {
  npcId: 'toka',
  entries: ['TOK_INITIAL'],
  nodes: {
    TOK_INITIAL: {
      id: 'TOK_INITIAL',
      speaker: 'toka',
      line: '(stands by the driftwood shrine, hand resting on a fire-striker) "Stop there. Hands open."',
      trigger: { excludes: ['met_toka'] },
      sideEffects: [{ kind: 'set_flag', flag: 'met_toka' }],
      options: [
        { text: 'Show empty hands.', kind: 'gesture', react: 'nod', next: 'END' },
        { text: 'Mime "I crashed".', kind: 'gesture', react: 'nod', next: 'END' },
      ],
    },
  },
};

const senu: DialogueTree = {
  npcId: 'senu',
  entries: ['SEN_INITIAL'],
  nodes: {
    SEN_INITIAL: {
      id: 'SEN_INITIAL',
      speaker: 'senu',
      line: '(stripping bark from a log, the air smells of resin) "You walk soft. Good."',
      trigger: { excludes: ['met_senu'] },
      sideEffects: [{ kind: 'set_flag', flag: 'met_senu' }],
      options: [
        { text: 'Nod.', kind: 'gesture', react: 'nod', next: 'END' },
        { text: 'Look at the trees.', kind: 'gesture', react: 'point', next: 'END' },
      ],
    },
  },
};

const hala: DialogueTree = {
  npcId: 'hala',
  entries: ['HAL_INITIAL'],
  nodes: {
    HAL_INITIAL: {
      id: 'HAL_INITIAL',
      speaker: 'hala',
      line: '(seated by the lighthouse door, eyes closed) "Not yet."',
      trigger: { excludes: ['met_hala'] },
      sideEffects: [{ kind: 'set_flag', flag: 'met_hala' }],
      options: [
        { text: 'Not yet what?', kind: 'utterance', react: 'shake_head', next: 'END' },
        { text: 'Bow and leave.', kind: 'gesture', react: 'bow', next: 'END' },
      ],
    },
  },
};

export const DIALOGUE_TREES: Record<NpcId, DialogueTree> = {
  pemi, naro, lemu, toka, senu, hala,
};
