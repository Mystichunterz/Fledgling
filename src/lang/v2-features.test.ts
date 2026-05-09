import { describe, expect, it } from "vitest";
import { FilledFrame } from "./frames.js";
import { encodeFrame } from "./encoder.js";
import { decodeText } from "./decoder.js";
import { EXAMPLE_LANGUAGE } from "./example-language.js";
import { randomLanguage } from "./random-language.js";
import { glossFrame } from "./gloss.js";
import { templatesFor, canonicalTemplate, rephraseTemplates } from "./templates.js";
import { generatePhonology, uniqueWords, passesPhonotactics } from "./phonology.js";
import { mulberry32 } from "./prng.js";

const L = EXAMPLE_LANGUAGE;

describe("v2: new frames", () => {
  it("encodes EAT", () => {
    // 'the smith eats the bread' — SOV, suffixing
    expect(
      encodeFrame(L, {
        predicate: "EAT",
        mood: "declarative",
        roles: {
          agent: { type: "ANIMATE", conceptId: "SMITH" },
          patient: { type: "ITEM", conceptId: "BREAD" },
        },
      }),
    ).toBe("tova guvin bisu");
  });

  it("encodes SEE with a location target", () => {
    expect(
      encodeFrame(L, {
        predicate: "SEE",
        mood: "declarative",
        roles: {
          viewer: "self",
          target: { type: "LOCATION", conceptId: "MEADOW" },
        },
      }),
    ).toBe("ne polman rena");
  });

  it("decodes EAT round-trip", () => {
    const frame: FilledFrame = {
      predicate: "EAT",
      mood: "declarative",
      roles: {
        agent: { type: "ANIMATE", conceptId: "SMITH" },
        patient: { type: "ITEM", conceptId: "BREAD" },
      },
    };
    expect(decodeText(L, encodeFrame(L, frame))).toEqual(frame);
  });

  it("encodes SAY with a nested EAT frame", () => {
    // 'the smith says to the player [the woodsman eats the bread]'
    const inner: FilledFrame = {
      predicate: "EAT",
      mood: "declarative",
      roles: {
        agent: { type: "ANIMATE", conceptId: "WOODSMAN" },
        patient: { type: "ITEM", conceptId: "BREAD" },
      },
    };
    const outer: FilledFrame = {
      predicate: "SAY",
      mood: "declarative",
      roles: {
        speaker: { type: "ANIMATE", conceptId: "SMITH" },
        recipient: "self",
        content: { kind: "frame", frame: inner },
      },
    };
    // The nested clause renders inline.
    const surface = encodeFrame(L, outer);
    expect(surface).toContain("loma");          // SAY verb
    expect(surface).toContain("bisu");          // inner EAT verb
    expect(surface).toContain("henu");          // WOODSMAN
    expect(surface).toContain("guvin");         // BREAD-ACC
  });
});

describe("v2: number & tense", () => {
  it("marks plural subjects with -si", () => {
    const frame: FilledFrame = {
      predicate: "WANT",
      mood: "declarative",
      roles: {
        wanter: { type: "ANIMATE", conceptId: "SMITH", number: "pl" },
        desired: { type: "ITEM", conceptId: "FLINT" },
      },
    };
    // tova-si pira-n selu — plural subject, accusative object, bare verb.
    expect(encodeFrame(L, frame)).toBe("tovasi piran selu");
  });

  it("round-trips plural subjects", () => {
    const frame: FilledFrame = {
      predicate: "WANT",
      mood: "declarative",
      roles: {
        wanter: { type: "ANIMATE", conceptId: "SMITH", number: "pl" },
        desired: { type: "ITEM", conceptId: "FLINT" },
      },
    };
    expect(decodeText(L, encodeFrame(L, frame))).toEqual(frame);
  });

  it("marks past tense on the verb with -to", () => {
    const frame: FilledFrame = {
      predicate: "EAT",
      mood: "declarative",
      tense: "past",
      roles: {
        agent: { type: "ANIMATE", conceptId: "WOODSMAN" },
        patient: { type: "ITEM", conceptId: "BREAD" },
      },
    };
    expect(encodeFrame(L, frame)).toBe("henu guvin bisuto");
  });

  it("marks future tense on the verb with -fu", () => {
    const frame: FilledFrame = {
      predicate: "EAT",
      mood: "declarative",
      tense: "future",
      roles: {
        agent: { type: "ANIMATE", conceptId: "WOODSMAN" },
        patient: { type: "ITEM", conceptId: "BREAD" },
      },
    };
    expect(encodeFrame(L, frame)).toBe("henu guvin bisufu");
  });

  it("round-trips a past-tense plural", () => {
    const frame: FilledFrame = {
      predicate: "EAT",
      mood: "declarative",
      tense: "past",
      roles: {
        agent: { type: "ANIMATE", conceptId: "WOODSMAN", number: "pl" },
        patient: { type: "ITEM", conceptId: "BREAD" },
      },
    };
    expect(decodeText(L, encodeFrame(L, frame))).toEqual(frame);
  });
});

describe("v2: agreement", () => {
  it("verb takes a number marker matching subject when agreement is on", () => {
    // tovari has agreement off; flip it on for this test.
    const Lagree = {
      ...L,
      syntax: { ...L.syntax, agreement: { subjectVerbNumber: true } },
    };
    const frame: FilledFrame = {
      predicate: "EAT",
      mood: "declarative",
      roles: {
        agent: { type: "ANIMATE", conceptId: "SMITH", number: "pl" },
        patient: { type: "ITEM", conceptId: "BREAD" },
      },
    };
    // tova-si guvi-n bisu-si — verb shows -si because subject is pl.
    expect(encodeFrame(Lagree, frame)).toBe("tovasi guvin bisusi");
  });

  it("decoder rejects an agreement violation", () => {
    const Lagree = {
      ...L,
      syntax: { ...L.syntax, agreement: { subjectVerbNumber: true } },
    };
    // sg subject + pl verb marker: not well-formed.
    expect(() => decodeText(Lagree, "tova guvin bisusi")).toThrow();
  });

  it("agreement round-trips both numbers", () => {
    const Lagree = {
      ...L,
      syntax: { ...L.syntax, agreement: { subjectVerbNumber: true } },
    };
    for (const n of ["sg", "pl"] as const) {
      const frame: FilledFrame = {
        predicate: "EAT",
        mood: "declarative",
        roles: {
          agent: n === "pl"
            ? { type: "ANIMATE", conceptId: "SMITH", number: "pl" }
            : { type: "ANIMATE", conceptId: "SMITH" },
          patient: { type: "ITEM", conceptId: "BREAD" },
        },
      };
      expect(decodeText(Lagree, encodeFrame(Lagree, frame))).toEqual(frame);
    }
  });
});

describe("v2: templates & rephrase", () => {
  it("each frame has at least 2 templates", () => {
    for (const id of [
      "GIVE", "TAKE", "MOVE", "WANT", "BE_AT", "HAVE",
      "SEE", "SAY", "MAKE", "EAT",
    ]) {
      expect(templatesFor(id).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("canonical template is the first one", () => {
    expect(canonicalTemplate("GIVE").id).toBe("GIVE_active");
  });

  it("rephraseTemplates returns alternatives, not the canonical", () => {
    const alts = rephraseTemplates(L, {
      predicate: "GIVE",
      mood: "declarative",
      roles: {
        agent: "self",
        recipient: { type: "ANIMATE", conceptId: "SMITH" },
        theme: { type: "ITEM", conceptId: "FLINT" },
      },
    });
    expect(alts.length).toBeGreaterThan(0);
    expect(alts.every((a) => a.templateId !== "GIVE_active")).toBe(true);
  });
});

describe("v2: phonology", () => {
  it("generates a phonology with at least 3 consonants and 2 vowels", () => {
    const rng = mulberry32(42);
    const p = generatePhonology(rng);
    expect(p.consonants.length).toBeGreaterThanOrEqual(3);
    expect(p.vowels.length).toBeGreaterThanOrEqual(2);
  });

  it("uniqueWords produces distinct phonotactic-clean words", () => {
    const rng = mulberry32(1234);
    const p = generatePhonology(rng);
    const words = uniqueWords(rng, p, 10, 2);
    expect(new Set(words).size).toBe(10);
    for (const w of words) expect(passesPhonotactics(p, w)).toBe(true);
  });

  it("seeded random language is deterministic across subsystem changes", () => {
    const a = randomLanguage("alpha");
    const b = randomLanguage("alpha");
    expect(a.lexicon).toEqual(b.lexicon);
    expect(a.morphology).toEqual(b.morphology);
    expect(a.syntax).toEqual(b.syntax);
  });
});

describe("v2: gloss tags", () => {
  it("tags PL on plural nouns and PAST on past verbs", () => {
    const frame: FilledFrame = {
      predicate: "EAT",
      mood: "declarative",
      tense: "past",
      roles: {
        agent: { type: "ANIMATE", conceptId: "SMITH", number: "pl" },
        patient: { type: "ITEM", conceptId: "BREAD" },
      },
    };
    const g = glossFrame(L, frame);
    const allTags = g.words.flatMap((w) => w.tags);
    expect(allTags).toContain("PL");
    expect(allTags).toContain("PAST");
    expect(allTags).toContain("ACC");
  });
});
