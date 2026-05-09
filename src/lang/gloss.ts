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

// A single surface word and its morpheme breakdown, for interlinear gloss
// display in the UI. The gloss follows the Leipzig convention: each
// morpheme labeled with its morphosyntactic tag, joined with hyphens.

export type GlossedWord = {
  surface: string;
  // Display label for the stem (the lexeme being expressed).
  // Concept IDs (e.g. "FLINT") for nouns and "?" for wildcards.
  label: string;
  // Affix tags attached to the stem, in surface order. e.g. ["ACC"], ["Q"].
  tags: string[];
};

export type FrameGloss = {
  surface: string;
  words: GlossedWord[];
};

function applyAffix(stem: string, affix: Affix): string {
  if (affix.form === "") return stem;
  return affix.position === "prefix"
    ? affix.form + stem
    : stem + affix.form;
}

function verbForFrame(spec: LanguageSpec, frameId: string): {
  conceptId: string;
  stem: string;
} {
  for (const [conceptId, entry] of Object.entries(spec.lexicon)) {
    if (entry.category === "verb" && entry.frame === frameId) {
      return { conceptId, stem: entry.stem };
    }
  }
  throw new Error(`No verb realizing frame ${frameId} in ${spec.id}`);
}

function glossWordForRole(
  spec: LanguageSpec,
  role: RoleSpec,
  filler: FilledFrame["roles"][string],
): GlossedWord {
  const caseTag = caseForGrammar(spec, role.grammar);
  const caseAffix = spec.morphology.case[caseTag];

  let label: string;
  let stem: string;
  if (filler === "?") {
    const primaryType = role.types[0]!;
    const whConcept = WH_FOR_TYPE[primaryType];
    const entry = spec.lexicon[whConcept];
    if (!entry) throw new Error(`Missing wh-word ${whConcept}`);
    label = `?${primaryType}`;
    stem = entry.stem;
  } else {
    const entry = spec.lexicon[filler.conceptId];
    if (!entry) throw new Error(`Missing concept ${filler.conceptId}`);
    label = filler.conceptId;
    stem = entry.stem;
  }

  // Suppress zero-marker tags from the gloss line — they'd clutter it.
  const tags: string[] = [];
  if (caseAffix.form !== "") tags.push(caseTag);
  return { surface: applyAffix(stem, caseAffix), label, tags };
}

export function glossFrame(
  spec: LanguageSpec,
  filled: FilledFrame,
): FrameGloss {
  validateFilledFrame(filled);
  const frame = FRAMES[filled.predicate];
  if (!frame) throw new Error(`Unknown frame: ${filled.predicate}`);

  const subjectWords: GlossedWord[] = [];
  const objectWords: GlossedWord[] = [];
  const obliqueWords: GlossedWord[] = [];
  for (const role of frame.roles) {
    const filler = filled.roles[role.name];
    if (filler === undefined) continue;
    const word = glossWordForRole(spec, role, filler);
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

  const verb = verbForFrame(spec, frame.id);
  const moodTag = moodTagOf(filled.mood);
  const moodAffix = spec.morphology.mood[moodTag];
  const verbWord: GlossedWord = {
    surface: applyAffix(verb.stem, moodAffix),
    label: frame.id,
    tags: moodAffix.form === "" ? [] : [moodTag],
  };

  const slots: Record<"S" | "O" | "V", GlossedWord[]> = {
    S: subjectWords,
    O: objectWords,
    V: [verbWord],
  };
  const order = spec.syntax.wordOrder.split("") as ("S" | "O" | "V")[];
  const base = order.flatMap((letter) => slots[letter]);

  // Insert obliques next to the verb.
  let withObliques = base;
  if (obliqueWords.length > 0) {
    const verbIdx = base.indexOf(verbWord);
    const insertAt =
      spec.syntax.obliquePosition === "pre-verb" ? verbIdx : verbIdx + 1;
    withObliques = [
      ...base.slice(0, insertAt),
      ...obliqueWords,
      ...base.slice(insertAt),
    ];
  }

  return {
    surface: withObliques.map((w) => w.surface).join(" "),
    words: withObliques,
  };
}

// Format a single word as "label.tag1.tag2" for interlinear display.
export function formatGlossLabel(word: GlossedWord): string {
  return [word.label, ...word.tags].join(".");
}
