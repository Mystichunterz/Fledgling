import {
  FRAMES,
  FilledFrame,
  RoleFiller,
  RoleSpec,
  Tense,
  isEntityRef,
  isNestedFrame,
  isPhaticGreet,
  isPronoun,
} from "./frames.js";

// Rough English realization of a FilledFrame. Used in the workbench so the
// player can sanity-check what a frame "means" without parsing the conlang
// surface gloss. Not a serious MT system: it covers the eleven game frames,
// the four sentence types, three tenses, negation, and basic subject-verb
// agreement. Edge cases that don't matter for the game (passive voice,
// articles for proper nouns, irregular plurals) are intentionally rough.

// ── Verb morphology table ────────────────────────────────────────
interface Verb {
  base: string;
  thirdSg: string;
  past: string;
}

const VERBS: Record<string, Verb> = {
  GIVE:     { base: "give",  thirdSg: "gives",  past: "gave" },
  TAKE:     { base: "take",  thirdSg: "takes",  past: "took" },
  MOVE:     { base: "go",    thirdSg: "goes",   past: "went" },
  WANT:     { base: "want",  thirdSg: "wants",  past: "wanted" },
  BE_AT:    { base: "be",    thirdSg: "is",     past: "was" },
  HAVE:     { base: "have",  thirdSg: "has",    past: "had" },
  SEE:      { base: "see",   thirdSg: "sees",   past: "saw" },
  SAY:      { base: "say",   thirdSg: "says",   past: "said" },
  MAKE:     { base: "make",  thirdSg: "makes",  past: "made" },
  EAT:      { base: "eat",   thirdSg: "eats",   past: "ate" },
  BE_STATE: { base: "be",    thirdSg: "is",     past: "was" },
};

// Per-frame English argument layout: which role is the subject and the
// surface order (with prepositions) for the rest.
interface Arg {
  role: string;
  prep?: string;
}
interface Template {
  subject: string;
  args: Arg[];
}

const TEMPLATES: Record<string, Template> = {
  GIVE:     { subject: "agent",       args: [{ role: "theme" }, { role: "recipient", prep: "to" }] },
  TAKE:     { subject: "agent",       args: [{ role: "theme" }] },
  MOVE:     { subject: "agent",       args: [{ role: "destination", prep: "to" }] },
  WANT:     { subject: "wanter",      args: [{ role: "desired" }] },
  BE_AT:    { subject: "figure",      args: [{ role: "ground", prep: "at" }] },
  HAVE:     { subject: "owner",       args: [{ role: "theme" }] },
  SEE:      { subject: "viewer",      args: [{ role: "target" }] },
  SAY:      { subject: "speaker",     args: [{ role: "content" }, { role: "recipient", prep: "to" }] },
  MAKE:     { subject: "agent",       args: [{ role: "patient" }, { role: "source", prep: "from" }] },
  EAT:      { subject: "agent",       args: [{ role: "patient" }] },
  BE_STATE: { subject: "experiencer", args: [{ role: "state" }] },
};

// ── Agreement & noun phrases ─────────────────────────────────────
type Agreement = "1sg" | "2" | "3sg" | "3pl";

function agreementOf(filler: RoleFiller | undefined): Agreement {
  if (filler === "self") return "1sg";
  if (filler === "listener") return "2";
  if (filler && isEntityRef(filler) && filler.number === "pl") return "3pl";
  return "3sg";
}

function whWord(role: RoleSpec): string {
  const t = role.types[0];
  if (t === "ANIMATE") return "who";
  if (t === "LOCATION") return "where";
  if (t === "ABSTRACT") return "how";
  return "what";
}

function nounPhrase(
  filler: RoleFiller | undefined,
  role: RoleSpec,
  position: "subject" | "object",
): string {
  if (filler === undefined) return "?";
  if (filler === "unknown") return whWord(role);
  if (isPronoun(filler)) {
    if (filler === "self") return position === "subject" ? "I" : "me";
    if (filler === "listener") return "you";
    return "it"; // reference — singular generic
  }
  if (isEntityRef(filler)) {
    const word = filler.conceptId.toLowerCase();
    // ABSTRACT entities (state qualities) don't take an article in English:
    // "I am good", not "I am the good".
    if (filler.type === "ABSTRACT") return word;
    return filler.number === "pl" ? `the ${word}s` : `the ${word}`;
  }
  if (isNestedFrame(filler)) {
    // Embed the nested clause as a "that ..." complement, no period.
    return `that ${englishClause(filler.frame, { embedded: true }).replace(/[.!?]$/, "")}`;
  }
  return "?";
}

// ── Conjugation helpers ──────────────────────────────────────────

// Plain-form inflection (no aux). Used for affirmative statements.
function inflect(verb: Verb, agr: Agreement, tense: Tense): string {
  if (tense === "future") return `will ${verb.base}`;
  if (tense === "past") {
    // "be" has split past forms (was/were).
    if (verb.base === "be" && (agr === "2" || agr === "3pl")) return "were";
    return verb.past;
  }
  // present
  if (verb.base === "be") {
    if (agr === "1sg") return "am";
    if (agr === "2" || agr === "3pl") return "are";
    return "is";
  }
  if (verb.base === "have") {
    return agr === "3sg" ? "has" : "have";
  }
  return agr === "3sg" ? verb.thirdSg : verb.base;
}

// Auxiliary (do/does/did/will) for non-BE negation and Q.
function aux(agr: Agreement, tense: Tense): string {
  if (tense === "future") return "will";
  if (tense === "past") return "did";
  return agr === "3sg" ? "does" : "do";
}

// Negative contraction for an aux ("doesn't", "didn't", "won't").
function negAux(agr: Agreement, tense: Tense): string {
  if (tense === "future") return "won't";
  if (tense === "past") return "didn't";
  return agr === "3sg" ? "doesn't" : "don't";
}

// Negative contraction for a BE form ("isn't", "wasn't", "won't be"…).
function negBe(agr: Agreement, tense: Tense): string {
  if (tense === "future") return "won't be";
  if (tense === "past") return agr === "2" || agr === "3pl" ? "weren't" : "wasn't";
  if (agr === "1sg") return "am not";
  if (agr === "2" || agr === "3pl") return "aren't";
  return "isn't";
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0]!.toUpperCase() + s.slice(1);
}

// Render the post-verb argument list, optionally skipping a role (used
// when that role has been fronted as a wh-word).
function renderArgs(
  frame: FilledFrame,
  spec: { roles: RoleSpec[] },
  tmpl: Template,
  skipRole?: string,
): string {
  const out: string[] = [];
  for (const a of tmpl.args) {
    if (a.role === skipRole) continue;
    const role = spec.roles.find((r) => r.name === a.role)!;
    const np = nounPhrase(frame.roles[a.role], role, "object");
    out.push(a.prep ? `${a.prep} ${np}` : np);
  }
  return out.join(" ").trim();
}

// ── Main entry point ─────────────────────────────────────────────

interface ClauseOpts {
  embedded?: boolean;
}

function englishClause(frame: FilledFrame, opts: ClauseOpts = {}): string {
  // Phatic GREET → bare interjection.
  if (isPhaticGreet(frame)) return opts.embedded ? "hello" : "Hello.";

  const spec = FRAMES[frame.predicate];
  const tmpl = TEMPLATES[frame.predicate];
  const verb = VERBS[frame.predicate];
  if (!spec || !tmpl || !verb) return `[${frame.predicate}?]`;

  const tense: Tense = frame.tense ?? "present";
  const negated = !!frame.negated;
  const isPolar = frame.polarQuestion === true && !opts.embedded;
  const whRole = spec.roles.find((r) => frame.roles[r.name] === "unknown");
  const isWh = whRole !== undefined && !opts.embedded;
  const isCommand = frame.mood === "imperative" && !opts.embedded;

  const subjectRole = spec.roles.find((r) => r.name === tmpl.subject)!;
  const subjectFiller = frame.roles[tmpl.subject];
  const subjectAgr = agreementOf(subjectFiller);
  const isBe = verb.base === "be";

  // Imperatives — drop subject, base form. "Give the flint to me!"
  if (isCommand) {
    const head = negated ? `Don't ${verb.base}` : capitalize(verb.base);
    const args = renderArgs(frame, spec, tmpl);
    return `${head}${args ? " " + args : ""}!`;
  }

  // Wh-questions: wh-word fronted; subject-aux inversion if wh isn't subject.
  if (isWh) {
    const wh = whWord(whRole!);
    const whIsSubject = whRole!.name === tmpl.subject;
    const args = renderArgs(frame, spec, tmpl, whRole!.name);

    if (whIsSubject) {
      // "Who VERBS …?" — no inversion, always 3sg agreement on the verb.
      if (negated) {
        return `${capitalize(wh)} ${negAux("3sg", tense)} ${verb.base}${args ? " " + args : ""}?`;
      }
      const v = inflect(verb, "3sg", tense);
      return `${capitalize(wh)} ${v}${args ? " " + args : ""}?`;
    }

    const subj = nounPhrase(subjectFiller, subjectRole, "subject");

    if (isBe) {
      // "Where is the flint?" / "Where wasn't the flint?"
      const v = negated ? negBe(subjectAgr, tense) : inflect(verb, subjectAgr, tense);
      return `${capitalize(wh)} ${v} ${subj}${args ? " " + args : ""}?`;
    }

    const a = negated ? negAux(subjectAgr, tense) : aux(subjectAgr, tense);
    return `${capitalize(wh)} ${a} ${subj} ${verb.base}${args ? " " + args : ""}?`;
  }

  // Polar (yes/no) questions: subject-aux inversion.
  if (isPolar) {
    const subj = nounPhrase(subjectFiller, subjectRole, "subject");
    const args = renderArgs(frame, spec, tmpl);

    if (isBe) {
      const v = negated ? negBe(subjectAgr, tense) : inflect(verb, subjectAgr, tense);
      return `${capitalize(v)} ${subj}${args ? " " + args : ""}?`;
    }

    const a = negated ? negAux(subjectAgr, tense) : aux(subjectAgr, tense);
    return `${capitalize(a)} ${subj} ${verb.base}${args ? " " + args : ""}?`;
  }

  // Plain statement.
  const subj = nounPhrase(subjectFiller, subjectRole, "subject");

  // SAY with a nested-frame content reads better as "tells X that Y …"
  // than the literal "says Y to X".
  if (frame.predicate === "SAY") {
    const contentFiller = frame.roles["content"];
    if (contentFiller && isNestedFrame(contentFiller)) {
      const recipientRole = spec.roles.find((r) => r.name === "recipient")!;
      const recipientNp = nounPhrase(
        frame.roles["recipient"],
        recipientRole,
        "object",
      );
      const tellVerb: Verb = { base: "tell", thirdSg: "tells", past: "told" };
      const v = negated
        ? `${negAux(subjectAgr, tense)} tell`
        : inflect(tellVerb, subjectAgr, tense);
      const inner = englishClause(contentFiller.frame, { embedded: true }).replace(
        /[.!?]$/,
        "",
      );
      return `${capitalize(subj)} ${v} ${recipientNp} that ${inner}.`;
    }
  }

  const args = renderArgs(frame, spec, tmpl);
  if (isBe) {
    const v = negated ? negBe(subjectAgr, tense) : inflect(verb, subjectAgr, tense);
    return `${capitalize(subj)} ${v}${args ? " " + args : ""}.`;
  }
  if (negated) {
    return `${capitalize(subj)} ${negAux(subjectAgr, tense)} ${verb.base}${args ? " " + args : ""}.`;
  }
  const v = inflect(verb, subjectAgr, tense);
  return `${capitalize(subj)} ${v}${args ? " " + args : ""}.`;
}

export function englishOf(frame: FilledFrame): string {
  return englishClause(frame);
}
