// FilledFrame translations for Lemu's dialogue tree.
// Spliced into dialogueTrees.ts at module load (see attachFrames).

import type { FilledFrame } from '../../lang/frames';

export const LEMU_LINE_FRAMES: Record<string, FilledFrame[]> = {
  LEM_INITIAL: [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'BE_IDENTITY', mood: 'declarative', roles: { entity: 'self', identity: { type: 'ANIMATE', conceptId: 'LEMU' } } },
  ],
  LEM_SAW_PLANE: [
    { predicate: 'KNOW', mood: 'declarative', tense: 'past', roles: { knower: 'self', object: 'reference' } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'WATER' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'WELL' } } },
    { predicate: 'KNOW', mood: 'declarative', roles: { knower: { type: 'ANIMATE', conceptId: 'NARO' }, object: 'reference' } },
  ],
  LEM_SEA: [
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'WATER' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'WELL' } } },
  ],
  LEM_AWAITING: [
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'WATER' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'WELL' } } },
  ],
  LEM_WHY_WATER: [
    { predicate: 'GIVE', mood: 'declarative', tense: 'future', roles: { agent: { type: 'ANIMATE', conceptId: 'NARO' }, recipient: 'listener', theme: { type: 'ITEM', conceptId: 'WATER' } } },
  ],
  LEM_POINT_WELL: [
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'NARO' }, ground: { type: 'LOCATION', conceptId: 'WELL' } } },
  ],
  LEM_GIVE_OIL: [],
  LEM_HANDOVER_OIL: [],
  LEM_MAREN_PRESS: [],
  LEM_MAREN_END: [
    { predicate: 'SAY', mood: 'declarative', tense: 'future', roles: { speaker: { type: 'ANIMATE', conceptId: 'HALA' }, recipient: 'listener', content: 'reference' } },
  ],
  LEM_POST_ITEM: [
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'TOKA' }, ground: { type: 'LOCATION', conceptId: 'SHRINE' } } },
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'TOKA' }, theme: { type: 'ITEM', conceptId: 'FLINT' } } },
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'SENU' }, ground: { type: 'LOCATION', conceptId: 'FOREST' } } },
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'SENU' }, theme: { type: 'ITEM', conceptId: 'WOOD' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'HALA' }, ground: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
  ],
};

export const LEMU_OPTION_FRAMES: Record<string, FilledFrame[][]> = {
  LEM_INITIAL: [
    [{ predicate: 'SEE', mood: 'declarative', polarQuestion: true, roles: { viewer: 'listener', target: 'reference' } }],
    [],
    [],
    [],
  ],
  LEM_AWAITING: [
    [],
    // "Well — where?" — bare wh-question, NOT polar (mutex with `unknown`).
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'LOCATION', conceptId: 'WELL' }, ground: 'unknown' } }],
    [],
  ],
  LEM_HANDOVER_OIL: [
    [],
    [{ predicate: 'SAY', mood: 'imperative', roles: { speaker: 'listener', recipient: 'self', content: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } }],
    [],
  ],
};
