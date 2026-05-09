// FilledFrame translations for Naro's dialogue tree.
// Spliced into dialogueTrees.ts at module load (see attachFrames).

import type { FilledFrame } from '../../lang/frames';

// Some of Naro's nodes have multiple interleaved speech segments. attachFrames
// detects FilledFrame[][] (per-segment) vs FilledFrame[] (legacy first-segment)
// at runtime; here we keep the declared type as FilledFrame[] (matching the
// other NPCs and the test-table shape) and cast nested arrays via `as unknown
// as FilledFrame[]` where they appear. The runtime branches on Array.isArray.
export const NARO_LINE_FRAMES: Record<string, FilledFrame[] | FilledFrame[][]> = {
  NAR_INITIAL: [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'BE_IDENTITY', mood: 'declarative', roles: { entity: 'self', identity: { type: 'ANIMATE', conceptId: 'NARO' } } },
    // "You?" — same name-elicitation pattern as Pemi; no FRAME for "who are
    // you", so the prompt is carried by stage direction only.
  ],
  NAR_GREETING: [
    // Per-segment FilledFrame[][]; cast through unknown so it sits in the
    // FilledFrame[] record alongside the legacy flat entries. attachFrames
    // dispatches on Array.isArray(raw[0]) at runtime.
    [
      // Segment 0: "Good. Hi, you. Sea brings who it brings."
      { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
      { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
      // "Sea brings who it brings" — fatalistic idiom; no usable predicate.
    ],
    [
      // Segment 1: "Me want fruit. You go forest. Bring."
      { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'FRUIT' } } },
      { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
      // "Bring." — imperative; closest mapping is TAKE (the fruit).
      { predicate: 'TAKE', mood: 'imperative', roles: { agent: 'listener', theme: { type: 'ITEM', conceptId: 'FRUIT' } } },
    ],
  ],
  NAR_QUIET: [
    { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'FRUIT' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
  ],
  NAR_BREAD: [
    [
      // Segment 0: "Bread for fruit. Fair?"
      // Naro proposes giving bread in exchange for fruit. Render as a polar Q
      // ("Do I give the bread to you?") to capture the "Fair?" check — it's
      // the closest the inventory gets to a trade-proposition.
      {
        predicate: 'GIVE',
        mood: 'declarative',
        polarQuestion: true,
        roles: { agent: 'self', recipient: 'listener', theme: { type: 'ITEM', conceptId: 'BREAD' } },
      },
      // Naro wanting fruit — the other side of the trade.
      { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'FRUIT' } } },
    ],
    [
      // Segment 1: "Hi, you."
      { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    ],
  ],
  NAR_AWAITING: [
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'FRUIT' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
    { predicate: 'TAKE', mood: 'imperative', roles: { agent: 'listener', theme: { type: 'ITEM', conceptId: 'FRUIT' } } },
  ],
  NAR_POINT_FOREST: [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
  ],
  NAR_DESCRIBE_FRUIT: [
    // Segment 0: "Round. Red. Tree." — three properties of the fruit. "Tree"
    // is a source/location and has no clean predicate; render as a HAVE
    // (the tree has the fruit) so the listener gets the source cue.
    [
      { predicate: 'BE_STATE', mood: 'declarative', roles: { experiencer: { type: 'ANIMATE', conceptId: 'FRUIT' }, state: { type: 'ABSTRACT', conceptId: 'ROUND' } } },
      { predicate: 'BE_STATE', mood: 'declarative', roles: { experiencer: { type: 'ANIMATE', conceptId: 'FRUIT' }, state: { type: 'ABSTRACT', conceptId: 'RED' } } },
      // "Tree." — fruit is at the tree (location).
      { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ITEM', conceptId: 'FRUIT' }, ground: { type: 'LOCATION', conceptId: 'TREE' } } },
    ],
    // Segment 1: "Sweet."
    [
      { predicate: 'BE_STATE', mood: 'declarative', roles: { experiencer: { type: 'ANIMATE', conceptId: 'FRUIT' }, state: { type: 'ABSTRACT', conceptId: 'SWEET' } } },
    ],
  ],
  NAR_GIVE_FRUIT: [
    // Segment 0: "Good. You learn fast."
    [
      { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
      // "You learn fast." — closest mapping is BE_STATE: you are fast.
      { predicate: 'BE_STATE', mood: 'declarative', roles: { experiencer: 'listener', state: { type: 'ABSTRACT', conceptId: 'FAST' } } },
    ],
    // Segment 1: "Bread. Yours."
    [
      { predicate: 'GIVE', mood: 'declarative', roles: { agent: 'self', recipient: 'listener', theme: { type: 'ITEM', conceptId: 'BREAD' } } },
    ],
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
  NAR_ABOUT_MAREN: [
    // Segment 0: "Maren sat at this well a year before they could ask for
    // water without pointing. We sang to teach them — daft songs, mostly
    // about the weather."
    //
    // The temporal/manner detail is beyond the inventory; we keep the core
    // propositions: Maren was at the well, Maren wanted water, and we
    // (= self) said the songs to Maren (the teaching action).
    [
      { predicate: 'BE_AT', mood: 'declarative', tense: 'past', roles: { figure: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, ground: { type: 'LOCATION', conceptId: 'WELL' } } },
      { predicate: 'WANT', mood: 'declarative', tense: 'past', roles: { wanter: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, desired: { type: 'ITEM', conceptId: 'WATER' } } },
      { predicate: 'SAY', mood: 'declarative', tense: 'past', roles: { speaker: 'self', recipient: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, content: { type: 'ITEM', conceptId: 'SONG' } } },
    ],
    // Segment 1: "You? Faster." — comparative shorthand: you (the player)
    // are fast.
    [
      { predicate: 'BE_STATE', mood: 'declarative', roles: { experiencer: 'listener', state: { type: 'ABSTRACT', conceptId: 'FAST' } } },
    ],
  ],
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
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ITEM', conceptId: 'FRUIT' }, ground: 'unknown' } }],
    [],
  ],
  NAR_GIVE_FRUIT: [
    [{ predicate: 'MOVE', mood: 'declarative', roles: { agent: 'self', destination: 'unknown' } }],
    [{ predicate: 'SAY', mood: 'imperative', roles: { speaker: 'listener', recipient: 'self', content: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } }],
    [],
  ],
};
