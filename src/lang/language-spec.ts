import { z } from "zod";
import { Mood, RoleType } from "./frames.js";

// Minimal LanguageSpec — just enough to drive the bidirectional translator.
// The full WALS-tuned generator (phonology, allomorphy, paradigm tables)
// produces something richer; this is the slice the translator consumes.

export const Case = z.enum(["NOM", "ACC", "DAT"]);
export type Case = z.infer<typeof Case>;

export const MoodTag = z.enum(["DECL", "Q", "IMP"]);
export type MoodTag = z.infer<typeof MoodTag>;

// An affix already realized as romanized ASCII. The empty string "" means
// the form is unmarked (zero morpheme) — common for nominative/declarative.
export const Affix = z.object({
  form: z.string(),
  position: z.enum(["prefix", "suffix"]),
});
export type Affix = z.infer<typeof Affix>;

// One entry per concept the language can express.
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
});
export type LexiconEntry = z.infer<typeof LexiconEntry>;

// 6 possible word orders. Order is over Subject / Verb / Object;
// oblique arguments are placed by `obliquePosition` separately.
export const WordOrder = z.enum(["SOV", "SVO", "VSO", "VOS", "OSV", "OVS"]);
export type WordOrder = z.infer<typeof WordOrder>;

export const LanguageSpec = z.object({
  id: z.string(),
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
  }),
  syntax: z.object({
    wordOrder: WordOrder,
    // Where oblique-case arguments sit relative to the verb.
    obliquePosition: z.enum(["pre-verb", "post-verb"]),
  }),
});
export type LanguageSpec = z.infer<typeof LanguageSpec>;

// Conventional concept IDs for the wh-words. The lexicon must contain
// one wh-entry per RoleType the player can ask about.
export const WH_FOR_TYPE: Record<RoleType, string> = {
  ANIMATE: "WH_ANIMATE",
  ITEM: "WH_ITEM",
  LOCATION: "WH_LOCATION",
};

// Round-trip mapping between the Mood enum (semantic, used in FilledFrame)
// and the MoodTag enum (morphological, keys into spec.morphology.mood).
export function moodTagOf(mood: Mood): MoodTag {
  switch (mood) {
    case "declarative":
      return "DECL";
    case "interrogative":
      return "Q";
    case "imperative":
      return "IMP";
  }
}

export function moodFromTag(tag: MoodTag): Mood {
  switch (tag) {
    case "DECL":
      return "declarative";
    case "Q":
      return "interrogative";
    case "IMP":
      return "imperative";
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
    case "subject":
      return "NOM";
    case "object":
      return "ACC";
    case "oblique":
      return "DAT";
  }
}
