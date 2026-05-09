import {
  EntityRef,
  FRAMES,
  FilledFrame,
  Mood,
  Number_,
  RoleFiller,
  RoleSpec,
  Tense,
  validateFilledFrame,
} from "./frames.js";
import {
  Affix,
  Case,
  LanguageSpec,
  LexiconEntry,
  MoodTag,
  caseForGrammar,
  moodFromTag,
} from "./language-spec.js";

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

// ─── Affix peeling helpers ──────────────────────────────────────

// Try to combine `stem` with an affix. Returns the resulting surface form.
function withAffix(stem: string, affix: Affix): string {
  if (affix.form === "") return stem;
  return affix.position === "prefix" ? affix.form + stem : stem + affix.form;
}

// ─── Per-token analysis ─────────────────────────────────────────

type NounAnalysis = {
  kind: "noun";
  conceptId: string;
  entry: LexiconEntry;
  case: Case;
  number: Number_;
};

type VerbAnalysis = {
  kind: "verb";
  conceptId: string;
  entry: LexiconEntry;
  mood: MoodTag;
  tense: Tense;
  agreementNumber: Number_ | null; // null when agreement is off
  negated: boolean;
};

type TokenAnalysis = NounAnalysis | VerbAnalysis;

// Enumerate all (concept, number, case) combinations that produce this
// token for noun-like categories.
function enumerateNounAnalyses(
  spec: LanguageSpec,
  token: string,
): NounAnalysis[] {
  const out: NounAnalysis[] = [];
  const numbers: Number_[] = ["sg", "pl"];
  const cases: Case[] = ["NOM", "ACC", "DAT"];
  for (const [conceptId, entry] of Object.entries(spec.lexicon)) {
    if (entry.category === "verb") continue;
    for (const num of numbers) {
      for (const cs of cases) {
        const numAffix = spec.morphology.number[num];
        const caseAffix = spec.morphology.case[cs];
        // Suffixing: stem + NUM + CASE; Prefixing: CASE + NUM + stem.
        const surface = withAffix(withAffix(entry.stem, numAffix), caseAffix);
        if (surface === token) {
          out.push({ kind: "noun", conceptId, entry, case: cs, number: num });
        }
      }
    }
  }
  return out;
}

// Enumerate all (verb, tense, agreement-number, mood, negated) combinations
// that produce this token for verbs.
function enumerateVerbAnalyses(
  spec: LanguageSpec,
  token: string,
): VerbAnalysis[] {
  const out: VerbAnalysis[] = [];
  const tenses: Tense[] = ["past", "present", "future"];
  const moods: MoodTag[] = ["DECL", "Q", "IMP"];
  const agreementValues: (Number_ | null)[] = spec.syntax.agreement.subjectVerbNumber
    ? ["sg", "pl"]
    : [null];
  const negationOptions: boolean[] = spec.syntax.negationStrategy === "affix"
    ? [false, true]
    : [false];
  for (const [conceptId, entry] of Object.entries(spec.lexicon)) {
    if (entry.category !== "verb") continue;
    for (const t of tenses) {
      for (const ag of agreementValues) {
        for (const m of moods) {
          for (const neg of negationOptions) {
            let surface = withAffix(entry.stem, spec.morphology.tense[t]);
            if (ag !== null) {
              surface = withAffix(surface, spec.morphology.number[ag]);
            }
            surface = withAffix(surface, spec.morphology.mood[m]);
            if (neg) surface = withAffix(surface, spec.morphology.negation);
            if (surface === token) {
              out.push({
                kind: "verb",
                conceptId,
                entry,
                mood: m,
                tense: t,
                agreementNumber: ag,
                negated: neg,
              });
            }
          }
        }
      }
    }
  }
  return out;
}

function analyzeToken(spec: LanguageSpec, token: string): TokenAnalysis[] {
  return [
    ...enumerateVerbAnalyses(spec, token),
    ...enumerateNounAnalyses(spec, token),
  ];
}

// Score a token analysis. Higher is better. The intent is to mirror the
// pre-extension behavior where ambiguity is broken by stem length and
// preferring NON-zero affixes (so "tova" parses as bare-stem, not as
// some prefixed form that happens to also produce "tova").
function scoreAnalysis(spec: LanguageSpec, a: TokenAnalysis): number {
  let s = a.entry.stem.length * 10;
  if (a.kind === "noun") {
    if (spec.morphology.case[a.case].form !== "") s += 1;
    if (spec.morphology.number[a.number].form !== "") s += 1;
  } else {
    if (spec.morphology.mood[a.mood].form !== "") s += 1;
    if (spec.morphology.tense[a.tense].form !== "") s += 1;
    if (a.agreementNumber !== null
        && spec.morphology.number[a.agreementNumber].form !== "") s += 1;
    if (a.negated) s += 1;
  }
  return s;
}

function pickBestAnalysis(
  spec: LanguageSpec,
  analyses: TokenAnalysis[],
): TokenAnalysis {
  return [...analyses].sort((a, b) => scoreAnalysis(spec, b) - scoreAnalysis(spec, a))[0]!;
}

// ─── Tokenisation ───────────────────────────────────────────────

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

// ─── Decoder ────────────────────────────────────────────────────

export function decodeText(
  spec: LanguageSpec,
  input: string,
): FilledFrame {
  // Simple-difficulty languages have zero-marked morphology across the
  // board, so the affix-enumeration path below would tag every noun NOM
  // and double-fill the subject role. Use a position-based decoder
  // instead: strip the mood particle, identify the verb, then assign
  // S/O/OBL by word order.
  if (spec.difficulty === "simple") return decodeSimple(spec, input);

  let tokens = tokenize(input);
  if (tokens.length === 0) throw new ParseError("Empty input");

  // Strip sentence-level mood particles (simple-difficulty languages).
  // Q is purely a question signal (the wh-word in the noun analysis will
  // produce the "unknown" filler — particle is redundant but stripped if
  // present). IMP sets the FilledFrame's mood to imperative.
  let particleMood: Mood | null = null;
  if (spec.particles) {
    const tryStrip = (p: { form: string; position: "initial" | "final" }): boolean => {
      if (p.form === "") return false;
      if (p.position === "initial" && tokens[0] === p.form) {
        tokens = tokens.slice(1);
        return true;
      }
      if (p.position === "final" && tokens[tokens.length - 1] === p.form) {
        tokens = tokens.slice(0, -1);
        return true;
      }
      return false;
    };
    const qStripped = tryStrip(spec.particles.Q);
    if (!qStripped && tryStrip(spec.particles.IMP)) {
      particleMood = "imperative";
    }
  }
  if (tokens.length === 0) throw new ParseError("Empty input after particle strip");

  const { negated: particleNegated, rest: nonNegatedTokens } = stripNegationParticle(
    spec,
    tokens,
  );
  tokens = nonNegatedTokens;
  if (tokens.length === 0) throw new ParseError("Empty input after negation strip");

  const analyzed: TokenAnalysis[] = [];
  for (const tok of tokens) {
    const candidates = analyzeToken(spec, tok);
    if (candidates.length === 0) {
      throw new ParseError(`Unknown word "${tok}"`);
    }
    analyzed.push(pickBestAnalysis(spec, candidates));
  }

  const verbs = analyzed.filter((a): a is VerbAnalysis => a.kind === "verb");
  if (verbs.length === 0) throw new ParseError("No verb found");
  if (verbs.length > 1) throw new ParseError("Multiple verbs found");
  const verb = verbs[0]!;
  const frameId = verb.entry.frame;
  if (!frameId) {
    throw new ParseError(`Verb "${verb.entry.stem}" has no frame mapping`);
  }
  const frame = FRAMES[frameId];
  if (!frame) throw new ParseError(`Unknown frame: ${frameId}`);

  // Particle mood (imperative) overrides the verb's morphological mood,
  // which is zero-marked in simple mode. Question-ness no longer factors
  // into Mood — it rides on the "unknown" filler emitted from the wh-word.
  const mood: Mood = particleMood ?? moodFromTag(verb.mood);

  // Assign each non-verb token to a role by matching case to grammar.
  const filledRoles: Record<string, RoleFiller> = {};
  const nouns = analyzed.filter((a): a is NounAnalysis => a.kind === "noun");
  for (const noun of nouns) {
    const role = findRoleForCase(spec, frame.roles, noun.case);
    if (!role) {
      throw new ParseError(
        `Frame ${frame.id} has no role for case ${noun.case} (token "${noun.entry.stem}")`,
      );
    }
    if (filledRoles[role.name] !== undefined) {
      throw new ParseError(
        `Role "${role.name}" filled twice (case ${noun.case})`,
      );
    }
    if (noun.entry.category === "wh") {
      filledRoles[role.name] = "unknown";
    } else if (noun.entry.category === "pronoun") {
      if (!noun.entry.person) {
        throw new ParseError(
          `Pronoun lexicon entry ${noun.conceptId} is missing person`,
        );
      }
      filledRoles[role.name] = noun.entry.person;
    } else {
      if (!noun.entry.semanticType) {
        throw new ParseError(
          `Lexicon entry ${noun.conceptId} is missing semanticType`,
        );
      }
      if (!role.types.includes(noun.entry.semanticType)) {
        throw new ParseError(
          `Role "${role.name}" expects ${role.types.join("|")}, ` +
            `got ${noun.entry.semanticType} (token "${noun.entry.stem}")`,
        );
      }
      const ref: EntityRef = {
        type: noun.entry.semanticType,
        conceptId: noun.conceptId,
      };
      // Only attach number when it's plural — keeps singular round-trip
      // to a frame that omits the number field (the canonical default).
      if (noun.number === "pl") ref.number = "pl";
      filledRoles[role.name] = ref;
    }
  }

  // Cross-check: if subject-verb number agreement is on, the verb's
  // agreement marker must match the subject's number. Mismatch is a parse
  // error (the language requires agreement, so a violation means the
  // input wasn't well-formed in this language).
  if (spec.syntax.agreement.subjectVerbNumber && verb.agreementNumber !== null) {
    const subjectRole = frame.roles.find((r) => r.grammar === "subject");
    if (subjectRole) {
      const subjFiller = filledRoles[subjectRole.name];
      let subjNumber: Number_ = "sg";
      if (subjFiller && typeof subjFiller === "object" && "conceptId" in subjFiller) {
        subjNumber = (subjFiller as EntityRef).number ?? "sg";
      }
      if (subjNumber !== verb.agreementNumber) {
        throw new ParseError(
          `Agreement violation: verb shows ${verb.agreementNumber} but subject is ${subjNumber}`,
        );
      }
    }
  }

  const filled: FilledFrame = {
    predicate: frame.id,
    mood,
    roles: filledRoles,
  };
  // Only attach tense / negated when non-default, so existing frames that
  // omit them still round-trip identically.
  if (verb.tense !== "present") filled.tense = verb.tense;
  if (verb.negated || particleNegated) filled.negated = true;
  validateFilledFrame(filled);
  return filled;
}

function findRoleForCase(
  spec: LanguageSpec,
  roles: RoleSpec[],
  caseTag: Case,
): RoleSpec | undefined {
  return roles.find((r) => caseForGrammar(spec, r.grammar) === caseTag);
}

// ─── Simple-difficulty decoder ──────────────────────────────────
// Bare stems, no case/mood inflection. Mood comes from a sentence-level
// particle (Malay/Indonesian-style); roles come from word order, with
// obliques sitting immediately adjacent to the verb on the configured side.

function decodeSimple(spec: LanguageSpec, input: string): FilledFrame {
  const allTokens = tokenize(input);
  if (allTokens.length === 0) throw new ParseError("Empty input");

  // Strip a sentence-level Q or IMP particle, if present.
  const { mood, rest } = stripMoodParticleSimple(spec, allTokens);
  if (rest.length === 0) {
    throw new ParseError("Empty input after particle strip");
  }

  const { negated, rest: nonNegatedTokens } = stripNegationParticle(spec, rest);
  if (nonNegatedTokens.length === 0) {
    throw new ParseError("Empty input after negation strip");
  }

  // Identify the verb by exact stem match. Stem inventories are designed
  // so verb stems don't collide with nouns/pronouns/wh/particles.
  let verbIdx = -1;
  let verbEntry: LexiconEntry | undefined;
  for (let i = 0; i < nonNegatedTokens.length; i++) {
    const tok = nonNegatedTokens[i]!;
    const match = lookupVerbByStem(spec, tok);
    if (!match) continue;
    if (verbIdx >= 0) throw new ParseError("Multiple verbs found");
    verbIdx = i;
    verbEntry = match;
  }
  if (verbIdx < 0 || !verbEntry) throw new ParseError("No verb found");

  const frameId = verbEntry.frame;
  if (!frameId) {
    throw new ParseError(`Verb "${verbEntry.stem}" has no frame mapping`);
  }
  const frame = FRAMES[frameId];
  if (!frame) throw new ParseError(`Unknown frame: ${frameId}`);

  if (mood === "imperative" && frame.category !== "action") {
    throw new ParseError(
      `Imperative particle on non-action frame ${frame.id}`,
    );
  }

  const subjectRole = frame.roles.find((r) => r.grammar === "subject");
  const objectRole = frame.roles.find((r) => r.grammar === "object");
  const obliqueRole = frame.roles.find((r) => r.grammar === "oblique");

  // Split around the verb. The encoder's canonical template emits the
  // oblique at the OUTER end of the sentence (after the object for
  // post-verb languages, before the subject for pre-verb), not adjacent to
  // the verb — so we peel it from the far edge of the appropriate span.
  // For verb-final orders (SOV, OSV) the post-verb span is just [OBL] and
  // both ends collapse to the same token; for verb-medial orders (SVO,
  // OVS) the difference matters and the outer-edge rule is what matches
  // the encoder.
  let preV = nonNegatedTokens.slice(0, verbIdx);
  let postV = nonNegatedTokens.slice(verbIdx + 1);
  let obliqueToken: string | undefined;
  if (obliqueRole) {
    if (spec.syntax.obliquePosition === "pre-verb") {
      obliqueToken = preV[0];
      if (obliqueToken === undefined) {
        throw new ParseError(`Frame ${frame.id} expects a pre-verb oblique`);
      }
      preV = preV.slice(1);
    } else {
      obliqueToken = postV[postV.length - 1];
      if (obliqueToken === undefined) {
        throw new ParseError(`Frame ${frame.id} expects a post-verb oblique`);
      }
      postV = postV.slice(0, -1);
    }
  }

  // Remaining non-verb, non-oblique tokens fill S and O. Their surface
  // order matches wordOrder with V removed (e.g. "VSO" → ["S","O"]).
  const soTokens = [...preV, ...postV];
  const soOrder = spec.syntax.wordOrder
    .split("")
    .filter((c) => c !== "V") as ("S" | "O")[];

  const filledRoles: Record<string, RoleFiller> = {};
  let cursor = 0;
  for (const slot of soOrder) {
    const role =
      slot === "S" ? subjectRole : slot === "O" ? objectRole : undefined;
    if (!role) continue;
    const tok = soTokens[cursor++];
    if (tok === undefined) {
      throw new ParseError(
        `Frame ${frame.id} missing ${role.grammar} token`,
      );
    }
    filledRoles[role.name] = nounTokenToFillerSimple(spec, tok, role);
  }
  if (cursor < soTokens.length) {
    throw new ParseError(`Unexpected extra tokens for frame ${frame.id}`);
  }
  if (obliqueRole && obliqueToken !== undefined) {
    filledRoles[obliqueRole.name] = nounTokenToFillerSimple(
      spec,
      obliqueToken,
      obliqueRole,
    );
  }

  const filled: FilledFrame = {
    predicate: frame.id,
    mood,
    roles: filledRoles,
  };
  if (negated) filled.negated = true;
  validateFilledFrame(filled);
  return filled;
}

function stripNegationParticle(
  spec: LanguageSpec,
  tokens: string[],
): { negated: boolean; rest: string[] } {
  if (spec.syntax.negationStrategy === "affix") {
    return { negated: false, rest: tokens };
  }
  const particle = spec.morphology.negation.form;
  if (particle === "") return { negated: false, rest: tokens };

  const matches = tokens.reduce<number[]>((acc, token, index) => {
    if (token === particle) acc.push(index);
    return acc;
  }, []);

  if (matches.length === 0) return { negated: false, rest: tokens };
  if (matches.length > 1) {
    throw new ParseError(`Multiple negation particles found: "${particle}"`);
  }

  const at = matches[0]!;
  return {
    negated: true,
    rest: [...tokens.slice(0, at), ...tokens.slice(at + 1)],
  };
}

function stripMoodParticleSimple(
  spec: LanguageSpec,
  tokens: string[],
): { mood: Mood; rest: string[] } {
  if (!spec.particles) return { mood: "declarative", rest: tokens };
  // The Q particle is informational only — question-ness rides on the
  // "unknown" filler the wh-word produces. The Mood we return is just
  // declarative vs imperative; Q strips the particle and stays declarative.
  const tryStrip = (
    p: { form: string; position: "initial" | "final" } | undefined,
    mood: Mood,
  ): { mood: Mood; rest: string[] } | null => {
    if (!p || p.form === "") return null;
    if (p.position === "initial" && tokens[0] === p.form) {
      return { mood, rest: tokens.slice(1) };
    }
    if (p.position === "final" && tokens[tokens.length - 1] === p.form) {
      return { mood, rest: tokens.slice(0, -1) };
    }
    return null;
  };
  return (
    tryStrip(spec.particles.Q, "declarative") ??
    tryStrip(spec.particles.IMP, "imperative") ?? {
      mood: "declarative",
      rest: tokens,
    }
  );
}

function lookupVerbByStem(
  spec: LanguageSpec,
  stem: string,
): LexiconEntry | undefined {
  for (const entry of Object.values(spec.lexicon)) {
    if (entry.category === "verb" && entry.stem === stem) return entry;
  }
  return undefined;
}

function nounTokenToFillerSimple(
  spec: LanguageSpec,
  token: string,
  role: RoleSpec,
): RoleFiller {
  let conceptId: string | undefined;
  let entry: LexiconEntry | undefined;
  for (const [id, e] of Object.entries(spec.lexicon)) {
    if (e.category === "verb") continue;
    if (e.stem === token) {
      conceptId = id;
      entry = e;
      break;
    }
  }
  if (!entry || !conceptId) throw new ParseError(`Unknown word "${token}"`);
  if (entry.category === "wh") return "unknown";
  if (entry.category === "pronoun") {
    if (!entry.person) {
      throw new ParseError(`Pronoun lexicon entry ${conceptId} is missing person`);
    }
    return entry.person;
  }
  if (!entry.semanticType) {
    throw new ParseError(`Lexicon entry ${conceptId} is missing semanticType`);
  }
  if (!role.types.includes(entry.semanticType)) {
    throw new ParseError(
      `Role "${role.name}" expects ${role.types.join("|")}, ` +
        `got ${entry.semanticType} (token "${token}")`,
    );
  }
  return { type: entry.semanticType, conceptId };
}
