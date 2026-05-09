import { z } from "zod";

// Frame inventory is language-independent — the same FrameSpec set drives
// every generated language. v2: 10 frames with thematic role labels and a
// richer semantic-type taxonomy. The original 6 game frames are retained
// verbatim; 4 new ones added (SEE, SAY, MAKE, EAT). SAY supports nesting
// via its `content` role.

export const RoleType = z.enum([
  "ANIMATE",
  "ITEM",
  "LOCATION",
  "ABSTRACT",  // properties, qualities (NEW)
  "EVENT",     // a nested frame instance (NEW)
]);
export type RoleType = z.infer<typeof RoleType>;

// Grammatical role assigned to each frame argument. Drives case marking.
// Under nom-acc alignment (v1): subject->NOM, object->ACC, oblique->DAT.
export const GrammaticalRole = z.enum(["subject", "object", "oblique"]);
export type GrammaticalRole = z.infer<typeof GrammaticalRole>;

export const RoleSpec = z.object({
  name: z.string(),
  // Set of acceptable entity types for this role. The first entry is the
  // "primary" type, used to pick the wh-word when this role is wildcarded.
  types: z.array(RoleType).min(1),
  grammar: GrammaticalRole,
  // For roles that may be filled by a nested frame (e.g. SAY.content).
  // The decoder won't try to reach inside; the encoder serialises the
  // nested frame inline using its canonical template.
  allowsNested: z.boolean().optional(),
});
export type RoleSpec = z.infer<typeof RoleSpec>;

export const FrameSpec = z.object({
  id: z.string(),
  category: z.enum(["action", "state", "modal"]),
  roles: z.array(RoleSpec),
});
export type FrameSpec = z.infer<typeof FrameSpec>;

// Thematic role names used across the inventory. Kept as informal labels —
// templates key off the label rather than its formal type.

export const FRAMES: Record<string, FrameSpec> = {
  GIVE: {
    id: "GIVE",
    category: "action",
    roles: [
      { name: "agent",     types: ["ANIMATE"], grammar: "subject" },
      { name: "recipient", types: ["ANIMATE"], grammar: "oblique" },
      { name: "theme",     types: ["ITEM"],    grammar: "object" },
    ],
  },
  TAKE: {
    id: "TAKE",
    category: "action",
    roles: [
      { name: "agent", types: ["ANIMATE"], grammar: "subject" },
      { name: "theme", types: ["ITEM"],    grammar: "object" },
    ],
  },
  MOVE: {
    id: "MOVE",
    category: "action",
    roles: [
      { name: "agent",       types: ["ANIMATE"],  grammar: "subject" },
      { name: "destination", types: ["LOCATION"], grammar: "oblique" },
    ],
  },
  WANT: {
    id: "WANT",
    category: "state",
    roles: [
      { name: "wanter",  types: ["ANIMATE"], grammar: "subject" },
      { name: "desired", types: ["ITEM"],    grammar: "object" },
    ],
  },
  BE_AT: {
    id: "BE_AT",
    category: "state",
    roles: [
      // Items are the common case for this game (the player asks
      // "where is the flint?"); animates are rarer but supported.
      { name: "figure", types: ["ITEM", "ANIMATE"], grammar: "subject" },
      { name: "ground", types: ["LOCATION"],        grammar: "oblique" },
    ],
  },
  HAVE: {
    id: "HAVE",
    category: "state",
    roles: [
      { name: "owner", types: ["ANIMATE"], grammar: "subject" },
      { name: "theme", types: ["ITEM"],    grammar: "object" },
    ],
  },
  // ─── New frames ─────────────────────────────────────────────
  SEE: {
    id: "SEE",
    category: "state",
    roles: [
      { name: "viewer", types: ["ANIMATE"],                     grammar: "subject" },
      { name: "target", types: ["ITEM", "ANIMATE", "LOCATION"], grammar: "object" },
    ],
  },
  SAY: {
    // SAY supports a nested frame in `content`. Without nesting the content
    // role takes an ITEM ("the smith says the flint" — referring to it).
    id: "SAY",
    category: "action",
    roles: [
      { name: "speaker",   types: ["ANIMATE"],       grammar: "subject" },
      { name: "recipient", types: ["ANIMATE"],       grammar: "oblique" },
      { name: "content",   types: ["EVENT", "ITEM"], grammar: "object", allowsNested: true },
    ],
  },
  MAKE: {
    id: "MAKE",
    category: "action",
    roles: [
      { name: "agent",   types: ["ANIMATE"], grammar: "subject" },
      { name: "patient", types: ["ITEM"],    grammar: "object" },
      { name: "source",  types: ["ITEM"],    grammar: "oblique" },
    ],
  },
  EAT: {
    id: "EAT",
    category: "action",
    roles: [
      { name: "agent",   types: ["ANIMATE"], grammar: "subject" },
      { name: "patient", types: ["ITEM"],    grammar: "object" },
    ],
  },
};

// ─── Filled frames ──────────────────────────────────────────────

export const Number_ = z.enum(["sg", "pl"]);
export type Number_ = z.infer<typeof Number_>;

export const Tense = z.enum(["past", "present", "future"]);
export type Tense = z.infer<typeof Tense>;

// Entity reference, optionally carrying number. Default (when omitted)
// is singular. Adding number is non-breaking for older fixtures.
export const EntityRef = z.object({
  type: RoleType,
  conceptId: z.string(),
  number: Number_.optional(),
});
export type EntityRef = z.infer<typeof EntityRef>;

export const Mood = z.enum(["declarative", "interrogative", "imperative"]);
export type Mood = z.infer<typeof Mood>;

// Forward-declared types so RoleFiller and FilledFrame can reference each
// other recursively.
export type FilledFrame = {
  predicate: string;
  mood: Mood;
  roles: Record<string, RoleFiller>;
  // `| undefined` is required so the Zod-inferred shape (which uses
  // `Tense.optional()` ↔ `Tense | undefined`) is assignable to this
  // type under `exactOptionalPropertyTypes: true`.
  tense?: Tense | undefined;
  negated?: boolean | undefined;
};

export type RoleFiller =
  | EntityRef
  | "?"
  | { kind: "frame"; frame: FilledFrame };

export const FilledFrame: z.ZodType<FilledFrame> = z.lazy(() =>
  z.object({
    predicate: z.string(),
    mood: Mood,
    roles: z.record(z.string(), RoleFiller),
    tense: Tense.optional(),
    negated: z.boolean().optional(),
  }),
);

export const RoleFiller: z.ZodType<RoleFiller> = z.lazy(() =>
  z.union([
    EntityRef,
    z.literal("?"),
    z.object({ kind: z.literal("frame"), frame: FilledFrame }),
  ]),
);

// Helpers to discriminate filler kinds.
export function isWildcard(f: RoleFiller): f is "?" {
  return f === "?";
}
export function isNestedFrame(
  f: RoleFiller,
): f is { kind: "frame"; frame: FilledFrame } {
  return typeof f === "object" && f !== null && "kind" in f && f.kind === "frame";
}
export function isEntityRef(f: RoleFiller): f is EntityRef {
  return typeof f === "object" && f !== null && "conceptId" in f && !("kind" in f);
}

// Convenience constructor for an EntityRef.
export function ref(
  type: RoleType,
  conceptId: string,
  number?: Number_,
): EntityRef {
  return number ? { type, conceptId, number } : { type, conceptId };
}

// Read the effective number of an entity reference (default sg).
export function numberOf(r: EntityRef): Number_ {
  return r.number ?? "sg";
}

// Validate that a FilledFrame is well-formed against its frame definition:
// every required role is filled, fillers respect type restrictions, at most
// one role is the "?" wildcard (and only in interrogative mood), nested
// frames are only used in roles that allow them.
const MAX_NESTING_DEPTH = 3;

export function validateFilledFrame(filled: FilledFrame, depth = 1): void {
  if (depth > MAX_NESTING_DEPTH) {
    throw new Error(`Frame nesting exceeds maximum depth of ${MAX_NESTING_DEPTH}`);
  }
  const frame = FRAMES[filled.predicate];
  if (!frame) throw new Error(`Unknown frame: ${filled.predicate}`);

  const declared = new Set(frame.roles.map((r) => r.name));
  for (const k of Object.keys(filled.roles)) {
    if (!declared.has(k)) {
      throw new Error(`Frame ${frame.id} has no role "${k}"`);
    }
  }

  let wildcards = 0;
  for (const role of frame.roles) {
    const filler = filled.roles[role.name];
    if (filler === undefined) {
      throw new Error(`Frame ${frame.id} missing role "${role.name}"`);
    }
    if (isWildcard(filler)) {
      wildcards++;
      continue;
    }
    if (isNestedFrame(filler)) {
      if (!role.allowsNested) {
        throw new Error(
          `Role "${role.name}" of frame ${frame.id} does not accept nested frames`,
        );
      }
      validateFilledFrame(filler.frame, depth + 1);
      continue;
    }
    // EntityRef
    if (!role.types.includes(filler.type)) {
      throw new Error(
        `Frame ${frame.id} role "${role.name}" expects ${role.types.join("|")}, got ${filler.type}`,
      );
    }
  }

  if (wildcards > 1) {
    throw new Error(`Frame ${frame.id} has ${wildcards} "?" wildcards (max 1)`);
  }
  if (wildcards === 1 && filled.mood !== "interrogative") {
    throw new Error(`Wildcard "?" requires interrogative mood`);
  }
  if (wildcards === 0 && filled.mood === "interrogative") {
    throw new Error(`Interrogative mood requires exactly one "?" wildcard`);
  }
  if (filled.mood === "imperative" && frame.category !== "action") {
    throw new Error(
      `Imperative mood requires an action frame (got ${frame.category} frame ${frame.id})`,
    );
  }
}
