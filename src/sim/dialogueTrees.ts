import type { DialogueTree, NpcId } from './dialogueTypes';
import { attachFrames } from './frames/attachFrames';
import { PEMI_LINE_FRAMES, PEMI_OPTION_FRAMES } from './frames/pemiFrames';
import { NARO_LINE_FRAMES, NARO_OPTION_FRAMES } from './frames/naroFrames';
import { LEMU_LINE_FRAMES, LEMU_OPTION_FRAMES } from './frames/lemuFrames';
import { TOKA_LINE_FRAMES, TOKA_OPTION_FRAMES } from './frames/tokaFrames';
import { SENU_LINE_FRAMES, SENU_OPTION_FRAMES } from './frames/senuFrames';
import { HALA_LINE_FRAMES, HALA_OPTION_FRAMES } from './frames/halaFrames';

// v3 dialogue trees per app/agents/story-dialogue-trees.md §4.
// Pemi (§4.1), Naro (§4.2), Lemu (§4.3), Toka (§4.4), Senu (§4.5) ported in
// full. Hala (§4.6) is the climax tree and ships with Phase 5; the Phase A
// stub remains so first-approach is non-empty.
//
// {{predecessorName}} is rendered literally as PREDECESSOR_NAME for the demo
// — runtime token substitution lands with the worldState wiring later.
const PREDECESSOR_NAME = 'Maren';

const pemi: DialogueTree = {
  npcId: 'pemi',
  // Most-specific phase first. PEM_FOLLOW only after met_pemi.
  entries: ['PEM_FOLLOW', 'PEM_BEACH_INTRO'],
  nodes: {
    PEM_BEACH_INTRO: {
      id: 'PEM_BEACH_INTRO',
      speaker: 'pemi',
      line: [
        { kind: 'stage', text: 'scampers across the sand, stops a few paces away, points at themself' },
        { kind: 'speech', english: 'Hi! Hi-hi. Me Pemi. Me — you?' },
      ],
      trigger: { excludes: ['met_pemi'] },
      options: [
        { english: 'Wave back.', kind: 'gesture', react: 'laugh', next: 'PEM_WAVE_BACK' },
        { english: 'Point at yourself, mime your own name.', kind: 'gesture', react: 'laugh', next: 'PEM_NAME_MIME' },
        { english: 'Stay silent.', kind: 'gesture', react: 'puzzle', next: 'PEM_QUIET' },
      ],
    },
    PEM_WAVE_BACK: {
      id: 'PEM_WAVE_BACK',
      speaker: 'pemi',
      line: [
        { kind: 'stage', text: 'beams' },
        { kind: 'speech', english: 'Hi-hi. You hi me. Me hi you. Good!' },
        { kind: 'stage', text: 'twirls, then points south past the dunes' },
        { kind: 'speech', english: 'Go — go village. Naro. Go!' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'met_pemi' },
        { kind: 'set_anchor', anchor: 'hi' },
        { kind: 'set_anchor', anchor: 'me' },
        { kind: 'set_anchor', anchor: 'you' },
        { kind: 'set_anchor', anchor: 'go' },
        { kind: 'log_hint', hint: 'village_south' },
      ],
      options: [
        { english: 'Follow Pemi south.', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    PEM_NAME_MIME: {
      id: 'PEM_NAME_MIME',
      speaker: 'pemi',
      line: [
        { kind: 'stage', text: 'laughs' },
        { kind: 'speech', english: 'You! Me Pemi, you… you. Hi, you. Go village, follow me!' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'met_pemi' },
        { kind: 'set_anchor', anchor: 'hi' },
        { kind: 'set_anchor', anchor: 'me' },
        { kind: 'set_anchor', anchor: 'you' },
        { kind: 'set_anchor', anchor: 'go' },
      ],
      options: [
        { english: 'Follow Pemi.', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    PEM_QUIET: {
      id: 'PEM_QUIET',
      speaker: 'pemi',
      line: [
        { kind: 'stage', text: 'tilts head, then shrugs cheerfully' },
        { kind: 'speech', english: 'Quiet you. Hi anyway. Me Pemi. Follow.' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'met_pemi' },
        { kind: 'set_anchor', anchor: 'hi' },
        { kind: 'set_anchor', anchor: 'me' },
      ],
      options: [
        { english: 'Nod.', kind: 'gesture', react: 'nod', next: 'END' },
      ],
    },
    PEM_FOLLOW: {
      id: 'PEM_FOLLOW',
      speaker: 'pemi',
      line: [
        { kind: 'stage', text: 'falls into step beside you' },
        { kind: 'speech', english: 'Me with you. Where go?' },
      ],
      trigger: { requires: ['met_pemi'] },
      options: [
        { english: 'Who is at the well?', kind: 'utterance', react: 'point', next: 'PEM_TELL_NARO' },
        { english: 'Who is at the firepit?', kind: 'utterance', react: 'point', next: 'PEM_TELL_LEMU' },
        { english: 'Who is at the shrine?', kind: 'utterance', react: 'point', next: 'PEM_TELL_TOKA' },
        { english: 'Who is in the forest?', kind: 'utterance', react: 'point', next: 'PEM_TELL_SENU' },
        { english: 'Tell me about the lighthouse.', kind: 'utterance', react: 'frown', next: 'PEM_TELL_HALA',  gatedBy: 'has_visited_hut' },
        { english: 'Tell me about the one before me.', kind: 'utterance', react: 'nod',   next: 'PEM_TELL_MAREN', gatedBy: 'has_visited_hut' },
        { english: '(leave)', kind: 'gesture', react: 'wave',  next: 'END' },
      ],
    },
    PEM_TELL_NARO: {
      id: 'PEM_TELL_NARO',
      speaker: 'pemi',
      line: [
        { kind: 'speech', english: 'Naro. Big bread. Naro want fruit. Go.' },
        { kind: 'stage', text: 'mimes biting an apple' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'PEM_FOLLOW' },
      ],
    },
    PEM_TELL_LEMU: {
      id: 'PEM_TELL_LEMU',
      speaker: 'pemi',
      line: [
        { kind: 'speech', english: 'Lemu. Fire. Sea-eyes. Lemu want water.' },
        { kind: 'stage', text: 'mimes pouring' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'PEM_FOLLOW' },
      ],
    },
    PEM_TELL_TOKA: {
      id: 'PEM_TELL_TOKA',
      speaker: 'pemi',
      line: [
        { kind: 'speech', english: 'Toka. Stone-house. Strict. Toka want rope.' },
        { kind: 'stage', text: 'mimes tying' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'PEM_FOLLOW' },
      ],
    },
    PEM_TELL_SENU: {
      id: 'PEM_TELL_SENU',
      speaker: 'pemi',
      line: [
        { kind: 'speech', english: 'Senu. Trees. Quiet. Senu want basket.' },
        { kind: 'stage', text: 'mimes carrying' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'PEM_FOLLOW' },
      ],
    },
    PEM_TELL_HALA: {
      id: 'PEM_TELL_HALA',
      speaker: 'pemi',
      line: [
        { kind: 'stage', text: 'suddenly serious' },
        { kind: 'speech', english: 'Hala. Lighthouse. Big-house, fire-on-top. Wait, wait, wait — me only seven winters. Hala will say. Bring fire to her.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'PEM_FOLLOW' },
      ],
    },
    PEM_TELL_MAREN: {
      id: 'PEM_TELL_MAREN',
      speaker: 'pemi',
      line: [
        { kind: 'speech', english: 'Before. The other one. Boat. Letter. Hala read it every winter. Same day.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'PEM_FOLLOW' },
      ],
    },
  },
};

const naro: DialogueTree = {
  npcId: 'naro',
  // Most-specific phase first.
  entries: ['NAR_POST_FRUIT', 'NAR_GIVE_FRUIT', 'NAR_AWAITING', 'NAR_INITIAL'],
  nodes: {
    // Phase A
    NAR_INITIAL: {
      id: 'NAR_INITIAL',
      speaker: 'naro',
      line: [
        { kind: 'stage', text: 'she sets down a half-woven basket; she looks up, unsurprised' },
        { kind: 'speech', english: 'Hi. Me Naro. You?' },
      ],
      trigger: { excludes: ['met_naro'] },
      options: [
        { english: 'Hi. Me — me. (point at self)', kind: 'utterance', react: 'nod',    next: 'NAR_GREETING' },
        { english: 'Stay silent, look around the well.', kind: 'gesture', react: 'puzzle', next: 'NAR_QUIET' },
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    NAR_GREETING: {
      id: 'NAR_GREETING',
      speaker: 'naro',
      line: [
        { kind: 'stage', text: 'small smile' },
        { kind: 'speech', english: 'Good. Hi, you. Sea brings who it brings.' },
        { kind: 'stage', text: 'beat' },
        { kind: 'speech', english: 'Me want fruit. You go forest. Bring.' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'met_naro' },
        { kind: 'set_anchor', anchor: 'hi' },
        { kind: 'set_anchor', anchor: 'me' },
        { kind: 'set_anchor', anchor: 'you' },
        { kind: 'set_anchor', anchor: 'want' },
        { kind: 'set_anchor', anchor: 'go' },
        { kind: 'log_hint', hint: 'forest_for_fruit' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'NAR_BREAD' },
      ],
    },
    NAR_QUIET: {
      id: 'NAR_QUIET',
      speaker: 'naro',
      line: [
        { kind: 'stage', text: 'she resumes weaving without rushing you' },
        { kind: 'speech', english: 'All right. Me weave, you look. When you ready: me want fruit. Go forest.' },
        { kind: 'stage', text: 'she points west with her chin' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'met_naro' },
        { kind: 'set_anchor', anchor: 'me' },
        { kind: 'set_anchor', anchor: 'you' },
        { kind: 'set_anchor', anchor: 'want' },
        { kind: 'set_anchor', anchor: 'go' },
        { kind: 'log_hint', hint: 'forest_for_fruit' },
      ],
      options: [
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    NAR_BREAD: {
      id: 'NAR_BREAD',
      speaker: 'naro',
      line: [
        { kind: 'stage', text: 'she gestures at a small stack of loaves' },
        { kind: 'speech', english: 'Bread for fruit. Fair?' },
        { kind: 'stage', text: 'she breaks off a piece, hands it to you to eat now' },
        { kind: 'speech', english: 'Hi, you.' },
      ],
      options: [
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    // Phase B
    NAR_AWAITING: {
      id: 'NAR_AWAITING',
      speaker: 'naro',
      line: [
        { kind: 'stage', text: 'without lifting her eyes' },
        { kind: 'speech', english: 'Me want fruit. Go forest. Bring.' },
      ],
      trigger: { requires: ['met_naro'], excludes: ['fetch_done_naro'] },
      options: [
        { english: 'Forest — where?', kind: 'utterance', react: 'point',  next: 'NAR_POINT_FOREST' },
        { english: 'Fruit — what?', kind: 'utterance', react: 'puzzle', next: 'NAR_DESCRIBE_FRUIT' },
        { english: '(leave)', kind: 'gesture',   react: 'wave',   next: 'END' },
      ],
    },
    NAR_POINT_FOREST: {
      id: 'NAR_POINT_FOREST',
      speaker: 'naro',
      line: [
        { kind: 'stage', text: 'points west and slightly south with the basket-needle' },
        { kind: 'speech', english: 'Path past shrine. Sign there. Go.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'NAR_AWAITING' },
      ],
    },
    NAR_DESCRIBE_FRUIT: {
      id: 'NAR_DESCRIBE_FRUIT',
      speaker: 'naro',
      line: [
        { kind: 'stage', text: 'makes a round shape with both hands, hums' },
        { kind: 'speech', english: 'Round. Red. Tree.' },
        { kind: 'stage', text: 'taps her cheek' },
        { kind: 'speech', english: 'Sweet.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'NAR_AWAITING' },
      ],
    },
    // Phase C
    NAR_GIVE_FRUIT: {
      id: 'NAR_GIVE_FRUIT',
      speaker: 'naro',
      line: [
        { kind: 'stage', text: 'she takes the fruit, weighs it, smells it' },
        { kind: 'speech', english: 'Good. You learn fast.' },
        { kind: 'stage', text: 'presses a fresh loaf into your hands' },
        { kind: 'speech', english: 'Bread. Yours.' },
      ],
      trigger: { requires: ['holding_fruit'], excludes: ['fetch_done_naro'] },
      sideEffects: [
        { kind: 'set_flag', flag: 'fetch_done_naro' },
        { kind: 'set_flag', flag: 'holding_fruit', value: false },
      ],
      options: [
        { english: 'What now?', kind: 'utterance', react: 'nod',  next: 'NAR_NEXT_HINT' },
        { english: `Tell me about ${PREDECESSOR_NAME}.`, kind: 'utterance', react: 'nod', next: 'NAR_ABOUT_MAREN', gatedBy: 'has_visited_hut' },
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'NAR_POST_FRUIT' },
      ],
    },
    NAR_NEXT_HINT: {
      id: 'NAR_NEXT_HINT',
      speaker: 'naro',
      line: [
        { kind: 'speech', english: 'Lemu, firepit. Want water. Toka, shrine. Want rope. Senu, forest. Want basket. And — you go west, cliff path. Hut. Read what is there.' },
      ],
      sideEffects: [
        { kind: 'log_hint', hint: 'hut_west' },
        { kind: 'log_hint', hint: 'hut_has_journal' },
      ],
      options: [
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    NAR_ABOUT_MAREN: {
      id: 'NAR_ABOUT_MAREN',
      speaker: 'naro',
      line: [
        { kind: 'speech', english: `${PREDECESSOR_NAME} sat at this well a year before they could ask for water without pointing. We sang to teach them — daft songs, mostly about the weather.` },
        { kind: 'stage', text: `she smiles` },
        { kind: 'speech', english: `You? Faster.` },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'NAR_GIVE_FRUIT' },
      ],
    },
    // Phase D
    NAR_POST_FRUIT: {
      id: 'NAR_POST_FRUIT',
      speaker: 'naro',
      line: [
        { kind: 'stage', text: 'she hands you a small linen-wrapped crust each time' },
        { kind: 'speech', english: 'Bread, yours. Lighthouse, south. Hala wait.' },
      ],
      trigger: { requires: ['fetch_done_naro'] },
      options: [
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
  },
};

const lemu: DialogueTree = {
  npcId: 'lemu',
  entries: ['LEM_POST_ITEM', 'LEM_GIVE_OIL', 'LEM_AWAITING', 'LEM_INITIAL'],
  nodes: {
    // Phase A
    LEM_INITIAL: {
      id: 'LEM_INITIAL',
      speaker: 'lemu',
      line: [
        { kind: 'stage', text: 'she\'s leaning on the stone press, watching the sea past the firepit smoke' },
        { kind: 'speech', english: 'Hi. Lemu. Plane brought you. Loud thing.' },
      ],
      trigger: { excludes: ['met_lemu'] },
      options: [
        { english: 'You — see?', kind: 'utterance', react: 'nod',  next: 'LEM_SAW_PLANE' },
        { english: 'Mime the plane falling.', kind: 'gesture', react: 'nod',  next: 'LEM_SAW_PLANE' },
        { english: 'Look at the press with her.', kind: 'gesture', react: 'none', next: 'LEM_SEA' },
        { english: '(leave)', kind: 'gesture',   react: 'wave', next: 'END' },
      ],
    },
    LEM_SAW_PLANE: {
      id: 'LEM_SAW_PLANE',
      speaker: 'lemu',
      line: [
        { kind: 'speech', english: 'Heard it. Like the last one — twenty winters. Me knew before me looked.' },
        { kind: 'stage', text: 'she nods toward the firepit' },
        { kind: 'speech', english: 'Me want water. Go well. Naro know.' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'met_lemu' },
        { kind: 'log_hint', hint: 'lemu_wants_water' },
      ],
      options: [
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    LEM_SEA: {
      id: 'LEM_SEA',
      speaker: 'lemu',
      line: [
        { kind: 'stage', text: 'after a long beat' },
        { kind: 'speech', english: 'Boats come every two months. Next one will see your fire if you light it.' },
        { kind: 'stage', text: 'taps the press' },
        { kind: 'speech', english: 'Oil for fire. Me want water first. Go well.' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'met_lemu' },
        { kind: 'log_hint', hint: 'lemu_wants_water' },
        { kind: 'log_hint', hint: 'lighthouse_signal' },
      ],
      options: [
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    // Phase B
    LEM_AWAITING: {
      id: 'LEM_AWAITING',
      speaker: 'lemu',
      line: [
        { kind: 'speech', english: 'Water.' },
        { kind: 'stage', text: 'small head-tilt toward the well' },
        { kind: 'speech', english: 'Go.' },
      ],
      trigger: { requires: ['met_lemu'], excludes: ['fetch_done_lemu'] },
      options: [
        { english: 'Why water?', kind: 'utterance', react: 'nod',   next: 'LEM_WHY_WATER' },
        { english: 'Well — where?', kind: 'utterance', react: 'point', next: 'LEM_POINT_WELL' },
        { english: '(leave)', kind: 'gesture',   react: 'wave',  next: 'END' },
      ],
    },
    LEM_WHY_WATER: {
      id: 'LEM_WHY_WATER',
      speaker: 'lemu',
      line: [
        { kind: 'speech', english: 'Press is dry. Olives need water in the screw. Old trick.' },
        { kind: 'stage', text: 'half-smile' },
        { kind: 'speech', english: 'Naro will give. She likes you.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'LEM_AWAITING' },
      ],
    },
    LEM_POINT_WELL: {
      id: 'LEM_POINT_WELL',
      speaker: 'lemu',
      line: [
        { kind: 'stage', text: 'jerks her chin north-west' },
        { kind: 'speech', english: 'Two stones over. Naro there. Sign on the path.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'LEM_AWAITING' },
      ],
    },
    // Phase C
    LEM_GIVE_OIL: {
      id: 'LEM_GIVE_OIL',
      speaker: 'lemu',
      line: [
        { kind: 'stage', text: 'she pours your water into the press, turns the wheel three times in silence, then unstoppers a clay flask and fills it from the spout' },
        { kind: 'speech', english: 'Three measures. Enough to start any fire and keep it through wet wind.' },
        { kind: 'stage', text: 'she stoppers it, offers it across the press' },
      ],
      trigger: { requires: ['holding_water'], excludes: ['fetch_done_lemu'] },
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'LEM_HANDOVER_OIL' },
      ],
    },
    LEM_HANDOVER_OIL: {
      id: 'LEM_HANDOVER_OIL',
      speaker: 'lemu',
      line: [
        { kind: 'speech', english: 'Don\'t drop it. Cliff is slick after morning fog.' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'fetch_done_lemu' },
        { kind: 'set_flag', flag: 'holds_item_oil' },
        { kind: 'set_flag', flag: 'holding_water', value: false },
      ],
      options: [
        { english: `${PREDECESSOR_NAME} press oil too?`, kind: 'utterance', react: 'nod',   next: 'LEM_MAREN_PRESS', gatedBy: 'has_visited_hut' },
        { english: `${PREDECESSOR_NAME} — at the end?`, kind: 'utterance', react: 'frown', next: 'LEM_MAREN_END',   gatedBy: 'has_visited_hut' },
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'LEM_POST_ITEM' },
      ],
    },
    LEM_MAREN_PRESS: {
      id: 'LEM_MAREN_PRESS',
      speaker: 'lemu',
      line: [
        { kind: 'speech', english: 'Every press-day for years. They had a hand for the wheel. Could keep the rhythm without watching, which is rare.' },
        { kind: 'stage', text: 'half-smile' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'LEM_HANDOVER_OIL' },
      ],
    },
    LEM_MAREN_END: {
      id: 'LEM_MAREN_END',
      speaker: 'lemu',
      line: [
        { kind: 'stage', text: 'her face closes' },
        { kind: 'speech', english: 'Hala will tell you. Me held them at the press for the goodbye. Words belong to her.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'LEM_HANDOVER_OIL' },
      ],
    },
    // Phase D
    LEM_POST_ITEM: {
      id: 'LEM_POST_ITEM',
      speaker: 'lemu',
      line: [
        { kind: 'speech', english: 'Flint? Toka, shrine. Wood? Senu, forest. Then lighthouse. Hala wait.' },
      ],
      trigger: { requires: ['holds_item_oil'] },
      options: [
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
  },
};

const toka: DialogueTree = {
  npcId: 'toka',
  entries: ['TOK_POST_ITEM', 'TOK_GIVE_FLINT', 'TOK_AWAITING', 'TOK_INITIAL'],
  nodes: {
    // Phase A
    TOK_INITIAL: {
      id: 'TOK_INITIAL',
      speaker: 'toka',
      line: [
        { kind: 'stage', text: 'rests a hand on the staff propped beside him; doesn\'t stand' },
        { kind: 'speech', english: 'Hi. Stop. Hands open.' },
      ],
      trigger: { excludes: ['met_toka'] },
      options: [
        { english: 'Show empty hands.', kind: 'gesture', react: 'nod',  next: 'TOK_HANDS_OPEN' },
        { english: 'Mime the plane crash.', kind: 'gesture', react: 'nod', next: 'TOK_CRASHED' },
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    TOK_HANDS_OPEN: {
      id: 'TOK_HANDS_OPEN',
      speaker: 'toka',
      line: [
        { kind: 'stage', text: 'grunts, half-satisfied' },
        { kind: 'speech', english: 'All right. You\'re new wreck. Stay out of me way until me see what you are.' },
        { kind: 'stage', text: 'taps the striker on his belt' },
        { kind: 'speech', english: 'Me want rope. Go forest. Senu has.' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'met_toka' },
        { kind: 'log_hint', hint: 'toka_wants_rope' },
      ],
      options: [
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    TOK_CRASHED: {
      id: 'TOK_CRASHED',
      speaker: 'toka',
      line: [
        { kind: 'stage', text: 'eyes you, then nods once' },
        { kind: 'speech', english: 'Like the last one. Walk west, find their hut, read what they wrote. Then come back. Me want rope, you bring.' },
        { kind: 'stage', text: 'small slap on his belt' },
        { kind: 'speech', english: 'Then talk.' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'met_toka' },
        { kind: 'log_hint', hint: 'toka_wants_rope' },
        { kind: 'log_hint', hint: 'hut_west' },
        { kind: 'log_hint', hint: 'hut_has_journal' },
      ],
      options: [
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    // Phase B
    TOK_AWAITING: {
      id: 'TOK_AWAITING',
      speaker: 'toka',
      line: [
        { kind: 'speech', english: 'Rope. Senu. Forest.' },
        { kind: 'stage', text: 'taps his striker' },
        { kind: 'speech', english: 'Me wait.' },
      ],
      trigger: { requires: ['met_toka'], excludes: ['fetch_done_toka'] },
      options: [
        { english: 'Why rope?', kind: 'utterance', react: 'nod',   next: 'TOK_WHY_ROPE' },
        { english: 'Senu — where?', kind: 'utterance', react: 'point', next: 'TOK_POINT_FOREST' },
        { english: '(leave)', kind: 'gesture',   react: 'wave',  next: 'END' },
      ],
    },
    TOK_WHY_ROPE: {
      id: 'TOK_WHY_ROPE',
      speaker: 'toka',
      line: [
        { kind: 'speech', english: 'Shrine roof. Wind tore the binding. Old rope is salt-rot. Need new — Senu cuts good fibre.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'TOK_AWAITING' },
      ],
    },
    TOK_POINT_FOREST: {
      id: 'TOK_POINT_FOREST',
      speaker: 'toka',
      line: [
        { kind: 'stage', text: 'points south-west, past the shrine and down a path' },
        { kind: 'speech', english: 'Trees. Sign at fork. Go.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'TOK_AWAITING' },
      ],
    },
    // Phase C
    TOK_GIVE_FLINT: {
      id: 'TOK_GIVE_FLINT',
      speaker: 'toka',
      line: [
        { kind: 'stage', text: 'takes the rope, weighs it, ties a quick test-knot, then unties' },
        { kind: 'speech', english: 'Good. Senu\'s hand still.' },
        { kind: 'stage', text: 'unties the striker, weighs it in his palm, then closes your hand around it' },
        { kind: 'speech', english: 'Don\'t lose it. Second-oldest thing on this island. After Hala.' },
        { kind: 'stage', text: 'half-grin' },
      ],
      trigger: { requires: ['holding_rope'], excludes: ['fetch_done_toka'] },
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'TOK_HANDOVER_FLINT' },
      ],
    },
    TOK_HANDOVER_FLINT: {
      id: 'TOK_HANDOVER_FLINT',
      speaker: 'toka',
      line: [
        { kind: 'speech', english: 'Strike sharp, not hard. Wind on the cliff will do half the work.' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'fetch_done_toka' },
        { kind: 'set_flag', flag: 'holds_item_flint' },
        { kind: 'set_flag', flag: 'holding_rope', value: false },
      ],
      options: [
        { english: `${PREDECESSOR_NAME} ask you too?`, kind: 'utterance', react: 'laugh', next: 'TOK_MAREN_FLINT',  gatedBy: 'has_visited_hut' },
        { english: 'Why you say like that?', kind: 'utterance', react: 'frown', next: 'TOK_WHY_LIKE_THAT', gatedBy: 'has_visited_hut' },
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'TOK_POST_ITEM' },
      ],
    },
    TOK_MAREN_FLINT: {
      id: 'TOK_MAREN_FLINT',
      speaker: 'toka',
      line: [
        { kind: 'speech', english: 'They asked me three times before me gave it. Each time more politely. The third was almost a song.' },
        { kind: 'stage', text: 'quiet laugh' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'TOK_HANDOVER_FLINT' },
      ],
    },
    TOK_WHY_LIKE_THAT: {
      id: 'TOK_WHY_LIKE_THAT',
      speaker: 'toka',
      line: [
        { kind: 'stage', text: `looks past you, toward the lighthouse` },
        { kind: 'speech', english: `Because Hala will not have an easy week. Light the lamp anyway. We owed ${PREDECESSOR_NAME} their leaving and we owe you yours.` },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'TOK_HANDOVER_FLINT' },
      ],
    },
    // Phase D
    TOK_POST_ITEM: {
      id: 'TOK_POST_ITEM',
      speaker: 'toka',
      line: [
        { kind: 'speech', english: 'Lighthouse, south. Path forks at the shrine — you know the way. Hala will be inside. Door opens for fire.' },
      ],
      trigger: { requires: ['holds_item_flint'] },
      options: [
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
  },
};

const senu: DialogueTree = {
  npcId: 'senu',
  entries: ['SEN_POST_ITEM', 'SEN_GIVE_WOOD', 'SEN_AWAITING', 'SEN_INITIAL'],
  nodes: {
    // Phase A
    SEN_INITIAL: {
      id: 'SEN_INITIAL',
      speaker: 'senu',
      line: [
        { kind: 'stage', text: 'he straightens from the splitting block, axe head down, palms wide' },
        { kind: 'speech', english: 'Hi.' },
      ],
      trigger: { excludes: ['met_senu'] },
      options: [
        { english: 'Hi. Me — me. (point at self)', kind: 'utterance', react: 'nod', next: 'SEN_GREETING' },
        { english: 'Look at the woodpile.', kind: 'gesture',   react: 'nod', next: 'SEN_WOODPILE' },
        { english: '(leave)', kind: 'gesture',   react: 'wave', next: 'END' },
      ],
    },
    SEN_GREETING: {
      id: 'SEN_GREETING',
      speaker: 'senu',
      line: [
        { kind: 'stage', text: 'nods slowly' },
        { kind: 'speech', english: 'Senu. You — new. Plane?' },
        { kind: 'stage', text: 'small grunt of confirmation when you nod' },
        { kind: 'speech', english: 'Me want basket. Go well. Naro weave. Bring.' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'met_senu' },
        { kind: 'log_hint', hint: 'senu_wants_basket' },
      ],
      options: [
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    SEN_WOODPILE: {
      id: 'SEN_WOODPILE',
      speaker: 'senu',
      line: [
        { kind: 'stage', text: 'taps a stack of seasoned logs' },
        { kind: 'speech', english: 'Wood. Dry, season. For lighthouse, yes? Last one took some too.' },
        { kind: 'stage', text: 'beat' },
        { kind: 'speech', english: 'Me want basket first. Naro has. Go well.' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'met_senu' },
        { kind: 'log_hint', hint: 'senu_wants_basket' },
        { kind: 'log_hint', hint: 'lighthouse_needs_wood' },
      ],
      options: [
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    // Phase B
    SEN_AWAITING: {
      id: 'SEN_AWAITING',
      speaker: 'senu',
      line: [
        { kind: 'speech', english: 'Basket. Naro.' },
        { kind: 'stage', text: 'picks up another log' },
        { kind: 'speech', english: 'Me wait.' },
      ],
      trigger: { requires: ['met_senu'], excludes: ['fetch_done_senu'] },
      options: [
        { english: 'Why basket?', kind: 'utterance', react: 'nod',   next: 'SEN_WHY_BASKET' },
        { english: 'Naro — where?', kind: 'utterance', react: 'point', next: 'SEN_POINT_WELL' },
        { english: '(leave)', kind: 'gesture',   react: 'wave',  next: 'END' },
      ],
    },
    SEN_WHY_BASKET: {
      id: 'SEN_WHY_BASKET',
      speaker: 'senu',
      line: [
        { kind: 'speech', english: 'Carry seasoned wood without splinter-drop. My old one cracked.' },
        { kind: 'stage', text: 'shrugs' },
        { kind: 'speech', english: 'Naro weaves better. Trade fair: basket, wood.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'SEN_AWAITING' },
      ],
    },
    SEN_POINT_WELL: {
      id: 'SEN_POINT_WELL',
      speaker: 'senu',
      line: [
        { kind: 'stage', text: 'jerks his chin north-east' },
        { kind: 'speech', english: 'Past shrine. Up the path. Sign there. Go.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'SEN_AWAITING' },
      ],
    },
    // Phase C
    SEN_GIVE_WOOD: {
      id: 'SEN_GIVE_WOOD',
      speaker: 'senu',
      line: [
        { kind: 'stage', text: 'takes the basket, runs a thumb along the weave, nods once' },
        { kind: 'speech', english: 'Good hand still.' },
        { kind: 'stage', text: 'loads a bundle of seasoned logs into the basket and lifts it back into your arms' },
        { kind: 'speech', english: 'Wood. For the lighthouse.' },
        { kind: 'stage', text: 'steps back, dusts his palms' },
      ],
      trigger: { requires: ['holding_basket'], excludes: ['fetch_done_senu'] },
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'SEN_HANDOVER_WOOD' },
      ],
    },
    SEN_HANDOVER_WOOD: {
      id: 'SEN_HANDOVER_WOOD',
      speaker: 'senu',
      line: [
        { kind: 'speech', english: 'Mind your steps. Path bends near the bramble.' },
      ],
      sideEffects: [
        { kind: 'set_flag', flag: 'fetch_done_senu' },
        { kind: 'set_flag', flag: 'holds_item_wood' },
        { kind: 'set_flag', flag: 'holding_basket', value: false },
      ],
      options: [
        { english: `${PREDECESSOR_NAME} cut wood with you?`, kind: 'utterance', react: 'nod',   next: 'SEN_MAREN_WOOD', gatedBy: 'has_visited_hut' },
        { english: 'Why so quiet today?', kind: 'utterance', react: 'frown', next: 'SEN_QUIET_TODAY', gatedBy: 'has_visited_hut' },
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'SEN_POST_ITEM' },
      ],
    },
    SEN_MAREN_WOOD: {
      id: 'SEN_MAREN_WOOD',
      speaker: 'senu',
      line: [
        { kind: 'speech', english: 'Three winters they came every dawn. Quiet like me. We cut, we did not need words.' },
        { kind: 'stage', text: 'small, real smile' },
        { kind: 'speech', english: 'When they left, the woodpile felt loud.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'SEN_HANDOVER_WOOD' },
      ],
    },
    SEN_QUIET_TODAY: {
      id: 'SEN_QUIET_TODAY',
      speaker: 'senu',
      line: [
        { kind: 'stage', text: 'beat; looks toward the lighthouse over the trees' },
        { kind: 'speech', english: 'Because today there will be a fire there again. Twenty winters since the last.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'SEN_HANDOVER_WOOD' },
      ],
    },
    // Phase D
    SEN_POST_ITEM: {
      id: 'SEN_POST_ITEM',
      speaker: 'senu',
      line: [
        { kind: 'speech', english: 'Oil, Lemu. Flint, Toka. Then lighthouse. Hala open the door for fire, not for talk.' },
      ],
      trigger: { requires: ['holds_item_wood'] },
      options: [
        { english: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
  },
};

// Hala — full climax tree per §4.6. Entry priority:
//   1. HAL_DOOR_OPENS — all 3 critical items (wood/oil/flint) → climax tree
//   2. HAL_SOME_ITEMS — met but missing items → "Almost"
//   3. HAL_INITIAL    — first approach → "Not yet"
const hala: DialogueTree = {
  npcId: 'hala',
  entries: ['HAL_DOOR_OPENS', 'HAL_SOME_ITEMS', 'HAL_INITIAL'],
  nodes: {
    // Phase A — door closed
    HAL_INITIAL: {
      id: 'HAL_INITIAL',
      speaker: 'hala',
      line: [
        { kind: 'stage', text: 'her voice through the closed lighthouse door' },
        { kind: 'speech', english: 'Not yet.' },
      ],
      trigger: { excludes: ['met_hala'] },
      sideEffects: [{ kind: 'set_flag', flag: 'met_hala' }],
      options: [
        { english: 'Not yet — what?', kind: 'utterance', react: 'puzzle',     next: 'HAL_NOT_YET' },
        { english: 'Try the door.', kind: 'gesture',   react: 'shake_head', next: 'HAL_DOOR_LOCKED' },
        { english: '(leave)', kind: 'gesture',   react: 'none',       next: 'END' },
      ],
    },
    HAL_NOT_YET: {
      id: 'HAL_NOT_YET',
      speaker: 'hala',
      line: [
        { kind: 'stage', text: 'through the door' },
        { kind: 'speech', english: 'Not yet your turn to talk to me. Walk west first. Read what was left for you. Then ask the four for what me need.' },
      ],
      sideEffects: [
        { kind: 'log_hint', hint: 'hut_west' },
        { kind: 'log_hint', hint: 'ask_four_npcs' },
      ],
      options: [
        { english: '(leave)', kind: 'gesture', react: 'none', next: 'END' },
      ],
    },
    HAL_DOOR_LOCKED: {
      id: 'HAL_DOOR_LOCKED',
      speaker: 'hala',
      line: [
        { kind: 'stage', text: 'through the door' },
        { kind: 'speech', english: 'Door opens for fire. Bring it.' },
      ],
      options: [
        { english: '(leave)', kind: 'gesture', react: 'none', next: 'END' },
      ],
    },
    // Phase B — met but missing items
    HAL_SOME_ITEMS: {
      id: 'HAL_SOME_ITEMS',
      speaker: 'hala',
      line: [
        { kind: 'stage', text: 'through the door, slight smile in her voice' },
        { kind: 'speech', english: 'Almost. Bring me a fire, not three things in your arms.' },
      ],
      trigger: { requires: ['met_hala'] },
      options: [
        { english: '(leave)', kind: 'gesture', react: 'none', next: 'END' },
      ],
    },
    // Phase C — door opens with all three items
    HAL_DOOR_OPENS: {
      id: 'HAL_DOOR_OPENS',
      speaker: 'hala',
      line: [
        { kind: 'stage', text: 'The lighthouse door creaks open. A warm light spills out. Inside, an old woman stands beside a stone hearth. She is the chief — Hala.' },
        { kind: 'stage', text: 'she steps aside to let you in' },
        { kind: 'speech', english: 'Come.' },
      ],
      trigger: { requires: ['holds_item_wood', 'holds_item_oil', 'holds_item_flint'] },
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'HAL_BEACON_OPEN' },
      ],
    },
    // Phase D — climax tree (all stock-line per §4.6)
    HAL_BEACON_OPEN: {
      id: 'HAL_BEACON_OPEN',
      speaker: 'hala',
      stockLine: true,
      line: [
        { kind: 'stage', text: 'stands beside the unlit hearth; lays a hand on the stone ring' },
        { kind: 'speech', english: 'There. Same fire. Same air. Twenty winters and the same wind through the chimney.' },
      ],
      options: [
        { english: `You knew ${PREDECESSOR_NAME}.`, kind: 'utterance', react: 'nod',   next: 'HAL_KNEW_MAREN' },
        { english: `${PREDECESSOR_NAME} go home?`, kind: 'utterance', react: 'nod',   next: 'HAL_DID_MAREN' },
        { english: 'Why you cry?', kind: 'utterance', react: 'frown', next: 'HAL_WHY_CRYING' },
        { english: '(silent, place the wood)', kind: 'gesture',   react: 'none',  next: 'HAL_WAIT' },
      ],
    },
    HAL_KNEW_MAREN: {
      id: 'HAL_KNEW_MAREN',
      speaker: 'hala',
      stockLine: true,
      line: [
        { kind: 'speech', english: 'Knew. We sat together every dusk for nineteen years. They learned our words. Me never learned theirs — not really. We didn\'t need to.' },
        { kind: 'stage', text: 'she meets your eyes for the first time' },
      ],
      options: [
        { english: 'Tell me — the end.', kind: 'utterance', react: 'nod', next: 'HAL_END_STORY' },
        { english: 'Letter — still come?', kind: 'utterance', react: 'nod', next: 'HAL_LETTER' },
        { english: 'Were you — love?', kind: 'utterance', react: 'nod', next: 'HAL_LOVE' },
      ],
    },
    HAL_DID_MAREN: {
      id: 'HAL_DID_MAREN',
      speaker: 'hala',
      stockLine: true,
      line: [
        { kind: 'speech', english: 'Yes. Boat saw the fire that night. They went up the rope ladder and turned once at the top to look back. Then ship went on.' },
        { kind: 'stage', text: 'beat' },
        { kind: 'speech', english: 'A year later, wind brought a folded paper in a fishing net.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'HAL_LETTER' },
      ],
    },
    HAL_WHY_CRYING: {
      id: 'HAL_WHY_CRYING',
      speaker: 'hala',
      stockLine: true,
      line: [
        { kind: 'speech', english: 'Because the fire reminds me. Because you remind me. Because me always thought there\'d only be one.' },
        { kind: 'stage', text: 'she touches the stone of the hearth' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'HAL_BEACON_OPEN' },
      ],
    },
    HAL_WAIT: {
      id: 'HAL_WAIT',
      speaker: 'hala',
      line: [
        { kind: 'stage', text: 'after a long quiet' },
        { kind: 'speech', english: 'It\'s all right. There\'s no rush now. Boat that comes for you won\'t come until first light.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'HAL_BEACON_OPEN' },
      ],
    },
    HAL_END_STORY: {
      id: 'HAL_END_STORY',
      speaker: 'hala',
      stockLine: true,
      line: [
        { kind: 'speech', english: 'They woke one morning and said it\'s time, isn\'t it. Me said yes, because it was. We lit this lighthouse together. Boat came at dawn. They left me a smooth river-stone and a name they\'d written down — yours and mine on the same page — and they went.' },
      ],
      options: [
        { english: 'Right choice?', kind: 'utterance', react: 'nod',   next: 'HAL_RIGHT_CHOICE' },
        { english: 'Did they want to stay?', kind: 'utterance', react: 'frown', next: 'HAL_WANTED_STAY' },
        { english: 'Me — same question?', kind: 'utterance', react: 'nod',   next: 'HAL_QUESTION' },
      ],
    },
    HAL_LETTER: {
      id: 'HAL_LETTER',
      speaker: 'hala',
      stockLine: true,
      line: [
        { kind: 'speech', english: 'Six lines. They had taught their family our words. They said the bread on their side of the world was the wrong shape. They said the sea was louder there.' },
        { kind: 'stage', text: 'small laugh' },
        { kind: 'speech', english: 'We read it once a year. Whole village.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'HAL_END_STORY' },
      ],
    },
    HAL_LOVE: {
      id: 'HAL_LOVE',
      speaker: 'hala',
      stockLine: true,
      line: [
        { kind: 'stage', text: 'long beat; she is honest' },
        { kind: 'speech', english: 'Me don\'t know what your word for it is. Me don\'t even know if me have one in mine. We were each other\'s. That is what me have.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'HAL_END_STORY' },
      ],
    },
    HAL_RIGHT_CHOICE: {
      id: 'HAL_RIGHT_CHOICE',
      speaker: 'hala',
      line: [
        { kind: 'speech', english: 'It was the choice they could live with. Both choices are real. Neither is better. The wrong one is the one you can\'t believe in.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'HAL_QUESTION' },
      ],
    },
    HAL_WANTED_STAY: {
      id: 'HAL_WANTED_STAY',
      speaker: 'hala',
      line: [
        { kind: 'stage', text: 'tilts her head' },
        { kind: 'speech', english: 'Some days. So did me, want them to. They went anyway. They were right to.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'HAL_QUESTION' },
      ],
    },
    HAL_QUESTION: {
      id: 'HAL_QUESTION',
      speaker: 'hala',
      stockLine: true,
      line: [
        { kind: 'stage', text: 'she takes both your hands; the hearth catches behind her, oil flaring; the lighthouse lamp turns and throws a beam out to sea' },
        { kind: 'speech', english: 'So me ask you, the way me asked them. Boat comes at first light. You go, or you stay?' },
      ],
      options: [
        { english: 'Me go.', kind: 'utterance', react: 'nod', next: 'END_LEAVE' },
        { english: 'Me stay.', kind: 'utterance', react: 'nod', next: 'END_STAY' },
        { english: 'Wait — me think.', kind: 'utterance', react: 'nod', next: 'HAL_MOMENT' },
      ],
    },
    HAL_MOMENT: {
      id: 'HAL_MOMENT',
      speaker: 'hala',
      line: [
        { kind: 'stage', text: 'nods' },
        { kind: 'speech', english: 'Take it. The fire will keep.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'HAL_QUESTION' },
      ],
    },
    // Endings — these fire the EndScreen overlay via the encounter event,
    // which listens for nodeId END_LEAVE / END_STAY.
    END_LEAVE: {
      id: 'END_LEAVE',
      speaker: 'hala',
      stockLine: true,
      line: [
        { kind: 'stage', text: 'she lets go of your hands and steps back' },
        { kind: 'speech', english: 'Then go. Take a memory of us with you. We\'ll read your letter, when it comes.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'END' },
      ],
    },
    END_STAY: {
      id: 'END_STAY',
      speaker: 'hala',
      stockLine: true,
      line: [
        { kind: 'stage', text: 'her face cracks into a smile she didn\'t expect' },
        { kind: 'speech', english: 'Then come. Bread is still warm at Naro\'s. There\'s a stool at Lemu\'s press for you. Senu has a second axe.' },
      ],
      options: [
        { english: '…', kind: 'gesture', react: 'none', next: 'END' },
      ],
    },
  },
};

attachFrames(pemi, { lines: PEMI_LINE_FRAMES, options: PEMI_OPTION_FRAMES });
attachFrames(naro, { lines: NARO_LINE_FRAMES, options: NARO_OPTION_FRAMES });
attachFrames(lemu, { lines: LEMU_LINE_FRAMES, options: LEMU_OPTION_FRAMES });
attachFrames(toka, { lines: TOKA_LINE_FRAMES, options: TOKA_OPTION_FRAMES });
attachFrames(senu, { lines: SENU_LINE_FRAMES, options: SENU_OPTION_FRAMES });
attachFrames(hala, { lines: HALA_LINE_FRAMES, options: HALA_OPTION_FRAMES });

export const DIALOGUE_TREES: Record<NpcId, DialogueTree> = {
  pemi, naro, lemu, toka, senu, hala,
};
