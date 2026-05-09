// FilledFrame translations for Naro's dialogue tree.
// Spliced into dialogueTrees.ts at module load (see attachFrames).

import type { FilledFrame } from '../../lang/frames';

export const NARO_LINE_FRAMES: Record<string, FilledFrame[]> = {
  NAR_INITIAL: [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'BE_IDENTITY', mood: 'declarative', roles: { entity: 'self', identity: { type: 'ANIMATE', conceptId: 'NARO' } } },
    // "You?" — same name-elicitation pattern as Pemi; no FRAME for "who are
    // you", so the prompt is carried by stage direction only.
  ],
  NAR_GREETING: [
    { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'FRUIT' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
  ],
  NAR_QUIET: [
    { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'FRUIT' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
  ],
  NAR_BREAD: [
    { predicate: 'GIVE', mood: 'declarative', roles: { agent: 'self', recipient: 'listener', theme: { type: 'ITEM', conceptId: 'BREAD' } } },
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
  ],
  NAR_AWAITING: [
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'FRUIT' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
  ],
  NAR_POINT_FOREST: [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
  ],
  NAR_DESCRIBE_FRUIT: [],
  NAR_GIVE_FRUIT: [
    { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
    { predicate: 'GIVE', mood: 'declarative', roles: { agent: 'self', recipient: 'listener', theme: { type: 'ITEM', conceptId: 'BREAD' } } },
  ],
  NAR_NEXT_HINT: [
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'LEMU' }, ground: { type: 'LOCATION', conceptId: 'FIREPIT' } } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: { type: 'ANIMATE', conceptId: 'LEMU' }, desired: { type: 'ITEM', conceptId: 'WATER' } } },
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'TOKA' }, ground: { type: 'LOCATION', conceptId: 'SHRINE' } } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: { type: 'ANIMATE', conceptId: 'TOKA' }, desired: { type: 'ITEM', conceptId: 'ROPE' } } },
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'SENU' }, ground: { type: 'LOCATION', conceptId: 'FOREST' } } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: { type: 'ANIMATE', conceptId: 'SENU' }, desired: { type: 'ITEM', conceptId: 'BASKET' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'HUT' } } },
  ],
  NAR_ABOUT_MAREN: [],
  NAR_POST_FRUIT: [
    { predicate: 'GIVE', mood: 'declarative', roles: { agent: 'self', recipient: 'listener', theme: { type: 'ITEM', conceptId: 'BREAD' } } },
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'HALA' }, ground: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
  ],
};

export const NARO_OPTION_FRAMES: Record<string, FilledFrame[][]> = {
  NAR_INITIAL: [
    // "Hi. Me — me. (point at self)" — player's nameless self-introduction.
    // SAY content has no wh-word for `unknown`, so we keep just the greeting.
    [{ predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } }],
    [],
    [],
  ],
  NAR_AWAITING: [
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'LOCATION', conceptId: 'FOREST' }, ground: 'unknown' } }],
    [],
    [],
  ],
  NAR_GIVE_FRUIT: [
    [],
    [{ predicate: 'SAY', mood: 'imperative', roles: { speaker: 'listener', recipient: 'self', content: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } }],
    [],
  ],
};
