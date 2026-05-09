import { describe, expect, it } from "vitest";
import {
  cacheKeyForGeneratedLanguage,
  LanguageDesignArtifact,
} from "./generated-language-types.js";

describe("LanguageDesignArtifact", () => {
  const validArtifact = {
    version: 1,
    phonologicalFlavor: "liquid-heavy open syllables",
    lexicalStyle: "short stems with repeated vowels",
    namingStyle: "two-syllable personal names",
    morphologicalProfile: "suffixing light agglutinative",
    irregularityBudget: 1,
    preferredSyllableShapes: ["CV", "CVC"],
    markedPhonemes: ["l", "r", "o"],
    pronounFlavor: "short deictics",
    compoundingTendency: "medium",
    affixProfile: { position: "suffix", density: "light" },
    particleStyle: "sentence-final",
    tabooRepeats: ["aaa"],
    questConceptPriorities: ["HALA", "LIGHTHOUSE", "BOAT"],
  } as const;

  it("accepts a fully-specified artifact", () => {
    const parsed = LanguageDesignArtifact.parse(validArtifact);

    expect(parsed.version).toBe(1);
  });

  it("rejects artifacts missing uniqueness levers", () => {
    expect(() => LanguageDesignArtifact.parse({ version: 1 })).toThrow(
      /phonologicalFlavor/i,
    );
  });

  it("rejects invalid affix profile values", () => {
    expect(() =>
      LanguageDesignArtifact.parse({
        ...validArtifact,
        affixProfile: { position: "infix", density: "light" },
      }),
    ).toThrow(/position/i);
  });

  it("rejects empty strings in constrained arrays", () => {
    expect(() =>
      LanguageDesignArtifact.parse({
        ...validArtifact,
        preferredSyllableShapes: [""],
      }),
    ).toThrow();
    expect(() =>
      LanguageDesignArtifact.parse({
        ...validArtifact,
        markedPhonemes: [""],
      }),
    ).toThrow();
    expect(() =>
      LanguageDesignArtifact.parse({
        ...validArtifact,
        tabooRepeats: [""],
      }),
    ).toThrow();
    expect(() =>
      LanguageDesignArtifact.parse({
        ...validArtifact,
        questConceptPriorities: [""],
      }),
    ).toThrow();
  });
});

describe("cacheKeyForGeneratedLanguage", () => {
  it("includes seed difficulty model prompt and compiler version", () => {
    expect(
      cacheKeyForGeneratedLanguage({
        seed: "alpha",
        difficulty: "simple",
        model: "gpt-4.1-mini",
        promptVersion: "v1",
        compilerVersion: "v1",
      }),
    ).toBe("alpha::simple::gpt-4.1-mini::v1::v1");
  });

  it("preserves raw values when joining cache key parts", () => {
    expect(
      cacheKeyForGeneratedLanguage({
        seed: "alpha beta",
        difficulty: "simple",
        model: "gpt/4.1-mini",
        promptVersion: "v1 prompt",
        compilerVersion: "v1/compiler",
      }),
    ).toBe("alpha beta::simple::gpt/4.1-mini::v1 prompt::v1/compiler");
  });

  it("rejects reserved delimiters inside values to avoid collisions", () => {
    expect(() =>
      cacheKeyForGeneratedLanguage({
        seed: "alpha::beta",
        difficulty: "simple",
        model: "gpt-4.1-mini",
        promptVersion: "v1",
        compilerVersion: "v1",
      }),
    ).toThrow(/reserved delimiter/i);
  });
});
