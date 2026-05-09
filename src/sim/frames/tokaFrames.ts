// FilledFrame translations for Toka's dialogue tree.
// Spliced into dialogueTrees.ts at module load (see attachFrames).

import type { FilledFrame } from '../../lang/frames';

export const TOKA_LINE_FRAMES: Record<string, FilledFrame[]> = {
  // GREET is a state-category frame; imperative mood is illegal per the validator.
  TOK_INITIAL: [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
  ],
  TOK_HANDS_OPEN: [
    { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'ROPE' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'SENU' }, theme: { type: 'ITEM', conceptId: 'ROPE' } } },
  ],
  TOK_CRASHED: [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'HUT' } } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'ROPE' } } },
    { predicate: 'TAKE', mood: 'imperative', roles: { agent: 'listener', theme: { type: 'ITEM', conceptId: 'ROPE' } } },
  ],
  TOK_AWAITING: [
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'ROPE' } } },
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'SENU' }, ground: { type: 'LOCATION', conceptId: 'FOREST' } } },
  ],
  TOK_WHY_ROPE: [
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'ROPE' } } },
  ],
  TOK_POINT_FOREST: [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
  ],
  TOK_GIVE_FLINT: [
    { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
    { predicate: 'GIVE', mood: 'declarative', roles: { agent: 'self', recipient: 'listener', theme: { type: 'ITEM', conceptId: 'FLINT' } } },
  ],
  TOK_HANDOVER_FLINT: [],
  TOK_MAREN_FLINT: [
    { predicate: 'GIVE', mood: 'declarative', tense: 'past', roles: { agent: 'self', recipient: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, theme: { type: 'ITEM', conceptId: 'FLINT' } } },
  ],
  TOK_WHY_LIKE_THAT: [
    { predicate: 'DECIDE', mood: 'declarative', tense: 'past', roles: { decider: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } },
  ],
  TOK_POST_ITEM: [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
    { predicate: 'BE_AT', mood: 'declarative', tense: 'future', roles: { figure: { type: 'ANIMATE', conceptId: 'HALA' }, ground: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
  ],
};

export const TOKA_OPTION_FRAMES: Record<string, FilledFrame[][]> = {
  TOK_INITIAL: [[], [], []],
  TOK_HANDS_OPEN: [[]],
  TOK_CRASHED: [[]],
  TOK_AWAITING: [
    [],
    // "Senu — where?" — wh-question (NOT polar; mutex with `unknown`).
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'SENU' }, ground: 'unknown' } }],
    [],
  ],
  TOK_WHY_ROPE: [[]],
  TOK_POINT_FOREST: [[]],
  TOK_GIVE_FLINT: [[]],
  TOK_HANDOVER_FLINT: [
    [{ predicate: 'SAY', mood: 'declarative', tense: 'past', polarQuestion: true, roles: { speaker: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, recipient: 'self', content: { type: 'ITEM', conceptId: 'FLINT' } } }],
    [],
    [],
  ],
  TOK_MAREN_FLINT: [[]],
  TOK_WHY_LIKE_THAT: [[]],
  TOK_POST_ITEM: [[]],
};
