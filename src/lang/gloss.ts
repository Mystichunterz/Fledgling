import {
  FRAMES,
  FilledFrame,
  RoleSpec,
  isEntityRef,
  isNestedFrame,
  isWildcard,
  numberOf,
  validateFilledFrame,
} from "./frames.js";
import {
  Affix,
  LanguageSpec,
  WH_FOR_TYPE,
  caseForGrammar,
  moodTagOf,
  tenseOf,
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

// Build the surface + tags for a single non-nested role filler. Nested
// frames are flattened by glossing the inner frame and inlining its words.
function glossWordForRole(
  spec: LanguageSpec,
  role: RoleSpec,
  filler: FilledFrame["roles"][string],
): GlossedWord {
  const caseTag = caseForGrammar(spec, role.grammar);
  const caseAffix = spec.morphology.case[caseTag];

  let label: string;
  let stem: string;
  let number: "sg" | "pl" = "sg";
  if (isWildcard(filler)) {
    const primaryType = role.types[0]!;
    const whConcept = WH_FOR_TYPE[primaryType];
    if (!whConcept) {
      throw new Error(`No wh-word for role type ${primaryType}`);
    }
    const entry = spec.lexicon[whConcept];
    if (!entry) throw new Error(`Missing wh-word ${whConcept}`);
    label = `?${primaryType}`;
    stem = entry.stem;
  } else {
    // EntityRef (nested-frame case is handled by the caller).
    if (!isEntityRef(filler)) {
      throw new Error(`Unexpected filler kind in glossWordForRole`);
    }
    const entry = spec.lexicon[filler.conceptId];
    if (!entry) throw new Error(`Missing concept ${filler.conceptId}`);
    label = filler.conceptId;
    stem = entry.stem;
    number = numberOf(filler);
  }

  // Suppress zero-marker tags from the gloss line — they'd clutter it.
  const tags: string[] = [];
  const numAffix = spec.morphology.number[number];
  if (numAffix.form !== "") tags.push(number.toUpperCase());
  if (caseAffix.form !== "") tags.push(caseTag);
  // Order: stem + NUM + CASE (suffixing) or CASE + NUM + stem (prefixing).
  const surface = applyAffix(applyAffix(stem, numAffix), caseAffix);
  return { surface, label, tags };
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
  let subjectNumber: "sg" | "pl" = "sg";
  for (const role of frame.roles) {
    const filler = filled.roles[role.name];
    if (filler === undefined) continue;
    if (isNestedFrame(filler)) {
      // Inline the nested frame's gloss as a sequence of words.
      const inner = glossFrame(spec, filler.frame);
      switch (role.grammar) {
        case "subject": subjectWords.push(...inner.words); break;
        case "object":  objectWords.push(...inner.words);  break;
        case "oblique": obliqueWords.push(...inner.words); break;
      }
      continue;
    }
    const word = glossWordForRole(spec, role, filler);
    switch (role.grammar) {
      case "subject":
        subjectWords.push(word);
        if (isEntityRef(filler)) subjectNumber = numberOf(filler);
        break;
      case "object":  objectWords.push(word);  break;
      case "oblique": obliqueWords.push(word); break;
    }
  }

  // Build the verb word. Stem + tense + (agreement-number) + mood.
  const verb = verbForFrame(spec, frame.id);
  const tense = tenseOf(filled);
  const tenseAffix = spec.morphology.tense[tense];
  const moodTag = moodTagOf(filled.mood);
  const moodAffix = spec.morphology.mood[moodTag];

  let verbSurface = applyAffix(verb.stem, tenseAffix);
  const verbTags: string[] = [];
  if (tenseAffix.form !== "") verbTags.push(tense.toUpperCase());
  if (spec.syntax.agreement.subjectVerbNumber) {
    const numAffix = spec.morphology.number[subjectNumber];
    verbSurface = applyAffix(verbSurface, numAffix);
    if (numAffix.form !== "") verbTags.push(`AGR.${subjectNumber.toUpperCase()}`);
  }
  verbSurface = applyAffix(verbSurface, moodAffix);
  if (moodAffix.form !== "") verbTags.push(moodTag);
  if (filled.negated && spec.syntax.negationStrategy === "affix"
      && spec.morphology.negation.form !== "") {
    verbSurface = applyAffix(verbSurface, spec.morphology.negation);
    verbTags.push("NEG");
  }
  const verbWord: GlossedWord = {
    surface: verbSurface,
    label: frame.id,
    tags: verbTags,
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

  // Particle-style negation as a free-standing word.
  let withNeg = withObliques;
  if (filled.negated && spec.syntax.negationStrategy !== "affix"
      && spec.morphology.negation.form !== "") {
    const negWord: GlossedWord = {
      surface: spec.morphology.negation.form,
      label: "NEG",
      tags: [],
    };
    const verbIdx = withNeg.indexOf(verbWord);
    const at = spec.syntax.negationStrategy === "pre-verb" ? verbIdx : verbIdx + 1;
    withNeg = [...withNeg.slice(0, at), negWord, ...withNeg.slice(at)];
  }

  // Simple mode: append/prepend the mood particle as its own glossed word.
  let final = withNeg;
  if (spec.difficulty === "simple" && moodTag !== "DECL") {
    const particle = spec.particles?.[moodTag];
    if (particle) {
      const particleWord: GlossedWord = {
        surface: particle.form,
        label: moodTag,
        tags: [],
      };
      final =
        particle.position === "initial"
          ? [particleWord, ...final]
          : [...final, particleWord];
    }
  }

  return {
    surface: final.map((w) => w.surface).join(" "),
    words: final,
  };
}

// Format a single word as "label.tag1.tag2" for interlinear display.
export function formatGlossLabel(word: GlossedWord): string {
  return [word.label, ...word.tags].join(".");
}
