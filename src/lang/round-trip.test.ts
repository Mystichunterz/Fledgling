import { describe, expect, it } from "vitest";
import { FRAMES, FilledFrame, RoleFiller, isEntityRef, isPronoun } from "./frames.js";
import { encodeFrame } from "./encoder.js";
import { ParseError, decodeText } from "./decoder.js";
import { EXAMPLE_LANGUAGE } from "./example-language.js";
import { randomLanguage } from "./random-language.js";

const L = EXAMPLE_LANGUAGE;

// Concepts grouped by semantic type for the example language. Deictic
// pronouns ("self"/"listener"/"reference") and the wh "unknown" filler are
// not concept IDs — they're enumerated separately in the frame generator.
const BY_TYPE = {
  ANIMATE: ["SMITH", "WOODSMAN"],
  ITEM: ["FLINT", "STICK", "LIGHTER"],
  LOCATION: ["FOREST", "CAVE", "FORGE"],
} as const;

describe("encoder spot checks (SOV, suffixing, nom-acc)", () => {
  it("encodes a simple declarative WANT", () => {
    // 'the smith wants the flint'
    const frame: FilledFrame = {
      predicate: "WANT",
      mood: "declarative",
      roles: {
        wanter: { type: "ANIMATE", conceptId: "SMITH" },
        desired: { type: "ITEM", conceptId: "FLINT" },
      },
    };
    expect(encodeFrame(L, frame)).toBe("tova piran selu");
  });

  it("encodes a question with object unknown filler", () => {
    // 'what does the smith want?' — "unknown" filler implies the question;
    // mood stays declarative.
    const frame: FilledFrame = {
      predicate: "WANT",
      mood: "declarative",
      roles: {
        wanter: { type: "ANIMATE", conceptId: "SMITH" },
        desired: "unknown",
      },
    };
    expect(encodeFrame(L, frame)).toBe("tova man seluli");
  });

  it("encodes a 3-argument GIVE", () => {
    // 'I give the flint to the smith'
    // SOV + post-verb obliques: ne piran miro tovara
    const frame: FilledFrame = {
      predicate: "GIVE",
      mood: "declarative",
      roles: {
        agent: "self",
        recipient: { type: "ANIMATE", conceptId: "SMITH" },
        theme: { type: "ITEM", conceptId: "FLINT" },
      },
    };
    expect(encodeFrame(L, frame)).toBe("ne piran miro tovara");
  });

  it("encodes a where-question over an item", () => {
    // 'where is the flint?'
    const frame: FilledFrame = {
      predicate: "BE_AT",
      mood: "declarative",
      roles: {
        figure: { type: "ITEM", conceptId: "FLINT" },
        ground: "unknown",
      },
    };
    expect(encodeFrame(L, frame)).toBe("pira nokili vora");
  });

  it("encodes an imperative TAKE", () => {
    // 'take the flint!' — addressed to the listener
    const frame: FilledFrame = {
      predicate: "TAKE",
      mood: "imperative",
      roles: {
        agent: "listener",
        theme: { type: "ITEM", conceptId: "FLINT" },
      },
    };
    expect(encodeFrame(L, frame)).toBe("ti piran taneka");
  });

  it("rejects imperative on a state frame", () => {
    const frame: FilledFrame = {
      predicate: "WANT",
      mood: "imperative",
      roles: {
        wanter: "listener",
        desired: { type: "ITEM", conceptId: "FLINT" },
      },
    };
    expect(() => encodeFrame(L, frame)).toThrow(/Imperative/);
  });

  it("encodes MOVE (no object, oblique destination)", () => {
    // 'you go to the cave'
    const frame: FilledFrame = {
      predicate: "MOVE",
      mood: "declarative",
      roles: {
        agent: "listener",
        destination: { type: "LOCATION", conceptId: "CAVE" },
      },
    };
    expect(encodeFrame(L, frame)).toBe("ti kupa shimora");
  });
});

describe("decoder spot checks", () => {
  it("decodes a declarative WANT", () => {
    expect(decodeText(L, "tova piran selu")).toEqual({
      predicate: "WANT",
      mood: "declarative",
      roles: {
        wanter: { type: "ANIMATE", conceptId: "SMITH" },
        desired: { type: "ITEM", conceptId: "FLINT" },
      },
    });
  });

  it("decodes an object-unknown question", () => {
    expect(decodeText(L, "tova man seluli")).toEqual({
      predicate: "WANT",
      mood: "declarative",
      roles: {
        wanter: { type: "ANIMATE", conceptId: "SMITH" },
        desired: "unknown",
      },
    });
  });

  it("decodes an imperative TAKE", () => {
    expect(decodeText(L, "ti piran taneka")).toEqual({
      predicate: "TAKE",
      mood: "imperative",
      roles: {
        agent: "listener",
        theme: { type: "ITEM", conceptId: "FLINT" },
      },
    });
  });

  it("rejects unknown words", () => {
    expect(() => decodeText(L, "xyzzy piran selu")).toThrow(ParseError);
  });

  it("rejects sentences with no verb", () => {
    expect(() => decodeText(L, "tova piran")).toThrow(ParseError);
  });

  it("rejects type-incompatible fillers", () => {
    // 'forest-ACC want' would require desired to be a LOCATION; theme is ITEM-only.
    expect(() => decodeText(L, "tova luvan selu")).toThrow(ParseError);
  });

  it("is case-insensitive and tolerates trailing punctuation", () => {
    expect(decodeText(L, "Tova piran selu.")).toEqual({
      predicate: "WANT",
      mood: "declarative",
      roles: {
        wanter: { type: "ANIMATE", conceptId: "SMITH" },
        desired: { type: "ITEM", conceptId: "FLINT" },
      },
    });
  });
});

// Generate every well-formed FilledFrame for the example language's lexicon
// and assert decode(encode(F)) === F. This is the load-bearing correctness
// invariant for the translator. Variants:
//   - declarative + concrete fillers
//   - imperative + concrete fillers (action frames only)
//   - declarative + one "unknown" filler (wh-question)
//   - declarative + a deictic pronoun in an animate-accepting role
function* enumerateFilledFrames(): Generator<FilledFrame> {
  for (const frame of Object.values(FRAMES)) {
    const fillerOptions: RoleFiller[][] = frame.roles.map((role) => {
      const concrete: RoleFiller[] = [];
      for (const t of role.types) {
        // BY_TYPE only covers the original 3 referent types; new ones
        // (ABSTRACT, EVENT) aren't directly enumerable here.
        if (t !== "ANIMATE" && t !== "ITEM" && t !== "LOCATION") continue;
        for (const id of BY_TYPE[t]) {
          concrete.push({ type: t, conceptId: id });
        }
      }
      return concrete;
    });

    // Cartesian product of concrete fillers (declarative variants).
    for (const combo of cartesian(fillerOptions)) {
      const roles: Record<string, RoleFiller> = {};
      frame.roles.forEach((r, i) => (roles[r.name] = combo[i]!));
      yield { predicate: frame.id, mood: "declarative", roles };
    }

    // Imperative variants share the unknown-free shape of declaratives,
    // but only action frames support imperative semantics.
    if (frame.category === "action") {
      for (const combo of cartesian(fillerOptions)) {
        const roles: Record<string, RoleFiller> = {};
        frame.roles.forEach((r, i) => (roles[r.name] = combo[i]!));
        yield { predicate: frame.id, mood: "imperative", roles };
      }
    }

    // Wh-question variants: one role takes "unknown", others stay concrete.
    // Mood remains declarative; question-ness rides on the unknown filler.
    for (let unkIdx = 0; unkIdx < frame.roles.length; unkIdx++) {
      const otherOptions = fillerOptions.map((opts, i) =>
        i === unkIdx ? ([] as RoleFiller[]) : opts,
      );
      for (const combo of cartesian(otherOptions)) {
        const roles: Record<string, RoleFiller> = {};
        frame.roles.forEach((r, i) => {
          roles[r.name] = i === unkIdx ? "unknown" : combo[i]!;
        });
        yield { predicate: frame.id, mood: "declarative", roles };
      }
    }

    // Deictic-pronoun variants: each animate-accepting role tries each of
    // self/listener/reference (the others stay at the first concrete option).
    const animateRoleIdxs: number[] = [];
    frame.roles.forEach((r, i) => {
      if (r.types.includes("ANIMATE")) animateRoleIdxs.push(i);
    });
    for (const idx of animateRoleIdxs) {
      for (const person of ["self", "listener", "reference"] as const) {
        // Need a default for every other role — pick the first concrete.
        const baseRoles: Record<string, RoleFiller> = {};
        let canBuild = true;
        frame.roles.forEach((r, i) => {
          if (i === idx) {
            baseRoles[r.name] = person;
            return;
          }
          const first = fillerOptions[i]?.[0];
          if (!first) {
            canBuild = false;
            return;
          }
          baseRoles[r.name] = first;
        });
        if (!canBuild) continue;
        yield { predicate: frame.id, mood: "declarative", roles: baseRoles };
      }
    }
  }
}

function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  const [head, ...tail] = arrays;
  const tailProduct = cartesian(tail);
  const result: T[][] = [];
  for (const h of head!) {
    for (const t of tailProduct) result.push([h, ...t]);
  }
  return result;
}

describe("round-trip property", () => {
  const allFrames = [...enumerateFilledFrames()];

  it("enumerates a non-trivial number of frames", () => {
    expect(allFrames.length).toBeGreaterThan(100);
  });

  it("decode(encode(F)) === F for every valid filled frame", () => {
    const failures: { frame: FilledFrame; surface: string; got: unknown }[] =
      [];
    for (const frame of allFrames) {
      const surface = encodeFrame(L, frame);
      let got: FilledFrame;
      try {
        got = decodeText(L, surface);
      } catch (e) {
        failures.push({ frame, surface, got: String(e) });
        continue;
      }
      if (!framesEqual(got, frame)) {
        failures.push({ frame, surface, got });
      }
    }
    if (failures.length > 0) {
      const sample = failures
        .slice(0, 3)
        .map(
          (f) =>
            `\n  frame=${JSON.stringify(f.frame)}\n  surface="${f.surface}"\n  decoded=${JSON.stringify(f.got)}`,
        )
        .join("\n");
      throw new Error(
        `${failures.length}/${allFrames.length} round-trips failed.${sample}`,
      );
    }
  });
});

describe("randomLanguage round-trip", () => {
  it("every sampled random language round-trips the full frame space", () => {
    const samples = 12;
    const allFrames = [...enumerateFilledFrames()];
    for (let s = 0; s < samples; s++) {
      const Lr = randomLanguage();
      for (const frame of allFrames) {
        const surface = encodeFrame(Lr, frame);
        const decoded = decodeText(Lr, surface);
        if (!framesEqual(decoded, frame)) {
          throw new Error(
            `random language ${Lr.id} failed:\n  frame=${JSON.stringify(frame)}\n  surface="${surface}"\n  decoded=${JSON.stringify(decoded)}`,
          );
        }
      }
    }
  });

  it("same seed produces identical languages", () => {
    const seeds = ["alpha", "tovari-2", "🌱", "x", "lorem ipsum dolor"];
    for (const seed of seeds) {
      const a = randomLanguage(seed);
      const b = randomLanguage(seed);
      expect(b).toEqual(a);
    }
  });

  it("different seeds produce different languages", () => {
    const a = randomLanguage("alpha");
    const b = randomLanguage("beta");
    expect(b).not.toEqual(a);
  });

  it("seeded languages still round-trip the full frame space", () => {
    const allFrames = [...enumerateFilledFrames()];
    for (const seed of ["alpha", "beta", "gamma", "delta", "epsilon"]) {
      const Lr = randomLanguage(seed);
      for (const frame of allFrames) {
        const surface = encodeFrame(Lr, frame);
        const decoded = decodeText(Lr, surface);
        if (!framesEqual(decoded, frame)) {
          throw new Error(
            `seed "${seed}" (${Lr.id}) failed:\n  frame=${JSON.stringify(frame)}\n  surface="${surface}"`,
          );
        }
      }
    }
  });
});

function framesEqual(a: FilledFrame, b: FilledFrame): boolean {
  if (a.predicate !== b.predicate) return false;
  if (a.mood !== b.mood) return false;
  const aKeys = Object.keys(a.roles).sort();
  const bKeys = Object.keys(b.roles).sort();
  if (aKeys.join(",") !== bKeys.join(",")) return false;
  for (const k of aKeys) {
    const av = a.roles[k];
    const bv = b.roles[k];
    if (av === undefined || bv === undefined) return false;
    if (isPronoun(av) || isPronoun(bv)) {
      if (av !== bv) return false;
    } else if (isEntityRef(av) && isEntityRef(bv)) {
      if (av.type !== bv.type || av.conceptId !== bv.conceptId) return false;
    } else {
      return false;
    }
  }
  return true;
}
