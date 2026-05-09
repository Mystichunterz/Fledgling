// FilledFrame translations for Hala's dialogue tree (climax).
// Spliced into dialogueTrees.ts at module load (see attachFrames).
//
// Many of Hala's lines are deliberately english-only — her speech is poetic
// monologue beyond the 15-frame inventory. The DECIDE frames in HAL_QUESTION
// and the END_LEAVE/END_STAY tags are the load-bearing ones; the rest are
// flourishes the diary will keep verbatim.
//
// Two of Hala's nodes interleave two speech segments (HAL_DID_MAREN,
// HAL_LETTER). For those we use the per-segment FilledFrame[][] shape so the
// frame attachment lines up with the segment order in dialogueTrees.ts. The
// record type widens to accept both shapes (see attachFrames.ts).

import type { FilledFrame } from '../../lang/frames';

export const HALA_LINE_FRAMES: Record<string, FilledFrame[] | FilledFrame[][]> = {
  // "Not yet." — bare denial, anaphoric to whatever the player is asking.
  // Renders as "No." via the AFFIRM/DENY-reference idiom in english.ts.
  HAL_INITIAL: [
    { predicate: 'DENY', mood: 'declarative', roles: { disagreer: 'self', proposition: 'reference' } },
  ],
  HAL_NOT_YET: [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'HUT' } } },
  ],
  // "Door opens for fire. Bring it." — the central act is "bring it [to me]",
  // a give-to-self imperative. WANT keeps the prior reading ("I want the fire")
  // as a softer paraphrase of the door-fire idiom.
  HAL_DOOR_LOCKED: [
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'FIRE' } } },
    { predicate: 'GIVE', mood: 'imperative', roles: { agent: 'listener', recipient: 'self', theme: { type: 'ITEM', conceptId: 'FIRE' } } },
  ],
  HAL_SOME_ITEMS: [
    { predicate: 'GIVE', mood: 'imperative', roles: { agent: 'listener', recipient: 'self', theme: { type: 'ITEM', conceptId: 'FIRE' } } },
  ],
  // "Come." — the player is already at the lighthouse, so an explicit
  // destination would be a deictic-flip bug. Use 'unknown' as the
  // unspecified-destination idiom; the imperative-with-unknown-destination
  // path is suppressed in english.ts so this no longer renders "Go to where!".
  HAL_DOOR_OPENS: [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: 'unknown' } },
  ],
  // "There. Same fire. Same air. Twenty winters and the same wind through the
  // chimney." — Hala's reflection on the unchanged hearth. The literal
  // propositions are "the fire is at the lighthouse" (still here) and "you
  // came" (BE_AT listener at the lighthouse). KNOW listener captures the
  // recognition beat — Hala sees the player and remembers the predecessor.
  HAL_BEACON_OPEN: [
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ITEM', conceptId: 'FIRE' }, ground: { type: 'LOCATION', conceptId: 'LIGHTHOUSE' } } },
    { predicate: 'KNOW', mood: 'declarative', roles: { knower: 'self', object: 'listener' } },
  ],
  HAL_KNEW_MAREN: [
    { predicate: 'KNOW', mood: 'declarative', tense: 'past', roles: { knower: 'self', object: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } },
  ],
  // Two speech segments. Segment 0: "Yes. Boat saw the fire that night. They
  // went up the rope ladder and turned once at the top to look back. Then ship
  // went on." — affirmation + the leaving moment (DECIDE.past LEAVING).
  // Segment 1: "A year later, wind brought a folded paper in a fishing net."
  // — the letter arrives. GIVE past, agent reference (the predecessor),
  // recipient self.
  HAL_DID_MAREN: [
    [
      { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
      { predicate: 'DECIDE', mood: 'declarative', tense: 'past', roles: { decider: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } },
    ],
    [
      { predicate: 'GIVE', mood: 'declarative', tense: 'past', roles: { agent: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, recipient: 'self', theme: { type: 'ITEM', conceptId: 'LETTER' } } },
    ],
  ],
  // "Because the fire reminds me. Because you remind me. Because me always
  // thought there'd only be one." — the central proposition is "I see you
  // [and remember]". KNOW listener is closest; the SEE.target=listener
  // captures the "you remind me" beat. Use both for a richer rendering.
  HAL_WHY_CRYING: [
    { predicate: 'SEE', mood: 'declarative', roles: { viewer: 'self', target: 'listener' } },
    { predicate: 'KNOW', mood: 'declarative', tense: 'past', roles: { knower: 'self', object: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } },
  ],
  HAL_WAIT: [
    { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
  ],
  // "They woke one morning and said it's time, isn't it. Me said yes, because
  // it was. We lit this lighthouse together. Boat came at dawn. They left me
  // a smooth river-stone and a name they'd written down — yours and mine on
  // the same page — and they went."
  //
  // Three load-bearing propositions: predecessor said something to self
  // (reference anaphor for "it's time"), predecessor and self made the fire
  // ("we lit this lighthouse"), predecessor decided to leave.
  HAL_END_STORY: [
    { predicate: 'SAY', mood: 'declarative', tense: 'past', roles: { speaker: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, recipient: 'self', content: 'reference' } },
    { predicate: 'MAKE', mood: 'declarative', tense: 'past', roles: { agent: 'self', patient: { type: 'ITEM', conceptId: 'FIRE' }, source: { type: 'ITEM', conceptId: 'WOOD' } } },
    { predicate: 'DECIDE', mood: 'declarative', tense: 'past', roles: { decider: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } },
  ],
  // Two speech segments. Segment 0: "Six lines. They had taught their family
  // our words. They said the bread on their side of the world was the wrong
  // shape. They said the sea was louder there." — predecessor said something
  // to self (anaphoric).
  // Segment 1: "We read it once a year. Whole village." — self saw the letter
  // (the closest the inventory gets to "we read it"; SEE.past + LETTER).
  HAL_LETTER: [
    [
      { predicate: 'SAY', mood: 'declarative', tense: 'past', roles: { speaker: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, recipient: 'self', content: 'reference' } },
    ],
    [
      { predicate: 'SEE', mood: 'declarative', roles: { viewer: 'self', target: { type: 'ITEM', conceptId: 'LETTER' } } },
    ],
  ],
  // "Me don't know what your word for it is. Me don't even know if me have
  // one in mine. We were each other's. That is what me have."
  //
  // KNOW.negated reference renders "I don't know it." — closest to "me don't
  // know what your word for it is". HAVE owner=self theme=reference (the
  // predecessor) captures "we had each other" — the affirmative core after
  // the linguistic-relativity disclaimers.
  HAL_LOVE: [
    { predicate: 'KNOW', mood: 'declarative', negated: true, roles: { knower: 'self', object: 'reference' } },
    { predicate: 'HAVE', mood: 'declarative', tense: 'past', roles: { owner: 'self', theme: 'reference' } },
  ],
  // "It was the choice they could live with. Both choices are real. Neither
  // is better. The wrong one is the one you can't believe in." — the central
  // proposition is the predecessor's past decision to leave (the choice they
  // could live with).
  HAL_RIGHT_CHOICE: [
    { predicate: 'DECIDE', mood: 'declarative', tense: 'past', roles: { decider: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } },
  ],
  HAL_WANTED_STAY: [
    { predicate: 'WANT', mood: 'declarative', tense: 'past', roles: { wanter: 'self', desired: { type: 'ABSTRACT', conceptId: 'STAYING' } } },
    { predicate: 'DECIDE', mood: 'declarative', tense: 'past', roles: { decider: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } },
  ],
  HAL_QUESTION: [
    // "You go, or you stay?" — wh-DECIDE on the player's choice.
    { predicate: 'DECIDE', mood: 'declarative', roles: { decider: 'listener', choice: 'unknown' } },
  ],
  // "Take it. The fire will keep." — "it" refers to the moment, not the fire.
  // Render as TAKE imperative with theme=reference (anaphor to the moment) so
  // the rendering doesn't deictic-flip into "Take the fire!".
  HAL_MOMENT: [
    { predicate: 'TAKE', mood: 'imperative', roles: { agent: 'listener', theme: 'reference' } },
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
  HAL_INITIAL: [
    // "Not yet — what?" — polar BE_STATE NOT_YET, "Am I not yet?".
    [{ predicate: 'BE_STATE', mood: 'declarative', polarQuestion: true, roles: { experiencer: 'self', state: { type: 'ABSTRACT', conceptId: 'NOT_YET' } } }],
    [],
    [],
  ],
  HAL_NOT_YET: [[]],
  HAL_DOOR_LOCKED: [[]],
  HAL_SOME_ITEMS: [[]],
  HAL_DOOR_OPENS: [[]],
  HAL_BEACON_OPEN: [
    [{ predicate: 'KNOW', mood: 'declarative', tense: 'past', roles: { knower: 'listener', object: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } }],
    [{ predicate: 'DECIDE', mood: 'declarative', tense: 'past', polarQuestion: true, roles: { decider: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } }],
    // "Why you cry?" — polar BE_STATE GOOD negated, "Aren't you good?".
    [{ predicate: 'BE_STATE', mood: 'declarative', polarQuestion: true, negated: true, roles: { experiencer: 'listener', state: { type: 'ABSTRACT', conceptId: 'GOOD' } } }],
    [],
  ],
  HAL_KNEW_MAREN: [
    [{ predicate: 'SAY', mood: 'imperative', roles: { speaker: 'listener', recipient: 'self', content: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } }],
    // "Letter — still come?" — polar future SAY of LETTER from predecessor to self.
    [{ predicate: 'SAY', mood: 'declarative', tense: 'future', polarQuestion: true, roles: { speaker: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, recipient: 'self', content: { type: 'ITEM', conceptId: 'LETTER' } } }],
    // "Were you — love?" — polar past KNOW, "Did you know the predecessor?".
    [{ predicate: 'KNOW', mood: 'declarative', tense: 'past', polarQuestion: true, roles: { knower: 'listener', object: { type: 'ANIMATE', conceptId: 'PREDECESSOR' } } }],
  ],
  HAL_DID_MAREN: [[]],
  HAL_WHY_CRYING: [[]],
  HAL_WAIT: [[]],
  HAL_END_STORY: [
    // "Right choice?" — polar past DECIDE, "Did the predecessor choose to leave?".
    [{ predicate: 'DECIDE', mood: 'declarative', tense: 'past', polarQuestion: true, roles: { decider: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } }],
    [{ predicate: 'WANT', mood: 'declarative', tense: 'past', polarQuestion: true, roles: { wanter: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, desired: { type: 'ABSTRACT', conceptId: 'STAYING' } } }],
    // "Me — same question?" — polar DECIDE on self, "Do I choose to leave?".
    [{ predicate: 'DECIDE', mood: 'declarative', polarQuestion: true, roles: { decider: 'self', choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } }],
  ],
  HAL_LETTER: [[]],
  HAL_LOVE: [[]],
  HAL_RIGHT_CHOICE: [[]],
  HAL_WANTED_STAY: [[]],
  HAL_QUESTION: [
    [{ predicate: 'DECIDE', mood: 'declarative', roles: { decider: 'self', choice: { type: 'ABSTRACT', conceptId: 'LEAVING' } } }],
    [{ predicate: 'DECIDE', mood: 'declarative', roles: { decider: 'self', choice: { type: 'ABSTRACT', conceptId: 'STAYING' } } }],
    // "Wait — me think." — BE_STATE NOT_YET, "I am not yet.".
    [{ predicate: 'BE_STATE', mood: 'declarative', roles: { experiencer: 'self', state: { type: 'ABSTRACT', conceptId: 'NOT_YET' } } }],
  ],
  HAL_MOMENT: [[]],
  END_LEAVE: [[]],
  END_STAY: [[]],
};
