import { encodeFrame } from "../lang/encoder.js";
import { EXAMPLE_LANGUAGE } from "../lang/example-language.js";
import {
  NPC,
  makeStartingNPCs,
  makeStartingWorld,
  tickAll,
} from "./village.js";

// CLI driver: prints the village simulation as a stream of conlang
// utterances with English glosses. Engine lives in ./village.ts so the
// HTML viewer can share it.

const LANG = EXAMPLE_LANGUAGE;

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
  console.log("Lexicon (concept → stem):");
  for (const [group, ids] of Object.entries(used)) {
    const pairs = ids
      .map((c) => `${LANG.lexicon[c]?.stem ?? "??"}=${c}`)
      .join("  ");
    console.log(`  ${group.padEnd(10)} ${pairs}`);
  }
  console.log(
    "Affixes: -n=ACC  -ra=DAT  -to=PAST  (NOM, present, sg are unmarked)",
  );
  console.log();
}

function main(): void {
  const world = makeStartingWorld();
  const npcs = makeStartingNPCs();

  const TICKS = 18;
  console.log(`=== Village sim — language: ${LANG.id} (SOV, nom-acc) ===\n`);
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
      const tenseTag = decision.frame.tense ? "/" + decision.frame.tense : "";
      console.log(`     « ${conlang} »`);
      console.log(`       ${decision.gloss}  [${decision.frame.predicate}${tenseTag}]`);
    }
  }
}

main();
