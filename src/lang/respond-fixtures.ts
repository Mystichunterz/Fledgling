import { FilledFrame, Mood } from "./frames.js";
import { NpcContext } from "./respond-prompt.js";

// A single eval case. `expect` lists soft constraints — anything left out
// is not scored. For role expectations, a string is a single acceptable
// filler (an EntityRef conceptId or one of the deictic pronoun literals
// "self"|"listener"|"reference"|"unknown"); an array is a set of equally-
// acceptable answers.
export interface RespondFixture {
  name: string;
  context: NpcContext;
  incoming: FilledFrame;
  expect: {
    predicate?: string;
    moodAnyOf?: Mood[];
    negated?: boolean;
    // Question-ness used to live in `mood`; under the new model it is the
    // presence of an "unknown" filler. `expectsUnknown: true` checks that
    // exactly one role in the response is the wh-pronoun.
    expectsUnknown?: boolean;
    roles?: Record<string, string | string[]>;
  };
  notes?: string;
}

// Canonical NPC: a smith who has bread, wants flint, knows flint is at
// the cave. Used as the default context for several fixtures.
const SMITH: NpcContext = {
  self: "SMITH",
  desires: ["FLINT"],
  inventory: ["BREAD"],
  knows: [
    { figure: "FLINT", ground: "CAVE" },
    { figure: "STICK", ground: "FOREST" },
  ],
  persona: "gruff, terse village blacksmith",
};

// A second persona: woodsman with stick + lighter, wants water, knows
// the meadow has water. Provides variety so the eval isn't single-context.
const WOODSMAN: NpcContext = {
  self: "WOODSMAN",
  desires: ["WATER"],
  inventory: ["STICK", "LIGHTER"],
  knows: [
    { figure: "WATER", ground: "MEADOW" },
    { figure: "FLINT", ground: "CAVE" },
  ],
  persona: "wandering forester, friendly",
};

export const RESPOND_FIXTURES: RespondFixture[] = [
  {
    name: "answer 'what do you want?'",
    context: SMITH,
    incoming: {
      predicate: "WANT",
      mood: "declarative",
      roles: { wanter: "listener", desired: "unknown" },
    },
    expect: {
      predicate: "WANT",
      moodAnyOf: ["declarative"],
      roles: { wanter: "self", desired: "FLINT" },
    },
  },
  {
    name: "answer 'where is the flint?' (NPC knows)",
    context: SMITH,
    incoming: {
      predicate: "BE_AT",
      mood: "declarative",
      roles: {
        figure: { type: "ITEM", conceptId: "FLINT" },
        ground: "unknown",
      },
    },
    expect: {
      predicate: "BE_AT",
      moodAnyOf: ["declarative"],
      roles: { figure: "FLINT", ground: "CAVE" },
    },
  },
  {
    name: "answer 'where is the stick?' (NPC knows different ground)",
    context: SMITH,
    incoming: {
      predicate: "BE_AT",
      mood: "declarative",
      roles: {
        figure: { type: "ITEM", conceptId: "STICK" },
        ground: "unknown",
      },
    },
    expect: {
      predicate: "BE_AT",
      moodAnyOf: ["declarative"],
      roles: { figure: "STICK", ground: "FOREST" },
    },
  },
  {
    name: "comply with 'give me bread!' (NPC has bread)",
    context: SMITH,
    incoming: {
      predicate: "GIVE",
      mood: "imperative",
      roles: {
        agent: "listener",
        recipient: "self",
        theme: { type: "ITEM", conceptId: "BREAD" },
      },
    },
    expect: {
      predicate: "GIVE",
      moodAnyOf: ["declarative"],
      roles: { agent: "self", recipient: "listener", theme: "BREAD" },
    },
  },
  {
    name: "refuse 'give me flint!' (NPC lacks flint)",
    context: SMITH,
    incoming: {
      predicate: "GIVE",
      mood: "imperative",
      roles: {
        agent: "listener",
        recipient: "self",
        theme: { type: "ITEM", conceptId: "FLINT" },
      },
    },
    expect: {
      // Refusals can take several shapes. Most natural: HAVE … negated.
      predicate: "HAVE",
      moodAnyOf: ["declarative"],
      negated: true,
      roles: { owner: "self", theme: "FLINT" },
    },
    notes:
      "Refusal shape is open — predicate could plausibly be HAVE-negated, " +
      "GIVE-negated, or even WANT. Marking HAVE-negated as canonical; " +
      "alternative shapes will fail this fixture and we'll review.",
  },
  {
    name: "answer 'what do you have?'",
    context: SMITH,
    incoming: {
      predicate: "HAVE",
      mood: "declarative",
      roles: { owner: "listener", theme: "unknown" },
    },
    expect: {
      predicate: "HAVE",
      moodAnyOf: ["declarative"],
      roles: { owner: "self", theme: "BREAD" },
    },
  },
  {
    name: "woodsman: 'where is the water?'",
    context: WOODSMAN,
    incoming: {
      predicate: "BE_AT",
      mood: "declarative",
      roles: {
        figure: { type: "ITEM", conceptId: "WATER" },
        ground: "unknown",
      },
    },
    expect: {
      predicate: "BE_AT",
      moodAnyOf: ["declarative"],
      roles: { figure: "WATER", ground: "MEADOW" },
    },
  },
  {
    name: "woodsman: 'what do you want?' (different desire)",
    context: WOODSMAN,
    incoming: {
      predicate: "WANT",
      mood: "declarative",
      roles: { wanter: "listener", desired: "unknown" },
    },
    expect: {
      predicate: "WANT",
      moodAnyOf: ["declarative"],
      roles: { wanter: "self", desired: "WATER" },
    },
  },
  {
    name: "woodsman: 'give me the stick!' (NPC has it)",
    context: WOODSMAN,
    incoming: {
      predicate: "GIVE",
      mood: "imperative",
      roles: {
        agent: "listener",
        recipient: "self",
        theme: { type: "ITEM", conceptId: "STICK" },
      },
    },
    expect: {
      predicate: "GIVE",
      moodAnyOf: ["declarative"],
      roles: { agent: "self", recipient: "listener", theme: "STICK" },
    },
  },
  {
    name: "answer 'who wants flint?' (NPC self-identifies)",
    context: SMITH,
    incoming: {
      predicate: "WANT",
      mood: "declarative",
      roles: {
        wanter: "unknown",
        desired: { type: "ITEM", conceptId: "FLINT" },
      },
    },
    expect: {
      predicate: "WANT",
      moodAnyOf: ["declarative"],
      roles: { wanter: "self", desired: "FLINT" },
    },
  },
];
