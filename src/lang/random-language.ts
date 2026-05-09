import {
  Difficulty,
  HeadDirection,
  LanguageSpec,
  LexiconEntry,
  NegationStrategy,
  PRONOUN_ID_FOR,
} from "./language-spec.js";
import {
  FilledFrame,
  Number_,
  Pronoun,
  RoleFiller,
  isEntityRef,
  isPronoun,
} from "./frames.js";
import { encodeFrame } from "./encoder.js";
import { decodeText } from "./decoder.js";
import {
  Rng,
  makeSubsystemRngs,
  pick,
  randomSeedString,
} from "./prng.js";
import {
  Phonology,
  generatePhonology,
  shortAffix,
  uniqueWords,
} from "./phonology.js";
import { customLanguageForSeed } from "./custom-languages.js";

// Re-export so callers don't have to import from prng directly.
export { randomSeedString };
export { customLanguageNames } from "./custom-languages.js";

// Concept inventory the random language must cover. v2 adds verbs for the
// new frames (SEE/SAY/MAKE/EAT) and a few new content nouns; the legacy
// 6-frame set is kept verbatim so older fixtures keep parsing.
const VERB_CONCEPTS = [
  "GIVE", "TAKE", "MOVE", "WANT", "BE_AT", "HAVE",
  "SEE", "SAY", "MAKE", "EAT",
  // Social / dialogue frames added for game integration.
  "GREET", "AFFIRM", "DENY", "DECIDE", "KNOW",
] as const;
const ITEM_CONCEPTS = [
  "FLINT", "STICK", "LIGHTER", "BREAD", "WATER",
  "WOOD", "OIL", "FRUIT", "PEBBLE", "JOURNAL", "LETTER", "FIRE",
] as const;
const LOCATION_CONCEPTS = [
  "FOREST", "CAVE", "FORGE", "MEADOW",
  "BEACH", "VILLAGE", "HUT", "LIGHTHOUSE", "SHRINE", "HOME",
] as const;
const ANIMATE_CONCEPTS = [
  "SMITH", "WOODSMAN",
  "PREDECESSOR", "BAKER", "FARMER", "GUARD", "CHILD", "SHRINE_KEEPER",
] as const;
const ABSTRACT_CONCEPTS = ["LEAVING", "STAYING"] as const;
// Deictic pronouns the random language must realise. Keys correspond to
// the Pronoun enum members minus "unknown" (wh-words are emitted under
// the WH_<TYPE> scheme below). Lexicon keys follow PRONOUN_ID_FOR.
const PRONOUN_PERSONS = ["self", "listener", "reference"] as const satisfies readonly Pronoun[];

const WORD_ORDERS = ["SOV", "SVO", "VSO", "VOS", "OSV", "OVS"] as const;
const POSITIONS = ["prefix", "suffix"] as const;
const OBLIQUE_POSITIONS = ["pre-verb", "post-verb"] as const;
const PARTICLE_POSITIONS = ["initial", "final"] as const;
const HEAD_DIRECTIONS: HeadDirection[] = ["head-initial", "head-final"];
const ADP_ORDERS = ["preposition", "postposition"] as const;
const ADJ_ORDERS = ["pre-noun", "post-noun"] as const;
const NEG_STRATEGIES: NegationStrategy[] = ["pre-verb", "post-verb", "affix"];

// Build the lexicon shared across difficulties. Verbs, nouns, pronouns, and
// wh-words have distinct stem lengths so the decoder's longest-stem
// tiebreak stays well-behaved in full mode.
function generateLexicon(rng: Rng, phon: Phonology): Record<string, LexiconEntry> {
  const verbCount = VERB_CONCEPTS.length;
  const nounCount =
    ITEM_CONCEPTS.length +
    LOCATION_CONCEPTS.length +
    ANIMATE_CONCEPTS.length +
    ABSTRACT_CONCEPTS.length;
  const contentStems = uniqueWords(rng, phon, verbCount + nounCount, 2);
  // Short stems: 3 deictic pronouns + 4 wh-words (animate/item/location/abstract).
  const shortStems = uniqueWords(rng, phon, PRONOUN_PERSONS.length + 4, 1);

  const lexicon: Record<string, LexiconEntry> = {};
  let i = 0;
  for (const id of VERB_CONCEPTS) {
    lexicon[id] = { stem: contentStems[i++]!, category: "verb", frame: id };
  }
  for (const id of ITEM_CONCEPTS) {
    lexicon[id] = { stem: contentStems[i++]!, category: "noun", semanticType: "ITEM" };
  }
  for (const id of LOCATION_CONCEPTS) {
    lexicon[id] = { stem: contentStems[i++]!, category: "noun", semanticType: "LOCATION" };
  }
  for (const id of ANIMATE_CONCEPTS) {
    lexicon[id] = { stem: contentStems[i++]!, category: "noun", semanticType: "ANIMATE" };
  }
  for (const id of ABSTRACT_CONCEPTS) {
    lexicon[id] = { stem: contentStems[i++]!, category: "noun", semanticType: "ABSTRACT" };
  }
  let j = 0;
  for (const person of PRONOUN_PERSONS) {
    lexicon[PRONOUN_ID_FOR[person]] = {
      stem: shortStems[j++]!,
      category: "pronoun",
      person,
      semanticType: "ANIMATE",
      inherentNumber: "sg",
    };
  }
  lexicon["WH_ANIMATE"]  = { stem: shortStems[j++]!, category: "wh", semanticType: "ANIMATE" };
  lexicon["WH_ITEM"]     = { stem: shortStems[j++]!, category: "wh", semanticType: "ITEM" };
  lexicon["WH_LOCATION"] = { stem: shortStems[j++]!, category: "wh", semanticType: "LOCATION" };
  lexicon["WH_ABSTRACT"] = { stem: shortStems[j++]!, category: "wh", semanticType: "ABSTRACT" };
  return lexicon;
}

// Draw an affix form distinct from anything in `taken`. Retries up to a
// generous cap; throws if the phonology can't fit one. Difficulty is forwarded
// to shortAffix so simple-mode draws stay CV-shaped.
function drawDistinctAffix(
  rng: Rng,
  phon: Phonology,
  taken: Set<string>,
  difficulty: Difficulty = "full",
): string {
  for (let g = 0; g < 200; g++) {
    const f = shortAffix(rng, phon, difficulty);
    if (taken.has(f)) continue;
    return f;
  }
  throw new Error("could not draw a distinct affix form");
}

function generateFullAttempt(
  phonRng: Rng,
  morphRng: Rng,
  syntaxRng: Rng,
  lexRng: Rng,
): LanguageSpec {
  const phonology = generatePhonology(phonRng);
  const lexicon = generateLexicon(lexRng, phonology);

  const position = pick(POSITIONS, morphRng);
  const wordOrder = pick(WORD_ORDERS, syntaxRng);
  const obliquePosition = pick(OBLIQUE_POSITIONS, syntaxRng);

  // Case affixes (NOM zero); all distinct.
  const caseTaken = new Set<string>([""]);
  const accForm = drawDistinctAffix(morphRng, phonology, caseTaken); caseTaken.add(accForm);
  const datForm = drawDistinctAffix(morphRng, phonology, caseTaken); caseTaken.add(datForm);

  // Mood affixes (DECL zero); all distinct.
  const moodTaken = new Set<string>([""]);
  const qForm = drawDistinctAffix(morphRng, phonology, moodTaken); moodTaken.add(qForm);
  const impForm = drawDistinctAffix(morphRng, phonology, moodTaken); moodTaken.add(impForm);

  // Number affix: sg zero, pl distinct.
  const plForm = drawDistinctAffix(morphRng, phonology, new Set([""]));

  // Tense affixes: present zero, past + future distinct.
  const tenseTaken = new Set<string>([""]);
  const pastForm = drawDistinctAffix(morphRng, phonology, tenseTaken); tenseTaken.add(pastForm);
  const futureForm = drawDistinctAffix(morphRng, phonology, tenseTaken); tenseTaken.add(futureForm);

  // Negation affix.
  const negForm = drawDistinctAffix(morphRng, phonology, new Set([""]));

  const headDirection = pick(HEAD_DIRECTIONS, syntaxRng);
  const adpositionOrder = pick(ADP_ORDERS, syntaxRng);
  const adjectiveOrder = pick(ADJ_ORDERS, syntaxRng);
  const negationStrategy = pick(NEG_STRATEGIES, syntaxRng);
  // 50% chance of subject-verb number agreement.
  const subjectVerbNumber = syntaxRng() < 0.5;

  return {
    id: stemId(phonology, syntaxRng),
    difficulty: "full",
    phonology,
    lexicon,
    morphology: {
      alignment: "nom-acc",
      case: {
        NOM: { form: "",      position },
        ACC: { form: accForm, position },
        DAT: { form: datForm, position },
      },
      mood: {
        DECL: { form: "",      position },
        Q:    { form: qForm,   position },
        IMP:  { form: impForm, position },
      },
      number: {
        sg: { form: "",     position },
        pl: { form: plForm, position },
      },
      tense: {
        present: { form: "",         position },
        past:    { form: pastForm,   position },
        future:  { form: futureForm, position },
      },
      negation: { form: negForm, position },
    },
    syntax: {
      wordOrder,
      obliquePosition,
      headDirection,
      adpositionOrder,
      adjectiveOrder,
      negationStrategy,
      agreement: { subjectVerbNumber },
    },
  };
}

function generateSimpleAttempt(
  phonRng: Rng,
  morphRng: Rng,
  syntaxRng: Rng,
  lexRng: Rng,
): LanguageSpec {
  // Simple difficulty: clean CV phonology, canonical inventory, no harmony,
  // no tones. Particle draws below inherit the same restriction via
  // drawDistinctAffix → shortAffix.
  const phonology = generatePhonology(phonRng, "simple");
  const lexicon = generateLexicon(lexRng, phonology);
  const stems = new Set(Object.values(lexicon).map((e) => e.stem));

  // Simple difficulty pins word order to SVO so learners always see
  // subject-then-verb-then-object — the easiest order to map to English.
  // Other syntactic dials are still randomised to keep variety.
  const wordOrder = "SVO" as const;
  const obliquePosition = pick(OBLIQUE_POSITIONS, syntaxRng);

  // Mood particles must be unique vs lexicon stems and each other.
  const taken = new Set<string>([...stems]);
  const qForm = drawDistinctAffix(morphRng, phonology, taken, "simple"); taken.add(qForm);
  const impForm = drawDistinctAffix(morphRng, phonology, taken, "simple");
  const qPosition = pick(PARTICLE_POSITIONS, syntaxRng);
  const impPosition = pick(PARTICLE_POSITIONS, syntaxRng);

  // Affix position is irrelevant when every form is "", but the schema
  // still requires one. "suffix" is the more common cross-linguistic default.
  const zeroPos = "suffix" as const;
  const zero = { form: "", position: zeroPos };

  return {
    id: stemId(phonology, syntaxRng),
    difficulty: "simple",
    phonology,
    lexicon,
    morphology: {
      alignment: "nom-acc",
      case:   { NOM: zero, ACC: zero, DAT: zero },
      mood:   { DECL: zero, Q: zero, IMP: zero },
      number: { sg: zero, pl: zero },
      tense:  { present: zero, past: zero, future: zero },
      negation: zero,
    },
    syntax: {
      wordOrder,
      obliquePosition,
      headDirection: pick(HEAD_DIRECTIONS, syntaxRng),
      adpositionOrder: pick(ADP_ORDERS, syntaxRng),
      adjectiveOrder: pick(ADJ_ORDERS, syntaxRng),
      // Simple-mode never marks negation morphologically — keep the dial
      // present for schema completeness; encoder skips it when negated=false.
      negationStrategy: "pre-verb",
      agreement: { subjectVerbNumber: false },
    },
    particles: {
      Q:   { form: qForm,   position: qPosition },
      IMP: { form: impForm, position: impPosition },
    },
  };
}

// Quick language-id generator (3 syllables under the language's own phonology).
function stemId(phon: Phonology, rng: Rng): string {
  return uniqueWords(rng, phon, 1, 3)[0]!;
}

// Representative frames covering the collision modes that matter.
const PROBE_FRAMES: FilledFrame[] = [
  {
    predicate: "WANT", mood: "declarative",
    roles: {
      wanter:  { type: "ANIMATE", conceptId: "SMITH" },
      desired: { type: "ITEM",    conceptId: "FLINT" },
    },
  },
  {
    predicate: "GIVE", mood: "declarative",
    roles: {
      agent:     "self",
      recipient: { type: "ANIMATE", conceptId: "SMITH" },
      theme:     { type: "ITEM",    conceptId: "FLINT" },
    },
  },
  {
    predicate: "GIVE", mood: "declarative",
    roles: {
      agent:     { type: "ANIMATE", conceptId: "SMITH" },
      recipient: "listener",
      theme:     { type: "ITEM",    conceptId: "STICK" },
    },
  },
  // Wh-probes (questions): no longer require interrogative mood — the
  // "unknown" filler alone marks the question.
  {
    predicate: "WANT", mood: "declarative",
    roles: {
      wanter:  { type: "ANIMATE", conceptId: "SMITH" },
      desired: "unknown",
    },
  },
  {
    predicate: "BE_AT", mood: "declarative",
    roles: {
      figure: { type: "ITEM", conceptId: "FLINT" },
      ground: "unknown",
    },
  },
  {
    predicate: "HAVE", mood: "declarative",
    roles: {
      owner: "unknown",
      theme: { type: "ITEM", conceptId: "FLINT" },
    },
  },
  {
    predicate: "TAKE", mood: "imperative",
    roles: {
      agent: "listener",
      theme: { type: "ITEM", conceptId: "FLINT" },
    },
  },
  // New-frame coverage:
  {
    predicate: "EAT", mood: "declarative",
    roles: {
      agent:   { type: "ANIMATE", conceptId: "SMITH" },
      patient: { type: "ITEM",    conceptId: "BREAD" },
    },
  },
  {
    predicate: "SEE", mood: "declarative",
    roles: {
      viewer: "self",
      target: { type: "LOCATION", conceptId: "MEADOW" },
    },
  },
  // 3rd-person anaphor probe (round-trip exercise for "reference").
  {
    predicate: "WANT", mood: "declarative",
    roles: {
      wanter:  "reference",
      desired: { type: "ITEM", conceptId: "FLINT" },
    },
  },
  // Pronouns in ACC case — SEE.target accepts ANIMATE so all three pronouns
  // can ride that slot. Catches stem-collision modes that only surface when
  // a pronoun is object-case marked rather than subject-case.
  {
    predicate: "SEE", mood: "declarative",
    roles: {
      viewer: { type: "ANIMATE", conceptId: "SMITH" },
      target: "reference",
    },
  },
  {
    predicate: "SEE", mood: "declarative",
    roles: {
      viewer: { type: "ANIMATE", conceptId: "WOODSMAN" },
      target: "self",
    },
  },
  {
    predicate: "SEE", mood: "declarative",
    roles: {
      viewer: { type: "ANIMATE", conceptId: "WOODSMAN" },
      target: "listener",
    },
  },
  // Pronoun in DAT case — GIVE.recipient marks DAT (oblique).
  {
    predicate: "GIVE", mood: "declarative",
    roles: {
      agent:     { type: "ANIMATE", conceptId: "SMITH" },
      recipient: "reference",
      theme:     { type: "ITEM", conceptId: "FLINT" },
    },
  },
  // Plural number probe (full-mode only).
  {
    predicate: "WANT", mood: "declarative",
    roles: {
      wanter:  { type: "ANIMATE", conceptId: "SMITH", number: "pl" },
      desired: { type: "ITEM",    conceptId: "FLINT" },
    },
  },
  // Past-tense probe (full-mode only).
  {
    predicate: "EAT", mood: "declarative",
    tense: "past",
    roles: {
      agent:   { type: "ANIMATE", conceptId: "WOODSMAN" },
      patient: { type: "ITEM",    conceptId: "BREAD" },
    },
  },
];

function fillerEqual(a: RoleFiller, b: RoleFiller): boolean {
  if (isPronoun(a) || isPronoun(b)) return a === b;
  if (!isEntityRef(a) || !isEntityRef(b)) return false;
  if (a.type !== b.type) return false;
  if (a.conceptId !== b.conceptId) return false;
  // Compare numbers, treating absence as singular.
  const an: Number_ = a.number ?? "sg";
  const bn: Number_ = b.number ?? "sg";
  return an === bn;
}

function roundTrips(spec: LanguageSpec): boolean {
  // In simple mode all morphology is zero-marked, so probes that depend on
  // number/tense distinctions can't round-trip there — skip them.
  const probes = spec.difficulty === "simple"
    ? PROBE_FRAMES.filter((f) =>
        !f.tense &&
        Object.values(f.roles).every(
          (r) => isPronoun(r) || (isEntityRef(r) && r.number === undefined),
        ),
      )
    : PROBE_FRAMES;
  for (const frame of probes) {
    try {
      const surface = encodeFrame(spec, frame);
      const decoded = decodeText(spec, surface);
      if (decoded.predicate !== frame.predicate) return false;
      if (decoded.mood !== frame.mood) return false;
      if ((decoded.tense ?? "present") !== (frame.tense ?? "present")) return false;
      const keys = Object.keys(frame.roles);
      if (keys.length !== Object.keys(decoded.roles).length) return false;
      for (const k of keys) {
        const a = frame.roles[k];
        const b = decoded.roles[k];
        if (!a || !b || !fillerEqual(a, b)) return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

// Generate a random language whose probe frames round-trip cleanly. Retries
// on collision (e.g. a content stem that happens to equal pronoun + DAT).
//
// `difficulty` selects the morphological richness:
//   "full"   — full inflection: case + number + tense affixes, optional agreement
//   "simple" — bare stems, mood expressed by a sentence-level particle
//
// If `seed` is provided, generation is deterministic — the same (seed,
// difficulty) pair always produces the same LanguageSpec.
export function randomLanguage(
  seed?: string,
  difficulty: Difficulty = "full",
): LanguageSpec {
  // Hand-crafted real-language seeds (e.g. "Malay") short-circuit
  // generation: when the seed matches a registered language, return that
  // spec verbatim. Difficulty is ignored — each custom spec carries its own.
  if (seed !== undefined && seed !== "") {
    const custom = customLanguageForSeed(seed);
    if (custom) return custom;
  }
  const rngs = makeSubsystemRngs(seed);
  for (let attempt = 0; attempt < 200; attempt++) {
    const candidate =
      difficulty === "simple"
        ? generateSimpleAttempt(rngs.phonology, rngs.morphology, rngs.syntax, rngs.lexicon)
        : generateFullAttempt(rngs.phonology, rngs.morphology, rngs.syntax, rngs.lexicon);
    if (roundTrips(candidate)) return candidate;
  }
  throw new Error(
    seed === undefined
      ? `Could not generate a round-trip-valid ${difficulty} random language`
      : `Seed "${seed}" could not produce a round-trip-valid ${difficulty} language`,
  );
}
