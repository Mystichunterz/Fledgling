import Groq from "groq-sdk";
import { FilledFrame, validateFilledFrame } from "./frames.js";
import {
  NpcContext,
  buildSystemPrompt,
  conceptIdsFromLanguage,
} from "./respond-prompt.js";

// Re-export so existing call sites (eval harness, vite middleware) keep
// working without touching their imports.
export type { NpcContext };
export { conceptIdsFromLanguage };

export interface RespondOptions {
  // Entity concept IDs the model may reference. Verbs / wh-words excluded.
  conceptIds: string[];
  model?: string;
  apiKey?: string;
  // Retry once on validation failure by default.
  maxRetries?: number;
}

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export async function respondToFrame(
  incoming: FilledFrame,
  context: NpcContext,
  opts: RespondOptions,
): Promise<FilledFrame> {
  // Validate the incoming frame upfront so we don't hand garbage to the
  // model. Cheaper to fail loudly than to debug a confused completion.
  validateFilledFrame(incoming);

  const apiKey = opts.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY missing — set it in env or pass opts.apiKey");
  }
  const client = new Groq({ apiKey });
  const model = opts.model ?? DEFAULT_MODEL;
  const systemPrompt = buildSystemPrompt(opts.conceptIds, context);
  const userPayload = JSON.stringify({ incoming });

  const attempts = (opts.maxRetries ?? 1) + 1;
  let lastErr: unknown;
  let priorOutput: string | undefined;
  let priorErrorMsg: string | undefined;

  for (let i = 0; i < attempts; i++) {
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPayload },
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
    `respondToFrame failed after ${attempts} attempts: ${String(lastErr)}`,
  );
}
