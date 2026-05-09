// Syntactic templates — multiple word-level orderings per frame for
// rephrase support. The ENCODER always uses each frame's CANONICAL
// template (the first one) so the round-trip property holds; the DECODER
// only sees a flat token sequence and uses morphology (case affixes), not
// template identity, to recover the frame.
//
// Alternative templates are exposed via `rephraseFrame` for users who
// want to see paraphrases of the same meaning.

import { FRAMES, FilledFrame } from "./frames.js";
import { LanguageSpec, WordOrder } from "./language-spec.js";

// A template describes a constituent ordering. Slots are abstract names
// referring to grammatical functions; word-order adaptation maps SVO core
// positions to the language's actual order.
export type TemplateSlot =
  | { kind: "subject" }
  | { kind: "verb" }
  | { kind: "object" }
  | { kind: "oblique" };

export type Template = {
  id: string;          // "GIVE_active", "GIVE_topicalized"
  frameId: string;
  description: string;
  // Abstract slot list; word-order adaptation produces the final ordering.
  slots: TemplateSlot[];
};

// Two or three templates per frame. The first is canonical (used by
// encodeFrame). The others reorder the same slots to produce paraphrases —
// they're surface-distinct but recover to the same FilledFrame on parse,
// so we don't use them in encode by default.

const T = (
  id: string,
  frameId: string,
  description: string,
  slots: TemplateSlot[],
): Template => ({ id, frameId, description, slots });

const SVO_O: TemplateSlot[] = [
  { kind: "subject" },
  { kind: "verb" },
  { kind: "object" },
  { kind: "oblique" },
];

// The canonical template is just the SVO-with-oblique skeleton — it's
// adapted to the language's actual word order at render time. Alternative
// templates put obliques first (focus-fronting) or topicalize the object.
const ALL_TEMPLATES: Template[] = [
  // ─── action frames ──────────────────────────────────────────
  T("GIVE_active", "GIVE", "active: agent gives theme to recipient", SVO_O),
  T("GIVE_oblique_first", "GIVE", "oblique focus: to recipient, agent gives theme", [
    { kind: "oblique" }, { kind: "subject" }, { kind: "verb" }, { kind: "object" },
  ]),

  T("TAKE_active", "TAKE", "active: agent takes theme", SVO_O),
  T("TAKE_object_first", "TAKE", "object focus: theme, agent takes", [
    { kind: "object" }, { kind: "subject" }, { kind: "verb" },
  ]),

  T("MOVE_active", "MOVE", "active: agent moves to destination", SVO_O),
  T("MOVE_oblique_first", "MOVE", "destination focus: to dest, agent moves", [
    { kind: "oblique" }, { kind: "subject" }, { kind: "verb" },
  ]),

  T("WANT_active", "WANT", "active: wanter wants desired", SVO_O),
  T("WANT_object_first", "WANT", "object focus: desired, wanter wants", [
    { kind: "object" }, { kind: "subject" }, { kind: "verb" },
  ]),

  T("BE_AT_active", "BE_AT", "active: figure is at ground", SVO_O),
  T("BE_AT_oblique_first", "BE_AT", "ground focus: at ground, figure is", [
    { kind: "oblique" }, { kind: "subject" }, { kind: "verb" },
  ]),

  T("HAVE_active", "HAVE", "active: owner has theme", SVO_O),
  T("HAVE_object_first", "HAVE", "object focus: theme, owner has", [
    { kind: "object" }, { kind: "subject" }, { kind: "verb" },
  ]),

  T("SEE_active", "SEE", "active: viewer sees target", SVO_O),
  T("SEE_object_first", "SEE", "target focus: target, viewer sees", [
    { kind: "object" }, { kind: "subject" }, { kind: "verb" },
  ]),

  T("SAY_active", "SAY", "active: speaker says content to recipient", SVO_O),
  T("SAY_oblique_first", "SAY", "addressee focus: to recipient, speaker says content", [
    { kind: "oblique" }, { kind: "subject" }, { kind: "verb" }, { kind: "object" },
  ]),

  T("MAKE_active", "MAKE", "active: agent makes patient from source", SVO_O),
  T("MAKE_oblique_first", "MAKE", "source focus: from source, agent makes patient", [
    { kind: "oblique" }, { kind: "subject" }, { kind: "verb" }, { kind: "object" },
  ]),

  T("EAT_active", "EAT", "active: agent eats patient", SVO_O),
  T("EAT_object_first", "EAT", "patient focus: patient, agent eats", [
    { kind: "object" }, { kind: "subject" }, { kind: "verb" },
  ]),

  T("BE_STATE_active", "BE_STATE", "active: experiencer is state", SVO_O),
  T("BE_STATE_object_first", "BE_STATE", "state focus: state, experiencer is", [
    { kind: "object" }, { kind: "subject" }, { kind: "verb" },
  ]),

  // ─── social / dialogue frames ───────────────────────────────
  T("GREET_active", "GREET", "active: greeter greets addressee", SVO_O),
  T("GREET_oblique_first", "GREET", "addressee focus: to addressee, greeter greets", [
    { kind: "oblique" }, { kind: "subject" }, { kind: "verb" },
  ]),

  T("AFFIRM_active", "AFFIRM", "active: agreer affirms proposition", SVO_O),
  T("AFFIRM_object_first", "AFFIRM", "proposition focus: proposition, agreer affirms", [
    { kind: "object" }, { kind: "subject" }, { kind: "verb" },
  ]),

  T("DENY_active", "DENY", "active: disagreer denies proposition", SVO_O),
  T("DENY_object_first", "DENY", "proposition focus: proposition, disagreer denies", [
    { kind: "object" }, { kind: "subject" }, { kind: "verb" },
  ]),

  T("DECIDE_active", "DECIDE", "active: decider chooses choice", SVO_O),
  T("DECIDE_object_first", "DECIDE", "choice focus: choice, decider chooses", [
    { kind: "object" }, { kind: "subject" }, { kind: "verb" },
  ]),

  T("KNOW_active", "KNOW", "active: knower knows object", SVO_O),
  T("KNOW_object_first", "KNOW", "object focus: object, knower knows", [
    { kind: "object" }, { kind: "subject" }, { kind: "verb" },
  ]),
];

export function templatesFor(frameId: string): Template[] {
  return ALL_TEMPLATES.filter((t) => t.frameId === frameId);
}

export function canonicalTemplate(frameId: string): Template {
  const ts = templatesFor(frameId);
  if (ts.length === 0) {
    if (!FRAMES[frameId]) throw new Error(`No templates: unknown frame ${frameId}`);
    throw new Error(`No templates registered for frame ${frameId}`);
  }
  return ts[0]!;
}

// Apply the language's word order to the template's core S/V/O slots.
// Oblique slots stay in their template-specified position relative to the
// core, but oblique-marker placement is finalised by the encoder using
// `obliquePosition` when the template doesn't pin the oblique.
export function adaptToWordOrder(
  template: Template,
  wordOrder: WordOrder,
): TemplateSlot[] {
  const core = ["S", "V", "O"] as const;
  const orderArr = wordOrder.split("") as ("S" | "V" | "O")[];
  const corePositions = new Set(["subject", "verb", "object"]);
  // Separate core vs non-core preserving template's relative order of obliques.
  const result: TemplateSlot[] = [];
  // Build a queue of core slots from the template (they'll be reordered).
  const coreQueue: TemplateSlot[] = template.slots.filter((s) =>
    corePositions.has(s.kind),
  );
  // Sort coreQueue by the language's order.
  const orderIdx = (k: TemplateSlot["kind"]): number => {
    const letter = k === "subject" ? "S" : k === "verb" ? "V" : "O";
    return orderArr.indexOf(letter as "S" | "V" | "O");
  };
  coreQueue.sort((a, b) => orderIdx(a.kind) - orderIdx(b.kind));
  // Walk the template; replace core slots in-order with the reordered queue,
  // leave non-core slots in their original positions.
  let coreIdx = 0;
  for (const slot of template.slots) {
    if (corePositions.has(slot.kind)) {
      result.push(coreQueue[coreIdx++]!);
    } else {
      result.push(slot);
    }
  }
  void core;
  return result;
}

// Generate paraphrases of a frame using its alternative (non-canonical)
// templates. Used by the UI's "rephrase" affordance; not part of the
// round-trip encoder pipeline.
export type Rephrase = { templateId: string; description: string };
export function rephraseTemplates(spec: LanguageSpec, frame: FilledFrame): Rephrase[] {
  void spec;
  const all = templatesFor(frame.predicate);
  return all.slice(1).map((t) => ({ templateId: t.id, description: t.description }));
}
