// FilledFrame translations for Senu's dialogue tree.
// Spliced into dialogueTrees.ts at module load (see attachFrames).
//
// LINE_FRAMES[nodeId] uses one of two shapes (see LineFrameAttachment):
//   - flat FilledFrame[]:    applies to the first speech segment in the node
//   - nested FilledFrame[][]: one inner array per speech segment in
//     declaration order (use for nodes with interleaved stage/speech).
// OPTION_FRAMES[nodeId][i] applies to the i-th option in declaration order;
// gestures and unframable utterances use [].

import type { FilledFrame } from '../../lang/frames';

export const SENU_LINE_FRAMES: Record<string, FilledFrame[] | FilledFrame[][]> = {
  // Single speech segment: "Hi."
  SEN_INITIAL: [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
  ],

  // Two speech segments interleaved with stage cues:
  //   1) "Senu. You — new. Plane?"
  //   2) "Me want basket. Go well. Naro weave. Bring."
  SEN_GREETING: [
    [
      // "Senu." — self-introduction.
      { predicate: 'BE_IDENTITY', mood: 'declarative', roles: { entity: 'self', identity: { type: 'ANIMATE', conceptId: 'SENU' } } },
      // "Plane?" — polar question, asking whether the listener saw/came from
      // the plane. No PLANE concept registered, so use `reference` (the
      // contextually salient prior referent — same trick LEM_SAW_PLANE uses).
      // Polar yes/no Q stays declarative-mood with polarQuestion:true.
      { predicate: 'SEE', mood: 'declarative', polarQuestion: true, roles: { viewer: 'listener', target: 'reference' } },
    ],
    [
      // "Me want basket."
      { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'BASKET' } } },
      // "Go well."
      { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'WELL' } } },
      // "Naro weave." — Naro makes the basket.
      { predicate: 'MAKE', mood: 'declarative', roles: { agent: { type: 'ANIMATE', conceptId: 'NARO' }, patient: { type: 'ITEM', conceptId: 'BASKET' }, source: { type: 'ITEM', conceptId: 'BASKET' } } },
      // "Bring." — listener brings the basket back.
      { predicate: 'GIVE', mood: 'imperative', roles: { agent: 'listener', recipient: 'self', theme: { type: 'ITEM', conceptId: 'BASKET' } } },
    ],
  ],

  // Two speech segments:
  //   1) "Wood. Dry, season. For lighthouse, yes? Last one took some too."
  //   2) "Me want basket first. Naro has. Go well."
  SEN_WOODPILE: [
    [
      // "Wood." — Senu has wood.
      { predicate: 'HAVE', mood: 'declarative', roles: { owner: 'self', theme: { type: 'ITEM', conceptId: 'WOOD' } } },
      // "Last one took some too." — predecessor took wood, past tense.
      { predicate: 'TAKE', mood: 'declarative', tense: 'past', roles: { agent: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, theme: { type: 'ITEM', conceptId: 'WOOD' } } },
    ],
    [
      // "Me want basket first."
      { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'BASKET' } } },
      // "Naro has."
      { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'NARO' }, theme: { type: 'ITEM', conceptId: 'BASKET' } } },
      // "Go well."
      { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'WELL' } } },
    ],
  ],

  // Two speech segments:
  //   1) "Basket. Naro."
  //   2) "Me wait." — encoded as BE_STATE NOT_YET (waiting = not-yet state).
  SEN_AWAITING: [
    [
      { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'BASKET' } } },
      { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'NARO' }, theme: { type: 'ITEM', conceptId: 'BASKET' } } },
    ],
    [
      { predicate: 'BE_STATE', mood: 'declarative', roles: { experiencer: 'self', state: { type: 'ABSTRACT', conceptId: 'NOT_YET' } } },
    ],
  ],

  // Two speech segments:
  //   1) "Carry seasoned wood without splinter-drop. My old one cracked."
  //   2) "Naro weaves better. Trade fair: basket, wood."
  SEN_WHY_BASKET: [
    [
      // "Carry seasoned wood..." — Senu has wood and wants a basket to carry it.
      { predicate: 'HAVE', mood: 'declarative', roles: { owner: 'self', theme: { type: 'ITEM', conceptId: 'WOOD' } } },
      { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'BASKET' } } },
    ],
    [
      // "Naro weaves better." — Naro makes the basket. Source==patient is a
      // mild abuse; MAKE.source is required (ITEM) and we have no fibre item.
      { predicate: 'MAKE', mood: 'declarative', roles: { agent: { type: 'ANIMATE', conceptId: 'NARO' }, patient: { type: 'ITEM', conceptId: 'BASKET' }, source: { type: 'ITEM', conceptId: 'BASKET' } } },
      // "Trade fair: basket, wood." — bidirectional trade.
      { predicate: 'GIVE', mood: 'declarative', roles: { agent: 'self', recipient: { type: 'ANIMATE', conceptId: 'NARO' }, theme: { type: 'ITEM', conceptId: 'WOOD' } } },
      { predicate: 'GIVE', mood: 'declarative', roles: { agent: { type: 'ANIMATE', conceptId: 'NARO' }, recipient: 'self', theme: { type: 'ITEM', conceptId: 'BASKET' } } },
    ],
  ],

  // Single speech segment: "Past shrine. Up the path. Sign there. Go."
  SEN_POINT_WELL: [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'WELL' } } },
  ],

  // Two speech segments:
  //   1) "Good hand still." — AFFIRM the basket is well-made (anaphoric).
  //   2) "Wood. For the lighthouse."
  SEN_GIVE_WOOD: [
    [
      { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
    ],
    [
      // "Wood." — give wood to the player.
      { predicate: 'GIVE', mood: 'declarative', roles: { agent: 'self', recipient: 'listener', theme: { type: 'ITEM', conceptId: 'WOOD' } } },
      // "For the lighthouse." — listener should go to the lighthouse with it.
      { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
    ],
  ],

  // Single speech segment: "Mind your steps. Path bends near the bramble."
  // No CAREFUL/PATH primitive; the salient frame is the just-completed
  // handover, so author the GIVE the player's just received.
  SEN_HANDOVER_WOOD: [
    { predicate: 'GIVE', mood: 'declarative', tense: 'past', roles: { agent: 'self', recipient: 'listener', theme: { type: 'ITEM', conceptId: 'WOOD' } } },
  ],

  // Two speech segments:
  //   1) "Three winters they came every dawn. Quiet like me. We cut, we did not need words."
  //      → predecessor visited (past MOVE) and they made wood together.
  //   2) "When they left, the woodpile felt loud."
  //      → predecessor decided to leave (past).
  SEN_MAREN_WOOD: [
    [
      // "they came every dawn" — predecessor moved here (to the forest).
      { predicate: 'MOVE', mood: 'declarative', tense: 'past', roles: { agent: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
      // "We cut" — together they made wood. Source==patient again as a
      // structural placeholder; no TREE concept registered.
      { predicate: 'MAKE', mood: 'declarative', tense: 'past', roles: { agent: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, patient: { type: 'ITEM', conceptId: 'WOOD' }, source: { type: 'ITEM', conceptId: 'WOOD' } } },
    ],
    [
      // "When they left" — predecessor chose to leave.
      { predicate: 'DECIDE', mood: 'declarative', tense: 'past', roles: { decider: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } },
    ],
  ],

  // Single speech segment: "Because today there will be a fire there again..."
  SEN_QUIET_TODAY: [
    { predicate: 'BE_AT', mood: 'declarative', tense: 'future', roles: { figure: { type: 'ITEM', conceptId: 'FIRE' }, ground: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
  ],

  // Single speech segment: "Oil, Lemu. Flint, Toka. Then lighthouse. Hala open the door for fire, not for talk."
  // The "open the door for fire, not for talk" gating rule has no primitive
  // — we capture WANT(Hala,fire) to imply Hala only opens for fire-bearing
  // visitors, plus the imperative move-to-lighthouse Senu is dispatching.
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
    // "Why basket?" — "Do you want the basket?" polar Q.
    [{ predicate: 'WANT', mood: 'declarative', polarQuestion: true, roles: { wanter: 'listener', desired: { type: 'ITEM', conceptId: 'BASKET' } } }],
    // "Naro — where?" — wh-question (NOT polar; mutex with `unknown`).
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'NARO' }, ground: 'unknown' } }],
    [],
  ],
  SEN_HANDOVER_WOOD: [
    // "Maren cut wood with you?" — polar Q about the past MAKE.
    [{ predicate: 'MAKE', mood: 'declarative', tense: 'past', polarQuestion: true, roles: { agent: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, patient: { type: 'ITEM', conceptId: 'WOOD' }, source: { type: 'ITEM', conceptId: 'WOOD' } } }],
    // "Why so quiet today?" — polar BE_STATE QUIET, "Are you quiet?".
    [{ predicate: 'BE_STATE', mood: 'declarative', polarQuestion: true, roles: { experiencer: 'listener', state: { type: 'ABSTRACT', conceptId: 'QUIET' } } }],
    [],
  ],
};
