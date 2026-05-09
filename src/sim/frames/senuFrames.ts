// FilledFrame translations for Senu's dialogue tree.
// Spliced into dialogueTrees.ts at module load (see attachFrames).

import type { FilledFrame } from '../../lang/frames';

export const SENU_LINE_FRAMES: Record<string, FilledFrame[]> = {
  SEN_INITIAL: [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
  ],
  SEN_GREETING: [
    { predicate: 'BE_IDENTITY', mood: 'declarative', roles: { entity: 'self', identity: { type: 'ANIMATE', conceptId: 'SENU' } } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'BASKET' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'WELL' } } },
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'NARO' }, theme: { type: 'ITEM', conceptId: 'BASKET' } } },
  ],
  SEN_WOODPILE: [
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: 'self', theme: { type: 'ITEM', conceptId: 'WOOD' } } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'BASKET' } } },
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'NARO' }, theme: { type: 'ITEM', conceptId: 'BASKET' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'WELL' } } },
  ],
  SEN_AWAITING: [
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'BASKET' } } },
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'NARO' }, theme: { type: 'ITEM', conceptId: 'BASKET' } } },
  ],
  SEN_WHY_BASKET: [
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'NARO' }, theme: { type: 'ITEM', conceptId: 'BASKET' } } },
    { predicate: 'GIVE', mood: 'declarative', roles: { agent: 'self', recipient: { type: 'ANIMATE', conceptId: 'NARO' }, theme: { type: 'ITEM', conceptId: 'WOOD' } } },
    { predicate: 'GIVE', mood: 'declarative', roles: { agent: { type: 'ANIMATE', conceptId: 'NARO' }, recipient: 'self', theme: { type: 'ITEM', conceptId: 'BASKET' } } },
  ],
  SEN_POINT_WELL: [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'WELL' } } },
  ],
  SEN_GIVE_WOOD: [
    { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
    { predicate: 'GIVE', mood: 'declarative', roles: { agent: 'self', recipient: 'listener', theme: { type: 'ITEM', conceptId: 'WOOD' } } },
  ],
  SEN_HANDOVER_WOOD: [],
  SEN_MAREN_WOOD: [
    { predicate: 'DECIDE', mood: 'declarative', tense: 'past', roles: { decider: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } },
  ],
  SEN_QUIET_TODAY: [
    { predicate: 'BE_AT', mood: 'declarative', tense: 'future', roles: { figure: { type: 'ITEM', conceptId: 'FIRE' }, ground: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
  ],
  SEN_POST_ITEM: [
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'LEMU' }, theme: { type: 'ITEM', conceptId: 'OIL' } } },
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'TOKA' }, theme: { type: 'ITEM', conceptId: 'FLINT' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: { type: 'ANIMATE', conceptId: 'HALA' }, desired: { type: 'ITEM', conceptId: 'FIRE' } } },
  ],
};

export const SENU_OPTION_FRAMES: Record<string, FilledFrame[][]> = {
  SEN_INITIAL: [
    // "Hi. Me — me." — player's nameless self-introduction; just GREET.
    [{ predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } }],
    [],
    [],
  ],
  SEN_AWAITING: [
    [],
    // "Naro — where?" — wh-question (NOT polar; mutex with `unknown`).
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'NARO' }, ground: 'unknown' } }],
    [],
  ],
  SEN_HANDOVER_WOOD: [[], [], []],
};
