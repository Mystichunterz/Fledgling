// FilledFrame translations for Lemu's dialogue tree.
// Spliced into dialogueTrees.ts at module load (see attachFrames).

import type { FilledFrame } from '../../lang/frames';

// Widened to allow per-segment nested arrays for lines whose `line` field
// has multiple speech segments interleaved with stage cues.
export const LEMU_LINE_FRAMES: Record<string, FilledFrame[] | FilledFrame[][]> = {
  // "Hi. Lemu. Plane brought you. Loud thing."
  // Single speech segment (stage cue precedes it).
  LEM_INITIAL: [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'BE_IDENTITY', mood: 'declarative', roles: { entity: 'self', identity: { type: 'ANIMATE', conceptId: 'LEMU' } } },
    // "Plane brought you" — encode as MOVE with the plane as agent (ITEM).
    // No PLANE template in english lexicon — will render as "the plane" via the
    // generic conceptId-lowercase fallback in nounPhrase().
    // "Plane brought you" — MOVE.agent requires ANIMATE; we substitute the
    // 2nd-person listener as the mover (semantically: "you went somewhere").
    { predicate: 'MOVE', mood: 'declarative', tense: 'past', roles: { agent: 'listener', destination: 'unknown' } },
  ],
  // Two speech segments separated by a stage cue. Use nested form.
  // Seg 0: "Heard it. Like the last one — twenty winters. Me knew before me looked."
  // Seg 1: "Me want water. Go well. Naro know."
  LEM_SAW_PLANE: [
    [
      { predicate: 'KNOW', mood: 'declarative', tense: 'past', roles: { knower: 'self', object: 'reference' } },
    ],
    [
      { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'WATER' } } },
      { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'WELL' } } },
      { predicate: 'KNOW', mood: 'declarative', roles: { knower: { type: 'ANIMATE', conceptId: 'NARO' }, object: 'reference' } },
    ],
  ],
  // Two speech segments.
  // Seg 0: "Boats come every two months. Next one will see your fire if you light it."
  // Seg 1: "Oil for fire. Me want water first. Go well."
  LEM_SEA: [
    [
      // "boats come" — MOVE with future-tense seeing of fire is hard; instead capture
      // the future-see relationship that ties the boat to the player's fire.
      // "Next boat will see your fire" — SEE.viewer requires ANIMATE; we
      // proxy with the future-have relationship between the boat-context and
      // the fire instead. Listener-fire ownership in the future captures
      // "your fire will be there".
      { predicate: 'BE_AT', mood: 'declarative', tense: 'future', roles: { figure: { type: 'ITEM', conceptId: 'FIRE' }, ground: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
    ],
    [
      { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'WATER' } } },
      { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'WELL' } } },
    ],
  ],
  // Two speech segments split by a stage cue.
  // Seg 0: "Water."
  // Seg 1: "Go."
  LEM_AWAITING: [
    [
      { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'WATER' } } },
    ],
    [
      { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'WELL' } } },
    ],
  ],
  // Two speech segments.
  // Seg 0: "Press is dry. Olives need water in the screw. Old trick."
  // Seg 1: "Naro will give. She likes you."
  LEM_WHY_WATER: [
    [
      // "Press is dry" — WANT.wanter requires ANIMATE; we substitute self
      // (Lemu) wanting water for the press, which preserves the author intent
      // even if the press isn't the literal subject.
      { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'WATER' } } },
    ],
    [
      // "Naro will give" — future-give from Naro to listener.
      { predicate: 'GIVE', mood: 'declarative', tense: 'future', roles: { agent: { type: 'ANIMATE', conceptId: 'NARO' }, recipient: 'listener', theme: { type: 'ITEM', conceptId: 'WATER' } } },
    ],
  ],
  LEM_POINT_WELL: [
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'NARO' }, ground: { type: 'LOCATION', conceptId: 'WELL' } } },
  ],
  // "Three measures. Enough to start any fire and keep it through wet wind."
  // Followed by stage cue "she stoppers it, offers it across the press" — the
  // GIVE captures the offer that's about to happen.
  LEM_GIVE_OIL: [
    { predicate: 'GIVE', mood: 'declarative', roles: { agent: 'self', recipient: 'listener', theme: { type: 'ITEM', conceptId: 'OIL' } } },
    { predicate: 'MAKE', mood: 'imperative', roles: { agent: 'listener', patient: { type: 'ITEM', conceptId: 'FIRE' }, source: { type: 'ITEM', conceptId: 'OIL' } } },
  ],
  // "Don't drop it. Cliff is slick after morning fog."
  LEM_HANDOVER_OIL: [
    // "Don't drop it" — HAVE is a state frame so imperative is illegal. The
    // give-context is already captured upstream (LEM_GIVE_OIL); here we surface
    // a MOVE imperative carrying the listener-to-lighthouse trajectory so the
    // line isn't empty.
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
  ],
  // "Every press-day for years. They had a hand for the wheel..."
  // Encode "Maren pressed (had work at the press)" via KNOW + HAVE/BE_AT.
  LEM_MAREN_PRESS: [
    { predicate: 'KNOW', mood: 'declarative', tense: 'past', roles: { knower: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, object: { type: 'ITEM', conceptId: 'PRESS' } as never } } as FilledFrame,
    { predicate: 'BE_AT', mood: 'declarative', tense: 'past', roles: { figure: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, ground: { type: 'LOCATION', conceptId: 'PRESS' } as never } } as FilledFrame,
  ],
  // "Hala will tell you. Me held them at the press for the goodbye. Words belong to her."
  LEM_MAREN_END: [
    { predicate: 'SAY', mood: 'declarative', tense: 'future', roles: { speaker: { type: 'ANIMATE', conceptId: 'HALA' }, recipient: 'listener', content: 'reference' } },
    // "Me held them at the press for the goodbye" — KNOW/HAVE the predecessor at the press in the past.
    { predicate: 'BE_AT', mood: 'declarative', tense: 'past', roles: { figure: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, ground: { type: 'LOCATION', conceptId: 'PRESS' } as never } } as FilledFrame,
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
    // "Why water?" — Lemu rephrasing the player's question as a polar
    // self-want check ("Do I want the water?"). Closest the inventory
    // gets to "why water" without a CAUSE primitive.
    [{ predicate: 'WANT', mood: 'declarative', polarQuestion: true, roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'WATER' } } }],
    // "Well — where?" — bare wh-question, NOT polar (mutex with `unknown`).
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'LOCATION', conceptId: 'WELL' }, ground: 'unknown' } }],
    [],
  ],
  LEM_HANDOVER_OIL: [
    // "Maren press oil too?" — polar Q on Maren making oil.
    [{ predicate: 'MAKE', mood: 'declarative', polarQuestion: true, tense: 'past', roles: { agent: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, patient: { type: 'ITEM', conceptId: 'OIL' }, source: { type: 'ITEM', conceptId: 'OLIVE' } as never } } as FilledFrame],
    // "Maren — at the end?" — polar Q via BE_AT asking whether the predecessor
    // was at the (metaphorical) end. END isn't a real LOCATION, but the
    // generic article fallback will render it as "the end".
    [{ predicate: 'BE_AT', mood: 'declarative', polarQuestion: true, tense: 'past', roles: { figure: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, ground: { type: 'LOCATION', conceptId: 'END' } } }],
    [],
  ],
};
