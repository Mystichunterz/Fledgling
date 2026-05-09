import { z } from "zod";
import { Mood, Number_, RoleType, Tense } from "./frames.js";
import { Phonology } from "./phonology.js";

// LanguageSpec v2 — extended with featurised phonology, multi-affix
// morphology (case + mood + number + tense), agreement toggle, and
// typological dials (head direction, adjective/adposition order, negation).

export const Case = z.enum(["NOM", "ACC", "DAT"]);
export type Case = z.infer<typeof Case>;

export const MoodTag = z.enum(["DECL", "Q", "IMP"]);
export type MoodTag = z.infer<typeof MoodTag>;

// An affix already realized as romanized ASCII. The empty string ""
// means the form is unmarked (zero morpheme).
export const Affix = z.object({
  form: z.string(),
  position: z.enum(["prefix", "suffix"]),
});
export type Affix = z.infer<typeof Affix>;

export const LexicalCategory = z.enum(["verb", "noun", "pronoun", "wh"]);
export type LexicalCategory = z.infer<typeof LexicalCategory>;

export const LexiconEntry = z.object({
  stem: z.string(),
  category: LexicalCategory,
  // For nouns/pronouns/wh: the semantic type of the entity it refers to.
  // For verbs: omitted (the frame supplies role types).
  semanticType: RoleType.optional(),
  // For verbs: the frame ID this verb realizes (one stem per frame in v1).
  frame: z.string().optional(),
  // For pronouns: inherent number (PLAYER is sg; "we" would be pl).
  // Currently every pronoun is sg; defined for forward compatibility.
  inherentNumber: Number_.optional(),
});
export type LexiconEntry = z.infer<typeof LexiconEntry>;

// 6 possible word orders. Order is over Subject / Verb / Object;
// oblique arguments are placed by `obliquePosition` separately.
export const WordOrder = z.enum(["SOV", "SVO", "VSO", "VOS", "OSV", "OVS"]);
export type WordOrder = z.infer<typeof WordOrder>;

// Typological dials beyond core word order.
export const HeadDirection = z.enum(["head-initial", "head-final"]);
export type HeadDirection = z.infer<typeof HeadDirection>;

export const NegationStrategy = z.enum(["pre-verb", "post-verb", "affix"]);
export type NegationStrategy = z.infer<typeof NegationStrategy>;

// Per-language agreement toggles. When subjectVerbNumber is true, the verb
// takes a number affix matching its subject.
export const AgreementSpec = z.object({
  subjectVerbNumber: z.boolean(),
});
export type AgreementSpec = z.infer<typeof AgreementSpec>;

// Tier of morphological richness. "full" uses case + tense + number affixes;
// "simple" zero-marks them and conveys mood via sentence-level particles.
// (Compatibility with the parallel difficulty work in random-language.ts.)
export const Difficulty = z.enum(["full", "simple"]);
export type Difficulty = z.infer<typeof Difficulty>;

// Sentence-level particle (used in "simple" difficulty).
export const Particle = z.object({
  form: z.string(),
  position: z.enum(["initial", "final"]),
});
export type Particle = z.infer<typeof Particle>;

export const LanguageSpec = z.object({
  id: z.string(),
  // Tier; absent or "full" mean the standard inflectional engine.
  difficulty: Difficulty.optional(),
  // Optional — present only on generated languages, not on hand-crafted
  // fixtures (which describe themselves directly).
  phonology: Phonology.optional(),
  lexicon: z.record(z.string(), LexiconEntry),
  morphology: z.object({
    alignment: z.literal("nom-acc"),
    case: z.object({
      NOM: Affix,
      ACC: Affix,
      DAT: Affix,
    }),
    mood: z.object({
      DECL: Affix,
      Q: Affix,
      IMP: Affix,
    }),
    // NEW: number affix (sg is conventionally zero-marked, like NOM/DECL).
    number: z.object({
      sg: Affix,
      pl: Affix,
    }),
    // NEW: tense affix on verbs. Present is conventionally zero-marked.
    tense: z.object({
      past: Affix,
      present: Affix,
      future: Affix,
    }),
    // NEW: dedicated negation marker (only used when negationStrategy=affix).
    negation: Affix,
  }),
  syntax: z.object({
    wordOrder: WordOrder,
    obliquePosition: z.enum(["pre-verb", "post-verb"]),
    headDirection: HeadDirection,
    adpositionOrder: z.enum(["preposition", "postposition"]),
    adjectiveOrder: z.enum(["pre-noun", "post-noun"]),
    negationStrategy: NegationStrategy,
    agreement: AgreementSpec,
  }),
  // Optional sentence-level particles (used in "simple" difficulty).
  particles: z
    .object({
      Q: Particle,
      IMP: Particle,
    })
    .optional(),
});
export type LanguageSpec = z.infer<typeof LanguageSpec>;

// Conventional concept IDs for the wh-words. The lexicon must contain
// one wh-entry per RoleType the player can ask about. ABSTRACT and EVENT
// are not directly askable (they appear as nested content, not as roles
// the player would wildcard), so they're omitted.
export const WH_FOR_TYPE: Partial<Record<RoleType, string>> = {
  ANIMATE: "WH_ANIMATE",
  ITEM: "WH_ITEM",
  LOCATION: "WH_LOCATION",
};

// Round-trip mapping between the Mood enum (semantic, used in FilledFrame)
// and the MoodTag enum (morphological, keys into spec.morphology.mood).
export function moodTagOf(mood: Mood): MoodTag {
  switch (mood) {
    case "declarative": return "DECL";
    case "interrogative": return "Q";
    case "imperative": return "IMP";
  }
}

export function moodFromTag(tag: MoodTag): Mood {
  switch (tag) {
    case "DECL": return "declarative";
    case "Q":    return "interrogative";
    case "IMP":  return "imperative";
  }
}

// Map a role's grammatical function to a case under the spec's alignment.
// In v1 this is hardcoded; ergative alignment will swap the table.
export function caseForGrammar(
  spec: LanguageSpec,
  grammar: "subject" | "object" | "oblique",
): Case {
  // alignment === "nom-acc" — the only one we support
  switch (grammar) {
    case "subject": return "NOM";
    case "object":  return "ACC";
    case "oblique": return "DAT";
  }
}

// Default tense when a FilledFrame omits it. Present is zero-marked
// across the inventory, so this is the safe round-trip default.
export function tenseOf(frame: { tense?: Tense | undefined }): Tense {
  return frame.tense ?? "present";
}
