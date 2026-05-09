// FilledFrame translations for Hala's dialogue tree (climax).
// Spliced into dialogueTrees.ts at module load (see attachFrames).
//
// Many of Hala's lines are deliberately english-only — her speech is poetic
// monologue beyond the 15-frame inventory. The DECIDE frames in HAL_QUESTION
// and the END_LEAVE/END_STAY tags are the load-bearing ones; the rest are
// flourishes the diary will keep verbatim.

import type { FilledFrame } from '../../lang/frames';

export const HALA_LINE_FRAMES: Record<string, FilledFrame[]> = {
  HAL_INITIAL: [],
  HAL_NOT_YET: [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'HUT' } } },
  ],
  HAL_DOOR_LOCKED: [
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'FIRE' } } },
    { predicate: 'TAKE', mood: 'imperative', roles: { agent: 'listener', theme: { type: 'ITEM', conceptId: 'FIRE' } } },
  ],
  HAL_SOME_ITEMS: [
    { predicate: 'GIVE', mood: 'imperative', roles: { agent: 'listener', recipient: 'self', theme: { type: 'ITEM', conceptId: 'FIRE' } } },
  ],
  HAL_DOOR_OPENS: [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
  ],
  HAL_BEACON_OPEN: [],
  HAL_KNEW_MAREN: [
    { predicate: 'KNOW', mood: 'declarative', tense: 'past', roles: { knower: 'self', object: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } },
  ],
  HAL_DID_MAREN: [
    { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
    { predicate: 'DECIDE', mood: 'declarative', tense: 'past', roles: { decider: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } },
  ],
  HAL_WHY_CRYING: [],
  HAL_WAIT: [
    { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
  ],
  HAL_END_STORY: [
    { predicate: 'DECIDE', mood: 'declarative', tense: 'past', roles: { decider: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } },
  ],
  HAL_LETTER: [],
  HAL_LOVE: [
    { predicate: 'KNOW', mood: 'declarative', negated: true, roles: { knower: 'self', object: 'reference' } },
  ],
  HAL_RIGHT_CHOICE: [],
  HAL_WANTED_STAY: [
    { predicate: 'WANT', mood: 'declarative', tense: 'past', roles: { wanter: 'self', desired: { type: 'ABSTRACT', conceptId: 'STAYING' } } },
    { predicate: 'DECIDE', mood: 'declarative', tense: 'past', roles: { decider: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } },
  ],
  HAL_QUESTION: [
    // "You go, or you stay?" — wh-DECIDE on the player's choice.
    { predicate: 'DECIDE', mood: 'declarative', roles: { decider: 'listener', choice: 'unknown' } },
  ],
  HAL_MOMENT: [
    { predicate: 'TAKE', mood: 'imperative', roles: { agent: 'listener', theme: { type: 'ITEM', conceptId: 'FIRE' } } },
  ],
  END_LEAVE: [
    // "Then go." — destination wh-question encodes "go (somewhere)" without naming a place.
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: 'unknown' } },
  ],
  END_STAY: [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'VILLAGE' } } },
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'NARO' }, theme: { type: 'ITEM', conceptId: 'BREAD' } } },
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'SENU' }, theme: { type: 'ITEM', conceptId: 'WOOD' } } },
  ],
};

export const HALA_OPTION_FRAMES: Record<string, FilledFrame[][]> = {
  HAL_INITIAL: [[], [], []],
  HAL_NOT_YET: [[]],
  HAL_DOOR_LOCKED: [[]],
  HAL_SOME_ITEMS: [[]],
  HAL_DOOR_OPENS: [[]],
  HAL_BEACON_OPEN: [
    [{ predicate: 'KNOW', mood: 'declarative', tense: 'past', roles: { knower: 'listener', object: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } }],
    [{ predicate: 'DECIDE', mood: 'declarative', tense: 'past', polarQuestion: true, roles: { decider: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } }],
    [],
    [],
  ],
  HAL_KNEW_MAREN: [
    [{ predicate: 'SAY', mood: 'imperative', roles: { speaker: 'listener', recipient: 'self', content: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } }],
    [],
    [],
  ],
  HAL_DID_MAREN: [[]],
  HAL_WHY_CRYING: [[]],
  HAL_WAIT: [[]],
  HAL_END_STORY: [
    [],
    [{ predicate: 'WANT', mood: 'declarative', tense: 'past', polarQuestion: true, roles: { wanter: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, desired: { type: 'ABSTRACT', conceptId: 'STAYING' } } }],
    [],
  ],
  HAL_LETTER: [[]],
  HAL_LOVE: [[]],
  HAL_RIGHT_CHOICE: [[]],
  HAL_WANTED_STAY: [[]],
  HAL_QUESTION: [
    [{ predicate: 'DECIDE', mood: 'declarative', roles: { decider: 'self', choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } }],
    [{ predicate: 'DECIDE', mood: 'declarative', roles: { decider: 'self', choice: { type: 'ABSTRACT', conceptId: 'STAYING' } } }],
    [],
  ],
  HAL_MOMENT: [[]],
  END_LEAVE: [[]],
  END_STAY: [[]],
};
