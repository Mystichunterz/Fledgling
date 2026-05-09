import { LanguageSpec } from "./language-spec.js";

// Hand-crafted real-language specs the user can summon via the seed input.
// When the seed matches one of these (case-insensitive), `randomLanguage`
// returns the spec verbatim instead of generating one from PRNG streams.
//
// These languages bypass the round-trip probe used for generated languages —
// each hand-crafted spec is responsible for its own internal consistency
// (distinct stems, no affix collisions, etc.). Add a new language by:
//   1. defining its LanguageSpec below,
//   2. registering it in CUSTOM_LANGUAGES under the lowercased seed.

// Bahasa Malaysia (Malay) — isolating, SVO, head-initial.
// Mood is conveyed by sentence-final particles ("kah" for questions, "lah"
// for emphatic imperatives), so this language slots into the "simple"
// difficulty tier where case/tense/number affixes are all zero-marked.
export const MALAY_LANGUAGE: LanguageSpec = {
  id: "Malay",
  difficulty: "simple",
  lexicon: {
    // Verbs (one stem per frame). Bare roots without me-/ber- derivational
    // prefixes — readers see clean, recognisable Malay roots.
    GIVE:  { stem: "beri",  category: "verb", frame: "GIVE" },
    TAKE:  { stem: "ambil", category: "verb", frame: "TAKE" },
    MOVE:  { stem: "gerak", category: "verb", frame: "MOVE" },
    WANT:  { stem: "mahu",  category: "verb", frame: "WANT" },
    BE_AT: { stem: "ada",   category: "verb", frame: "BE_AT" },
    HAVE:  { stem: "punya", category: "verb", frame: "HAVE" },
    SEE:   { stem: "lihat", category: "verb", frame: "SEE" },
    SAY:   { stem: "kata",  category: "verb", frame: "SAY" },
    MAKE:  { stem: "buat",  category: "verb", frame: "MAKE" },
    EAT:   { stem: "makan", category: "verb", frame: "EAT" },
    BE_STATE: { stem: "rasa", category: "verb", frame: "BE_STATE" },

    // Items
    FLINT:   { stem: "batu",    category: "noun", semanticType: "ITEM" },
    STICK:   { stem: "kayu",    category: "noun", semanticType: "ITEM" },
    LIGHTER: { stem: "pemetik", category: "noun", semanticType: "ITEM" },
    BREAD:   { stem: "roti",    category: "noun", semanticType: "ITEM" },
    WATER:   { stem: "air",     category: "noun", semanticType: "ITEM" },
    BOAT:    { stem: "perahu",  category: "noun", semanticType: "ITEM" },

    // Locations
    FOREST: { stem: "hutan",   category: "noun", semanticType: "LOCATION" },
    CAVE:   { stem: "gua",     category: "noun", semanticType: "LOCATION" },
    FORGE:  { stem: "bengkel", category: "noun", semanticType: "LOCATION" },
    MEADOW: { stem: "padang",  category: "noun", semanticType: "LOCATION" },
    LIGHTHOUSE: { stem: "rumahapi", category: "noun", semanticType: "LOCATION" },

    // Animates
    SMITH:    { stem: "tukang",   category: "noun", semanticType: "ANIMATE" },
    WOODSMAN: { stem: "pembalak", category: "noun", semanticType: "ANIMATE" },
    HALA:     { stem: "hala",     category: "noun", semanticType: "ANIMATE" },

    // Abstract dialogue concepts
    GOOD:      { stem: "baik",        category: "noun", semanticType: "ABSTRACT" },
    NOT_YET:   { stem: "belum",       category: "noun", semanticType: "ABSTRACT" },
    GO_HOME:   { stem: "pulang",      category: "noun", semanticType: "ABSTRACT" },
    STAY_HERE: { stem: "tinggal-sini", category: "noun", semanticType: "ABSTRACT" },

    // Pronouns (singular). "saya" is the polite first person; "kamu" is the
    // informal second person; "dia" covers third-person reference.
    PRONOUN_SELF:      { stem: "saya", category: "pronoun", person: "self",      semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_LISTENER:  { stem: "kamu", category: "pronoun", person: "listener",  semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_REFERENCE: { stem: "dia",  category: "pronoun", person: "reference", semanticType: "ANIMATE", inherentNumber: "sg" },

    // Wh-words
    WH_ANIMATE:  { stem: "siapa", category: "wh", semanticType: "ANIMATE" },
    WH_ITEM:     { stem: "apa",   category: "wh", semanticType: "ITEM" },
    WH_LOCATION: { stem: "mana",  category: "wh", semanticType: "LOCATION" },
    WH_ABSTRACT: { stem: "macam-mana", category: "wh", semanticType: "ABSTRACT" },
  },
  morphology: {
    alignment: "nom-acc",
    // Malay marks none of these morphologically; all forms are zero. The
    // schema still requires a position, so "suffix" is given as a no-op
    // placeholder.
    case:   { NOM: { form: "", position: "suffix" }, ACC: { form: "", position: "suffix" }, DAT: { form: "", position: "suffix" } },
    mood:   { DECL: { form: "", position: "suffix" }, Q: { form: "", position: "suffix" }, IMP: { form: "", position: "suffix" } },
    number: { sg: { form: "", position: "suffix" }, pl: { form: "", position: "suffix" } },
    tense:  { present: { form: "", position: "suffix" }, past: { form: "", position: "suffix" }, future: { form: "", position: "suffix" } },
    // Negation is a free-standing pre-verb word ("tidak"), not an affix.
    negation: { form: "tidak", position: "suffix" },
  },
  syntax: {
    wordOrder: "SVO",
    obliquePosition: "post-verb",
    headDirection: "head-initial",
    adpositionOrder: "preposition",
    adjectiveOrder: "post-noun",
    negationStrategy: "pre-verb",
    agreement: { subjectVerbNumber: false },
  },
  particles: {
    Q:   { form: "kah", position: "final" },
    IMP: { form: "lah", position: "final" },
  },
};

// Taiwanese Hokkien (ASCII romanization) — isolating, SVO, head-initial.
// Like Malay in this harness, it uses the "simple" difficulty tier: no
// inflectional case/tense/number affixes, with sentence particles carrying
// question/imperative force.
export const HOKKIEN_LANGUAGE: LanguageSpec = {
  id: "Hokkien",
  difficulty: "simple",
  lexicon: {
    GIVE:  { stem: "ho",        category: "verb", frame: "GIVE" },
    TAKE:  { stem: "liah",      category: "verb", frame: "TAKE" },
    MOVE:  { stem: "ki",        category: "verb", frame: "MOVE" },
    WANT:  { stem: "beh",       category: "verb", frame: "WANT" },
    BE_AT: { stem: "ti",        category: "verb", frame: "BE_AT" },
    HAVE:  { stem: "u",         category: "verb", frame: "HAVE" },
    SEE:   { stem: "khoa",      category: "verb", frame: "SEE" },
    SAY:   { stem: "kong",      category: "verb", frame: "SAY" },
    MAKE:  { stem: "cho",       category: "verb", frame: "MAKE" },
    EAT:   { stem: "chiah",     category: "verb", frame: "EAT" },
    BE_STATE: { stem: "an",     category: "verb", frame: "BE_STATE" },

    FLINT:   { stem: "huehioh",   category: "noun", semanticType: "ITEM" },
    STICK:   { stem: "kiat",      category: "noun", semanticType: "ITEM" },
    LIGHTER: { stem: "phahhue",   category: "noun", semanticType: "ITEM" },
    BREAD:   { stem: "pang",      category: "noun", semanticType: "ITEM" },
    WATER:   { stem: "chui",      category: "noun", semanticType: "ITEM" },
    BOAT:    { stem: "chun",      category: "noun", semanticType: "ITEM" },

    FOREST: { stem: "na",         category: "noun", semanticType: "LOCATION" },
    CAVE:   { stem: "tong",       category: "noun", semanticType: "LOCATION" },
    FORGE:  { stem: "tihlo",      category: "noun", semanticType: "LOCATION" },
    MEADOW: { stem: "chhauti",    category: "noun", semanticType: "LOCATION" },
    LIGHTHOUSE: { stem: "tengthah", category: "noun", semanticType: "LOCATION" },

    SMITH:    { stem: "thihsai",  category: "noun", semanticType: "ANIMATE" },
    WOODSMAN: { stem: "chhaiphu", category: "noun", semanticType: "ANIMATE" },
    HALA:     { stem: "hala",     category: "noun", semanticType: "ANIMATE" },

    GOOD:      { stem: "sui",        category: "noun", semanticType: "ABSTRACT" },
    NOT_YET:   { stem: "be",         category: "noun", semanticType: "ABSTRACT" },
    GO_HOME:   { stem: "tngkhi",     category: "noun", semanticType: "ABSTRACT" },
    STAY_HERE: { stem: "tihia",      category: "noun", semanticType: "ABSTRACT" },

    PRONOUN_SELF:      { stem: "gua",  category: "pronoun", person: "self",      semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_LISTENER:  { stem: "li",   category: "pronoun", person: "listener",  semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_REFERENCE: { stem: "i",    category: "pronoun", person: "reference", semanticType: "ANIMATE", inherentNumber: "sg" },

    WH_ANIMATE:  { stem: "siang",   category: "wh", semanticType: "ANIMATE" },
    WH_ITEM:     { stem: "siammih", category: "wh", semanticType: "ITEM" },
    WH_LOCATION: { stem: "tohui",   category: "wh", semanticType: "LOCATION" },
    WH_ABSTRACT: { stem: "chhoan",  category: "wh", semanticType: "ABSTRACT" },
  },
  morphology: {
    alignment: "nom-acc",
    case:   { NOM: { form: "", position: "suffix" }, ACC: { form: "", position: "suffix" }, DAT: { form: "", position: "suffix" } },
    mood:   { DECL: { form: "", position: "suffix" }, Q: { form: "", position: "suffix" }, IMP: { form: "", position: "suffix" } },
    number: { sg: { form: "", position: "suffix" }, pl: { form: "", position: "suffix" } },
    tense:  { present: { form: "", position: "suffix" }, past: { form: "", position: "suffix" }, future: { form: "", position: "suffix" } },
    negation: { form: "m", position: "suffix" },
  },
  syntax: {
    wordOrder: "SVO",
    obliquePosition: "post-verb",
    headDirection: "head-initial",
    adpositionOrder: "preposition",
    adjectiveOrder: "post-noun",
    negationStrategy: "pre-verb",
    agreement: { subjectVerbNumber: false },
  },
  particles: {
    Q:   { form: "bo", position: "final" },
    IMP: { form: "lah", position: "final" },
  },
};

// Registry keyed by lowercased seed. Add new entries here.
const CUSTOM_LANGUAGES: Record<string, LanguageSpec> = {
  hokkien: HOKKIEN_LANGUAGE,
  malay: MALAY_LANGUAGE,
};

// Look up a hand-crafted language by seed string. Matching is
// case-insensitive and ignores surrounding whitespace, so "Malay", "malay",
// and "  MALAY  " all resolve to the same spec.
export function customLanguageForSeed(seed: string): LanguageSpec | undefined {
  return CUSTOM_LANGUAGES[seed.trim().toLowerCase()];
}

// Names of all registered custom seeds, displayed-case (the spec's `id`).
// Useful for surfacing them in UI hints.
export function customLanguageNames(): string[] {
  return Object.values(CUSTOM_LANGUAGES).map((spec) => spec.id);
}
