import {
  EntityRef,
  FilledFrame,
  Pronoun,
  RoleFiller,
  RoleType,
  Tense,
  isEntityRef,
  isNestedFrame,
  isPronoun,
  numberOf,
  validateFilledFrame,
} from "./frames.js";

// A compact, round-trippable text DSL for filled frames. Used by the
// workbench so frames can be hand-written / hand-edited without scrolling
// through nested JSON.
//
// Grammar (informal):
//   frame    := ("!" | "~")* predicate ("." tense)? "(" roles? ")"
//   roles    := role ("," role)*
//   role     := name "=" filler
//   filler   := pronoun | conceptId ("." number)? | "[" frame "]"
//   pronoun  := "self" | "listener" | "reference" | "unknown"
//   number   := "sg" | "pl"
//   tense    := "past" | "present" | "future"
//   "~" before the predicate marks negation; "!" before the predicate marks
//   an imperative. Either order is accepted (e.g. "!~GIVE" == "~!GIVE").
//   Mood otherwise defaults to declarative; question-ness rides on an
//   "unknown" filler.
//
// Examples:
//   WANT(wanter=self, desired=FLINT)
//   WANT(wanter=listener, desired=unknown)
//   !GIVE(agent=listener, recipient=self, theme=STICK)
//   ~HAVE.past(owner=SMITH, theme=BREAD)
//   SAY(speaker=SMITH, recipient=self,
//       content=[WANT(wanter=listener, desired=FLINT)])
//   FLINT.pl is allowed as a filler (plural lexical reference).

const PRONOUN_LITERALS: ReadonlySet<string> = new Set([
  "self",
  "listener",
  "reference",
  "unknown",
]);

const TENSE_LITERALS: ReadonlySet<string> = new Set([
  "past",
  "present",
  "future",
]);

export class FrameTextError extends Error {
  constructor(message: string, public position: number) {
    super(message);
    this.name = "FrameTextError";
  }
}

// ─── Format ──────────────────────────────────────────────────────

export function formatFrameText(frame: FilledFrame): string {
  let out = "";
  if (frame.mood === "imperative") out += "!";
  if (frame.negated) out += "~";
  out += frame.predicate;
  if (frame.tense && frame.tense !== "present") out += `.${frame.tense}`;
  const roleStrs = Object.entries(frame.roles).map(
    ([name, filler]) => `${name}=${formatFiller(filler)}`,
  );
  out += `(${roleStrs.join(", ")})`;
  return out;
}

function formatFiller(filler: RoleFiller): string {
  if (isPronoun(filler)) return filler;
  if (isNestedFrame(filler)) return `[${formatFrameText(filler.frame)}]`;
  if (isEntityRef(filler)) {
    const num = numberOf(filler);
    return num === "pl" ? `${filler.conceptId}.pl` : filler.conceptId;
  }
  throw new Error("formatFiller: unknown filler kind");
}

// ─── Parse ───────────────────────────────────────────────────────

// Type-of-conceptId lookup. Returns the semantic type (e.g. "ANIMATE") for
// a known concept, or undefined if the ID isn't in the language. The
// workbench wires this to `(id) => spec.lexicon[id]?.semanticType`.
export type ConceptTypeLookup = (conceptId: string) => RoleType | undefined;

interface Cursor {
  text: string;
  pos: number;
}

export function parseFrameText(
  text: string,
  conceptType: ConceptTypeLookup,
): FilledFrame {
  const cur: Cursor = { text, pos: 0 };
  skipWs(cur);
  const frame = parseFrame(cur, conceptType);
  skipWs(cur);
  if (cur.pos < cur.text.length) {
    throw new FrameTextError(
      `Unexpected trailing input: "${cur.text.slice(cur.pos)}"`,
      cur.pos,
    );
  }
  // Run the structural validator so callers get a single, consistent
  // exception type for both syntax and semantic errors.
  try {
    validateFilledFrame(frame);
  } catch (e) {
    throw new FrameTextError(
      e instanceof Error ? e.message : String(e),
      cur.pos,
    );
  }
  return frame;
}

function parseFrame(cur: Cursor, conceptType: ConceptTypeLookup): FilledFrame {
  skipWs(cur);
  let negated = false;
  let imperative = false;
  // Accept "!" and "~" as prefix markers in either order.
  while (peek(cur) === "!" || peek(cur) === "~") {
    if (peek(cur) === "!") imperative = true;
    else negated = true;
    cur.pos++;
    skipWs(cur);
  }
  const predicate = readIdentifier(cur);
  let tense: Tense | undefined;
  if (peek(cur) === ".") {
    const dotPos = cur.pos;
    cur.pos++;
    const word = readIdentifier(cur);
    if (!TENSE_LITERALS.has(word)) {
      throw new FrameTextError(
        `Expected tense (past|present|future) after '.', got "${word}"`,
        dotPos,
      );
    }
    tense = word as Tense;
  }
  expect(cur, "(");
  const roles: Record<string, RoleFiller> = {};
  skipWs(cur);
  if (peek(cur) !== ")") {
    parseRole(cur, conceptType, roles);
    skipWs(cur);
    while (peek(cur) === ",") {
      cur.pos++;
      parseRole(cur, conceptType, roles);
      skipWs(cur);
    }
  }
  expect(cur, ")");

  const frame: FilledFrame = {
    predicate,
    mood: imperative ? "imperative" : "declarative",
    roles,
  };
  if (tense && tense !== "present") frame.tense = tense;
  if (negated) frame.negated = true;
  return frame;
}

function parseRole(
  cur: Cursor,
  conceptType: ConceptTypeLookup,
  out: Record<string, RoleFiller>,
): void {
  skipWs(cur);
  const name = readIdentifier(cur);
  expect(cur, "=");
  const filler = parseFiller(cur, conceptType);
  if (out[name] !== undefined) {
    throw new FrameTextError(`Duplicate role "${name}"`, cur.pos);
  }
  out[name] = filler;
}

function parseFiller(
  cur: Cursor,
  conceptType: ConceptTypeLookup,
): RoleFiller {
  skipWs(cur);
  if (peek(cur) === "[") {
    cur.pos++;
    const inner = parseFrame(cur, conceptType);
    skipWs(cur);
    expect(cur, "]");
    return { kind: "frame", frame: inner };
  }
  const startPos = cur.pos;
  const word = readIdentifier(cur);
  if (PRONOUN_LITERALS.has(word)) {
    return word as Pronoun;
  }
  // Otherwise treat as a conceptId. Optional ".pl" / ".sg" suffix.
  let number: "sg" | "pl" | undefined;
  if (peek(cur) === ".") {
    const dotPos = cur.pos;
    cur.pos++;
    const tag = readIdentifier(cur);
    if (tag !== "sg" && tag !== "pl") {
      throw new FrameTextError(
        `Expected number (sg|pl) after '.', got "${tag}"`,
        dotPos,
      );
    }
    number = tag;
  }
  const type = conceptType(word);
  if (!type) {
    throw new FrameTextError(
      `Unknown concept "${word}" — not in this language's lexicon`,
      startPos,
    );
  }
  const ref: EntityRef = { type, conceptId: word };
  if (number === "pl") ref.number = "pl";
  return ref;
}

// ─── Lexer helpers ───────────────────────────────────────────────

function peek(cur: Cursor): string | undefined {
  skipWs(cur);
  return cur.text[cur.pos];
}

function skipWs(cur: Cursor): void {
  while (cur.pos < cur.text.length && /\s/.test(cur.text[cur.pos]!)) {
    cur.pos++;
  }
}

function expect(cur: Cursor, ch: string): void {
  skipWs(cur);
  if (cur.text[cur.pos] !== ch) {
    throw new FrameTextError(
      `Expected '${ch}', got '${cur.text[cur.pos] ?? "<end of input>"}'`,
      cur.pos,
    );
  }
  cur.pos++;
}

function readIdentifier(cur: Cursor): string {
  skipWs(cur);
  const start = cur.pos;
  while (
    cur.pos < cur.text.length &&
    /[A-Za-z0-9_]/.test(cur.text[cur.pos]!)
  ) {
    cur.pos++;
  }
  if (cur.pos === start) {
    throw new FrameTextError(
      `Expected identifier, got '${cur.text[cur.pos] ?? "<end of input>"}'`,
      cur.pos,
    );
  }
  return cur.text.slice(start, cur.pos);
}
