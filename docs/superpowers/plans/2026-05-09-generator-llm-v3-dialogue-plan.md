# Generator LLM + V3 Dialogue Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a server-mediated OpenAI language generator that compiles validated artifacts into executable `LanguageSpec` values, then integrate the active generated language into the current v3 dialogue/quest runtime without breaking quest flags, handovers, endings, or fallback behavior.

**Architecture:** Keep the current procedural generator as a fallback and add a parallel async generation path: `OpenAI -> LanguageDesignArtifact -> local compiler -> validated LanguageSpec + metadata`. For dialogue, keep the v3 authored trees as the source of truth, add canonical frame/effect payloads to covered nodes, and render generated conlang through a bridge while preserving English fallback and explicit gameplay effects.

**Tech Stack:** TypeScript, Vite middleware, React, Phaser overlays, zod, vitest, native `fetch` to OpenAI, existing `encodeFrame` / `decodeText` runtime.

---

## File Structure

- Create: `src/lang/generated-language-types.ts`
  - `LanguageDesignArtifact` zod schema
  - generation metadata types
  - cache key helpers
- Create: `src/lang/generated-language-compiler.ts`
  - artifact -> `LanguageSpec` compiler
  - bounded repair helpers
  - uniqueness heuristics
- Create: `src/lang/generated-language.ts`
  - async entry point
  - cache reuse
  - OpenAI request + retry loop
  - documented fallback when `OPENAI_KEY` is missing
- Create: `src/lang/generated-language.test.ts`
  - schema validation
  - compiler accept/reject
  - cache reuse
  - round-trip compatibility
- Modify: `src/lang/random-language.ts`
  - share concept inventory / probe fixtures where practical
- Modify: `src/lang/example-language.ts`
  - expand concept inventory for quest/dialogue coverage
- Modify: `src/lang/custom-languages.ts`
  - keep hand-authored languages executable under the expanded inventory
- Modify: `src/lang/frames.ts`
  - add any missing frame support for greeting, affirmation/denial, and leave/stay semantics
- Modify: `vite.config.ts`
  - add `/api/generate-language`
- Modify: `src/ui/App.tsx`
  - async generation
  - loading/error states
  - metadata surface
- Create: `src/lang/dialogue-language.ts`
  - frame-backed dialogue renderer and explicit effect resolver
- Create: `src/lang/dialogue-language.test.ts`
  - covered node resolution/render tests
- Modify: `src/sim/dialogueTypes.ts`
  - add canonical dialogue payloads and explicit effects
- Modify: `src/sim/dialogueTrees.ts`
  - annotate quest-critical nodes and choices with canonical frame/effect data
- Modify: `src/ui/DialogueOverlay.ts`
  - render through the bridge using one active language per session
- Modify: `src/state/handovers.ts`
  - stop parsing node ids; consume canonical effects instead
- Modify: `src/ui/EndScreen.ts`
  - trigger endings from canonical effects instead of node ids only
- Modify: `src/sim/diary.ts`
  - preserve current diary behavior via stable source text while generated rendering rolls out

---

### Task 1: Define Artifact Schema And Metadata

**Files:**
- Create: `src/lang/generated-language-types.ts`
- Test: `src/lang/generated-language.test.ts`

- [ ] **Step 1: Write the failing schema tests**

```ts
import { describe, expect, it } from "vitest";
import {
  LanguageDesignArtifact,
  cacheKeyForGeneratedLanguage,
} from "./generated-language-types.js";

describe("LanguageDesignArtifact", () => {
  it("accepts a fully-specified artifact", () => {
    const parsed = LanguageDesignArtifact.parse({
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
    });
    expect(parsed.version).toBe(1);
  });

  it("rejects artifacts missing uniqueness levers", () => {
    expect(() => LanguageDesignArtifact.parse({ version: 1 })).toThrow(/phonologicalFlavor/i);
  });
});

describe("cacheKeyForGeneratedLanguage", () => {
  it("includes seed difficulty model prompt and compiler version", () => {
    expect(cacheKeyForGeneratedLanguage({
      seed: "alpha",
      difficulty: "simple",
      model: "gpt-4.1-mini",
      promptVersion: "v1",
      compilerVersion: "v1",
    })).toBe("alpha::simple::gpt-4.1-mini::v1::v1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lang/generated-language.test.ts`
Expected: FAIL with module not found for `generated-language-types.ts`.

- [ ] **Step 3: Write minimal schema and metadata types**

```ts
import { z } from "zod";
import { Difficulty } from "./language-spec.js";

export const LanguageDesignArtifact = z.object({
  version: z.literal(1),
  phonologicalFlavor: z.string().min(1),
  lexicalStyle: z.string().min(1),
  namingStyle: z.string().min(1),
  morphologicalProfile: z.string().min(1),
  irregularityBudget: z.number().int().min(0).max(3),
  preferredSyllableShapes: z.array(z.string()).min(1),
  markedPhonemes: z.array(z.string()).min(1),
  pronounFlavor: z.string().min(1),
  compoundingTendency: z.enum(["low", "medium", "high"]),
  affixProfile: z.object({
    position: z.enum(["prefix", "suffix"]),
    density: z.enum(["light", "medium", "heavy"]),
  }),
  particleStyle: z.string().min(1),
  tabooRepeats: z.array(z.string()),
  questConceptPriorities: z.array(z.string()).min(1),
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
  return [input.seed, input.difficulty, input.model, input.promptVersion, input.compilerVersion].join("::");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lang/generated-language.test.ts`
Expected: PASS for schema tests.

- [ ] **Step 5: Commit**

```bash
git add src/lang/generated-language-types.ts src/lang/generated-language.test.ts
git commit -m "feat: add generated language artifact schema"
```

### Task 2: Build Compiler, Validation, And Uniqueness Guards

**Files:**
- Create: `src/lang/generated-language-compiler.ts`
- Modify: `src/lang/random-language.ts`
- Test: `src/lang/generated-language.test.ts`

- [ ] **Step 1: Write failing compiler tests**

```ts
import { compileGeneratedLanguageArtifact } from "./generated-language-compiler.js";

it("compiles a valid artifact into a runtime-valid LanguageSpec", () => {
  const { spec } = compileGeneratedLanguageArtifact(validArtifact, {
    seed: "alpha",
    difficulty: "full",
    compilerVersion: "v1",
  });
  expect(spec.lexicon.HALA?.semanticType).toBe("ANIMATE");
  expect(spec.lexicon.LIGHTHOUSE?.semanticType).toBe("LOCATION");
});

it("rejects low-variety artifacts after bounded repair", () => {
  expect(() => compileGeneratedLanguageArtifact(repetitiveArtifact, {
    seed: "beta",
    difficulty: "simple",
    compilerVersion: "v1",
  })).toThrow(/low-variety|uniqueness/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lang/generated-language.test.ts`
Expected: FAIL with module not found for `generated-language-compiler.ts`.

- [ ] **Step 3: Write minimal compiler and validator**

```ts
import { LanguageSpec } from "./language-spec.js";
import { randomLanguage } from "./random-language.js";
import { encodeFrame } from "./encoder.js";
import { decodeText } from "./decoder.js";
import type { FilledFrame } from "./frames.js";
import type { Difficulty } from "./language-spec.js";
import type { LanguageDesignArtifact } from "./generated-language-types.js";

const REQUIRED_CONCEPTS = [
  "HALA", "NARO", "LEMU", "TOKA", "SENU", "PEMI",
  "LIGHTHOUSE", "BOAT", "SEA", "HUT", "WELL", "SHRINE",
  "BASKET", "ROPE", "FRUIT", "WATER", "WOOD", "OIL", "FLINT",
  "GO_HOME", "STAY_HERE", "GOOD", "NOT_YET",
] as const;

const PROBES: FilledFrame[] = [
  { predicate: "BE_AT", mood: "declarative", roles: { figure: { type: "LOCATION", conceptId: "LIGHTHOUSE" }, ground: { type: "LOCATION", conceptId: "SEA" } } },
  { predicate: "WANT", mood: "declarative", roles: { wanter: { type: "ANIMATE", conceptId: "HALA" }, desired: { type: "ITEM", conceptId: "WOOD" } } },
];

export function compileGeneratedLanguageArtifact(
  artifact: LanguageDesignArtifact,
  input: { seed: string; difficulty: Difficulty; compilerVersion: string },
) {
  const base = randomLanguage(input.seed, input.difficulty);
  const spec = structuredClone(base);
  for (const concept of REQUIRED_CONCEPTS) {
    spec.lexicon[concept] ??= deriveQuestLexeme(concept, spec, artifact);
  }
  LanguageSpec.parse(spec);
  assertVariety(spec);
  assertRoundTrip(spec, PROBES);
  return { spec, repairCount: 0, compilerVersion: input.compilerVersion };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lang/generated-language.test.ts`
Expected: PASS for compiler acceptance/rejection tests.

- [ ] **Step 5: Commit**

```bash
git add src/lang/generated-language-compiler.ts src/lang/generated-language.test.ts src/lang/random-language.ts
git commit -m "feat: compile generated language artifacts locally"
```

### Task 3: Add Async OpenAI Generation, Retry, And Cache Reuse

**Files:**
- Create: `src/lang/generated-language.ts`
- Modify: `vite.config.ts`
- Test: `src/lang/generated-language.test.ts`

- [ ] **Step 1: Write failing cache and fallback tests**

```ts
import { generateLanguageFromSeed } from "./generated-language.js";

it("reuses the accepted artifact for identical generation tuples", async () => {
  const first = await generateLanguageFromSeed("gamma", "simple", { apiKey: "test", provider: fakeProvider });
  const second = await generateLanguageFromSeed("gamma", "simple", { apiKey: "test", provider: fakeProvider });
  expect(fakeProvider.calls).toHaveLength(1);
  expect(second.metadata.cacheKey).toBe(first.metadata.cacheKey);
});

it("falls back clearly when OPENAI_KEY is missing", async () => {
  const result = await generateLanguageFromSeed("delta", "full", { fallbackToProcedural: true });
  expect(result.metadata.model).toBe("procedural-fallback");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lang/generated-language.test.ts`
Expected: FAIL with module not found for `generated-language.ts`.

- [ ] **Step 3: Write minimal async entry point and Vite route**

```ts
export async function generateLanguageFromSeed(
  seed: string,
  difficulty: Difficulty,
  opts: {
    apiKey?: string;
    model?: string;
    provider?: (prompt: string) => Promise<unknown>;
    fallbackToProcedural?: boolean;
  } = {},
) {
  const apiKey = opts.apiKey ?? process.env.OPENAI_KEY;
  if (!apiKey && opts.fallbackToProcedural) {
    const spec = randomLanguage(seed, difficulty);
    return {
      spec,
      metadata: {
        seed,
        difficulty,
        model: "procedural-fallback",
        promptVersion: "fallback",
        compilerVersion: "v1",
        artifact: proceduralArtifactStub(spec),
        cacheKey: `${seed}::${difficulty}::procedural-fallback::fallback::v1`,
      },
    };
  }
  if (!apiKey) throw new Error("OPENAI_KEY missing — set it in env or enable fallback");
  // fetch artifact, validate, compile, cache, return
}
```

```ts
server.middlewares.use("/api/generate-language", async (req, res) => {
  const body = await readJsonBody(req) as { seed?: string; difficulty?: "simple" | "full" };
  const result = await generateLanguageFromSeed(body.seed ?? "", body.difficulty ?? "full", {
    apiKey: env.OPENAI_KEY ?? process.env.OPENAI_KEY,
    fallbackToProcedural: true,
  });
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(result));
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lang/generated-language.test.ts`
Expected: PASS for cache reuse and fallback tests.

- [ ] **Step 5: Commit**

```bash
git add src/lang/generated-language.ts src/lang/generated-language.test.ts vite.config.ts
git commit -m "feat: add async generated language API"
```

### Task 4: Surface Generated Languages In The Workbench

**Files:**
- Modify: `src/ui/App.tsx`
- Test: `src/lang/generated-language.test.ts`

- [ ] **Step 1: Write the failing UI behavior test or narrow smoke assertion**

```ts
it("returns metadata alongside generated languages", async () => {
  const result = await generateLanguageFromSeed("ui-seed", "simple", { provider: fakeProvider, apiKey: "test" });
  expect(result.metadata.promptVersion).toBe("v1");
  expect(result.metadata.artifact.namingStyle).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails for missing metadata shape**

Run: `npm test -- src/lang/generated-language.test.ts`
Expected: FAIL on missing metadata fields.

- [ ] **Step 3: Make `App.tsx` async and show metadata**

```tsx
const [loadingLanguage, setLoadingLanguage] = useState(false);
const [languageError, setLanguageError] = useState<string | null>(null);
const [generatedMeta, setGeneratedMeta] = useState<GeneratedLanguageMetadata | null>(null);

const regenerate = async () => {
  const trimmed = seed.trim();
  const used = trimmed === "" ? randomSeedString() : trimmed;
  setLoadingLanguage(true);
  setLanguageError(null);
  try {
    const res = await fetch("/api/generate-language", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seed: used, difficulty }),
    });
    const payload = await res.json();
    if (!res.ok || payload.error) throw new Error(payload.error ?? `HTTP ${res.status}`);
    installLanguage(payload.spec);
    setGeneratedMeta(payload.metadata);
    setSeed(used);
  } catch (err) {
    setLanguageError(err instanceof Error ? err.message : String(err));
  } finally {
    setLoadingLanguage(false);
  }
};
```

- [ ] **Step 4: Run targeted verification**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/App.tsx
git commit -m "feat: surface generated language metadata in workbench"
```

### Task 5: Expand Frame And Concept Coverage For Quest-Critical Dialogue

**Files:**
- Modify: `src/lang/frames.ts`
- Modify: `src/lang/example-language.ts`
- Modify: `src/lang/custom-languages.ts`
- Test: `src/lang/v2-features.test.ts`

- [ ] **Step 1: Write failing coverage tests**

```ts
it("supports quest-critical social and decision frames", () => {
  expect(FRAMES.GREET?.id).toBe("GREET");
  expect(FRAMES.DECIDE_STAY?.id).toBe("DECIDE_STAY");
});

it("ships quest-critical concepts in the example language", () => {
  expect(EXAMPLE_LANGUAGE.lexicon.HALA?.semanticType).toBe("ANIMATE");
  expect(EXAMPLE_LANGUAGE.lexicon.LIGHTHOUSE?.semanticType).toBe("LOCATION");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lang/v2-features.test.ts`
Expected: FAIL on missing frames/concepts.

- [ ] **Step 3: Add the minimal new inventory**

```ts
export const FRAMES: Record<string, FrameSpec> = {
  ...existingFrames,
  GREET: {
    id: "GREET",
    category: "action",
    roles: [
      { name: "speaker", types: ["ANIMATE"], grammar: "subject" },
      { name: "addressee", types: ["ANIMATE"], grammar: "oblique" },
    ],
  },
  DECIDE_STAY: {
    id: "DECIDE_STAY",
    category: "state",
    roles: [
      { name: "decider", types: ["ANIMATE"], grammar: "subject" },
      { name: "choice", types: ["ABSTRACT"], grammar: "object" },
    ],
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lang/v2-features.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lang/frames.ts src/lang/example-language.ts src/lang/custom-languages.ts src/lang/v2-features.test.ts
git commit -m "feat: expand quest-critical frame and concept coverage"
```

### Task 6: Add Canonical Dialogue Payloads And Explicit Effects

**Files:**
- Modify: `src/sim/dialogueTypes.ts`
- Modify: `src/sim/dialogueTrees.ts`
- Create: `src/lang/dialogue-language.ts`
- Test: `src/lang/dialogue-language.test.ts`

- [ ] **Step 1: Write failing bridge tests**

```ts
it("renders a covered node from canonical frames using the active language", () => {
  const rendered = renderDialogueNode(activeLanguage, coveredNode);
  expect(rendered.line).not.toBe(coveredNode.line);
  expect(rendered.sourceLine).toBe(coveredNode.line);
});

it("returns explicit quest effects instead of relying on node id parsing", () => {
  const rendered = renderDialogueNode(activeLanguage, handoverNode);
  expect(rendered.effects).toContainEqual({ kind: "grant_item", item: "oil" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lang/dialogue-language.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Add minimal canonical payload types and bridge**

```ts
export type DialogueEffect =
  | { kind: "grant_item"; item: "wood" | "oil" | "flint" }
  | { kind: "ending"; outcome: "leave" | "stay" };

export interface CanonicalDialogueLine {
  frames: FilledFrame[];
  sourceText: string;
}

export interface RenderedDialogueNode {
  line: string;
  sourceLine: string;
  effects: DialogueEffect[];
}
```

- [ ] **Step 4: Annotate a first covered slice in `dialogueTrees.ts`**

```ts
HAL_QUESTION: {
  ...existingNode,
  canonicalLine: {
    sourceText: existingNode.line,
    frames: [
      { predicate: "DECIDE_STAY", mood: "declarative", roles: { decider: "listener", choice: "unknown" } },
    ],
  },
},
END_STAY: {
  ...existingNode,
  canonicalEffects: [{ kind: "ending", outcome: "stay" }],
},
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/lang/dialogue-language.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim/dialogueTypes.ts src/sim/dialogueTrees.ts src/lang/dialogue-language.ts src/lang/dialogue-language.test.ts
git commit -m "feat: add canonical dialogue payloads for generated language rendering"
```

### Task 7: Integrate The Bridge Into Overlay, Handovers, Endings, And Diary

**Files:**
- Modify: `src/ui/DialogueOverlay.ts`
- Modify: `src/state/handovers.ts`
- Modify: `src/ui/EndScreen.ts`
- Modify: `src/sim/diary.ts`
- Test: `src/lang/dialogue-language.test.ts`

- [ ] **Step 1: Write failing integration tests for explicit effects**

```ts
it("emits canonical effects for covered handover and ending nodes", () => {
  const rendered = renderDialogueNode(activeLanguage, coveredNode);
  expect(rendered.effects.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lang/dialogue-language.test.ts`
Expected: FAIL on missing integration payload details.

- [ ] **Step 3: Change `DialogueOverlay` to emit rendered + source detail**

```ts
window.dispatchEvent(new CustomEvent("fledgling:encounter", {
  detail: {
    speaker: node.speaker,
    nodeId: node.id,
    line: rendered.line,
    sourceLine: rendered.sourceLine,
    effects: rendered.effects,
  },
}));
```

- [ ] **Step 4: Update handovers and endings to use explicit effects first**

```ts
const effects = detail?.effects ?? [];
for (const effect of effects) {
  if (effect.kind === "grant_item") giveItem(effect.item);
  if (effect.kind === "ending") queueEnding(effect.outcome);
}
```

- [ ] **Step 5: Keep diary stable during rollout**

```ts
const sourceText = detail?.sourceLine ?? detail?.line ?? "";
const tokens = tokenise(sourceText);
```

- [ ] **Step 6: Run targeted verification**

Run: `npm test -- src/lang/dialogue-language.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ui/DialogueOverlay.ts src/state/handovers.ts src/ui/EndScreen.ts src/sim/diary.ts
git commit -m "feat: wire generated dialogue rendering through canonical effects"
```

### Task 8: Full Verification And OpenSpec Task Completion

**Files:**
- Modify: `openspec/changes/generator-llm/tasks.md`

- [ ] **Step 1: Mark completed OpenSpec tasks in `tasks.md`**

```md
- [x] 1.1 Add the OpenAI generation provider and server-side config path that reads `OPENAI_KEY` without exposing it to browser code.
- [x] 1.2 Define the `LanguageDesignArtifact` schema and any generator metadata types needed to describe accepted LLM outputs.
- [x] 1.3 Add an async generation entry point and Vite/server API route for requesting a generated language by seed and difficulty.
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run focused generation and dialogue tests**

Run: `npm test -- src/lang/generated-language.test.ts src/lang/dialogue-language.test.ts`
Expected: PASS.

- [ ] **Step 4: Run existing regression suites**

Run: `npm test -- src/lang/round-trip.test.ts src/lang/simple-difficulty.test.ts src/lang/v2-features.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: PASS with all test files green.

- [ ] **Step 6: Commit verification and task state**

```bash
git add openspec/changes/generator-llm/tasks.md
git commit -m "docs: mark generator llm implementation tasks complete"
```

---

## Spec Coverage Check

- LLM generation foundation: Tasks 1-4
- Compiler, validation, repair, cache reuse: Tasks 2-3
- Uniqueness controls and metadata: Tasks 1-4
- Quest-critical concept and frame coverage: Task 5
- NPC dialogue language bridge on current v3 runtime: Tasks 6-7
- Automated tests and final verification: Tasks 1-8

## Notes For The Implementer

- Do not build against the old `line.en` / `line.conlang` shape; the current repo uses `DialogueTree.entries`, `trigger`, `sideEffects`, and plain string `line` / `text` fields.
- Do not let browser code read `OPENAI_KEY`; only `vite.config.ts` middleware and server-side language modules may access it.
- Prefer explicit canonical dialogue effects over node-id parsing. Preserve existing flags like `fetch_done_*` and `holds_item_*`.
- Keep English fallback for uncovered nodes until canonical payload coverage is proven by tests.
