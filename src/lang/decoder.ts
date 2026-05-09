import {
  EntityRef,
  FRAMES,
  FilledFrame,
  Mood,
  RoleFiller,
  RoleSpec,
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

// Try to peel a single affix off a token. Returns the bare stem if the
// token matches `stem + affix` (or `affix + stem`), else null.
function stripAffix(token: string, stem: string, affix: Affix): string | null {
  const surface =
    affix.position === "prefix" ? affix.form + stem : stem + affix.form;
  return token === surface ? stem : null;
}

type NounAnalysis = {
  kind: "noun";
  conceptId: string;
  entry: LexiconEntry;
  case: Case;
};

type VerbAnalysis = {
  kind: "verb";
  conceptId: string;
  entry: LexiconEntry;
  mood: MoodTag;
};

type TokenAnalysis = NounAnalysis | VerbAnalysis;

// Find every (concept, affix) pairing that produces this surface token.
function analyzeToken(
  spec: LanguageSpec,
  token: string,
): TokenAnalysis[] {
  const out: TokenAnalysis[] = [];
  const cases = Object.entries(spec.morphology.case) as [Case, Affix][];
  const moods = Object.entries(spec.morphology.mood) as [MoodTag, Affix][];

  for (const [conceptId, entry] of Object.entries(spec.lexicon)) {
    if (entry.category === "verb") {
      for (const [moodTag, affix] of moods) {
        if (stripAffix(token, entry.stem, affix) !== null) {
          out.push({ kind: "verb", conceptId, entry, mood: moodTag });
        }
      }
    } else {
      for (const [caseTag, affix] of cases) {
        if (stripAffix(token, entry.stem, affix) !== null) {
          out.push({ kind: "noun", conceptId, entry, case: caseTag });
        }
      }
    }
  }
  return out;
}

// When a token has multiple analyses, prefer the one with the longest stem.
// Tiebreak: prefer non-zero-marked case (more specific).
function pickBestAnalysis(
  analyses: TokenAnalysis[],
  spec: LanguageSpec,
): TokenAnalysis {
  return analyses.slice().sort((a, b) => {
    if (b.entry.stem.length !== a.entry.stem.length) {
      return b.entry.stem.length - a.entry.stem.length;
    }
    const aZero =
      a.kind === "noun"
        ? spec.morphology.case[a.case].form === ""
        : spec.morphology.mood[a.mood].form === "";
    const bZero =
      b.kind === "noun"
        ? spec.morphology.case[b.case].form === ""
        : spec.morphology.mood[b.mood].form === "";
    if (aZero === bZero) return 0;
    return aZero ? 1 : -1;
  })[0]!;
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export function decodeText(
  spec: LanguageSpec,
  input: string,
): FilledFrame {
  const tokens = tokenize(input);
  if (tokens.length === 0) throw new ParseError("Empty input");

  // Analyze each token; reject any that match nothing.
  const analyzed: TokenAnalysis[] = [];
  for (const tok of tokens) {
    const candidates = analyzeToken(spec, tok);
    if (candidates.length === 0) {
      throw new ParseError(`Unknown word "${tok}"`);
    }
    analyzed.push(pickBestAnalysis(candidates, spec));
  }

  // Identify the verb. Must be exactly one.
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

  const mood: Mood = moodFromTag(verb.mood);

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
      filledRoles[role.name] = "?";
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
      filledRoles[role.name] = ref;
    }
  }

  const filled: FilledFrame = {
    predicate: frame.id,
    mood,
    roles: filledRoles,
  };
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
