// FilledFrame translations for Pemi's dialogue tree.
// Spliced into dialogueTrees.ts at module load (see attachFrames).
//
// LINE_FRAMES[nodeId] uses one of two shapes (see LineFrameAttachment):
//   - flat FilledFrame[]:    applies to the first speech segment in the node
//   - nested FilledFrame[][]: one inner array per speech segment in
//     declaration order (use for nodes with interleaved stage/speech).
// OPTION_FRAMES[nodeId][i] applies to the i-th option in declaration order;
// gestures and unframable utterances use [].

import type { FilledFrame } from '../../lang/frames';

// PEM_WAVE_BACK has two speech segments (stage cue between them), so its
// frame attachment is the per-segment FilledFrame[][] shape. Declared
// separately and cast in the dict below so the existing test-suite type
// `Record<string, FilledFrame[]>` (see frames.test.ts) keeps compiling
// without a churn-sized refactor across every NPC frames table.
const PEM_WAVE_BACK_PER_SEGMENT: FilledFrame[][] = [
  // Speech 1: "Hi-hi. You hi me. Me hi you. Good!"
  [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'listener', addressee: 'self' } },
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'BE_STATE', mood: 'declarative', roles: { experiencer: 'self', state: { type: 'ABSTRACT', conceptId: 'GOOD' } } },
  ],
  // Speech 2: "Go — go village. Naro. Go!"
  [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'VILLAGE' } } },
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'NARO' } } },
  ],
];

export const PEMI_LINE_FRAMES: Record<string, FilledFrame[] | FilledFrame[][]> = {
  PEM_BEACH_INTRO: [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'BE_IDENTITY', mood: 'declarative', roles: { entity: 'self', identity: { type: 'ANIMATE', conceptId: 'PEMI' } } },
    // "Me — you?" (asking the listener's name) is not cleanly encodable —
    // there's no FRAME for "who are you". The gesture/stage direction in the
    // source line carries the prompt; we drop the frame so the surface is
    // just "hi" + "I am Pemi".
  ],
  // attachFrames inspects this entry shape at runtime (Array.isArray on the
  // first element) and routes it as per-segment. The cast is purely a
  // type-system accommodation.
  PEM_WAVE_BACK: PEM_WAVE_BACK_PER_SEGMENT,
  PEM_NAME_MIME: [
    { predicate: 'BE_IDENTITY', mood: 'declarative', roles: { entity: 'self', identity: { type: 'ANIMATE', conceptId: 'PEMI' } } },
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'VILLAGE' } } },
    // "follow me!" has no comitative/follow primitive; agent-with-agent
    // can't be expressed as MOVE.destination (LOCATION-only). Left to the
    // gesture animation to convey.
  ],
  PEM_QUIET: [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'BE_IDENTITY', mood: 'declarative', roles: { entity: 'self', identity: { type: 'ANIMATE', conceptId: 'PEMI' } } },
    // "Quiet you" / "Follow." — no QUIET state primitive; "follow" has no
    // comitative destination. Gesture carries the rest.
  ],
  PEM_FOLLOW: [
    // "Me with you. Where go?" — "Me with you" has no comitative/accompaniment
    // primitive (BE_AT.ground requires LOCATION; using `reference` rendered
    // as the nonsensical "I am at it"). Drop that frame and keep just the
    // wh-question, which renders correctly as "Where do you go?".
    { predicate: 'MOVE', mood: 'declarative', roles: { agent: 'listener', destination: 'unknown' } },
  ],
  PEM_TELL_NARO: [
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'NARO' } } },
    // "Big bread" — Naro-as-baker descriptor; no descriptor primitive.
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: { type: 'ANIMATE', conceptId: 'NARO' }, desired: { type: 'ITEM', conceptId: 'FRUIT' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
  ],
  PEM_TELL_LEMU: [
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'LEMU' } } },
    // "Fire. Sea-eyes." — descriptors of Lemu (firepit-keeper, blue-eyed);
    // no descriptor primitive, so left un-encoded.
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: { type: 'ANIMATE', conceptId: 'LEMU' }, desired: { type: 'ITEM', conceptId: 'WATER' } } },
  ],
  PEM_TELL_TOKA: [
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'TOKA' } } },
    // "Stone-house. Strict." — descriptors of Toka; no descriptor primitive.
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: { type: 'ANIMATE', conceptId: 'TOKA' }, desired: { type: 'ITEM', conceptId: 'ROPE' } } },
  ],
  PEM_TELL_SENU: [
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'SENU' } } },
    // "Trees. Quiet." — descriptors of Senu; no descriptor primitive.
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: { type: 'ANIMATE', conceptId: 'SENU' }, desired: { type: 'ITEM', conceptId: 'BASKET' } } },
  ],
  PEM_TELL_HALA: [
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'HALA' } } },
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'HALA' }, ground: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
    // "Big-house, fire-on-top" — descriptive gloss of the lighthouse; no
    // descriptor primitive. "me only seven winters" — age-claim has no
    // primitive either; it's a hedge that the gesture/stage carries.
    { predicate: 'GIVE', mood: 'imperative', roles: { agent: 'listener', recipient: { type: 'ANIMATE', conceptId: 'HALA' }, theme: { type: 'ITEM', conceptId: 'FIRE' } } },
  ],
  PEM_TELL_MAREN: [
    { predicate: 'SAY', mood: 'declarative', roles: { speaker: 'self', recipient: 'listener', content: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } },
    // "Boat. Letter." — bare-noun mentions; ITEM existence has no primitive
    // on its own. Encode the relationship that matters: Hala has the letter
    // (so the player knows where to retrieve it).
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'HALA' }, theme: { type: 'ITEM', conceptId: 'LETTER' } } },
  ],
};

export const PEMI_OPTION_FRAMES: Record<string, FilledFrame[][]> = {
  PEM_FOLLOW: [
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: 'unknown', ground: { type: 'LOCATION', conceptId: 'WELL' } } }],
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: 'unknown', ground: { type: 'LOCATION', conceptId: 'FIREPIT' } } }],
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: 'unknown', ground: { type: 'LOCATION', conceptId: 'SHRINE' } } }],
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: 'unknown', ground: { type: 'LOCATION', conceptId: 'FOREST' } } }],
    // "Tell me about the lighthouse." — SAY.content rejects LOCATION, so
    // re-encode as a polar BE_AT question about Hala at the lighthouse,
    // which is the load-bearing fact the player would learn from "tell me
    // about the lighthouse" anyway.
    [{ predicate: 'BE_AT', mood: 'declarative', polarQuestion: true, roles: { figure: { type: 'ANIMATE', conceptId: 'HALA' }, ground: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } }],
    [{ predicate: 'SAY', mood: 'imperative', roles: { speaker: 'listener', recipient: 'self', content: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } }],
    [],
  ],
};
