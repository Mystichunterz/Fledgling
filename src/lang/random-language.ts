import { LanguageSpec, LexiconEntry } from "./language-spec.js";
import { FilledFrame, RoleFiller } from "./frames.js";
import { encodeFrame } from "./encoder.js";
import { decodeText } from "./decoder.js";

// Phonological inventory: small enough to feel coherent, large enough to
// avoid stem collisions in a ~16-entry lexicon.
const CONSONANTS = ["p", "t", "k", "m", "n", "s", "l", "r"] as const;
const VOWELS = ["a", "e", "i", "o", "u"] as const;

type Rng = () => number;

// FNV-1a, 32-bit. Maps any string seed to a u32 starting state.
function hashStringToU32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Mulberry32: tiny, well-mixed PRNG. Good enough for procedural generation
// when reproducibility matters more than cryptographic quality.
function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed: string | undefined): Rng {
  if (seed === undefined || seed === "") return Math.random;
  return mulberry32(hashStringToU32(seed));
}

// Six lowercase alphanumerics. Used when the caller wants a fresh seed
// they can copy + share, rather than supplying their own.
export function randomSeedString(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

// Concept inventory the random language must cover. Same shape as the
// example language so frames keep working.
const VERB_CONCEPTS = ["GIVE", "TAKE", "MOVE", "WANT", "BE_AT", "HAVE"] as const;
const ITEM_CONCEPTS = ["FLINT", "STICK", "LIGHTER"] as const;
const LOCATION_CONCEPTS = ["FOREST", "CAVE", "FORGE"] as const;
const ANIMATE_CONCEPTS = ["SMITH", "WOODSMAN"] as const;
const PRONOUN_CONCEPTS = ["PLAYER", "ADDRESSEE"] as const;

const WORD_ORDERS = ["SOV", "SVO", "VSO", "VOS", "OSV", "OVS"] as const;
const POSITIONS = ["prefix", "suffix"] as const;
const OBLIQUE_POSITIONS = ["pre-verb", "post-verb"] as const;

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

// Build an n-syllable CVCV...CV string using consonants and vowels alternately.
function syllableString(syllables: number, rng: Rng): string {
  let out = "";
  for (let i = 0; i < syllables; i++) {
    out += pick(CONSONANTS, rng) + pick(VOWELS, rng);
  }
  return out;
}

// Generate a set of distinct stems of the given syllable count.
function uniqueStems(count: number, syllables: number, rng: Rng): string[] {
  const seen = new Set<string>();
  let guard = 0;
  while (seen.size < count) {
    seen.add(syllableString(syllables, rng));
    if (++guard > 1000) {
      throw new Error("inventory too small to draw enough unique stems");
    }
  }
  return [...seen];
}

// Generate a short affix form: 1 vowel, 1 consonant, or a CV pair.
function randomShortAffix(rng: Rng): string {
  const shape = Math.floor(rng() * 3);
  if (shape === 0) return pick(VOWELS, rng);
  if (shape === 1) return pick(CONSONANTS, rng);
  return pick(CONSONANTS, rng) + pick(VOWELS, rng);
}

function generateAttempt(rng: Rng): LanguageSpec {
  const position = pick(POSITIONS, rng);
  const wordOrder = pick(WORD_ORDERS, rng);
  const obliquePosition = pick(OBLIQUE_POSITIONS, rng);

  // NOM and DECL are zero-marked. The other case affixes must be distinct
  // from each other (cases compete on nouns); same for the other moods
  // (moods compete on verbs). Cases and moods don't compete with each
  // other since the decoder only tries cases on nouns and moods on verbs.
  const accForm = randomShortAffix(rng);
  let datForm = randomShortAffix(rng);
  while (datForm === accForm) datForm = randomShortAffix(rng);

  const qForm = randomShortAffix(rng);
  let impForm = randomShortAffix(rng);
  while (impForm === qForm) impForm = randomShortAffix(rng);

  // 2-syllable (4-char) content stems for verbs and nouns; 1-syllable
  // (2-char) stems for pronouns and wh-words. Same length within each
  // band keeps the decoder's longest-stem tiebreak well-behaved.
  const verbCount = VERB_CONCEPTS.length;
  const nounCount =
    ITEM_CONCEPTS.length + LOCATION_CONCEPTS.length + ANIMATE_CONCEPTS.length;
  const contentStems = uniqueStems(verbCount + nounCount, 2, rng);
  const shortStems = uniqueStems(PRONOUN_CONCEPTS.length + 3, 1, rng);

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
  let j = 0;
  for (const id of PRONOUN_CONCEPTS) {
    lexicon[id] = { stem: shortStems[j++]!, category: "pronoun", semanticType: "ANIMATE" };
  }
  lexicon["WH_ANIMATE"] = { stem: shortStems[j++]!, category: "wh", semanticType: "ANIMATE" };
  lexicon["WH_ITEM"] = { stem: shortStems[j++]!, category: "wh", semanticType: "ITEM" };
  lexicon["WH_LOCATION"] = { stem: shortStems[j++]!, category: "wh", semanticType: "LOCATION" };

  return {
    id: syllableString(3, rng),
    lexicon,
    morphology: {
      alignment: "nom-acc",
      case: {
        NOM: { form: "", position },
        ACC: { form: accForm, position },
        DAT: { form: datForm, position },
      },
      mood: {
        DECL: { form: "", position },
        Q: { form: qForm, position },
        IMP: { form: impForm, position },
      },
    },
    syntax: { wordOrder, obliquePosition },
  };
}

// Representative frames covering the collision modes that matter:
// content nouns in each case, pronouns in DAT (the one path where a 2-char
// pronoun + 2-char affix can hit a 4-char content stem), wh-words in NOM /
// ACC / DAT, and the three moods on action and state frames.
const PROBE_FRAMES: FilledFrame[] = [
  {
    predicate: "WANT",
    mood: "declarative",
    roles: {
      wanter: { type: "ANIMATE", conceptId: "SMITH" },
      desired: { type: "ITEM", conceptId: "FLINT" },
    },
  },
  {
    predicate: "GIVE",
    mood: "declarative",
    roles: {
      agent: { type: "ANIMATE", conceptId: "PLAYER" },
      recipient: { type: "ANIMATE", conceptId: "SMITH" },
      theme: { type: "ITEM", conceptId: "FLINT" },
    },
  },
  {
    predicate: "GIVE",
    mood: "declarative",
    roles: {
      agent: { type: "ANIMATE", conceptId: "SMITH" },
      recipient: { type: "ANIMATE", conceptId: "ADDRESSEE" },
      theme: { type: "ITEM", conceptId: "STICK" },
    },
  },
  {
    predicate: "WANT",
    mood: "interrogative",
    roles: {
      wanter: { type: "ANIMATE", conceptId: "SMITH" },
      desired: "?",
    },
  },
  {
    predicate: "BE_AT",
    mood: "interrogative",
    roles: {
      figure: { type: "ITEM", conceptId: "FLINT" },
      ground: "?",
    },
  },
  {
    predicate: "HAVE",
    mood: "interrogative",
    roles: {
      owner: "?",
      theme: { type: "ITEM", conceptId: "FLINT" },
    },
  },
  {
    predicate: "TAKE",
    mood: "imperative",
    roles: {
      agent: { type: "ANIMATE", conceptId: "ADDRESSEE" },
      theme: { type: "ITEM", conceptId: "FLINT" },
    },
  },
];

function fillerEqual(a: RoleFiller, b: RoleFiller): boolean {
  if (a === "?" || b === "?") return a === b;
  return a.type === b.type && a.conceptId === b.conceptId;
}

function roundTrips(spec: LanguageSpec): boolean {
  for (const frame of PROBE_FRAMES) {
    try {
      const surface = encodeFrame(spec, frame);
      const decoded = decodeText(spec, surface);
      if (decoded.predicate !== frame.predicate) return false;
      if (decoded.mood !== frame.mood) return false;
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
// on collision (e.g. a content stem that happens to equal pronoun+DAT). The
// retry count is generous; a single attempt usually succeeds.
//
// If `seed` is provided, generation is deterministic — the same seed string
// always produces the same LanguageSpec. Pass undefined for non-deterministic
// output (defaults to Math.random).
export function randomLanguage(seed?: string): LanguageSpec {
  const rng = makeRng(seed);
  for (let attempt = 0; attempt < 200; attempt++) {
    const candidate = generateAttempt(rng);
    if (roundTrips(candidate)) return candidate;
  }
  throw new Error(
    seed === undefined
      ? "Could not generate a round-trip-valid random language"
      : `Seed "${seed}" could not produce a round-trip-valid language`,
  );
}
