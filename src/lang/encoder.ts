import {
  EntityRef,
  FRAMES,
  FilledFrame,
  Mood,
  Number_,
  RoleFiller,
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
import { adaptToWordOrder, canonicalTemplate } from "./templates.js";

// Glue an affix onto a stem. Empty form returns the stem unchanged.
export function applyAffix(stem: string, affix: Affix): string {
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

// Look up the bare stem for a wh-word matching the role's primary type.
function whStem(spec: LanguageSpec, role: RoleSpec): string {
  const primaryType = role.types[0]!;
  const whConcept = WH_FOR_TYPE[primaryType];
  if (!whConcept) {
    throw new Error(
      `Role "${role.name}" type ${primaryType} has no wh-word`,
    );
  }
  const entry = spec.lexicon[whConcept];
  if (!entry) {
    throw new Error(
      `Language ${spec.id} missing wh-word for type ${primaryType} (${whConcept})`,
    );
  }
  return entry.stem;
}

// Read the stem for a non-wildcard, non-nested filler.
function stemForRef(spec: LanguageSpec, ref: EntityRef): string {
  const entry = spec.lexicon[ref.conceptId];
  if (!entry) {
    throw new Error(`Language ${spec.id} missing concept ${ref.conceptId}`);
  }
  return entry.stem;
}

// Build the surface word for one role: stem + number + case.
// Affixes stack inside-out so suffixing langs get stem+number+case;
// prefixing langs get case+number+stem.
function wordForRole(
  spec: LanguageSpec,
  role: RoleSpec,
  filler: EntityRef | "?",
): string {
  let stem: string;
  let number: Number_;
  if (isWildcard(filler)) {
    stem = whStem(spec, role);
    number = "sg"; // wh-words are conventionally singular
  } else {
    stem = stemForRef(spec, filler);
    number = numberOf(filler);
  }
  const numAffix = spec.morphology.number[number];
  const caseTag = caseForGrammar(spec, role.grammar);
  const caseAffix = spec.morphology.case[caseTag];
  // Apply number first so it sits closer to the stem than case
  // (suffixing: stem+NUM+CASE; prefixing: CASE+NUM+stem).
  return applyAffix(applyAffix(stem, numAffix), caseAffix);
}

// Build the verb word: stem + tense + (agreement-number) + mood + (negation).
function wordForVerb(
  spec: LanguageSpec,
  frame: FilledFrame,
  subjectNumber: Number_,
): string {
  const stem = verbForFrame(spec, frame.predicate);
  const tense = tenseOf(frame);
  let word = applyAffix(stem, spec.morphology.tense[tense]);
  if (spec.syntax.agreement.subjectVerbNumber) {
    word = applyAffix(word, spec.morphology.number[subjectNumber]);
  }
  const moodTag = moodTagOf(frame.mood);
  word = applyAffix(word, spec.morphology.mood[moodTag]);
  if (frame.negated && spec.syntax.negationStrategy === "affix") {
    word = applyAffix(word, spec.morphology.negation);
  }
  return word;
}

// Determine the subject's number from a frame. For nested-frame fillers in
// subject position (theoretically possible), default to sg.
function subjectNumberOf(spec: LanguageSpec, frame: FilledFrame): Number_ {
  const frameSpec = FRAMES[frame.predicate];
  if (!frameSpec) return "sg";
  const subjectRole = frameSpec.roles.find((r) => r.grammar === "subject");
  if (!subjectRole) return "sg";
  const filler = frame.roles[subjectRole.name];
  if (filler === undefined) return "sg";
  if (isWildcard(filler)) return "sg";
  if (isEntityRef(filler)) return numberOf(filler);
  return "sg";
}

// Render one role as either a single word, a multi-word phrase (for nested
// frames), or omit it (when a content-role nested frame is too complex).
function renderRoleFiller(
  spec: LanguageSpec,
  role: RoleSpec,
  filler: RoleFiller,
): string {
  if (isNestedFrame(filler)) {
    // Recursively encode the nested frame as its own clause.
    return encodeFrameInner(spec, filler.frame);
  }
  return wordForRole(spec, role, filler);
}

// Insert oblique-case words relative to the verb when the template doesn't
// already pin them. (When a template puts "oblique" before "subject", we
// honour that placement and skip this insertion.)
function placeObliquesAroundVerb(
  base: string[],
  verbWord: string,
  obliques: string[],
  position: "pre-verb" | "post-verb",
): string[] {
  if (obliques.length === 0) return base;
  const verbIdx = base.indexOf(verbWord);
  if (verbIdx < 0) {
    throw new Error("Verb not found in syntactic frame");
  }
  const insertAt = position === "pre-verb" ? verbIdx : verbIdx + 1;
  return [...base.slice(0, insertAt), ...obliques, ...base.slice(insertAt)];
}

// Core encoder. Public encodeFrame validates first; encodeFrameInner is
// used by recursion for nested frames (which are validated by the outer
// validation pass).
function encodeFrameInner(spec: LanguageSpec, frame: FilledFrame): string {
  const frameSpec = FRAMES[frame.predicate];
  if (!frameSpec) throw new Error(`Unknown frame: ${frame.predicate}`);

  const subjectNumber = subjectNumberOf(spec, frame);

  // Build a word per role using the frame's grammatical assignments.
  const subjectWords: string[] = [];
  const objectWords: string[] = [];
  const obliqueWords: string[] = [];
  for (const role of frameSpec.roles) {
    const filler = frame.roles[role.name];
    if (filler === undefined) continue;
    const word = renderRoleFiller(spec, role, filler);
    switch (role.grammar) {
      case "subject": subjectWords.push(word); break;
      case "object":  objectWords.push(word);  break;
      case "oblique": obliqueWords.push(word); break;
    }
  }

  const verbWord = wordForVerb(spec, frame, subjectNumber);

  // Use the canonical template, adapted to this language's word order.
  const template = canonicalTemplate(frame.predicate);
  const ordered = adaptToWordOrder(template, spec.syntax.wordOrder);

  const slotsByKind: Record<"subject" | "verb" | "object" | "oblique", string[]> = {
    subject: subjectWords,
    verb: [verbWord],
    object: objectWords,
    oblique: obliqueWords,
  };
  // Walk the ordered template; any oblique slots not pinned by the
  // template will be placed by placeObliquesAroundVerb afterwards.
  const usedObliquesInTemplate = ordered.some((s) => s.kind === "oblique");
  const base: string[] = [];
  for (const slot of ordered) {
    base.push(...(slotsByKind[slot.kind] ?? []));
  }
  let words = base;
  if (!usedObliquesInTemplate) {
    words = placeObliquesAroundVerb(
      base,
      verbWord,
      obliqueWords,
      spec.syntax.obliquePosition,
    );
  }

  // Particle-style negation (when not affix). The negation form goes
  // pre-verb or post-verb as a free-standing word.
  if (frame.negated && spec.syntax.negationStrategy !== "affix") {
    const particle = spec.morphology.negation.form;
    if (particle !== "") {
      const verbIdx = words.indexOf(verbWord);
      const at = spec.syntax.negationStrategy === "pre-verb" ? verbIdx : verbIdx + 1;
      words = [...words.slice(0, at), particle, ...words.slice(at)];
    }
  }

  // Sentence-level mood particles (used in "simple" difficulty languages).
  // Q goes around interrogatives, IMP around imperatives. Position is
  // initial or final. Particle marks STACK with affix marks (a language
  // could in principle do both); in practice, simple-mode languages have
  // empty mood affixes so only the particle is visible.
  if (spec.particles) {
    const apply = (p: { form: string; position: "initial" | "final" }) => {
      if (p.form === "") return;
      words = p.position === "initial" ? [p.form, ...words] : [...words, p.form];
    };
    if (frame.mood === "interrogative") apply(spec.particles.Q);
    else if (frame.mood === "imperative") apply(spec.particles.IMP);
  }

  return words.join(" ");
}

export function encodeFrame(spec: LanguageSpec, filled: FilledFrame): string {
  validateFilledFrame(filled);
  return encodeFrameInner(spec, filled);
}

// Re-export so callers can still import Mood etc. from a single module.
export type { Mood };
