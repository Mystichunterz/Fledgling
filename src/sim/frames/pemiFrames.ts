// FilledFrame translations for Pemi's dialogue tree.
// Spliced into dialogueTrees.ts at module load (see attachFrames).
//
// LINE_FRAMES[nodeId] applies to the first (and currently only) speech segment
// in that node's `line`. OPTION_FRAMES[nodeId][i] applies to the i-th option
// in declaration order — gestures and unframable utterances use [].

import type { FilledFrame } from '../../lang/frames';

export const PEMI_LINE_FRAMES: Record<string, FilledFrame[]> = {
  PEM_BEACH_INTRO: [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'BE_IDENTITY', mood: 'declarative', roles: { entity: 'self', identity: { type: 'ANIMATE', conceptId: 'PEMI' } } },
    // "Me — you?" (asking the listener's name) is not cleanly encodable —
    // there's no FRAME for "who are you". The gesture/stage direction in the
    // source line carries the prompt; we drop the frame so the surface is
    // just "hi" + "I am Pemi".
  ],
  PEM_WAVE_BACK: [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'listener', addressee: 'self' } },
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'BE_STATE', mood: 'declarative', roles: { experiencer: 'self', state: { type: 'ABSTRACT', conceptId: 'GOOD' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'VILLAGE' } } },
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'NARO' } } },
  ],
  PEM_NAME_MIME: [
    { predicate: 'BE_IDENTITY', mood: 'declarative', roles: { entity: 'self', identity: { type: 'ANIMATE', conceptId: 'PEMI' } } },
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'VILLAGE' } } },
  ],
  PEM_QUIET: [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'BE_IDENTITY', mood: 'declarative', roles: { entity: 'self', identity: { type: 'ANIMATE', conceptId: 'PEMI' } } },
  ],
  PEM_FOLLOW: [
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: 'self', ground: 'reference' } },
    { predicate: 'MOVE', mood: 'declarative', roles: { agent: 'listener', destination: 'unknown' } },
  ],
  PEM_TELL_NARO: [
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'NARO' } } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: { type: 'ANIMATE', conceptId: 'NARO' }, desired: { type: 'ITEM', conceptId: 'FRUIT' } } },
  ],
  PEM_TELL_LEMU: [
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'LEMU' } } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: { type: 'ANIMATE', conceptId: 'LEMU' }, desired: { type: 'ITEM', conceptId: 'WATER' } } },
  ],
  PEM_TELL_TOKA: [
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'TOKA' } } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: { type: 'ANIMATE', conceptId: 'TOKA' }, desired: { type: 'ITEM', conceptId: 'ROPE' } } },
  ],
  PEM_TELL_SENU: [
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'SENU' } } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: { type: 'ANIMATE', conceptId: 'SENU' }, desired: { type: 'ITEM', conceptId: 'BASKET' } } },
  ],
  PEM_TELL_HALA: [
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'HALA' } } },
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'HALA' }, ground: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
    { predicate: 'GIVE', mood: 'imperative', roles: { agent: 'listener', recipient: { type: 'ANIMATE', conceptId: 'HALA' }, theme: { type: 'ITEM', conceptId: 'FIRE' } } },
  ],
  PEM_TELL_MAREN: [
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } },
  ],
};

export const PEMI_OPTION_FRAMES: Record<string, FilledFrame[][]> = {
  PEM_FOLLOW: [
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: 'unknown', ground: { type: 'LOCATION', conceptId: 'WELL' } } }],
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: 'unknown', ground: { type: 'LOCATION', conceptId: 'FIREPIT' } } }],
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: 'unknown', ground: { type: 'LOCATION', conceptId: 'SHRINE' } } }],
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: 'unknown', ground: { type: 'LOCATION', conceptId: 'FOREST' } } }],
    // "Tell me about the lighthouse." — SAY.content doesn't accept LOCATION,
    // so this option stays english-only (no surface encoding).
    [],
    [{ predicate: 'SAY', mood: 'imperative', roles: { speaker: 'listener', recipient: 'self', content: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } }],
    [],
  ],
};
