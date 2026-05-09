import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { FilledFrame } from "./frames.js";
import { encodeFrame } from "./encoder.js";
import { ParseError, decodeText } from "./decoder.js";
import { EXAMPLE_LANGUAGE } from "./example-language.js";

const L = EXAMPLE_LANGUAGE;

const NPC_LINES: { gloss: string; frame: FilledFrame }[] = [
  {
    gloss: "(the smith says) I want the flint",
    frame: {
      predicate: "WANT",
      mood: "declarative",
      roles: {
        wanter: { type: "ANIMATE", conceptId: "SMITH" },
        desired: { type: "ITEM", conceptId: "FLINT" },
      },
    },
  },
  {
    gloss: "(the woodsman says) the stick is in the forest",
    frame: {
      predicate: "BE_AT",
      mood: "declarative",
      roles: {
        figure: { type: "ITEM", conceptId: "STICK" },
        ground: { type: "LOCATION", conceptId: "FOREST" },
      },
    },
  },
  {
    gloss: "(the smith asks) what do you want?",
    frame: {
      predicate: "WANT",
      mood: "interrogative",
      roles: {
        wanter: { type: "ANIMATE", conceptId: "ADDRESSEE" },
        desired: "?",
      },
    },
  },
  {
    gloss: "(the smith says) take the flint!",
    frame: {
      predicate: "TAKE",
      mood: "imperative",
      roles: {
        agent: { type: "ANIMATE", conceptId: "ADDRESSEE" },
        theme: { type: "ITEM", conceptId: "FLINT" },
      },
    },
  },
  {
    gloss: "(the woodsman asks) where is the lighter?",
    frame: {
      predicate: "BE_AT",
      mood: "interrogative",
      roles: {
        figure: { type: "ITEM", conceptId: "LIGHTER" },
        ground: "?",
      },
    },
  },
];

function describe(filled: FilledFrame): string {
  const parts = [filled.predicate, `[${filled.mood}]`];
  for (const [name, filler] of Object.entries(filled.roles)) {
    if (filler === "?") parts.push(`${name}=?`);
    else parts.push(`${name}=${filler.conceptId}`);
  }
  return parts.join(" ");
}

async function main() {
  console.log(`\n=== Fledgling translator demo (language: ${L.id}) ===`);
  console.log(`Typology: ${L.syntax.wordOrder}, ${L.syntax.obliquePosition} obliques, nom-acc.\n`);

  console.log("--- frame -> text (NPC speech) ---");
  for (const { gloss, frame } of NPC_LINES) {
    const surface = encodeFrame(L, frame);
    console.log(`  ${gloss}`);
    console.log(`    frame:   ${describe(frame)}`);
    console.log(`    surface: "${surface}"\n`);
  }

  console.log("--- text -> frame (player input) ---");
  console.log("Type a sentence in tovari, or 'quit'. Examples:");
  console.log("  ne pira tane          (player takes the flint)");
  console.log("  tova man seluli       (what does the smith want?)");
  console.log("  pira nokili vora      (where is the flint?)\n");

  const rl = createInterface({ input: stdin, output: stdout });
  while (true) {
    const line = (await rl.question("> ")).trim();
    if (!line) continue;
    if (line === "quit" || line === "exit") break;
    try {
      const frame = decodeText(L, line);
      console.log(`  parsed: ${describe(frame)}`);
      const round = encodeFrame(L, frame);
      if (round !== line.toLowerCase().replace(/[.,!?;:]/g, "").trim()) {
        console.log(`  re-encoded: "${round}"`);
      }
    } catch (e) {
      if (e instanceof ParseError) {
        console.log(`  parse error: ${e.message}`);
      } else {
        console.log(`  error: ${String(e)}`);
      }
    }
  }
  rl.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
