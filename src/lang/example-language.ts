import { LanguageSpec } from "./language-spec.js";

// A hand-crafted language used as the development fixture for the translator.
// Typology: SOV, suffixing, nom-acc, post-verbal obliques.
//
// Phonology (informal): CVCV stems, no clusters, 5 vowels, 8 consonants.
// All stems already romanized as ASCII.

export const EXAMPLE_LANGUAGE: LanguageSpec = {
  id: "tovari",
  lexicon: {
    // Verbs (one stem per frame)
    GIVE: { stem: "miro", category: "verb", frame: "GIVE" },
    TAKE: { stem: "tane", category: "verb", frame: "TAKE" },
    MOVE: { stem: "kupa", category: "verb", frame: "MOVE" },
    WANT: { stem: "selu", category: "verb", frame: "WANT" },
    BE_AT: { stem: "noki", category: "verb", frame: "BE_AT" },
    HAVE: { stem: "vala", category: "verb", frame: "HAVE" },

    // Items
    FLINT: { stem: "pira", category: "noun", semanticType: "ITEM" },
    STICK: { stem: "doma", category: "noun", semanticType: "ITEM" },
    LIGHTER: { stem: "kena", category: "noun", semanticType: "ITEM" },

    // Locations
    FOREST: { stem: "luva", category: "noun", semanticType: "LOCATION" },
    CAVE: { stem: "shimo", category: "noun", semanticType: "LOCATION" },
    FORGE: { stem: "garu", category: "noun", semanticType: "LOCATION" },

    // NPC types / animates
    SMITH: { stem: "tova", category: "noun", semanticType: "ANIMATE" },
    WOODSMAN: { stem: "henu", category: "noun", semanticType: "ANIMATE" },

    // Pronouns
    PLAYER: { stem: "ne", category: "pronoun", semanticType: "ANIMATE" },
    ADDRESSEE: { stem: "ti", category: "pronoun", semanticType: "ANIMATE" },

    // Wh-words (one per role type)
    WH_ANIMATE: { stem: "ko", category: "wh", semanticType: "ANIMATE" },
    WH_ITEM: { stem: "ma", category: "wh", semanticType: "ITEM" },
    WH_LOCATION: { stem: "vo", category: "wh", semanticType: "LOCATION" },
  },
  morphology: {
    alignment: "nom-acc",
    case: {
      NOM: { form: "", position: "suffix" }, // unmarked
      ACC: { form: "n", position: "suffix" },
      DAT: { form: "ra", position: "suffix" },
    },
    mood: {
      DECL: { form: "", position: "suffix" }, // unmarked
      Q: { form: "li", position: "suffix" },
      IMP: { form: "ka", position: "suffix" },
    },
  },
  syntax: {
    wordOrder: "SOV",
    obliquePosition: "post-verb",
  },
};
