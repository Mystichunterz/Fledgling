import { describe, expect, it } from "vitest";
import { encodeFrame } from "./encoder.js";
import { decodeText } from "./decoder.js";
import { randomLanguage } from "./random-language.js";
import type { FilledFrame } from "./frames.js";

const FRAMES: FilledFrame[] = [
  {
    predicate: "WANT",
    mood: "declarative",
    roles: {
      wanter: { type: "ANIMATE", conceptId: "SMITH" },
      desired: { type: "ITEM", conceptId: "FLINT" },
    },
  },
  {
    predicate: "GIVE",
    mood: "declarative",
    roles: {
      agent: { type: "ANIMATE", conceptId: "PLAYER" },
      recipient: { type: "ANIMATE", conceptId: "SMITH" },
      theme: { type: "ITEM", conceptId: "FLINT" },
    },
  },
  {
    predicate: "WANT",
    mood: "interrogative",
    roles: {
      wanter: { type: "ANIMATE", conceptId: "SMITH" },
      desired: "?",
    },
  },
  {
    predicate: "BE_AT",
    mood: "interrogative",
    roles: {
      figure: { type: "ITEM", conceptId: "FLINT" },
      ground: "?",
    },
  },
  {
    predicate: "TAKE",
    mood: "imperative",
    roles: {
      agent: { type: "ANIMATE", conceptId: "ADDRESSEE" },
      theme: { type: "ITEM", conceptId: "FLINT" },
    },
  },
  {
    predicate: "MOVE",
    mood: "declarative",
    roles: {
      agent: { type: "ANIMATE", conceptId: "ADDRESSEE" },
      destination: { type: "LOCATION", conceptId: "CAVE" },
    },
  },
];

describe("simple-difficulty round-trip", () => {
  it("simple-mode languages round-trip representative frames", () => {
    for (const seed of ["alpha", "beta", "gamma", "delta", "epsilon"]) {
      const L = randomLanguage(seed, "simple");
      expect(L.difficulty).toBe("simple");
      expect(L.particles).toBeDefined();
      // All inflectional affixes should be empty in simple mode.
      for (const c of ["NOM", "ACC", "DAT"] as const) {
        expect(L.morphology.case[c].form).toBe("");
      }
      for (const m of ["DECL", "Q", "IMP"] as const) {
        expect(L.morphology.mood[m].form).toBe("");
      }
      for (const frame of FRAMES) {
        const surface = encodeFrame(L, frame);
        const decoded = decodeText(L, surface);
        expect(decoded.predicate, `${seed}/${frame.predicate}`).toBe(
          frame.predicate,
        );
        expect(decoded.mood, `${seed}/${frame.predicate}/mood`).toBe(
          frame.mood,
        );
        for (const [k, expected] of Object.entries(frame.roles)) {
          const got = decoded.roles[k];
          if (expected === "?") {
            expect(got, `${seed}/${frame.predicate}/${k}`).toBe("?");
          } else if (typeof expected === "object" && "conceptId" in expected) {
            expect(got, `${seed}/${frame.predicate}/${k}`).toMatchObject({
              type: expected.type,
              conceptId: expected.conceptId,
            });
          }
        }
      }
    }
  });

  it("simple-mode emits a particle word on Q and IMP, not on DECL", () => {
    const L = randomLanguage("alpha", "simple");
    const decl = encodeFrame(L, FRAMES[0]!).split(/\s+/);
    const q = encodeFrame(L, FRAMES[2]!).split(/\s+/);
    const imp = encodeFrame(L, FRAMES[4]!).split(/\s+/);
    // Q and IMP each add one extra word.
    expect(q.length).toBe(decl.length + 1);
    expect(imp.length).toBe(decl.length + 1);
    // The added word matches the configured particle.
    const qParticle = L.particles!.Q;
    const impParticle = L.particles!.IMP;
    expect(qParticle.position === "initial" ? q[0] : q[q.length - 1]).toBe(
      qParticle.form,
    );
    expect(
      impParticle.position === "initial" ? imp[0] : imp[imp.length - 1],
    ).toBe(impParticle.form);
  });

  it("same seed produces identical languages across difficulties", () => {
    const a = randomLanguage("zeta", "simple");
    const b = randomLanguage("zeta", "simple");
    expect(b).toEqual(a);
  });

  it("simple and full produce different languages even with same seed", () => {
    const a = randomLanguage("eta", "simple");
    const b = randomLanguage("eta", "full");
    expect(a.difficulty).toBe("simple");
    expect(b.difficulty).toBe("full");
    expect(a.particles).toBeDefined();
    expect(b.particles).toBeUndefined();
  });
});
