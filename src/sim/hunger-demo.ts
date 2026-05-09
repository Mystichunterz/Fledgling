import { encodeFrame } from "../lang/encoder.js";
import { randomLanguage } from "../lang/random-language.js";
import {
  NPC,
  makeStartingNPCs,
  makeStartingWorld,
  tickAll,
} from "./village.js";

// CLI driver: prints the village simulation as a stream of conlang
// utterances with English glosses. Engine lives in ./village.ts so the
// HTML viewer can share it.

// Deterministic generated language — same (seed, difficulty) always
// produces the same LanguageSpec. See src/lang/random-language.ts.
const LANG = randomLanguage("banana", "simple");

function bar(pct: number, width = 8): string {
  const filled = Math.round((pct / 100) * width);
  return "█".repeat(filled) + "·".repeat(width - filled);
}

function statusLine(npc: NPC): string {
  const inv = npc.inventory.size
    ? ` [${[...npc.inventory].join(",")}]`
    : "";
  return (
    `  ${npc.displayName.padEnd(6)} @${npc.location.padEnd(7)}` +
    ` H ${bar(npc.hunger)} ${String(npc.hunger).padStart(3)}` +
    ` T ${bar(npc.thirst)} ${String(npc.thirst).padStart(3)}${inv}`
  );
}

function printLexicon(): void {
  const used: Record<string, string[]> = {
    Verbs: ["EAT", "MOVE", "SEE", "WANT", "TAKE", "BE_AT", "SAY"],
    Items: ["BREAD", "WATER"],
    Locations: ["FOREST", "MEADOW", "FORGE", "CAVE"],
    NPCs: ["WOODSMAN", "SMITH"],
  };
  console.log("Lexicon (stem = concept):");
  for (const [group, ids] of Object.entries(used)) {
    const pairs = ids
      .map((c) => `${LANG.lexicon[c]?.stem ?? "??"}=${c}`)
      .join("  ");
    console.log(`  ${group.padEnd(10)} ${pairs}`);
  }
  if (LANG.difficulty === "simple") {
    const q = LANG.particles?.Q;
    const imp = LANG.particles?.IMP;
    const parts = [`order=${LANG.syntax.wordOrder}`];
    if (q) parts.push(`Q-particle="${q.form}" (${q.position})`);
    if (imp) parts.push(`IMP-particle="${imp.form}" (${imp.position})`);
    console.log(`Morphology: ${parts.join("  ")}`);
    console.log("            (case, number, tense all unmarked)");
  } else {
    const m = LANG.morphology;
    const fmt = (a: { form: string; position: "prefix" | "suffix" }) =>
      a.form === "" ? "∅" : a.position === "prefix" ? `${a.form}-` : `-${a.form}`;
    console.log(
      `Affixes: ACC=${fmt(m.case.ACC)}  DAT=${fmt(m.case.DAT)}  ` +
        `PL=${fmt(m.number.pl)}  PAST=${fmt(m.tense.past)}  FUT=${fmt(m.tense.future)}`,
    );
  }
  console.log();
}

function main(): void {
  const world = makeStartingWorld();
  const npcs = makeStartingNPCs();

  const TICKS = 18;
  const tag = `${LANG.syntax.wordOrder}, ${LANG.morphology.alignment}, ${LANG.difficulty ?? "full"}-mode`;
  console.log(`=== Village sim — language: ${LANG.id} (${tag}) ===\n`);
  printLexicon();

  for (let t = 1; t <= TICKS; t++) {
    // tickAll mutates the world *and* applies decisions — but we want
    // status lines to show the pre-action state. We snapshot the
    // status string for each NPC before the tick, then print it
    // alongside that NPC's decision.
    const preStatus = new Map(npcs.map((n) => [n, statusLine(n)]));
    const entries = tickAll(world, npcs);

    console.log(`── tick ${String(t).padStart(2)} ─────────────────────────────────────`);
    for (const { npc, decision } of entries) {
      console.log(preStatus.get(npc) ?? statusLine(npc));
      const conlang = encodeFrame(LANG, decision.frame);
      console.log(`     « ${conlang} »`);
      const schema = JSON.stringify(decision.frame, null, 2)
        .split("\n")
        .map((l) => `       ${l}`)
        .join("\n");
      console.log(schema);
    }
  }
}

main();
