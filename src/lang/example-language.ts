import { LanguageSpec } from "./language-spec.js";

// A hand-crafted language used as the development fixture for the translator.
// Typology: SOV, suffixing, nom-acc, post-verbal obliques.
//
// Phonology (informal): CVCV stems, no clusters, 5 vowels, 8 consonants.
// All stems already romanized as ASCII.
//
// v2: extended with stems for the 4 new frames (SEE/SAY/MAKE/EAT) and a
// few new content nouns (BREAD, WATER, MEADOW). Number sg / tense present
// are zero-marked, so default frames produce the same surface as v1.

export const EXAMPLE_LANGUAGE: LanguageSpec = {
  id: "tovari",
  lexicon: {
    // Verbs (one stem per frame)
    GIVE:  { stem: "miro", category: "verb", frame: "GIVE" },
    TAKE:  { stem: "tane", category: "verb", frame: "TAKE" },
    MOVE:  { stem: "kupa", category: "verb", frame: "MOVE" },
    WANT:  { stem: "selu", category: "verb", frame: "WANT" },
    BE_AT: { stem: "noki", category: "verb", frame: "BE_AT" },
    HAVE:  { stem: "vala", category: "verb", frame: "HAVE" },
    SEE:   { stem: "rena", category: "verb", frame: "SEE" },
    SAY:   { stem: "loma", category: "verb", frame: "SAY" },
    MAKE:  { stem: "fado", category: "verb", frame: "MAKE" },
    EAT:   { stem: "bisu", category: "verb", frame: "EAT" },
    BE_STATE: { stem: "kiri", category: "verb", frame: "BE_STATE" },
    GREET:  { stem: "salu", category: "verb", frame: "GREET" },
    AFFIRM: { stem: "naha", category: "verb", frame: "AFFIRM" },
    DENY:   { stem: "veka", category: "verb", frame: "DENY" },
    DECIDE: { stem: "tuma", category: "verb", frame: "DECIDE" },
    KNOW:   { stem: "miko", category: "verb", frame: "KNOW" },

    // Items — original set kept for older fixtures
    FLINT:   { stem: "pira",  category: "noun", semanticType: "ITEM" },
    STICK:   { stem: "doma",  category: "noun", semanticType: "ITEM" },
    LIGHTER: { stem: "kena",  category: "noun", semanticType: "ITEM" },
    BREAD:   { stem: "guvi",  category: "noun", semanticType: "ITEM" },
    WATER:   { stem: "sela",  category: "noun", semanticType: "ITEM" },
    // Items — game inventory + dialogue references
    WOOD:    { stem: "vidu",  category: "noun", semanticType: "ITEM" },
    OIL:     { stem: "muno",  category: "noun", semanticType: "ITEM" },
    FRUIT:   { stem: "saba",  category: "noun", semanticType: "ITEM" },
    PEBBLE:  { stem: "rolu",  category: "noun", semanticType: "ITEM" },
    JOURNAL: { stem: "topi",  category: "noun", semanticType: "ITEM" },
    LETTER:  { stem: "haku",  category: "noun", semanticType: "ITEM" },
    FIRE:    { stem: "fero",  category: "noun", semanticType: "ITEM" },

    // Locations — original set
    FOREST: { stem: "luva",   category: "noun", semanticType: "LOCATION" },
    CAVE:   { stem: "shimo",  category: "noun", semanticType: "LOCATION" },
    FORGE:  { stem: "garu",   category: "noun", semanticType: "LOCATION" },
    MEADOW: { stem: "polma",  category: "noun", semanticType: "LOCATION" },
    // Locations — game scenes + narrative places
    BEACH:      { stem: "banu",  category: "noun", semanticType: "LOCATION" },
    VILLAGE:    { stem: "lupa",  category: "noun", semanticType: "LOCATION" },
    HUT:        { stem: "kemo",  category: "noun", semanticType: "LOCATION" },
    LIGHTHOUSE: { stem: "tora",  category: "noun", semanticType: "LOCATION" },
    SHRINE:     { stem: "vesa",  category: "noun", semanticType: "LOCATION" },
    HOME:       { stem: "duna",  category: "noun", semanticType: "LOCATION" },

    // NPC types / animates — original set
    SMITH:    { stem: "tova", category: "noun", semanticType: "ANIMATE" },
    WOODSMAN: { stem: "henu", category: "noun", semanticType: "ANIMATE" },
    // NPC types / animates — game roster
    PREDECESSOR:    { stem: "remi", category: "noun", semanticType: "ANIMATE" },
    BAKER:          { stem: "kibo", category: "noun", semanticType: "ANIMATE" },
    FARMER:         { stem: "faki", category: "noun", semanticType: "ANIMATE" },
    GUARD:          { stem: "soka", category: "noun", semanticType: "ANIMATE" },
    CHILD:          { stem: "pino", category: "noun", semanticType: "ANIMATE" },
    SHRINE_KEEPER:  { stem: "halu", category: "noun", semanticType: "ANIMATE" },

    // Abstract qualities / properties (ABSTRACT semantic type)
    GOOD:    { stem: "tama", category: "noun", semanticType: "ABSTRACT" },
    // Abstracts used by DECIDE.choice
    LEAVING: { stem: "fina", category: "noun", semanticType: "ABSTRACT" },
    STAYING: { stem: "muka", category: "noun", semanticType: "ABSTRACT" },

    // Pronouns (inherently singular). Keyed by deictic person — these are
    // the surface forms for the "self" / "listener" / "reference" fillers.
    PRONOUN_SELF:      { stem: "ne",  category: "pronoun", person: "self",      semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_LISTENER:  { stem: "ti",  category: "pronoun", person: "listener",  semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_REFERENCE: { stem: "sa",  category: "pronoun", person: "reference", semanticType: "ANIMATE", inherentNumber: "sg" },

    // Wh-words (one per role type)
    WH_ANIMATE:  { stem: "ko", category: "wh", semanticType: "ANIMATE" },
    WH_ITEM:     { stem: "ma", category: "wh", semanticType: "ITEM" },
    WH_LOCATION: { stem: "vo", category: "wh", semanticType: "LOCATION" },
    WH_ABSTRACT: { stem: "ke", category: "wh", semanticType: "ABSTRACT" },
  },
  morphology: {
    alignment: "nom-acc",
    case: {
      NOM: { form: "",   position: "suffix" },     // unmarked
      ACC: { form: "n",  position: "suffix" },
      DAT: { form: "ra", position: "suffix" },
    },
    mood: {
      DECL: { form: "",   position: "suffix" },    // unmarked
      Q:    { form: "li", position: "suffix" },
      IMP:  { form: "ka", position: "suffix" },
    },
    number: {
      sg: { form: "",   position: "suffix" },      // unmarked
      pl: { form: "si", position: "suffix" },
    },
    tense: {
      present: { form: "",   position: "suffix" }, // unmarked
      past:    { form: "to", position: "suffix" },
      future:  { form: "fu", position: "suffix" },
    },
    negation: { form: "no", position: "suffix" },
  },
  syntax: {
    wordOrder: "SOV",
    obliquePosition: "post-verb",
    headDirection: "head-final",
    adpositionOrder: "postposition",
    adjectiveOrder: "pre-noun",
    negationStrategy: "pre-verb",
    agreement: { subjectVerbNumber: false }, // off in tovari
  },
};
