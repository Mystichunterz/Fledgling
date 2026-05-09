// FilledFrame translations for Toka's dialogue tree.
// Spliced into dialogueTrees.ts at module load (see attachFrames).
//
// LINE_FRAMES[nodeId] uses one of two shapes (see LineFrameAttachment):
//   - flat FilledFrame[]:    applies to the first speech segment in the node
//   - nested FilledFrame[][]: one inner array per speech segment in
//     declaration order (use for nodes with interleaved stage/speech).
// OPTION_FRAMES[nodeId][i] applies to the i-th option in declaration order;
// gestures and unframable utterances use [].

import type { FilledFrame } from '../../lang/frames';

// Per-segment frame stacks for nodes with interleaved stage/speech. Declared
// separately from the dict so the (loose) type widening below stays a single
// cast at the entry rather than scattered through the literal.

// "All right. You're new wreck. Stay out of me way until me see what you are."
// then (after stage cue) "Me want rope. Go forest. Senu has."
const TOK_HANDS_OPEN_PER_SEGMENT: FilledFrame[][] = [
  // Speech 1 — "All right." is the only piece with a clean primitive; the
  // "new wreck" / "stay out of me way" parts are descriptive flavour with no
  // primitive (no IDENTITY-as-a-property frame; no AVOID/BE_AWAY).
  [
    { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
  ],
  // Speech 2 — the imperative-flavoured chain.
  [
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'ROPE' } } },
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
    { predicate: 'HAVE', mood: 'declarative', roles: { owner: { type: 'ANIMATE', conceptId: 'SENU' }, theme: { type: 'ITEM', conceptId: 'ROPE' } } },
  ],
];

// "Like the last one. Walk west, find their hut, read what they wrote.
// Then come back. Me want rope, you bring." then (stage cue) "Then talk."
const TOK_CRASHED_PER_SEGMENT: FilledFrame[][] = [
  // Speech 1 — go to the hut, want rope, you bring it (player→self GIVE).
  // "Read what they wrote" has no READ primitive; "come back" has no
  // back-destination primitive. Best we can do: MOVE→HUT, WANT.rope,
  // GIVE imperative agent:listener recipient:self theme:ROPE (= "you bring").
  [
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'HUT' } } },
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'ROPE' } } },
    { predicate: 'GIVE', mood: 'imperative', roles: { agent: 'listener', recipient: 'self', theme: { type: 'ITEM', conceptId: 'ROPE' } } },
  ],
  // Speech 2 — "Then talk." SAY imperative listener→self with reference
  // content surfaces as "Say it to me!".
  [
    { predicate: 'SAY', mood: 'imperative', roles: { speaker: 'listener', recipient: 'self', content: 'reference' } },
  ],
];

// "Rope. Senu. Forest." then (stage) "Me wait."
const TOK_AWAITING_PER_SEGMENT: FilledFrame[][] = [
  // Speech 1.
  [
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'ROPE' } } },
    { predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'SENU' }, ground: { type: 'LOCATION', conceptId: 'FOREST' } } },
  ],
  // Speech 2 — "Me wait." surfaces as "I am not yet." via NOT_YET state.
  [
    { predicate: 'BE_STATE', mood: 'declarative', roles: { experiencer: 'self', state: { type: 'ABSTRACT', conceptId: 'NOT_YET' } } },
  ],
];

// "Good. Senu's hand still." then (stage) "Don't lose it. Second-oldest
// thing on this island. After Hala." then (stage). Two speech segments.
const TOK_GIVE_FLINT_PER_SEGMENT: FilledFrame[][] = [
  // Speech 1 — affirm (acknowledging the rope is good); "Senu's hand still"
  // has no still/steady primitive.
  [
    { predicate: 'AFFIRM', mood: 'declarative', roles: { agreer: 'self', proposition: 'reference' } },
  ],
  // Speech 2 — Toka hands over the flint. "Don't lose it" / "second-oldest"
  // have no clean primitives, but the GIVE captures the central act.
  [
    { predicate: 'GIVE', mood: 'declarative', roles: { agent: 'self', recipient: 'listener', theme: { type: 'ITEM', conceptId: 'FLINT' } } },
  ],
];

export const TOKA_LINE_FRAMES: Record<string, FilledFrame[] | FilledFrame[][]> = {
  // "Hi. Stop. Hands open." — GREET + a negated MOVE imperative for "Stop"
  // (renders as "Don't go!" once the unfilled destination is dropped). No
  // primitive for "hands open" — that's a gesture-stop command beyond our
  // inventory; the surrounding stage cue / sprite carries it.
  TOK_INITIAL: [
    { predicate: 'GREET', mood: 'declarative', roles: { greeter: 'self', addressee: 'listener' } },
    { predicate: 'MOVE', mood: 'imperative', negated: true, roles: { agent: 'listener', destination: 'unknown' } },
  ],
  // attachFrames detects the per-segment shape at runtime (Array.isArray on
  // the first element). The cast is a type-system accommodation so the
  // existing test infrastructure (which iterates entries as FilledFrame[])
  // keeps the same shape contract — see frames.test.ts collect().
  TOK_HANDS_OPEN: TOK_HANDS_OPEN_PER_SEGMENT,
  TOK_CRASHED: TOK_CRASHED_PER_SEGMENT,
  TOK_AWAITING: TOK_AWAITING_PER_SEGMENT,
  TOK_WHY_ROPE: [
    // "Shrine roof. Wind tore the binding. Old rope is salt-rot. Need new —
    // Senu cuts good fibre." — most of this is descriptive (no primitives
    // for roof/wind/rot); the load-bearing meaning is "I want rope" which
    // we already encode upstream, so just keep the WANT here too.
    { predicate: 'WANT', mood: 'declarative', roles: { wanter: 'self', desired: { type: 'ITEM', conceptId: 'ROPE' } } },
  ],
  TOK_POINT_FOREST: [
    // "Trees. Sign at fork. Go." — bare imperative to the forest.
    { predicate: 'MOVE', mood: 'imperative', roles: { agent: 'listener', destination: { type: 'LOCATION', conceptId: 'FOREST' } } },
  ],
  TOK_GIVE_FLINT: TOK_GIVE_FLINT_PER_SEGMENT,
  TOK_HANDOVER_FLINT: [
    // "Strike sharp, not hard. Wind on the cliff will do half the work." —
    // no STRIKE primitive; surface the central act as MAKE fire from flint
    // ("Make the fire from the flint!").
    { predicate: 'MAKE', mood: 'imperative', roles: { agent: 'listener', patient: { type: 'ITEM', conceptId: 'FIRE' }, source: { type: 'ITEM', conceptId: 'FLINT' } } },
  ],
  TOK_MAREN_FLINT: [
    // "They asked me three times before me gave it…" — past GIVE with the
    // predecessor as recipient. (Toka is the giver.)
    { predicate: 'GIVE', mood: 'declarative', tense: 'past', roles: { agent: 'self', recipient: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, theme: { type: 'ITEM', conceptId: 'FLINT' } } },
  ],
  TOK_WHY_LIKE_THAT: [
    // "We owed Maren their leaving…" — the predecessor's choice to leave is
    // the load-bearing meaning here; the rest is reflective context.
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
    // "Why rope?" — surface as polar Q "Do you want the rope?".
    [{ predicate: 'WANT', mood: 'declarative', polarQuestion: true, roles: { wanter: 'listener', desired: { type: 'ITEM', conceptId: 'ROPE' } } }],
    // "Senu — where?" — wh-question (NOT polar; mutex with `unknown`).
    [{ predicate: 'BE_AT', mood: 'declarative', roles: { figure: { type: 'ANIMATE', conceptId: 'SENU' }, ground: 'unknown' } }],
    [],
  ],
  TOK_WHY_ROPE: [[]],
  TOK_POINT_FOREST: [[]],
  TOK_GIVE_FLINT: [[]],
  TOK_HANDOVER_FLINT: [
    // "Maren ask you too?" — the player asks ABOUT Maren's request, so the
    // predecessor is the speaker, the listener (player) is the recipient,
    // and the flint is the asked-about content. Past polar Q surfaces as
    // "Did the predecessor say the flint to you?" — close enough; English's
    // "ask for" requires a request primitive we don't have.
    [{ predicate: 'SAY', mood: 'declarative', tense: 'past', polarQuestion: true, roles: { speaker: { type: 'ANIMATE', conceptId: 'PREDECESSOR' }, recipient: 'listener', content: { type: 'ITEM', conceptId: 'FLINT' } } }],
    // "Why you say like that?" — polar Q "Did you say it to me?".
    [{ predicate: 'SAY', mood: 'declarative', polarQuestion: true, roles: { speaker: 'listener', recipient: 'self', content: 'reference' } }],
    [],
  ],
  TOK_MAREN_FLINT: [[]],
  TOK_WHY_LIKE_THAT: [[]],
  TOK_POST_ITEM: [[]],
};
