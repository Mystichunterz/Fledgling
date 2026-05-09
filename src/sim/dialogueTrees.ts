import type { DialogueTree, NpcId } from './dialogueTypes';

const pemi: DialogueTree = {
  'pemi.greet': {
    id: 'pemi.greet', speaker: 'npc.pemi',
    line: { en: 'Hi! Hi! You go beach? Pemi go too!' },
    choices: [
      { id: 'hi',     text: { en: 'Hi.' },                  next: 'pemi.hi_back' },
      { id: 'who',    text: { en: 'Who are you?' },         next: 'pemi.intro' },
      { id: 'leave',  text: { en: '[Wave goodbye]' },       next: null },
    ],
  },
  'pemi.hi_back': {
    id: 'pemi.hi_back', speaker: 'npc.pemi',
    line: { en: 'Pemi want fruit! You go well? Lemu have fruit!' },
    choices: [
      { id: 'go',     text: { en: "I'll go to the well." }, next: 'pemi.go_well' },
      { id: 'why',    text: { en: 'Why fruit?' },           next: 'pemi.why_fruit' },
      { id: 'leave',  text: { en: '[Wave goodbye]' },       next: null },
    ],
  },
  'pemi.intro': {
    id: 'pemi.intro', speaker: 'npc.pemi',
    line: { en: 'Me Pemi. You... you?' },
    choices: [
      { id: 'new',    text: { en: "I'm new here." },        next: 'pemi.new' },
      { id: 'smile',  text: { en: '[Smile]' },              next: null },
    ],
  },
  'pemi.go_well': {
    id: 'pemi.go_well', speaker: 'npc.pemi',
    line: { en: 'Yes! Go go! Pemi follow!' },
    choices: [
      { id: 'leave',  text: { en: '[Leave with Pemi]' },    next: null },
    ],
  },
  'pemi.why_fruit': {
    id: 'pemi.why_fruit', speaker: 'npc.pemi',
    line: { en: 'Fruit good! Lemu give. Go!' },
    choices: [
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'pemi.new': {
    id: 'pemi.new', speaker: 'npc.pemi',
    line: { en: 'New! Me know. Boat people. Hala say.' },
    choices: [
      { id: 'who_hala', text: { en: 'Who is Hala?' },       next: 'pemi.who_hala' },
      { id: 'leave',    text: { en: '[Leave]' },            next: null },
    ],
  },
  'pemi.who_hala': {
    id: 'pemi.who_hala', speaker: 'npc.pemi',
    line: { en: 'Hala chief. Lighthouse. Old. You go Hala when fire come.' },
    choices: [
      { id: 'thanks', text: { en: '[Thank Pemi]' },         next: null },
    ],
  },
};

const naro: DialogueTree = {
  'naro.greet': {
    id: 'naro.greet', speaker: 'npc.naro',
    line: { en: 'Hi, fledgling. You walk far. What you want?' },
    choices: [
      { id: 'hi',     text: { en: 'Hi.' },                  next: 'naro.hi_back' },
      { id: 'wood',   text: { en: 'I want wood.' },         next: 'naro.want_wood' },
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'naro.hi_back': {
    id: 'naro.hi_back', speaker: 'npc.naro',
    line: { en: '[she nods] Pemi say you good. Go. Find. Then come.' },
    choices: [
      { id: 'find',   text: { en: 'Find what?' },           next: 'naro.find_what' },
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'naro.want_wood': {
    id: 'naro.want_wood', speaker: 'npc.naro',
    line: { en: 'Wood? You go hut first. Read. Then come back. Wood here.' },
    choices: [
      { id: 'where',  text: { en: 'Where is hut?' },        next: 'naro.hut_where' },
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'naro.find_what': {
    id: 'naro.find_what', speaker: 'npc.naro',
    line: { en: 'The hut. West path. Maren leave words. Read first, ask later.' },
    choices: [
      { id: 'maren',  text: { en: 'Who is Maren?' },        next: 'naro.who_maren' },
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'naro.who_maren': {
    id: 'naro.who_maren', speaker: 'npc.naro',
    line: { en: '[her smile dims] Hala will tell. Go ask Hala. I have wood when you come back.' },
    choices: [
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'naro.hut_where': {
    id: 'naro.hut_where', speaker: 'npc.naro',
    line: { en: 'West. Cliff path. You will see.' },
    choices: [
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
};

const lemu: DialogueTree = {
  'lemu.greet': {
    id: 'lemu.greet', speaker: 'npc.lemu',
    line: { en: 'Hi. [she presses cloth into the press] You want?' },
    choices: [
      { id: 'hi',     text: { en: 'Hi.' },                  next: 'lemu.hi_back' },
      { id: 'oil',    text: { en: 'I want oil.' },          next: 'lemu.want_oil' },
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'lemu.hi_back': {
    id: 'lemu.hi_back', speaker: 'npc.lemu',
    line: { en: 'Mm. Go to the hut. West path. Read what Maren left. Then I give oil.' },
    choices: [
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'lemu.want_oil': {
    id: 'lemu.want_oil', speaker: 'npc.lemu',
    line: { en: 'Oil ready. But first — go to the hut. Read. Then come. Then ask.' },
    choices: [
      { id: 'why',    text: { en: 'Why?' },                 next: 'lemu.why' },
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'lemu.why': {
    id: 'lemu.why', speaker: 'npc.lemu',
    line: { en: '[her face closes] Hala will tell. Words belong to her.' },
    choices: [
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
};

const toka: DialogueTree = {
  'toka.greet': {
    id: 'toka.greet', speaker: 'npc.toka',
    line: { en: '[weighs a stone in his palm] Hi. You walk soft. Good.' },
    choices: [
      { id: 'hi',     text: { en: 'Hi.' },                  next: 'toka.hi_back' },
      { id: 'flint',  text: { en: 'I want flint.' },        next: 'toka.want_flint' },
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'toka.hi_back': {
    id: 'toka.hi_back', speaker: 'npc.toka',
    line: { en: 'Pemi like you. That mean something. Where you go next?' },
    choices: [
      { id: 'hut',    text: { en: 'The hut.' },             next: 'toka.hut' },
      { id: 'hala',   text: { en: 'Hala.' },                next: 'toka.hala' },
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'toka.want_flint': {
    id: 'toka.want_flint', speaker: 'npc.toka',
    line: { en: 'Flint? [half-smiles] Read first. Hut, west. Then come. Flint here.' },
    choices: [
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'toka.hut': {
    id: 'toka.hut', speaker: 'npc.toka',
    line: { en: 'Good. West path. Cliff. You will know.' },
    choices: [
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'toka.hala': {
    id: 'toka.hala', speaker: 'npc.toka',
    line: { en: "Shrine first. Then lighthouse, when fire comes. Walk past her if she lets you. She probably won't." },
    choices: [
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
};

const hala: DialogueTree = {
  'hala.greet': {
    id: 'hala.greet', speaker: 'npc.hala',
    line: { en: '[without opening her eyes] Not yet.' },
    choices: [
      { id: 'wait',   text: { en: '[Wait]' },               next: 'hala.wait' },
      { id: 'why',    text: { en: 'Why not?' },             next: 'hala.why_not' },
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'hala.wait': {
    id: 'hala.wait', speaker: 'npc.hala',
    line: { en: '[silent. After a moment, she speaks] Walk west first. Read what was left. Then ask the three.' },
    choices: [
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
  'hala.why_not': {
    id: 'hala.why_not', speaker: 'npc.hala',
    line: { en: 'Not your turn yet. Go. Bring fire to the lighthouse. Then I will speak.' },
    choices: [
      { id: 'leave',  text: { en: '[Leave]' },              next: null },
    ],
  },
};

export const DIALOGUE_TREES: Record<NpcId, DialogueTree> = {
  'npc.pemi': pemi,
  'npc.naro': naro,
  'npc.lemu': lemu,
  'npc.toka': toka,
  'npc.hala': hala,
};
