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
    GREET:  { stem: "salam",   category: "verb", frame: "GREET" },
    AFFIRM: { stem: "setuju",  category: "verb", frame: "AFFIRM" },
    DENY:   { stem: "tolak",   category: "verb", frame: "DENY" },
    DECIDE: { stem: "pilih",   category: "verb", frame: "DECIDE" },
    KNOW:   { stem: "kenal",   category: "verb", frame: "KNOW" },
    // "ialah" is the Malay equational copula used for identity statements
    // ("saya ialah Pemi" — "I am Pemi"); distinct from the locative "ada".
    BE_IDENTITY: { stem: "ialah", category: "verb", frame: "BE_IDENTITY" },

    // Items — original set kept for older fixtures
    FLINT:   { stem: "batu",    category: "noun", semanticType: "ITEM" },
    STICK:   { stem: "kayu",    category: "noun", semanticType: "ITEM" },
    LIGHTER: { stem: "pemetik", category: "noun", semanticType: "ITEM" },
    BREAD:   { stem: "roti",    category: "noun", semanticType: "ITEM" },
    WATER:   { stem: "air",     category: "noun", semanticType: "ITEM" },
    // Items — game inventory + dialogue references
    WOOD:    { stem: "balak",  category: "noun", semanticType: "ITEM" },
    OIL:     { stem: "minyak", category: "noun", semanticType: "ITEM" },
    FRUIT:   { stem: "buah",   category: "noun", semanticType: "ITEM" },
    PEBBLE:  { stem: "kerikil", category: "noun", semanticType: "ITEM" },
    JOURNAL: { stem: "buku",   category: "noun", semanticType: "ITEM" },
    LETTER:  { stem: "surat",  category: "noun", semanticType: "ITEM" },
    FIRE:    { stem: "api",    category: "noun", semanticType: "ITEM" },
    BOAT:    { stem: "perahu", category: "noun", semanticType: "ITEM" },
    ROPE:    { stem: "tali",   category: "noun", semanticType: "ITEM" },
    BASKET:  { stem: "bakul",  category: "noun", semanticType: "ITEM" },

    // Locations — original set
    FOREST: { stem: "hutan",   category: "noun", semanticType: "LOCATION" },
    CAVE:   { stem: "gua",     category: "noun", semanticType: "LOCATION" },
    FORGE:  { stem: "bengkel", category: "noun", semanticType: "LOCATION" },
    MEADOW: { stem: "padang",  category: "noun", semanticType: "LOCATION" },
    // Locations — game scenes + narrative places
    BEACH:      { stem: "pantai",   category: "noun", semanticType: "LOCATION" },
    VILLAGE:    { stem: "kampung",  category: "noun", semanticType: "LOCATION" },
    HUT:        { stem: "pondok",   category: "noun", semanticType: "LOCATION" },
    LIGHTHOUSE: { stem: "menara",   category: "noun", semanticType: "LOCATION" },
    SHRINE:     { stem: "kuil",     category: "noun", semanticType: "LOCATION" },
    HOME:       { stem: "rumah",    category: "noun", semanticType: "LOCATION" },
    WELL:       { stem: "perigi",   category: "noun", semanticType: "LOCATION" },
    FIREPIT:    { stem: "tungku",   category: "noun", semanticType: "LOCATION" },

    // Animates — original set
    SMITH:    { stem: "tukang",   category: "noun", semanticType: "ANIMATE" },
    WOODSMAN: { stem: "pembalak", category: "noun", semanticType: "ANIMATE" },
    // Animates — game roster
    PREDECESSOR:   { stem: "dahulu",  category: "noun", semanticType: "ANIMATE" },
    BAKER:         { stem: "pembuat", category: "noun", semanticType: "ANIMATE" },
    FARMER:        { stem: "petani",  category: "noun", semanticType: "ANIMATE" },
    GUARD:         { stem: "pengawal", category: "noun", semanticType: "ANIMATE" },
    CHILD:         { stem: "kanak",   category: "noun", semanticType: "ANIMATE" },
    SHRINE_KEEPER: { stem: "penjaga", category: "noun", semanticType: "ANIMATE" },
    // NPC proper names — kept literal across language specs so the player
    // recognises Pemi/Naro/etc. by name regardless of seed.
    PEMI:          { stem: "Pemi", category: "noun", semanticType: "ANIMATE" },
    NARO:          { stem: "Naro", category: "noun", semanticType: "ANIMATE" },
    LEMU:          { stem: "Lemu", category: "noun", semanticType: "ANIMATE" },
    TOKA:          { stem: "Toka", category: "noun", semanticType: "ANIMATE" },
    SENU:          { stem: "Senu", category: "noun", semanticType: "ANIMATE" },
    HALA:          { stem: "Hala", category: "noun", semanticType: "ANIMATE" },

    // Abstracts used by DECIDE.choice
    LEAVING: { stem: "pergi",   category: "noun", semanticType: "ABSTRACT" },
    STAYING: { stem: "tinggal", category: "noun", semanticType: "ABSTRACT" },

    // Pronouns (singular). "saya" is the polite first person; "kamu" is the
    // informal second person; "dia" covers third-person reference.
    PRONOUN_SELF:      { stem: "saya", category: "pronoun", person: "self",      semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_LISTENER:  { stem: "kamu", category: "pronoun", person: "listener",  semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_REFERENCE: { stem: "dia",  category: "pronoun", person: "reference", semanticType: "ANIMATE", inherentNumber: "sg" },

    // Wh-words
    WH_ANIMATE:  { stem: "siapa",    category: "wh", semanticType: "ANIMATE" },
    WH_ITEM:     { stem: "apa",      category: "wh", semanticType: "ITEM" },
    WH_LOCATION: { stem: "mana",     category: "wh", semanticType: "LOCATION" },
    WH_ABSTRACT: { stem: "bagaimana", category: "wh", semanticType: "ABSTRACT" },
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

// English — isolating, SVO, head-initial. A stylised, ungrammaticalised
// pidgin: bare stems, no inflection. Tense and number are not surface-marked
// (the simple-difficulty engine zero-marks them anyway, and the simple
// decoder ignores them on round-trip — same as Malay). Mood rides on
// sentence-final particles: "eh" for questions (Canadian-tag style), "please"
// for imperatives. Negation is the free-standing pre-verb word "not".
//
// The aim is for the surface form to roughly read as English semantics: e.g.
// "you want bread eh", "I give bread to smith", "take flint please".
export const ENGLISH_LANGUAGE: LanguageSpec = {
  id: "English",
  difficulty: "simple",
  lexicon: {
    // Verbs — bare infinitive stems. "be" covers spatial BE_AT; "feel"
    // carries BE_STATE so the two state frames stay distinct. AFFIRM is
    // "agree" rather than "yes" to keep the affirmative-particle space
    // free for sentence-level use.
    GIVE:  { stem: "give",  category: "verb", frame: "GIVE" },
    TAKE:  { stem: "take",  category: "verb", frame: "TAKE" },
    MOVE:  { stem: "go",    category: "verb", frame: "MOVE" },
    WANT:  { stem: "want",  category: "verb", frame: "WANT" },
    BE_AT: { stem: "be",    category: "verb", frame: "BE_AT" },
    HAVE:  { stem: "have",  category: "verb", frame: "HAVE" },
    SEE:   { stem: "see",   category: "verb", frame: "SEE" },
    SAY:   { stem: "say",   category: "verb", frame: "SAY" },
    MAKE:  { stem: "make",  category: "verb", frame: "MAKE" },
    EAT:   { stem: "eat",   category: "verb", frame: "EAT" },
    BE_STATE: { stem: "feel",   category: "verb", frame: "BE_STATE" },
    GREET:    { stem: "greet",  category: "verb", frame: "GREET" },
    AFFIRM:   { stem: "agree",  category: "verb", frame: "AFFIRM" },
    DENY:     { stem: "deny",   category: "verb", frame: "DENY" },
    DECIDE:   { stem: "choose", category: "verb", frame: "DECIDE" },
    KNOW:     { stem: "know",   category: "verb", frame: "KNOW" },
    // "name" carries BE_IDENTITY in pidgin English — "I name Pemi" reads as
    // "I am [named] Pemi". Keeps "be" / "feel" free for BE_AT / BE_STATE.
    BE_IDENTITY: { stem: "name", category: "verb", frame: "BE_IDENTITY" },

    // Items — original set kept for older fixtures
    FLINT:   { stem: "flint",   category: "noun", semanticType: "ITEM" },
    STICK:   { stem: "stick",   category: "noun", semanticType: "ITEM" },
    LIGHTER: { stem: "lighter", category: "noun", semanticType: "ITEM" },
    BREAD:   { stem: "bread",   category: "noun", semanticType: "ITEM" },
    WATER:   { stem: "water",   category: "noun", semanticType: "ITEM" },
    // Items — game inventory + dialogue references
    WOOD:    { stem: "wood",    category: "noun", semanticType: "ITEM" },
    OIL:     { stem: "oil",     category: "noun", semanticType: "ITEM" },
    FRUIT:   { stem: "fruit",   category: "noun", semanticType: "ITEM" },
    PEBBLE:  { stem: "pebble",  category: "noun", semanticType: "ITEM" },
    JOURNAL: { stem: "journal", category: "noun", semanticType: "ITEM" },
    LETTER:  { stem: "letter",  category: "noun", semanticType: "ITEM" },
    FIRE:    { stem: "fire",    category: "noun", semanticType: "ITEM" },
    BOAT:    { stem: "boat",    category: "noun", semanticType: "ITEM" },
    ROPE:    { stem: "rope",    category: "noun", semanticType: "ITEM" },
    BASKET:  { stem: "basket",  category: "noun", semanticType: "ITEM" },

    // Locations — original set
    FOREST: { stem: "forest", category: "noun", semanticType: "LOCATION" },
    CAVE:   { stem: "cave",   category: "noun", semanticType: "LOCATION" },
    FORGE:  { stem: "forge",  category: "noun", semanticType: "LOCATION" },
    MEADOW: { stem: "meadow", category: "noun", semanticType: "LOCATION" },
    // Locations — game scenes + narrative places
    BEACH:      { stem: "beach",      category: "noun", semanticType: "LOCATION" },
    VILLAGE:    { stem: "village",    category: "noun", semanticType: "LOCATION" },
    HUT:        { stem: "hut",        category: "noun", semanticType: "LOCATION" },
    LIGHTHOUSE: { stem: "lighthouse", category: "noun", semanticType: "LOCATION" },
    SHRINE:     { stem: "shrine",     category: "noun", semanticType: "LOCATION" },
    HOME:       { stem: "home",       category: "noun", semanticType: "LOCATION" },
    WELL:       { stem: "well",       category: "noun", semanticType: "LOCATION" },
    FIREPIT:    { stem: "firepit",    category: "noun", semanticType: "LOCATION" },

    // Animates — original set
    SMITH:    { stem: "smith",    category: "noun", semanticType: "ANIMATE" },
    WOODSMAN: { stem: "woodsman", category: "noun", semanticType: "ANIMATE" },
    // Animates — game roster. "elder" stands in for PREDECESSOR (the prior
    // keeper of the place); "keeper" for SHRINE_KEEPER.
    PREDECESSOR:   { stem: "elder",  category: "noun", semanticType: "ANIMATE" },
    BAKER:         { stem: "baker",  category: "noun", semanticType: "ANIMATE" },
    FARMER:        { stem: "farmer", category: "noun", semanticType: "ANIMATE" },
    GUARD:         { stem: "guard",  category: "noun", semanticType: "ANIMATE" },
    CHILD:         { stem: "child",  category: "noun", semanticType: "ANIMATE" },
    SHRINE_KEEPER: { stem: "keeper", category: "noun", semanticType: "ANIMATE" },
    // NPC proper names — kept literal across language specs.
    PEMI:          { stem: "Pemi", category: "noun", semanticType: "ANIMATE" },
    NARO:          { stem: "Naro", category: "noun", semanticType: "ANIMATE" },
    LEMU:          { stem: "Lemu", category: "noun", semanticType: "ANIMATE" },
    TOKA:          { stem: "Toka", category: "noun", semanticType: "ANIMATE" },
    SENU:          { stem: "Senu", category: "noun", semanticType: "ANIMATE" },
    HALA:          { stem: "Hala", category: "noun", semanticType: "ANIMATE" },

    // Abstracts used by DECIDE.choice. Gerund forms — they're nominal here,
    // not verbal; the MOVE verb is "go", so no stem collision with LEAVING.
    LEAVING: { stem: "leaving", category: "noun", semanticType: "ABSTRACT" },
    STAYING: { stem: "staying", category: "noun", semanticType: "ABSTRACT" },

    // Pronouns. "they" is the gender-neutral 3sg referent; works for any
    // prior salient animate without forcing he/she.
    PRONOUN_SELF:      { stem: "i",    category: "pronoun", person: "self",      semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_LISTENER:  { stem: "you",  category: "pronoun", person: "listener",  semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_REFERENCE: { stem: "they", category: "pronoun", person: "reference", semanticType: "ANIMATE", inherentNumber: "sg" },

    // Wh-words. "how" doubles for the ABSTRACT slot ("how do you feel?").
    WH_ANIMATE:  { stem: "who",   category: "wh", semanticType: "ANIMATE" },
    WH_ITEM:     { stem: "what",  category: "wh", semanticType: "ITEM" },
    WH_LOCATION: { stem: "where", category: "wh", semanticType: "LOCATION" },
    WH_ABSTRACT: { stem: "how",   category: "wh", semanticType: "ABSTRACT" },
  },
  morphology: {
    alignment: "nom-acc",
    // Simple difficulty: every affix is zero. The schema requires a
    // position; "suffix" is a no-op placeholder.
    case:   { NOM: { form: "", position: "suffix" }, ACC: { form: "", position: "suffix" }, DAT: { form: "", position: "suffix" } },
    mood:   { DECL: { form: "", position: "suffix" }, Q: { form: "", position: "suffix" }, IMP: { form: "", position: "suffix" } },
    number: { sg: { form: "", position: "suffix" }, pl: { form: "", position: "suffix" } },
    tense:  { present: { form: "", position: "suffix" }, past: { form: "", position: "suffix" }, future: { form: "", position: "suffix" } },
    // Free-standing pre-verb negation word — same shape as Malay's "tidak".
    negation: { form: "not", position: "suffix" },
  },
  syntax: {
    wordOrder: "SVO",
    obliquePosition: "post-verb",
    headDirection: "head-initial",
    adpositionOrder: "preposition",
    // English actually puts adjectives pre-noun ("red car"), unlike Malay.
    adjectiveOrder: "pre-noun",
    negationStrategy: "pre-verb",
    agreement: { subjectVerbNumber: false },
  },
  particles: {
    // "eh" — Canadian-tag question particle; unambiguous and never appears
    // as a content word. "please" — softens an imperative without
    // doubling as a verb stem.
    Q:   { form: "eh",     position: "final" },
    IMP: { form: "please", position: "final" },
  },
};

// Japanese — isolating-styled pidgin, SOV, head-final, postpositional. Bare
// stems (no inflectional suffixes, no case particles), Hepburn romanisation
// without macrons (long vowels written doubled or as digraphs: "doukutsu",
// "honoo", "raitaa"). Mood rides on sentence-final particles: "ka" for
// questions, "kudasai" (please) for polite imperatives. Negation is the
// free-standing pre-verb word "nai" — not native Japanese syntax (which
// suffixes), but the simple-difficulty engine has no affixal slot, so we
// model it positionally as Malay does with "tidak".
//
// Caveat: SOV with the framework's canonical [S,V,O,OBL] template adapts to
// [S,O,V,OBL], so the oblique surfaces post-verb. That's not idiomatic
// Japanese (real Japanese has pre-verb obliques) but is the only placement
// that round-trips through the simple decoder.
export const JAPANESE_LANGUAGE: LanguageSpec = {
  id: "Japanese",
  difficulty: "simple",
  lexicon: {
    // Verbs — dictionary forms.
    GIVE:  { stem: "ageru",   category: "verb", frame: "GIVE" },
    TAKE:  { stem: "toru",    category: "verb", frame: "TAKE" },
    MOVE:  { stem: "iku",     category: "verb", frame: "MOVE" },
    WANT:  { stem: "hoshii",  category: "verb", frame: "WANT" },
    BE_AT: { stem: "aru",     category: "verb", frame: "BE_AT" },
    HAVE:  { stem: "motsu",   category: "verb", frame: "HAVE" },
    SEE:   { stem: "miru",    category: "verb", frame: "SEE" },
    SAY:   { stem: "iu",      category: "verb", frame: "SAY" },
    MAKE:  { stem: "tsukuru", category: "verb", frame: "MAKE" },
    EAT:   { stem: "taberu",  category: "verb", frame: "EAT" },
    BE_STATE: { stem: "kanjiru",  category: "verb", frame: "BE_STATE" },
    GREET:    { stem: "aisatsu",  category: "verb", frame: "GREET" },
    AFFIRM:   { stem: "doui",     category: "verb", frame: "AFFIRM" },
    DENY:     { stem: "kobamu",   category: "verb", frame: "DENY" },
    DECIDE:   { stem: "kimeru",   category: "verb", frame: "DECIDE" },
    KNOW:     { stem: "shiru",    category: "verb", frame: "KNOW" },
    // "nanoru" — to call oneself / introduce as. Idiomatic Japanese verb
    // for self-identification ("watashi wa Pemi to nanoru" → "I am Pemi").
    BE_IDENTITY: { stem: "nanoru",  category: "verb", frame: "BE_IDENTITY" },

    // Items — original set
    FLINT:   { stem: "hiuchi",   category: "noun", semanticType: "ITEM" },
    STICK:   { stem: "bou",      category: "noun", semanticType: "ITEM" },
    LIGHTER: { stem: "raitaa",   category: "noun", semanticType: "ITEM" },
    BREAD:   { stem: "pan",      category: "noun", semanticType: "ITEM" },
    WATER:   { stem: "mizu",     category: "noun", semanticType: "ITEM" },
    // Items — game inventory
    WOOD:    { stem: "mokuzai",  category: "noun", semanticType: "ITEM" },
    OIL:     { stem: "abura",    category: "noun", semanticType: "ITEM" },
    FRUIT:   { stem: "kudamono", category: "noun", semanticType: "ITEM" },
    PEBBLE:  { stem: "koishi",   category: "noun", semanticType: "ITEM" },
    JOURNAL: { stem: "nikki",    category: "noun", semanticType: "ITEM" },
    LETTER:  { stem: "tegami",   category: "noun", semanticType: "ITEM" },
    FIRE:    { stem: "honoo",    category: "noun", semanticType: "ITEM" },

    // Locations — original set
    FOREST: { stem: "mori",     category: "noun", semanticType: "LOCATION" },
    CAVE:   { stem: "doukutsu", category: "noun", semanticType: "LOCATION" },
    FORGE:  { stem: "kajiba",   category: "noun", semanticType: "LOCATION" },
    MEADOW: { stem: "nohara",   category: "noun", semanticType: "LOCATION" },
    // Locations — game scenes
    BEACH:      { stem: "hama",   category: "noun", semanticType: "LOCATION" },
    VILLAGE:    { stem: "mura",   category: "noun", semanticType: "LOCATION" },
    HUT:        { stem: "koya",   category: "noun", semanticType: "LOCATION" },
    LIGHTHOUSE: { stem: "toudai", category: "noun", semanticType: "LOCATION" },
    SHRINE:     { stem: "jinja",  category: "noun", semanticType: "LOCATION" },
    HOME:       { stem: "ie",     category: "noun", semanticType: "LOCATION" },

    // Animates — original set
    SMITH:    { stem: "kajiya",   category: "noun", semanticType: "ANIMATE" },
    WOODSMAN: { stem: "kikori",   category: "noun", semanticType: "ANIMATE" },
    // Animates — game roster
    PREDECESSOR:   { stem: "senjin",   category: "noun", semanticType: "ANIMATE" },
    BAKER:         { stem: "panya",    category: "noun", semanticType: "ANIMATE" },
    FARMER:        { stem: "noufu",    category: "noun", semanticType: "ANIMATE" },
    GUARD:         { stem: "keibi",    category: "noun", semanticType: "ANIMATE" },
    CHILD:         { stem: "kodomo",   category: "noun", semanticType: "ANIMATE" },
    SHRINE_KEEPER: { stem: "kannushi", category: "noun", semanticType: "ANIMATE" },

    // Abstracts — DECIDE.choice fillers
    LEAVING: { stem: "shuppatsu", category: "noun", semanticType: "ABSTRACT" },
    STAYING: { stem: "taizai",    category: "noun", semanticType: "ABSTRACT" },

    // Pronouns — "watashi" polite 1sg, "anata" 2sg, "kare" gender-neutral 3sg.
    PRONOUN_SELF:      { stem: "watashi", category: "pronoun", person: "self",      semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_LISTENER:  { stem: "anata",   category: "pronoun", person: "listener",  semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_REFERENCE: { stem: "kare",    category: "pronoun", person: "reference", semanticType: "ANIMATE", inherentNumber: "sg" },

    // Wh — "dou" doubles for the ABSTRACT slot ("dou kanjiru?" = "how feel?").
    WH_ANIMATE:  { stem: "dare", category: "wh", semanticType: "ANIMATE" },
    WH_ITEM:     { stem: "nani", category: "wh", semanticType: "ITEM" },
    WH_LOCATION: { stem: "doko", category: "wh", semanticType: "LOCATION" },
    WH_ABSTRACT: { stem: "dou",  category: "wh", semanticType: "ABSTRACT" },
  },
  morphology: {
    alignment: "nom-acc",
    case:   { NOM: { form: "", position: "suffix" }, ACC: { form: "", position: "suffix" }, DAT: { form: "", position: "suffix" } },
    mood:   { DECL: { form: "", position: "suffix" }, Q: { form: "", position: "suffix" }, IMP: { form: "", position: "suffix" } },
    number: { sg: { form: "", position: "suffix" }, pl: { form: "", position: "suffix" } },
    tense:  { present: { form: "", position: "suffix" }, past: { form: "", position: "suffix" }, future: { form: "", position: "suffix" } },
    negation: { form: "nai", position: "suffix" },
  },
  syntax: {
    wordOrder: "SOV",
    obliquePosition: "post-verb",
    headDirection: "head-final",
    adpositionOrder: "postposition",
    adjectiveOrder: "pre-noun",
    negationStrategy: "pre-verb",
    agreement: { subjectVerbNumber: false },
  },
  particles: {
    Q:   { form: "ka",       position: "final" },
    IMP: { form: "kudasai",  position: "final" },
  },
};

// Korean — isolating-styled pidgin, SOV, head-final, postpositional. Bare
// stems use Revised Romanization (which is natively diacritic-free): "eo"
// for ㅓ, "eu" for ㅡ. Verbs are given in dictionary form (-da). Mood rides
// on sentence-final particles: "kka" (formal -nikka Q ending) for questions,
// "juseyo" (please) for polite imperatives. Negation is "an" — the actual
// Korean preverbal negator, so this is the one piece of native syntax that
// survives the pidginisation.
//
// Caveat: like Japanese, oblique role surfaces post-verb (a quirk of the
// framework's canonical template under SOV) rather than between subject
// and verb where Korean would naturally place it.
export const KOREAN_LANGUAGE: LanguageSpec = {
  id: "Korean",
  difficulty: "simple",
  lexicon: {
    // Verbs — dictionary forms (-da).
    GIVE:  { stem: "juda",      category: "verb", frame: "GIVE" },
    TAKE:  { stem: "batda",     category: "verb", frame: "TAKE" },
    MOVE:  { stem: "gada",      category: "verb", frame: "MOVE" },
    WANT:  { stem: "wonhada",   category: "verb", frame: "WANT" },
    BE_AT: { stem: "itda",      category: "verb", frame: "BE_AT" },
    HAVE:  { stem: "gajida",    category: "verb", frame: "HAVE" },
    SEE:   { stem: "boda",      category: "verb", frame: "SEE" },
    SAY:   { stem: "malhada",   category: "verb", frame: "SAY" },
    MAKE:  { stem: "mandeulda", category: "verb", frame: "MAKE" },
    EAT:   { stem: "meokda",    category: "verb", frame: "EAT" },
    BE_STATE: { stem: "neukkida",    category: "verb", frame: "BE_STATE" },
    GREET:    { stem: "insahada",    category: "verb", frame: "GREET" },
    AFFIRM:   { stem: "donguihada",  category: "verb", frame: "AFFIRM" },
    DENY:     { stem: "geobuhada",   category: "verb", frame: "DENY" },
    DECIDE:   { stem: "jeonghada",   category: "verb", frame: "DECIDE" },
    KNOW:     { stem: "alda",        category: "verb", frame: "KNOW" },
    // "ireuda" — "to be called / named". Pidgin Korean for self-identity.
    BE_IDENTITY: { stem: "ireuda",   category: "verb", frame: "BE_IDENTITY" },

    // Items — original set
    FLINT:   { stem: "busitdol", category: "noun", semanticType: "ITEM" },
    STICK:   { stem: "makdaegi", category: "noun", semanticType: "ITEM" },
    LIGHTER: { stem: "raiteo",   category: "noun", semanticType: "ITEM" },
    BREAD:   { stem: "ppang",    category: "noun", semanticType: "ITEM" },
    WATER:   { stem: "mul",      category: "noun", semanticType: "ITEM" },
    // Items — game inventory
    WOOD:    { stem: "namu",     category: "noun", semanticType: "ITEM" },
    OIL:     { stem: "gireum",   category: "noun", semanticType: "ITEM" },
    FRUIT:   { stem: "gwail",    category: "noun", semanticType: "ITEM" },
    PEBBLE:  { stem: "joyakdol", category: "noun", semanticType: "ITEM" },
    JOURNAL: { stem: "ilgi",     category: "noun", semanticType: "ITEM" },
    LETTER:  { stem: "pyeonji",  category: "noun", semanticType: "ITEM" },
    FIRE:    { stem: "bul",      category: "noun", semanticType: "ITEM" },

    // Locations — original set
    FOREST: { stem: "sup",        category: "noun", semanticType: "LOCATION" },
    CAVE:   { stem: "donggul",    category: "noun", semanticType: "LOCATION" },
    FORGE:  { stem: "daejanggan", category: "noun", semanticType: "LOCATION" },
    MEADOW: { stem: "chowon",     category: "noun", semanticType: "LOCATION" },
    // Locations — game scenes
    BEACH:      { stem: "haebyeon", category: "noun", semanticType: "LOCATION" },
    VILLAGE:    { stem: "maeul",    category: "noun", semanticType: "LOCATION" },
    HUT:        { stem: "odumak",   category: "noun", semanticType: "LOCATION" },
    LIGHTHOUSE: { stem: "deungdae", category: "noun", semanticType: "LOCATION" },
    SHRINE:     { stem: "sadang",   category: "noun", semanticType: "LOCATION" },
    HOME:       { stem: "jip",      category: "noun", semanticType: "LOCATION" },

    // Animates — original set
    SMITH:    { stem: "daejangjangi", category: "noun", semanticType: "ANIMATE" },
    WOODSMAN: { stem: "namukkun",     category: "noun", semanticType: "ANIMATE" },
    // Animates — game roster
    PREDECESSOR:   { stem: "seonjo",    category: "noun", semanticType: "ANIMATE" },
    BAKER:         { stem: "jeppangsa", category: "noun", semanticType: "ANIMATE" },
    FARMER:        { stem: "nongbu",    category: "noun", semanticType: "ANIMATE" },
    GUARD:         { stem: "gyeongbi",  category: "noun", semanticType: "ANIMATE" },
    CHILD:         { stem: "ai",        category: "noun", semanticType: "ANIMATE" },
    SHRINE_KEEPER: { stem: "singwan",   category: "noun", semanticType: "ANIMATE" },

    // Abstracts — DECIDE.choice fillers (nominalised gerund forms)
    LEAVING: { stem: "tteonam",   category: "noun", semanticType: "ABSTRACT" },
    STAYING: { stem: "meomureum", category: "noun", semanticType: "ABSTRACT" },

    // Pronouns — informal 1sg/2sg, neutral 3sg.
    PRONOUN_SELF:      { stem: "na",  category: "pronoun", person: "self",      semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_LISTENER:  { stem: "neo", category: "pronoun", person: "listener",  semanticType: "ANIMATE", inherentNumber: "sg" },
    PRONOUN_REFERENCE: { stem: "geu", category: "pronoun", person: "reference", semanticType: "ANIMATE", inherentNumber: "sg" },

    // Wh-words.
    WH_ANIMATE:  { stem: "nugu",     category: "wh", semanticType: "ANIMATE" },
    WH_ITEM:     { stem: "mueot",    category: "wh", semanticType: "ITEM" },
    WH_LOCATION: { stem: "eodi",     category: "wh", semanticType: "LOCATION" },
    WH_ABSTRACT: { stem: "eotteoke", category: "wh", semanticType: "ABSTRACT" },
  },
  morphology: {
    alignment: "nom-acc",
    case:   { NOM: { form: "", position: "suffix" }, ACC: { form: "", position: "suffix" }, DAT: { form: "", position: "suffix" } },
    mood:   { DECL: { form: "", position: "suffix" }, Q: { form: "", position: "suffix" }, IMP: { form: "", position: "suffix" } },
    number: { sg: { form: "", position: "suffix" }, pl: { form: "", position: "suffix" } },
    tense:  { present: { form: "", position: "suffix" }, past: { form: "", position: "suffix" }, future: { form: "", position: "suffix" } },
    // "an" is the actual Korean preverbal negator — the one bit of native
    // syntax that survives the pidginisation.
    negation: { form: "an", position: "suffix" },
  },
  syntax: {
    wordOrder: "SOV",
    obliquePosition: "post-verb",
    headDirection: "head-final",
    adpositionOrder: "postposition",
    adjectiveOrder: "pre-noun",
    negationStrategy: "pre-verb",
    agreement: { subjectVerbNumber: false },
  },
  particles: {
    Q:   { form: "kka",    position: "final" },
    IMP: { form: "juseyo", position: "final" },
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
    // Hokkien "si" — equational copula ("X is Y"); distinct from "ti" (BE_AT).
    BE_IDENTITY: { stem: "si",  category: "verb", frame: "BE_IDENTITY" },

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
  malay: MALAY_LANGUAGE,
  hokkien: HOKKIEN_LANGUAGE,
  english: ENGLISH_LANGUAGE,
  japanese: JAPANESE_LANGUAGE,
  korean: KOREAN_LANGUAGE,
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
