import { z } from "zod";

// The 6 locked frames. Frame inventory is language-independent —
// the same FrameSpec drives every generated language.

export const RoleType = z.enum(["ANIMATE", "ITEM", "LOCATION"]);
export type RoleType = z.infer<typeof RoleType>;

// Grammatical role assigned to each frame argument. Drives case marking.
// Under nom-acc alignment (v1): subject->NOM, object->ACC, oblique->DAT.
// When we add ergative alignment, this mapping changes; the role labels stay.
export const GrammaticalRole = z.enum(["subject", "object", "oblique"]);
export type GrammaticalRole = z.infer<typeof GrammaticalRole>;

export const RoleSpec = z.object({
  name: z.string(),
  // Set of acceptable entity types for this role. The first entry is the
  // "primary" type, used to pick the wh-word when this role is wildcarded.
  types: z.array(RoleType).min(1),
  grammar: GrammaticalRole,
});
export type RoleSpec = z.infer<typeof RoleSpec>;

export const FrameSpec = z.object({
  id: z.string(),
  category: z.enum(["action", "state", "modal"]),
  roles: z.array(RoleSpec),
});
export type FrameSpec = z.infer<typeof FrameSpec>;

export const FRAMES: Record<string, FrameSpec> = {
  GIVE: {
    id: "GIVE",
    category: "action",
    roles: [
      { name: "agent", types: ["ANIMATE"], grammar: "subject" },
      { name: "recipient", types: ["ANIMATE"], grammar: "oblique" },
      { name: "theme", types: ["ITEM"], grammar: "object" },
    ],
  },
  TAKE: {
    id: "TAKE",
    category: "action",
    roles: [
      { name: "agent", types: ["ANIMATE"], grammar: "subject" },
      { name: "theme", types: ["ITEM"], grammar: "object" },
    ],
  },
  MOVE: {
    id: "MOVE",
    category: "action",
    roles: [
      { name: "agent", types: ["ANIMATE"], grammar: "subject" },
      { name: "destination", types: ["LOCATION"], grammar: "oblique" },
    ],
  },
  WANT: {
    id: "WANT",
    category: "state",
    roles: [
      { name: "wanter", types: ["ANIMATE"], grammar: "subject" },
      { name: "desired", types: ["ITEM"], grammar: "object" },
    ],
  },
  BE_AT: {
    id: "BE_AT",
    category: "state",
    roles: [
      // Items are the common case for this game (the player asks
      // "where is the flint?"); animates are rarer but supported.
      { name: "figure", types: ["ITEM", "ANIMATE"], grammar: "subject" },
      { name: "ground", types: ["LOCATION"], grammar: "oblique" },
    ],
  },
  HAVE: {
    id: "HAVE",
    category: "state",
    roles: [
      { name: "owner", types: ["ANIMATE"], grammar: "subject" },
      { name: "theme", types: ["ITEM"], grammar: "object" },
    ],
  },
};

// A reference to an entity in the game world OR the wildcard "?" used
// in interrogative mood to mark the role being asked about.
export const EntityRef = z.object({
  type: RoleType,
  // conceptId points into LanguageSpec.lexicon — the *type* of entity
  // (e.g. "FLINT", "NPC_SMITH"). Specific instances are the game's job.
  conceptId: z.string(),
});
export type EntityRef = z.infer<typeof EntityRef>;

export const RoleFiller = z.union([EntityRef, z.literal("?")]);
export type RoleFiller = z.infer<typeof RoleFiller>;

export const Mood = z.enum(["declarative", "interrogative", "imperative"]);
export type Mood = z.infer<typeof Mood>;

export const FilledFrame = z.object({
  predicate: z.string(),
  mood: Mood,
  roles: z.record(z.string(), RoleFiller),
});
export type FilledFrame = z.infer<typeof FilledFrame>;

// Validate that a FilledFrame is well-formed against its frame definition:
// every required role is filled, fillers respect type restrictions, and
// at most one role is the "?" wildcard (and only in interrogative mood).
export function validateFilledFrame(filled: FilledFrame): void {
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
    if (filler === "?") {
      wildcards++;
      continue;
    }
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
