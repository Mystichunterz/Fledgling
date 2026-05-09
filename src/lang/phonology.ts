// Featurised phonology — the sound-shape parameters of a generated language.
//
// Each consonant carries (place, manner, voiced); each vowel carries
// (height, backness, rounded). Stems and affixes are built by drawing
// from these inventories under a syllable template, optional vowel harmony,
// and a small set of phonotactic constraints.

import { Rng, pick, weightedPick } from "./prng.js";
import { z } from "zod";

// Mirrored locally to avoid a phonology ↔ language-spec import cycle.
// Kept structurally identical to language-spec.ts's `Difficulty`.
type Difficulty = "full" | "simple";

// ─── Featural enums ─────────────────────────────────────────────

export const Place = z.enum([
  "labial",
  "alveolar",
  "palatal",
  "velar",
  "glottal",
]);
export type Place = z.infer<typeof Place>;

export const Manner = z.enum([
  "stop",
  "fricative",
  "nasal",
  "liquid",
  "approximant",
]);
export type Manner = z.infer<typeof Manner>;

export const Height = z.enum(["high", "mid", "low"]);
export type Height = z.infer<typeof Height>;

export const Backness = z.enum(["front", "central", "back"]);
export type Backness = z.infer<typeof Backness>;

// ─── Phoneme schemas ────────────────────────────────────────────

export const ConsonantPhoneme = z.object({
  symbol: z.string(),
  features: z.object({
    place: Place,
    manner: Manner,
    voiced: z.boolean(),
  }),
  frequency: z.number().min(0).max(1),
});
export type ConsonantPhoneme = z.infer<typeof ConsonantPhoneme>;

export const VowelPhoneme = z.object({
  symbol: z.string(),
  features: z.object({
    height: Height,
    backness: Backness,
    rounded: z.boolean(),
  }),
  frequency: z.number().min(0).max(1),
});
export type VowelPhoneme = z.infer<typeof VowelPhoneme>;

// ─── Phonotactics ───────────────────────────────────────────────

export const PhonotacticRule = z.enum([
  "no-geminates",          // no doubled identical consonants
  "no-final-voiced-stops", // word-final stops must be voiceless
  "no-vowel-clusters",     // no two vowels in a row
  "no-cluster-stop-stop",  // no stop+stop sequences
]);
export type PhonotacticRule = z.infer<typeof PhonotacticRule>;

// ─── Vowel harmony ──────────────────────────────────────────────

export const VowelHarmony = z.union([
  z.literal(false),
  z.object({
    type: z.enum(["front-back", "round-unround"]),
    // groups[0] and groups[1] partition the vowel inventory; within a word,
    // all vowels must come from the same group.
    groups: z.tuple([z.array(z.string()), z.array(z.string())]),
  }),
]);
export type VowelHarmony = z.infer<typeof VowelHarmony>;

// ─── The phonology bundle ───────────────────────────────────────

export const Phonology = z.object({
  consonants: z.array(ConsonantPhoneme).min(3),
  vowels: z.array(VowelPhoneme).min(2),
  syllableTemplate: z.string(), // e.g. "(C)V(C)"
  phonotactics: z.array(PhonotacticRule),
  vowelHarmony: VowelHarmony,
  tones: z.number().int().min(0).max(4),
});
export type Phonology = z.infer<typeof Phonology>;

// ─── A canonical inventory pool ─────────────────────────────────
// Sampled from at generation time. Frequencies follow a rough
// cross-linguistic plausibility ranking (commoner phonemes weighted higher).

const CONSONANT_POOL: ConsonantPhoneme[] = [
  { symbol: "p", features: { place: "labial",   manner: "stop",       voiced: false }, frequency: 0.95 },
  { symbol: "b", features: { place: "labial",   manner: "stop",       voiced: true  }, frequency: 0.55 },
  { symbol: "t", features: { place: "alveolar", manner: "stop",       voiced: false }, frequency: 1.00 },
  { symbol: "d", features: { place: "alveolar", manner: "stop",       voiced: true  }, frequency: 0.60 },
  { symbol: "k", features: { place: "velar",    manner: "stop",       voiced: false }, frequency: 0.95 },
  { symbol: "g", features: { place: "velar",    manner: "stop",       voiced: true  }, frequency: 0.45 },
  { symbol: "m", features: { place: "labial",   manner: "nasal",      voiced: true  }, frequency: 0.95 },
  { symbol: "n", features: { place: "alveolar", manner: "nasal",      voiced: true  }, frequency: 1.00 },
  { symbol: "s", features: { place: "alveolar", manner: "fricative",  voiced: false }, frequency: 0.90 },
  { symbol: "z", features: { place: "alveolar", manner: "fricative",  voiced: true  }, frequency: 0.40 },
  { symbol: "f", features: { place: "labial",   manner: "fricative",  voiced: false }, frequency: 0.55 },
  { symbol: "v", features: { place: "labial",   manner: "fricative",  voiced: true  }, frequency: 0.35 },
  { symbol: "h", features: { place: "glottal",  manner: "fricative",  voiced: false }, frequency: 0.50 },
  { symbol: "l", features: { place: "alveolar", manner: "liquid",     voiced: true  }, frequency: 0.85 },
  { symbol: "r", features: { place: "alveolar", manner: "liquid",     voiced: true  }, frequency: 0.85 },
  { symbol: "j", features: { place: "palatal",  manner: "approximant",voiced: true  }, frequency: 0.45 },
  { symbol: "w", features: { place: "labial",   manner: "approximant",voiced: true  }, frequency: 0.45 },
];

const VOWEL_POOL: VowelPhoneme[] = [
  { symbol: "a", features: { height: "low",  backness: "central", rounded: false }, frequency: 1.00 },
  { symbol: "e", features: { height: "mid",  backness: "front",   rounded: false }, frequency: 0.85 },
  { symbol: "i", features: { height: "high", backness: "front",   rounded: false }, frequency: 0.95 },
  { symbol: "o", features: { height: "mid",  backness: "back",    rounded: true  }, frequency: 0.80 },
  { symbol: "u", features: { height: "high", backness: "back",    rounded: true  }, frequency: 0.85 },
  { symbol: "y", features: { height: "high", backness: "front",   rounded: true  }, frequency: 0.30 },
  { symbol: "ə", features: { height: "mid",  backness: "central", rounded: false }, frequency: 0.40 },
];

// ─── Generation ─────────────────────────────────────────────────

const SYLLABLE_TEMPLATES = ["CV", "(C)V", "CV(C)", "(C)V(C)", "CVC"] as const;
const PHONOTACTIC_POOL: PhonotacticRule[] = [
  "no-geminates",
  "no-final-voiced-stops",
  "no-vowel-clusters",
  "no-cluster-stop-stop",
];

// "Simple" mode uses a clean canonical inventory: the cross-linguistically
// most common consonants (no fricatives like z/v, no schwa, no front-rounded
// y), strict CV syllables, no harmony, no tones. The result reads like a
// stereotypical "easy" conlang — open syllables, predictable sounds.
const SIMPLE_CONSONANT_SYMBOLS = new Set(["p", "t", "k", "m", "n", "s", "l"]);
const SIMPLE_VOWEL_SYMBOLS = new Set(["a", "e", "i", "o", "u"]);

// Sample a random subset of the consonant/vowel pools, weighted by
// frequency. Larger languages get more phonemes; smaller get fewer.
function sampleConsonants(rng: Rng): ConsonantPhoneme[] {
  // Always include the high-frequency core (frequency >= 0.85)
  const core = CONSONANT_POOL.filter((c) => c.frequency >= 0.85);
  // Add extras stochastically — each consonant included with probability
  // equal to its frequency.
  const extras = CONSONANT_POOL.filter((c) => c.frequency < 0.85).filter(
    (c) => rng() < c.frequency,
  );
  return [...core, ...extras];
}

function sampleVowels(rng: Rng): VowelPhoneme[] {
  const core = VOWEL_POOL.filter((v) => v.frequency >= 0.80);
  const extras = VOWEL_POOL.filter((v) => v.frequency < 0.80).filter(
    (v) => rng() < v.frequency,
  );
  return [...core, ...extras];
}

function simpleConsonants(): ConsonantPhoneme[] {
  return CONSONANT_POOL.filter((c) => SIMPLE_CONSONANT_SYMBOLS.has(c.symbol));
}

function simpleVowels(): VowelPhoneme[] {
  return VOWEL_POOL.filter((v) => SIMPLE_VOWEL_SYMBOLS.has(v.symbol));
}

function maybeVowelHarmony(rng: Rng, vowels: VowelPhoneme[]): VowelHarmony {
  // 25% chance of vowel harmony.
  if (rng() > 0.25) return false;
  const type = rng() < 0.5 ? "front-back" : "round-unround";
  if (type === "front-back") {
    const front = vowels.filter((v) => v.features.backness === "front").map((v) => v.symbol);
    const back = vowels.filter((v) => v.features.backness === "back").map((v) => v.symbol);
    if (front.length === 0 || back.length === 0) return false;
    return { type, groups: [front, back] };
  } else {
    const rounded = vowels.filter((v) => v.features.rounded).map((v) => v.symbol);
    const unrounded = vowels.filter((v) => !v.features.rounded).map((v) => v.symbol);
    if (rounded.length === 0 || unrounded.length === 0) return false;
    return { type, groups: [rounded, unrounded] };
  }
}

export function generatePhonology(
  rng: Rng,
  difficulty: Difficulty = "full",
): Phonology {
  if (difficulty === "simple") {
    // Strict CV, canonical 7-consonant / 5-vowel inventory, no harmony,
    // no tones. `no-geminates` keeps obvious "tata"-style stems out without
    // constraining draws further.
    return {
      consonants: simpleConsonants(),
      vowels: simpleVowels(),
      syllableTemplate: "CV",
      phonotactics: ["no-geminates"],
      vowelHarmony: false,
      tones: 0,
    };
  }
  const consonants = sampleConsonants(rng);
  const vowels = sampleVowels(rng);
  const syllableTemplate = pick(SYLLABLE_TEMPLATES, rng);
  // Sample 1-2 phonotactic rules.
  const ruleCount = 1 + Math.floor(rng() * 2);
  const shuffled = [...PHONOTACTIC_POOL].sort(() => rng() - 0.5);
  const phonotactics = shuffled.slice(0, ruleCount);
  const vowelHarmony = maybeVowelHarmony(rng, vowels);
  // Tones: 0 (none) about 70% of the time, 2-3 the rest.
  const tones = rng() < 0.7 ? 0 : 2 + Math.floor(rng() * 2);
  return { consonants, vowels, syllableTemplate, phonotactics, vowelHarmony, tones };
}

// ─── Syllable template parsing ──────────────────────────────────

type Slot = { type: "C" | "V"; optional: boolean };

function parseTemplate(template: string): Slot[] {
  const slots: Slot[] = [];
  let i = 0;
  while (i < template.length) {
    if (template[i] === "(") {
      const t = template[i + 1] as "C" | "V";
      slots.push({ type: t, optional: true });
      i += 3; // skip "(X)"
    } else {
      slots.push({ type: template[i] as "C" | "V", optional: false });
      i += 1;
    }
  }
  return slots;
}

// ─── Word generation ────────────────────────────────────────────

// Build one syllable from the template, frequency-weighting each slot.
// A vowel-harmony group restricts the vowel pool when active.
function buildSyllable(
  rng: Rng,
  phon: Phonology,
  slots: Slot[],
  harmonyGroup: string[] | null,
): string {
  const cs = phon.consonants.map((c) => ({ value: c.symbol, weight: c.frequency }));
  const vs = (harmonyGroup === null
    ? phon.vowels
    : phon.vowels.filter((v) => harmonyGroup.includes(v.symbol))
  ).map((v) => ({ value: v.symbol, weight: v.frequency }));
  let out = "";
  for (const slot of slots) {
    if (slot.optional && rng() < 0.4) continue;
    if (slot.type === "C") out += weightedPick(cs, rng);
    else out += weightedPick(vs, rng);
  }
  return out;
}

// Pick a vowel-harmony group at word start (so all syllables agree).
function pickHarmonyGroup(rng: Rng, phon: Phonology): string[] | null {
  if (phon.vowelHarmony === false) return null;
  const groups = phon.vowelHarmony.groups;
  return rng() < 0.5 ? groups[0] : groups[1];
}

// Generate a word of `syllables` syllables. May fail phonotactic checks;
// caller (uniqueWords) retries.
function generateWordRaw(rng: Rng, phon: Phonology, syllables: number): string {
  const slots = parseTemplate(phon.syllableTemplate);
  const harmony = pickHarmonyGroup(rng, phon);
  let word = "";
  for (let i = 0; i < syllables; i++) {
    word += buildSyllable(rng, phon, slots, harmony);
  }
  return word;
}

// Apply the phonology's phonotactic constraints. Returns true if the word is
// well-formed.
export function passesPhonotactics(phon: Phonology, word: string): boolean {
  if (word.length === 0) return false;
  const consonantSet = new Set(phon.consonants.map((c) => c.symbol));
  const vowelSet = new Set(phon.vowels.map((v) => v.symbol));
  const stopSet = new Set(
    phon.consonants.filter((c) => c.features.manner === "stop").map((c) => c.symbol),
  );
  const voicedStopSet = new Set(
    phon.consonants
      .filter((c) => c.features.manner === "stop" && c.features.voiced)
      .map((c) => c.symbol),
  );
  for (const rule of phon.phonotactics) {
    switch (rule) {
      case "no-geminates":
        for (let i = 1; i < word.length; i++) {
          if (word[i] === word[i - 1]) return false;
        }
        break;
      case "no-final-voiced-stops":
        if (voicedStopSet.has(word[word.length - 1]!)) return false;
        break;
      case "no-vowel-clusters":
        for (let i = 1; i < word.length; i++) {
          if (vowelSet.has(word[i]!) && vowelSet.has(word[i - 1]!)) return false;
        }
        break;
      case "no-cluster-stop-stop":
        for (let i = 1; i < word.length; i++) {
          if (stopSet.has(word[i]!) && stopSet.has(word[i - 1]!)) return false;
        }
        break;
    }
    void consonantSet; // exhaustively imported for future rules
  }
  return true;
}

// Generate `count` distinct, well-formed words of the given syllable count.
// Retries phonotactic-failing or duplicate draws up to a generous cap.
export function uniqueWords(
  rng: Rng,
  phon: Phonology,
  count: number,
  syllables: number,
): string[] {
  const seen = new Set<string>();
  let guard = 0;
  while (seen.size < count) {
    if (++guard > 5000) {
      throw new Error(
        `phonology too constrained to draw ${count} unique ${syllables}-syllable words`,
      );
    }
    const word = generateWordRaw(rng, phon, syllables);
    if (word.length === 0) continue;
    if (!passesPhonotactics(phon, word)) continue;
    seen.add(word);
  }
  return [...seen];
}

// Generate one short affix form. In "full" difficulty this can be a bare
// vowel, a bare consonant, or CV. In "simple" difficulty the form is always
// CV — particles read like cleanly-pronounceable little words.
export function shortAffix(
  rng: Rng,
  phon: Phonology,
  difficulty: Difficulty = "full",
): string {
  const cs = phon.consonants.map((c) => ({ value: c.symbol, weight: c.frequency }));
  const vs = phon.vowels.map((v) => ({ value: v.symbol, weight: v.frequency }));
  if (difficulty === "simple") {
    return weightedPick(cs, rng) + weightedPick(vs, rng);
  }
  const shape = Math.floor(rng() * 3);
  if (shape === 0) return weightedPick(vs, rng);
  if (shape === 1) return weightedPick(cs, rng);
  return weightedPick(cs, rng) + weightedPick(vs, rng);
}
