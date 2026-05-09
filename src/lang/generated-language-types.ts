import { z } from "zod";
import type { Difficulty } from "./language-spec.js";

const NonEmptyString = z.string().min(1);

export const LanguageDesignArtifact = z.object({
  version: z.literal(1),
  phonologicalFlavor: NonEmptyString,
  lexicalStyle: NonEmptyString,
  namingStyle: NonEmptyString,
  morphologicalProfile: NonEmptyString,
  irregularityBudget: z.number().int().min(0).max(3),
  preferredSyllableShapes: z.array(NonEmptyString).min(1),
  markedPhonemes: z.array(NonEmptyString).min(1),
  pronounFlavor: NonEmptyString,
  compoundingTendency: z.enum(["low", "medium", "high"]),
  affixProfile: z.object({
    position: z.enum(["prefix", "suffix"]),
    density: z.enum(["light", "medium", "heavy"]),
  }),
  particleStyle: NonEmptyString,
  tabooRepeats: z.array(NonEmptyString),
  questConceptPriorities: z.array(NonEmptyString).min(1),
});

export type LanguageDesignArtifact = z.infer<typeof LanguageDesignArtifact>;

export interface GeneratedLanguageMetadata {
  seed: string;
  difficulty: Difficulty;
  model: string;
  promptVersion: string;
  compilerVersion: string;
  artifact: LanguageDesignArtifact;
  cacheKey: string;
}

export function cacheKeyForGeneratedLanguage(input: {
  seed: string;
  difficulty: Difficulty;
  model: string;
  promptVersion: string;
  compilerVersion: string;
}): string {
  const parts = [
    input.seed,
    input.difficulty,
    input.model,
    input.promptVersion,
    input.compilerVersion,
  ];

  if (parts.some((value) => value.includes("::"))) {
    throw new Error('Generated language cache key parts must not contain the reserved delimiter "::".');
  }

  return parts.join("::");
}
