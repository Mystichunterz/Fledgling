import type { DialogueTree, NpcId } from './dialogueTypes';

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
  // Most-specific phase first.
  entries: ['NAR_POST_FRUIT', 'NAR_GIVE_FRUIT', 'NAR_AWAITING', 'NAR_INITIAL'],
  nodes: {
    // Phase A
    NAR_INITIAL: {
      id: 'NAR_INITIAL',
      speaker: 'naro',
      line: '(she sets down a half-woven basket; she looks up, unsurprised) "Hi. Me Naro. You?"',
      trigger: { excludes: ['met_naro'] },
      options: [
        { text: 'Hi. Me — me. (point at self)', kind: 'utterance', react: 'nod',    next: 'NAR_GREETING' },
        { text: 'Stay silent, look around the well.', kind: 'gesture', react: 'puzzle', next: 'NAR_QUIET' },
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    NAR_GREETING: {
      id: 'NAR_GREETING',
      speaker: 'naro',
      line: '(small smile) "Good. Hi, you. Sea brings who it brings." (beat) "Me want fruit. You go forest. Bring."',
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
        { text: '…', kind: 'gesture', react: 'none', next: 'NAR_BREAD' },
      ],
    },
    NAR_QUIET: {
      id: 'NAR_QUIET',
      speaker: 'naro',
      line: '(she resumes weaving without rushing you) "All right. Me weave, you look. When you ready: me want fruit. Go forest." (she points west with her chin)',
      sideEffects: [
        { kind: 'set_flag', flag: 'met_naro' },
        { kind: 'set_anchor', anchor: 'me' },
        { kind: 'set_anchor', anchor: 'you' },
        { kind: 'set_anchor', anchor: 'want' },
        { kind: 'set_anchor', anchor: 'go' },
        { kind: 'log_hint', hint: 'forest_for_fruit' },
      ],
      options: [
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    NAR_BREAD: {
      id: 'NAR_BREAD',
      speaker: 'naro',
      line: '(she gestures at a small stack of loaves) "Bread for fruit. Fair?" (she breaks off a piece, hands it to you to eat now) "Hi, you."',
      options: [
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    // Phase B
    NAR_AWAITING: {
      id: 'NAR_AWAITING',
      speaker: 'naro',
      line: '(without lifting her eyes) "Me want fruit. Go forest. Bring."',
      trigger: { requires: ['met_naro'], excludes: ['fetch_done_naro'] },
      options: [
        { text: 'Forest — where?', kind: 'utterance', react: 'point',  next: 'NAR_POINT_FOREST' },
        { text: 'Fruit — what?',   kind: 'utterance', react: 'puzzle', next: 'NAR_DESCRIBE_FRUIT' },
        { text: '(leave)',         kind: 'gesture',   react: 'wave',   next: 'END' },
      ],
    },
    NAR_POINT_FOREST: {
      id: 'NAR_POINT_FOREST',
      speaker: 'naro',
      line: '(points west and slightly south with the basket-needle) "Path past shrine. Sign there. Go."',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'NAR_AWAITING' },
      ],
    },
    NAR_DESCRIBE_FRUIT: {
      id: 'NAR_DESCRIBE_FRUIT',
      speaker: 'naro',
      line: '(makes a round shape with both hands, hums) "Round. Red. Tree." (taps her cheek) "Sweet."',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'NAR_AWAITING' },
      ],
    },
    // Phase C
    NAR_GIVE_FRUIT: {
      id: 'NAR_GIVE_FRUIT',
      speaker: 'naro',
      line: '(she takes the fruit, weighs it, smells it) "Good. You learn fast." (presses a fresh loaf into your hands) "Bread. Yours."',
      trigger: { requires: ['holding_fruit'], excludes: ['fetch_done_naro'] },
      sideEffects: [
        { kind: 'set_flag', flag: 'fetch_done_naro' },
        { kind: 'set_flag', flag: 'holding_fruit', value: false },
      ],
      options: [
        { text: 'What now?', kind: 'utterance', react: 'nod',  next: 'NAR_NEXT_HINT' },
        { text: `Tell me about ${PREDECESSOR_NAME}.`, kind: 'utterance', react: 'nod', next: 'NAR_ABOUT_MAREN', gatedBy: 'has_visited_hut' },
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'NAR_POST_FRUIT' },
      ],
    },
    NAR_NEXT_HINT: {
      id: 'NAR_NEXT_HINT',
      speaker: 'naro',
      line: '"Lemu, firepit. Want water. Toka, shrine. Want rope. Senu, forest. Want basket. And — you go west, cliff path. Hut. Read what is there."',
      sideEffects: [
        { kind: 'log_hint', hint: 'hut_west' },
        { kind: 'log_hint', hint: 'hut_has_journal' },
      ],
      options: [
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    NAR_ABOUT_MAREN: {
      id: 'NAR_ABOUT_MAREN',
      speaker: 'naro',
      line: `"${PREDECESSOR_NAME} sat at this well a year before they could ask for water without pointing. We sang to teach them — daft songs, mostly about the weather." (she smiles) "You? Faster."`,
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'NAR_GIVE_FRUIT' },
      ],
    },
    // Phase D
    NAR_POST_FRUIT: {
      id: 'NAR_POST_FRUIT',
      speaker: 'naro',
      line: '(she hands you a small linen-wrapped crust each time) "Bread, yours. Lighthouse, south. Hala wait."',
      trigger: { requires: ['fetch_done_naro'] },
      options: [
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
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
      line: "(she's leaning on the stone press, watching the sea past the firepit smoke) \"Hi. Lemu. Plane brought you. Loud thing.\"",
      trigger: { excludes: ['met_lemu'] },
      options: [
        { text: 'You — see?',           kind: 'utterance', react: 'nod',  next: 'LEM_SAW_PLANE' },
        { text: 'Mime the plane falling.', kind: 'gesture', react: 'nod',  next: 'LEM_SAW_PLANE' },
        { text: 'Look at the press with her.', kind: 'gesture', react: 'none', next: 'LEM_SEA' },
        { text: '(leave)',              kind: 'gesture',   react: 'wave', next: 'END' },
      ],
    },
    LEM_SAW_PLANE: {
      id: 'LEM_SAW_PLANE',
      speaker: 'lemu',
      line: '"Heard it. Like the last one — twenty winters. Me knew before me looked." (she nods toward the firepit) "Me want water. Go well. Naro know."',
      sideEffects: [
        { kind: 'set_flag', flag: 'met_lemu' },
        { kind: 'log_hint', hint: 'lemu_wants_water' },
      ],
      options: [
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    LEM_SEA: {
      id: 'LEM_SEA',
      speaker: 'lemu',
      line: '(after a long beat) "Boats come every two months. Next one will see your fire if you light it." (taps the press) "Oil for fire. Me want water first. Go well."',
      sideEffects: [
        { kind: 'set_flag', flag: 'met_lemu' },
        { kind: 'log_hint', hint: 'lemu_wants_water' },
        { kind: 'log_hint', hint: 'lighthouse_signal' },
      ],
      options: [
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    // Phase B
    LEM_AWAITING: {
      id: 'LEM_AWAITING',
      speaker: 'lemu',
      line: '"Water." (small head-tilt toward the well) "Go."',
      trigger: { requires: ['met_lemu'], excludes: ['fetch_done_lemu'] },
      options: [
        { text: 'Why water?',    kind: 'utterance', react: 'nod',   next: 'LEM_WHY_WATER' },
        { text: 'Well — where?', kind: 'utterance', react: 'point', next: 'LEM_POINT_WELL' },
        { text: '(leave)',       kind: 'gesture',   react: 'wave',  next: 'END' },
      ],
    },
    LEM_WHY_WATER: {
      id: 'LEM_WHY_WATER',
      speaker: 'lemu',
      line: '"Press is dry. Olives need water in the screw. Old trick." (half-smile) "Naro will give. She likes you."',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'LEM_AWAITING' },
      ],
    },
    LEM_POINT_WELL: {
      id: 'LEM_POINT_WELL',
      speaker: 'lemu',
      line: '(jerks her chin north-west) "Two stones over. Naro there. Sign on the path."',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'LEM_AWAITING' },
      ],
    },
    // Phase C
    LEM_GIVE_OIL: {
      id: 'LEM_GIVE_OIL',
      speaker: 'lemu',
      line: '(she pours your water into the press, turns the wheel three times in silence, then unstoppers a clay flask and fills it from the spout) "Three measures. Enough to start any fire and keep it through wet wind." (she stoppers it, offers it across the press)',
      trigger: { requires: ['holding_water'], excludes: ['fetch_done_lemu'] },
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'LEM_HANDOVER_OIL' },
      ],
    },
    LEM_HANDOVER_OIL: {
      id: 'LEM_HANDOVER_OIL',
      speaker: 'lemu',
      line: '"Don\'t drop it. Cliff is slick after morning fog."',
      sideEffects: [
        { kind: 'set_flag', flag: 'fetch_done_lemu' },
        { kind: 'set_flag', flag: 'holds_item_oil' },
        { kind: 'set_flag', flag: 'holding_water', value: false },
      ],
      options: [
        { text: `${PREDECESSOR_NAME} press oil too?`, kind: 'utterance', react: 'nod',   next: 'LEM_MAREN_PRESS', gatedBy: 'has_visited_hut' },
        { text: `${PREDECESSOR_NAME} — at the end?`,   kind: 'utterance', react: 'frown', next: 'LEM_MAREN_END',   gatedBy: 'has_visited_hut' },
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'LEM_POST_ITEM' },
      ],
    },
    LEM_MAREN_PRESS: {
      id: 'LEM_MAREN_PRESS',
      speaker: 'lemu',
      line: '"Every press-day for years. They had a hand for the wheel. Could keep the rhythm without watching, which is rare." (half-smile)',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'LEM_HANDOVER_OIL' },
      ],
    },
    LEM_MAREN_END: {
      id: 'LEM_MAREN_END',
      speaker: 'lemu',
      line: '(her face closes) "Hala will tell you. Me held them at the press for the goodbye. Words belong to her."',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'LEM_HANDOVER_OIL' },
      ],
    },
    // Phase D
    LEM_POST_ITEM: {
      id: 'LEM_POST_ITEM',
      speaker: 'lemu',
      line: '"Flint? Toka, shrine. Wood? Senu, forest. Then lighthouse. Hala wait."',
      trigger: { requires: ['holds_item_oil'] },
      options: [
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
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
      line: '(rests a hand on the staff propped beside him; doesn\'t stand) "Hi. Stop. Hands open."',
      trigger: { excludes: ['met_toka'] },
      options: [
        { text: 'Show empty hands.',  kind: 'gesture', react: 'nod',  next: 'TOK_HANDS_OPEN' },
        { text: 'Mime the plane crash.', kind: 'gesture', react: 'nod', next: 'TOK_CRASHED' },
        { text: '(leave)',            kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    TOK_HANDS_OPEN: {
      id: 'TOK_HANDS_OPEN',
      speaker: 'toka',
      line: "(grunts, half-satisfied) \"All right. You're new wreck. Stay out of me way until me see what you are.\" (taps the striker on his belt) \"Me want rope. Go forest. Senu has.\"",
      sideEffects: [
        { kind: 'set_flag', flag: 'met_toka' },
        { kind: 'log_hint', hint: 'toka_wants_rope' },
      ],
      options: [
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    TOK_CRASHED: {
      id: 'TOK_CRASHED',
      speaker: 'toka',
      line: '(eyes you, then nods once) "Like the last one. Walk west, find their hut, read what they wrote. Then come back. Me want rope, you bring." (small slap on his belt) "Then talk."',
      sideEffects: [
        { kind: 'set_flag', flag: 'met_toka' },
        { kind: 'log_hint', hint: 'toka_wants_rope' },
        { kind: 'log_hint', hint: 'hut_west' },
        { kind: 'log_hint', hint: 'hut_has_journal' },
      ],
      options: [
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    // Phase B
    TOK_AWAITING: {
      id: 'TOK_AWAITING',
      speaker: 'toka',
      line: '"Rope. Senu. Forest." (taps his striker) "Me wait."',
      trigger: { requires: ['met_toka'], excludes: ['fetch_done_toka'] },
      options: [
        { text: 'Why rope?',     kind: 'utterance', react: 'nod',   next: 'TOK_WHY_ROPE' },
        { text: 'Senu — where?', kind: 'utterance', react: 'point', next: 'TOK_POINT_FOREST' },
        { text: '(leave)',       kind: 'gesture',   react: 'wave',  next: 'END' },
      ],
    },
    TOK_WHY_ROPE: {
      id: 'TOK_WHY_ROPE',
      speaker: 'toka',
      line: '"Shrine roof. Wind tore the binding. Old rope is salt-rot. Need new — Senu cuts good fibre."',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'TOK_AWAITING' },
      ],
    },
    TOK_POINT_FOREST: {
      id: 'TOK_POINT_FOREST',
      speaker: 'toka',
      line: '(points south-west, past the shrine and down a path) "Trees. Sign at fork. Go."',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'TOK_AWAITING' },
      ],
    },
    // Phase C
    TOK_GIVE_FLINT: {
      id: 'TOK_GIVE_FLINT',
      speaker: 'toka',
      line: "(takes the rope, weighs it, ties a quick test-knot, then unties) \"Good. Senu's hand still.\" (unties the striker, weighs it in his palm, then closes your hand around it) \"Don't lose it. Second-oldest thing on this island. After Hala.\" (half-grin)",
      trigger: { requires: ['holding_rope'], excludes: ['fetch_done_toka'] },
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'TOK_HANDOVER_FLINT' },
      ],
    },
    TOK_HANDOVER_FLINT: {
      id: 'TOK_HANDOVER_FLINT',
      speaker: 'toka',
      line: '"Strike sharp, not hard. Wind on the cliff will do half the work."',
      sideEffects: [
        { kind: 'set_flag', flag: 'fetch_done_toka' },
        { kind: 'set_flag', flag: 'holds_item_flint' },
        { kind: 'set_flag', flag: 'holding_rope', value: false },
      ],
      options: [
        { text: `${PREDECESSOR_NAME} ask you too?`, kind: 'utterance', react: 'laugh', next: 'TOK_MAREN_FLINT',  gatedBy: 'has_visited_hut' },
        { text: 'Why you say like that?',           kind: 'utterance', react: 'frown', next: 'TOK_WHY_LIKE_THAT', gatedBy: 'has_visited_hut' },
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'TOK_POST_ITEM' },
      ],
    },
    TOK_MAREN_FLINT: {
      id: 'TOK_MAREN_FLINT',
      speaker: 'toka',
      line: '"They asked me three times before me gave it. Each time more politely. The third was almost a song." (quiet laugh)',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'TOK_HANDOVER_FLINT' },
      ],
    },
    TOK_WHY_LIKE_THAT: {
      id: 'TOK_WHY_LIKE_THAT',
      speaker: 'toka',
      line: `(looks past you, toward the lighthouse) "Because Hala will not have an easy week. Light the lamp anyway. We owed ${PREDECESSOR_NAME} their leaving and we owe you yours."`,
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'TOK_HANDOVER_FLINT' },
      ],
    },
    // Phase D
    TOK_POST_ITEM: {
      id: 'TOK_POST_ITEM',
      speaker: 'toka',
      line: '"Lighthouse, south. Path forks at the shrine — you know the way. Hala will be inside. Door opens for fire."',
      trigger: { requires: ['holds_item_flint'] },
      options: [
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
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
      line: '(he straightens from the splitting block, axe head down, palms wide) "Hi."',
      trigger: { excludes: ['met_senu'] },
      options: [
        { text: 'Hi. Me — me. (point at self)', kind: 'utterance', react: 'nod', next: 'SEN_GREETING' },
        { text: 'Look at the woodpile.',         kind: 'gesture',   react: 'nod', next: 'SEN_WOODPILE' },
        { text: '(leave)',                       kind: 'gesture',   react: 'wave', next: 'END' },
      ],
    },
    SEN_GREETING: {
      id: 'SEN_GREETING',
      speaker: 'senu',
      line: '(nods slowly) "Senu. You — new. Plane?" (small grunt of confirmation when you nod) "Me want basket. Go well. Naro weave. Bring."',
      sideEffects: [
        { kind: 'set_flag', flag: 'met_senu' },
        { kind: 'log_hint', hint: 'senu_wants_basket' },
      ],
      options: [
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    SEN_WOODPILE: {
      id: 'SEN_WOODPILE',
      speaker: 'senu',
      line: '(taps a stack of seasoned logs) "Wood. Dry, season. For lighthouse, yes? Last one took some too." (beat) "Me want basket first. Naro has. Go well."',
      sideEffects: [
        { kind: 'set_flag', flag: 'met_senu' },
        { kind: 'log_hint', hint: 'senu_wants_basket' },
        { kind: 'log_hint', hint: 'lighthouse_needs_wood' },
      ],
      options: [
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
    // Phase B
    SEN_AWAITING: {
      id: 'SEN_AWAITING',
      speaker: 'senu',
      line: '"Basket. Naro." (picks up another log) "Me wait."',
      trigger: { requires: ['met_senu'], excludes: ['fetch_done_senu'] },
      options: [
        { text: 'Why basket?',    kind: 'utterance', react: 'nod',   next: 'SEN_WHY_BASKET' },
        { text: 'Naro — where?',  kind: 'utterance', react: 'point', next: 'SEN_POINT_WELL' },
        { text: '(leave)',        kind: 'gesture',   react: 'wave',  next: 'END' },
      ],
    },
    SEN_WHY_BASKET: {
      id: 'SEN_WHY_BASKET',
      speaker: 'senu',
      line: '"Carry seasoned wood without splinter-drop. My old one cracked." (shrugs) "Naro weaves better. Trade fair: basket, wood."',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'SEN_AWAITING' },
      ],
    },
    SEN_POINT_WELL: {
      id: 'SEN_POINT_WELL',
      speaker: 'senu',
      line: '(jerks his chin north-east) "Past shrine. Up the path. Sign there. Go."',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'SEN_AWAITING' },
      ],
    },
    // Phase C
    SEN_GIVE_WOOD: {
      id: 'SEN_GIVE_WOOD',
      speaker: 'senu',
      line: '(takes the basket, runs a thumb along the weave, nods once) "Good hand still." (loads a bundle of seasoned logs into the basket and lifts it back into your arms) "Wood. For the lighthouse." (steps back, dusts his palms)',
      trigger: { requires: ['holding_basket'], excludes: ['fetch_done_senu'] },
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'SEN_HANDOVER_WOOD' },
      ],
    },
    SEN_HANDOVER_WOOD: {
      id: 'SEN_HANDOVER_WOOD',
      speaker: 'senu',
      line: '"Mind your steps. Path bends near the bramble."',
      sideEffects: [
        { kind: 'set_flag', flag: 'fetch_done_senu' },
        { kind: 'set_flag', flag: 'holds_item_wood' },
        { kind: 'set_flag', flag: 'holding_basket', value: false },
      ],
      options: [
        { text: `${PREDECESSOR_NAME} cut wood with you?`, kind: 'utterance', react: 'nod',   next: 'SEN_MAREN_WOOD', gatedBy: 'has_visited_hut' },
        { text: 'Why so quiet today?',                     kind: 'utterance', react: 'frown', next: 'SEN_QUIET_TODAY', gatedBy: 'has_visited_hut' },
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'SEN_POST_ITEM' },
      ],
    },
    SEN_MAREN_WOOD: {
      id: 'SEN_MAREN_WOOD',
      speaker: 'senu',
      line: '"Three winters they came every dawn. Quiet like me. We cut, we did not need words." (small, real smile) "When they left, the woodpile felt loud."',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'SEN_HANDOVER_WOOD' },
      ],
    },
    SEN_QUIET_TODAY: {
      id: 'SEN_QUIET_TODAY',
      speaker: 'senu',
      line: '(beat; looks toward the lighthouse over the trees) "Because today there will be a fire there again. Twenty winters since the last."',
      options: [
        { text: '…', kind: 'gesture', react: 'none', next: 'SEN_HANDOVER_WOOD' },
      ],
    },
    // Phase D
    SEN_POST_ITEM: {
      id: 'SEN_POST_ITEM',
      speaker: 'senu',
      line: '"Oil, Lemu. Flint, Toka. Then lighthouse. Hala open the door for fire, not for talk."',
      trigger: { requires: ['holds_item_wood'] },
      options: [
        { text: '(leave)', kind: 'gesture', react: 'wave', next: 'END' },
      ],
    },
  },
};

// Hala — Phase A stub only. Full climax tree (Phase D) lands with T43 Phase 5
// once the lighthouse-door open and ending screens are wired.
const hala: DialogueTree = {
  npcId: 'hala',
  entries: ['HAL_INITIAL'],
  nodes: {
    HAL_INITIAL: {
      id: 'HAL_INITIAL',
      speaker: 'hala',
      line: '(her voice through the closed lighthouse door) "Not yet."',
      trigger: { excludes: ['met_hala'] },
      sideEffects: [{ kind: 'set_flag', flag: 'met_hala' }],
      options: [
        { text: 'Not yet — what?', kind: 'utterance', react: 'puzzle',     next: 'END' },
        { text: 'Try the door.',   kind: 'gesture',   react: 'shake_head', next: 'END' },
        { text: '(leave)',         kind: 'gesture',   react: 'none',       next: 'END' },
      ],
    },
  },
};

export const DIALOGUE_TREES: Record<NpcId, DialogueTree> = {
  pemi, naro, lemu, toka, senu, hala,
};
