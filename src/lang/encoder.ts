import {
  FRAMES,
  FilledFrame,
  RoleSpec,
  validateFilledFrame,
} from "./frames.js";
import {
  Affix,
  LanguageSpec,
  WH_FOR_TYPE,
  caseForGrammar,
  moodTagOf,
} from "./language-spec.js";

// Glue an affix onto a stem. Empty form returns the stem unchanged.
function applyAffix(stem: string, affix: Affix): string {
  if (affix.form === "") return stem;
  return affix.position === "prefix"
    ? affix.form + stem
    : stem + affix.form;
}

// Look up the verb stem realizing this frame in the given language.
function verbForFrame(spec: LanguageSpec, frameId: string): string {
  for (const entry of Object.values(spec.lexicon)) {
    if (entry.category === "verb" && entry.frame === frameId) {
      return entry.stem;
    }
  }
  throw new Error(
    `Language ${spec.id} has no verb realizing frame ${frameId}`,
  );
}

// Build the surface word for one role: stem (or wh-stem) + case affix.
function wordForRole(
  spec: LanguageSpec,
  role: RoleSpec,
  filler: FilledFrame["roles"][string],
): string {
  let stem: string;
  if (filler === "?") {
    // Pick the wh-word matching the role's primary expected type.
    const primaryType = role.types[0];
    if (!primaryType) {
      throw new Error(`Role ${role.name} has no types`);
    }
    const whConcept = WH_FOR_TYPE[primaryType];
    const entry = spec.lexicon[whConcept];
    if (!entry) {
      throw new Error(
        `Language ${spec.id} missing wh-word for type ${primaryType} (${whConcept})`,
      );
    }
    stem = entry.stem;
  } else {
    const entry = spec.lexicon[filler.conceptId];
    if (!entry) {
      throw new Error(
        `Language ${spec.id} missing concept ${filler.conceptId}`,
      );
    }
    stem = entry.stem;
  }
  const caseTag = caseForGrammar(spec, role.grammar);
  const caseAffix = spec.morphology.case[caseTag];
  return applyAffix(stem, caseAffix);
}

// Place subject(s) (S), object(s) (O), and verb (V) according to the
// language's basic word order. Returns an ordered list of slots.
function orderSOV(
  wordOrder: LanguageSpec["syntax"]["wordOrder"],
  S: string[],
  O: string[],
  V: string,
): string[] {
  const slots: Record<"S" | "O" | "V", string[]> = {
    S,
    O,
    V: [V],
  };
  const order = wordOrder.split("") as ("S" | "O" | "V")[];
  return order.flatMap((letter) => slots[letter]);
}

// Insert oblique-case words relative to the verb.
function insertObliques(
  base: string[],
  verb: string,
  obliques: string[],
  position: "pre-verb" | "post-verb",
): string[] {
  if (obliques.length === 0) return base;
  const verbIdx = base.indexOf(verb);
  if (verbIdx < 0) {
    throw new Error("Verb not found in syntactic frame");
  }
  const insertAt = position === "pre-verb" ? verbIdx : verbIdx + 1;
  return [...base.slice(0, insertAt), ...obliques, ...base.slice(insertAt)];
}

export function encodeFrame(
  spec: LanguageSpec,
  filled: FilledFrame,
): string {
  validateFilledFrame(filled);
  const frame = FRAMES[filled.predicate];
  if (!frame) throw new Error(`Unknown frame: ${filled.predicate}`);

  // Bucket roles by grammatical function and build their words.
  const subjectWords: string[] = [];
  const objectWords: string[] = [];
  const obliqueWords: string[] = [];
  for (const role of frame.roles) {
    const filler = filled.roles[role.name];
    if (filler === undefined) continue; // validateFilledFrame already caught
    const word = wordForRole(spec, role, filler);
    switch (role.grammar) {
      case "subject":
        subjectWords.push(word);
        break;
      case "object":
        objectWords.push(word);
        break;
      case "oblique":
        obliqueWords.push(word);
        break;
    }
  }

  // Verb gets the mood marker.
  const verbStem = verbForFrame(spec, frame.id);
  const moodTag = moodTagOf(filled.mood);
  const verbWord = applyAffix(verbStem, spec.morphology.mood[moodTag]);

  const base = orderSOV(
    spec.syntax.wordOrder,
    subjectWords,
    objectWords,
    verbWord,
  );
  const withObliques = insertObliques(
    base,
    verbWord,
    obliqueWords,
    spec.syntax.obliquePosition,
  );

  return withObliques.join(" ");
}
