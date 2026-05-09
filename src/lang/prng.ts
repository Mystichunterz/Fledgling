// Seeded PRNG with subsystem isolation.
//
// Each subsystem (phonology, lexicon, morphology, syntax) draws from its own
// stream so adding randomness to one of them doesn't shift outputs in the
// others. Streams are derived deterministically from the master seed by
// suffixing the subsystem name before hashing.

export type Rng = () => number;

// FNV-1a, 32-bit. Maps any string seed to a u32 starting state.
export function hashStringToU32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Mulberry32 — tiny, well-mixed PRNG. Reproducibility over crypto strength.
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: string | undefined): Rng {
  if (seed === undefined || seed === "") return Math.random;
  return mulberry32(hashStringToU32(seed));
}

export type SubsystemRngs = {
  phonology: Rng;
  lexicon: Rng;
  morphology: Rng;
  syntax: Rng;
};

// Derive four independent streams from one master seed. The salts make each
// stream's starting state independent, so changing one subsystem's RNG draws
// won't perturb the others' outputs.
export function makeSubsystemRngs(seed: string | undefined): SubsystemRngs {
  if (seed === undefined || seed === "") {
    return {
      phonology: Math.random,
      lexicon: Math.random,
      morphology: Math.random,
      syntax: Math.random,
    };
  }
  return {
    phonology: mulberry32(hashStringToU32(seed + ":phonology")),
    lexicon: mulberry32(hashStringToU32(seed + ":lexicon")),
    morphology: mulberry32(hashStringToU32(seed + ":morphology")),
    syntax: mulberry32(hashStringToU32(seed + ":syntax")),
  };
}

// Six lowercase alphanumerics. Used when the caller wants a fresh seed
// they can copy and share.
export function randomSeedString(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

export function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

// Frequency-weighted pick. Items with higher weights are picked more often.
// Falls back to uniform if all weights are zero.
export function weightedPick<T>(
  items: readonly { value: T; weight: number }[],
  rng: Rng,
): T {
  const total = items.reduce((s, it) => s + it.weight, 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)]!.value;
  let r = rng() * total;
  for (const it of items) {
    r -= it.weight;
    if (r < 0) return it.value;
  }
  return items[items.length - 1]!.value;
}
