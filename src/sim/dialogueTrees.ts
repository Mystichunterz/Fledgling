import type { DialogueTree, NpcId } from './dialogueTypes';

// v3 dialogue trees per app/agents/story-dialogue-trees.md §4.
// Phase 3a stubs — minimal Phase A nodes so the build compiles end-to-end.
// Phase 3b/3c will replace these with the authored content.

const pemi: DialogueTree = {
  npcId: 'pemi',
  // Most-specific phase first. PEM_FOLLOW only after met_pemi.
  entries: ['PEM_FOLLOW', 'PEM_BEACH_INTRO'],
  nodes: {
    PEM_BEACH_INTRO: {
      id: 'PEM_BEACH_INTRO',
      speaker: 'pemi',
      line: '(scampers across the sand, stops a few paces away, points at themself) "Hi! Hi-hi. Me Pemi. Me — you?"',
      trigger: { excludes: ['met_pemi'] },
      options: [
        { text: 'Wave back.', kind: 'gesture', react: 'laugh', next: 'PEM_WAVE_BACK' },
        { text: 'Point at yourself, mime your own name.', kind: 'gesture', react: 'laugh', next: 'PEM_NAME_MIME' },
        { text: 'Stay silent.', kind: 'gesture', react: 'puzzle', next: 'PEM_QUIET' },
      ],
    },
    PEM_WAVE_BACK: {
      id: 'PEM_WAVE_BACK',
      speaker: 'pemi',
      line: '(beams) "Hi-hi. You hi me. Me hi you. Good!" (twirls, then points south past the dunes) "Go — go village. Naro. Go!"',
      sideEffects: [
        { kind: 'set_flag', flag: 'met_pemi' },
        { kind: 'set_anchor', anchor: 'hi' },
        { kind: 'set_anchor', anchor: 'me' },
        { kind: 'set_anchor', anchor: 'you' },
        { kind: 'set_anchor', anchor: 'go' },
        { kind: 'log_hint', hint: 'village_south' },
      ],
      options: [
        { text: 'Follow Pemi south.', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    PEM_NAME_MIME: {
      id: 'PEM_NAME_MIME',
      speaker: 'pemi',
      line: '(laughs) "You! Me Pemi, you… you. Hi, you. Go village, follow me!"',
      sideEffects: [
        { kind: 'set_flag', flag: 'met_pemi' },
        { kind: 'set_anchor', anchor: 'hi' },
        { kind: 'set_anchor', anchor: 'me' },
        { kind: 'set_anchor', anchor: 'you' },
        { kind: 'set_anchor', anchor: 'go' },
      ],
      options: [
        { text: 'Follow Pemi.', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    PEM_QUIET: {
      id: 'PEM_QUIET',
      speaker: 'pemi',
      line: '(tilts head, then shrugs cheerfully) "Quiet you. Hi anyway. Me Pemi. Follow."',
      sideEffects: [
        { kind: 'set_flag', flag: 'met_pemi' },
        { kind: 'set_anchor', anchor: 'hi' },
        { kind: 'set_anchor', anchor: 'me' },
      ],
      options: [
        { text: 'Nod.', kind: 'gesture', react: 'nod', next: 'END' },
      ],
    },
    PEM_FOLLOW: {
      id: 'PEM_FOLLOW',
      speaker: 'pemi',
      line: '(falls into step beside you) "Me with you. Where go?"',
      trigger: { requires: ['met_pemi'] },
      options: [
        { text: 'Who is at the well?',          kind: 'utterance', react: 'point', next: 'PEM_TELL_NARO' },
        { text: 'Who is at the firepit?',       kind: 'utterance', react: 'point', next: 'PEM_TELL_LEMU' },
        { text: 'Who is at the shrine?',        kind: 'utterance', react: 'point', next: 'PEM_TELL_TOKA' },
        { text: 'Who is in the forest?',        kind: 'utterance', react: 'point', next: 'PEM_TELL_SENU' },
        { text: 'Tell me about the lighthouse.',     kind: 'utterance', react: 'frown', next: 'PEM_TELL_HALA',  gatedBy: 'has_visited_hut' },
        { text: 'Tell me about the one before me.',  kind: 'utterance', react: 'nod',   next: 'PEM_TELL_MAREN', gatedBy: 'has_visited_hut' },
        { text: '(leave)',                       kind: 'gesture', react: 'wave',  next: 'END' },
      ],
    },
    PEM_TELL_NARO: {
      id: 'PEM_TELL_NARO',
      speaker: 'pemi',
      line: '"Naro. Big bread. Naro want fruit. Go." (mimes biting an apple)',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'PEM_FOLLOW' },
      ],
    },
    PEM_TELL_LEMU: {
      id: 'PEM_TELL_LEMU',
      speaker: 'pemi',
      line: '"Lemu. Fire. Sea-eyes. Lemu want water." (mimes pouring)',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'PEM_FOLLOW' },
      ],
    },
    PEM_TELL_TOKA: {
      id: 'PEM_TELL_TOKA',
      speaker: 'pemi',
      line: '"Toka. Stone-house. Strict. Toka want rope." (mimes tying)',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'PEM_FOLLOW' },
      ],
    },
    PEM_TELL_SENU: {
      id: 'PEM_TELL_SENU',
      speaker: 'pemi',
      line: '"Senu. Trees. Quiet. Senu want basket." (mimes carrying)',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'PEM_FOLLOW' },
      ],
    },
    PEM_TELL_HALA: {
      id: 'PEM_TELL_HALA',
      speaker: 'pemi',
      line: '(suddenly serious) "Hala. Lighthouse. Big-house, fire-on-top. Wait, wait, wait — me only seven winters. Hala will say. Bring fire to her."',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'PEM_FOLLOW' },
      ],
    },
    PEM_TELL_MAREN: {
      id: 'PEM_TELL_MAREN',
      speaker: 'pemi',
      line: '"Before. The other one. Boat. Letter. Hala read it every winter. Same day."',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'PEM_FOLLOW' },
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
