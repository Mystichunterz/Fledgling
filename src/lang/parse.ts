import Groq from "groq-sdk";
import {
  FRAMES,
  FilledFrame,
  validateFilledFrame,
} from "./frames.js";
import { LanguageSpec } from "./language-spec.js";

export interface ParseOptions {
  // Entity concept IDs the model may reference. Verbs / wh-words excluded.
  conceptIds: string[];
  model?: string;
  apiKey?: string;
  // Retry once on validation failure by default — Groq is fast enough that
  // a second attempt with the validator's error in the prompt is usually
  // cheaper than failing the turn.
  maxRetries?: number;
}

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

// Pull the lexical entity concept IDs out of a LanguageSpec lexicon.
// Verbs, pronouns, and wh-words are filtered: they're not valid conceptIds
// for EntityRef fillers (pronouns are deictic literals; wh-words are
// realised by the "unknown" filler).
export function conceptIdsFromLanguage(spec: LanguageSpec): string[] {
  return Object.entries(spec.lexicon)
    .filter(([, entry]) => entry.category === "noun")
    .map(([id]) => id);
}

export async function parseEnglishToFrame(
  text: string,
  opts: ParseOptions,
): Promise<FilledFrame> {
  const apiKey = opts.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY missing — set it in env or pass opts.apiKey");
  }
  const client = new Groq({ apiKey });
  const model = opts.model ?? DEFAULT_MODEL;
  const systemPrompt = buildSystemPrompt(opts.conceptIds);

  const attempts = (opts.maxRetries ?? 1) + 1;
  let lastErr: unknown;
  let priorOutput: string | undefined;
  let priorErrorMsg: string | undefined;

  for (let i = 0; i < attempts; i++) {
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ];
    if (priorOutput && priorErrorMsg) {
      messages.push(
        { role: "assistant", content: priorOutput },
        {
          role: "user",
          content:
            `Your previous output failed validation: ${priorErrorMsg}\n` +
            `Re-emit the JSON object, fixing the violation. No prose.`,
        },
      );
    }
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages,
      });
      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty model response");
      priorOutput = raw;
      const parsed = JSON.parse(raw) as FilledFrame;
      validateFilledFrame(parsed);
      return parsed;
    } catch (err) {
      lastErr = err;
      priorErrorMsg = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(
    `parseEnglishToFrame failed after ${attempts} attempts: ${String(lastErr)}`,
  );
}

function buildSystemPrompt(conceptIds: string[]): string {
  const frameLines = Object.values(FRAMES)
    .map((f) => {
      const roles = f.roles
        .map((r) => {
          const types = r.types.join("|");
          const nested = r.allowsNested ? " | nested-frame" : "";
          return `    ${r.name}: ${types}${nested}`;
        })
        .join("\n");
      return `  ${f.id} (${f.category}):\n${roles}`;
    })
    .join("\n");

  const predicateList = Object.keys(FRAMES).map((k) => `"${k}"`).join(", ");

  return `You are a semantic frame parser for a procedurally-generated language
game. Convert the user's English sentence into one JSON object describing
its underlying frame. Output ONLY the JSON object — no prose, no markdown,
no code fences.

# Frame inventory
${frameLines}

# Output shape
{
  "predicate": ${predicateList},
  "mood": "declarative" | "imperative",            // questions stay declarative; mark with "unknown" filler
  "tense": "past" | "present" | "future",          // optional, default present
  "negated": boolean,                                // optional, default false
  "roles": { "<roleName>": <RoleFiller>, ... }
}

A <RoleFiller> is exactly one of:
  A) { "type": "ANIMATE"|"ITEM"|"LOCATION", "conceptId": "<ID>", "number": "sg"|"pl" (optional) } — a lexical entity
  B) "self"      — 1st person pronoun (I, me, my, mine)
  C) "listener"  — 2nd person pronoun (you, your, yours)
  D) "reference" — 3rd person anaphoric pronoun (he, she, it, they, him, her, them, his, hers, its, their)
  E) "unknown"   — wh-pronoun (who, what, where, …); marks a question; allowed at most once per frame
  F) { "kind": "frame", "frame": <FilledFrame> } — only valid for SAY.content (1 level of nesting max)

# Hard constraints
- Every role of the chosen predicate must be filled.
- A frame may contain at most one "unknown" filler. Its presence makes the frame a question — keep mood = "declarative".
- mood = "imperative" requires an action-category frame (GIVE, TAKE, MOVE, SAY, MAKE, EAT).
- "self" and "listener" only fill roles that accept ANIMATE.
- conceptIds for lexical fillers MUST be drawn verbatim from this list:
  ${conceptIds.join(", ")}
  If the sentence references something outside this list, pick the closest
  available concept rather than inventing an ID. Do NOT invent IDs like
  "PLAYER" or "ADDRESSEE" — use the deictic pronouns above instead.

# Examples
Input: I want flint
Output: {"predicate":"WANT","mood":"declarative","roles":{"wanter":"self","desired":{"type":"ITEM","conceptId":"FLINT"}}}

Input: What do you want?
Output: {"predicate":"WANT","mood":"declarative","roles":{"wanter":"listener","desired":"unknown"}}

Input: Where is the flint?
Output: {"predicate":"BE_AT","mood":"declarative","roles":{"figure":{"type":"ITEM","conceptId":"FLINT"},"ground":"unknown"}}

Input: Give me the stick!
Output: {"predicate":"GIVE","mood":"imperative","roles":{"agent":"listener","recipient":"self","theme":{"type":"ITEM","conceptId":"STICK"}}}

Input: She has the bread.
Output: {"predicate":"HAVE","mood":"declarative","roles":{"owner":"reference","theme":{"type":"ITEM","conceptId":"BREAD"}}}

Input: The smith does not have bread.
Output: {"predicate":"HAVE","mood":"declarative","negated":true,"roles":{"owner":{"type":"ANIMATE","conceptId":"SMITH"},"theme":{"type":"ITEM","conceptId":"BREAD"}}}

Input: The smith said you want flint.
Output: {"predicate":"SAY","mood":"declarative","tense":"past","roles":{"speaker":{"type":"ANIMATE","conceptId":"SMITH"},"recipient":"self","content":{"kind":"frame","frame":{"predicate":"WANT","mood":"declarative","roles":{"wanter":"listener","desired":{"type":"ITEM","conceptId":"FLINT"}}}}}}
`;
}
