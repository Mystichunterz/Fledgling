import { EXAMPLE_LANGUAGE } from "./example-language.js";
import { conceptIdsFromLanguage, parseEnglishToFrame } from "./parse.js";

const SENTENCES = [
  "I want flint.",
  "What do you want?",
  "Where is the flint?",
  "Give me the stick!",
  "The smith does not have bread.",
  "The smith said you want flint.",
];

async function main() {
  const conceptIds = conceptIdsFromLanguage(EXAMPLE_LANGUAGE);
  for (const sentence of SENTENCES) {
    process.stdout.write(`\n› ${sentence}\n`);
    try {
      const frame = await parseEnglishToFrame(sentence, { conceptIds });
      process.stdout.write(`${JSON.stringify(frame, null, 2)}\n`);
    } catch (err) {
      process.stdout.write(`  ✗ ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
