import {
  FRAMES,
  FilledFrame,
  isEntityRef,
  isNestedFrame,
  isPronoun,
} from "./frames.js";
import { LanguageSpec } from "./language-spec.js";

// Mock NPC context for the dialogue model. The handoff calls this the
// "minimum viable" shape — just enough that responses aren't a lookup table.
export interface NpcContext {
  // conceptId of this NPC in the lexicon (e.g. "SMITH"). Used in the prompt
  // so the model knows whose mouth it's speaking from.
  self: string;
  // ITEM conceptIds the NPC desires, e.g. ["FLINT"].
  desires: string[];
  // ITEM conceptIds the NPC currently has on hand.
  inventory: string[];
  // BE_AT facts the NPC happens to know.
  knows: { figure: string; ground: string }[];
  // Free-text vibe; surfaced verbatim into the prompt. Optional.
  persona?: string;
  // Self-reported wellbeing — drives BE_STATE responses to the
  // "you good?" greeting frame. "good" → affirmative; "bad" → negated.
  // Omitted defaults to "good".
  wellbeing?: "good" | "bad";
}

// Pull the entity-side concept IDs out of a LanguageSpec lexicon. Under the
// pronoun-aware frames model, pronouns (PLAYER/ADDRESSEE-style entries) are
// NOT valid EntityRef conceptIds — pronouns are their own filler kind
// ("self", "listener", "reference", "unknown"). So we filter to nouns only.
export function conceptIdsFromLanguage(spec: LanguageSpec): string[] {
  return Object.entries(spec.lexicon)
    .filter(([, e]) => e.category === "noun")
    .map(([id]) => id);
}

// Render a FilledFrame compactly enough to fit several examples into the
// system prompt without bloating tokens.
function frameJson(frame: FilledFrame): string {
  const compact: Record<string, unknown> = {
    predicate: frame.predicate,
    mood: frame.mood,
    roles: Object.fromEntries(
      Object.entries(frame.roles).map(([k, v]) => {
        if (isPronoun(v)) return [k, v]; // "self" / "listener" / "reference" / "unknown"
        if (isNestedFrame(v))
          return [k, { kind: "frame", frame: JSON.parse(frameJson(v.frame)) }];
        if (isEntityRef(v)) return [k, v];
        return [k, v];
      }),
    ),
  };
  if (frame.tense) compact.tense = frame.tense;
  if (frame.negated) compact.negated = true;
  return JSON.stringify(compact);
}

export function buildSystemPrompt(
  conceptIds: string[],
  ctx: NpcContext,
): string {
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

  // Canonical incoming/response pairs covering wh-question answer,
  // imperative compliance, declarative acknowledgement, and a refusal.
  // All pronouns are now string deictics (self/listener/reference/unknown).
  // "Interrogative" mood is gone — questions are declarative frames that
  // contain an "unknown" filler in the queried role.
  const exGiveImp: FilledFrame = {
    predicate: "GIVE",
    mood: "imperative",
    roles: { agent: "listener", recipient: "self", theme: { type: "ITEM", conceptId: "BREAD" } },
  };
  const exGiveResp: FilledFrame = {
    predicate: "GIVE",
    mood: "declarative",
    roles: { agent: "self", recipient: "listener", theme: { type: "ITEM", conceptId: "BREAD" } },
  };
  const exWantQ: FilledFrame = {
    predicate: "WANT",
    mood: "declarative",
    roles: { wanter: "listener", desired: "unknown" },
  };
  const exWantResp: FilledFrame = {
    predicate: "WANT",
    mood: "declarative",
    roles: { wanter: "self", desired: { type: "ITEM", conceptId: "FLINT" } },
  };
  const exWhereQ: FilledFrame = {
    predicate: "BE_AT",
    mood: "declarative",
    roles: { figure: { type: "ITEM", conceptId: "FLINT" }, ground: "unknown" },
  };
  const exWhereResp: FilledFrame = {
    predicate: "BE_AT",
    mood: "declarative",
    roles: {
      figure: { type: "ITEM", conceptId: "FLINT" },
      ground: { type: "LOCATION", conceptId: "CAVE" },
    },
  };
  const exHaveQ: FilledFrame = {
    predicate: "HAVE",
    mood: "declarative",
    roles: { owner: "listener", theme: "unknown" },
  };
  const exHaveResp: FilledFrame = {
    predicate: "HAVE",
    mood: "declarative",
    roles: { owner: "self", theme: { type: "ITEM", conceptId: "BREAD" } },
  };
  // Refusal: NPC doesn't have the requested item.
  const exRefuseImp: FilledFrame = {
    predicate: "GIVE",
    mood: "imperative",
    roles: { agent: "listener", recipient: "self", theme: { type: "ITEM", conceptId: "FLINT" } },
  };
  const exRefuseResp: FilledFrame = {
    predicate: "HAVE",
    mood: "declarative",
    negated: true,
    roles: { owner: "self", theme: { type: "ITEM", conceptId: "FLINT" } },
  };
  // Greeting: "you good?" — wildcard the state, NPC fills it in based on
  // its `wellbeing`. Two output examples (positive and negated) so the
  // model sees both shapes.
  const exGreetQ: FilledFrame = {
    predicate: "BE_STATE",
    mood: "declarative",
    roles: { experiencer: "listener", state: "unknown" },
  };
  const exGreetGood: FilledFrame = {
    predicate: "BE_STATE",
    mood: "declarative",
    roles: { experiencer: "self", state: { type: "ABSTRACT", conceptId: "GOOD" } },
  };
  const exGreetBad: FilledFrame = {
    predicate: "BE_STATE",
    mood: "declarative",
    negated: true,
    roles: { experiencer: "self", state: { type: "ABSTRACT", conceptId: "GOOD" } },
  };

  const examples = [
    { ctx: "(NPC has BREAD; player asks for BREAD)", inc: exGiveImp, out: exGiveResp },
    { ctx: "(NPC desires FLINT; player asks what NPC wants)", inc: exWantQ, out: exWantResp },
    { ctx: "(NPC knows FLINT is at CAVE; player asks where FLINT is)", inc: exWhereQ, out: exWhereResp },
    { ctx: "(NPC has BREAD; player asks what NPC has)", inc: exHaveQ, out: exHaveResp },
    { ctx: "(NPC does NOT have FLINT; player demands FLINT — NPC refuses)", inc: exRefuseImp, out: exRefuseResp },
    { ctx: "(NPC's wellbeing is \"good\"; player greets — affirmative)", inc: exGreetQ, out: exGreetGood },
    { ctx: "(NPC's wellbeing is \"bad\"; player greets — negated)", inc: exGreetQ, out: exGreetBad },
  ];
  const exampleBlock = examples
    .map(
      (e, i) =>
        `Example ${i + 1} ${e.ctx}\n` +
        `  incoming: ${frameJson(e.inc)}\n` +
        `  response: ${frameJson(e.out)}`,
    )
    .join("\n\n");

  const knowsBlock = ctx.knows.length
    ? ctx.knows.map((k) => `    ${k.figure} → ${k.ground}`).join("\n")
    : "    (none)";

  const wellbeing = ctx.wellbeing ?? "good";

  const personaLine = ctx.persona ? `\n# Persona\n${ctx.persona}\n` : "";

  return `You are role-playing as a non-player character (NPC) in a procedurally
generated language game. The player has just spoken to you. Their utterance
is given as a structured semantic frame ("incoming"). You must reply with
ONE JSON object describing your response frame. Output ONLY the JSON object
— no prose, no markdown, no code fences.

# Speaker semantics (deictic pronouns)
Roles can be filled by deictic pronouns instead of EntityRefs. The pronouns
are bare JSON strings:
  "self"      — 1st person (the current speaker — YOU when responding).
  "listener"  — 2nd person (the addressee — the human player when responding).
  "reference" — 3rd person anaphor (a salient prior referent).
  "unknown"   — wh-pronoun, asks "which X?" — at most ONE per frame, marks
                the role being queried.
Deixis flips with the speaker. In the player's incoming frame, "self" is
the player and "listener" is you. In your response, "self" is you (the NPC)
and "listener" is the player. Your own NPC conceptId is "${ctx.self}", but
do not refer to yourself in the third person — use "self".

# Mood
There are TWO moods only: "declarative" and "imperative". There is no
"interrogative" mood. A question is just a declarative frame that contains
an "unknown" filler in the queried role. Imperatives carry no "unknown".

# Your knowledge & state
  self (NPC conceptId, lexicon-side):
    ${ctx.self}
  desires (ITEM conceptIds you want):
    ${ctx.desires.length ? ctx.desires.join(", ") : "(none)"}
  inventory (ITEM conceptIds you currently hold):
    ${ctx.inventory.length ? ctx.inventory.join(", ") : "(none)"}
  knows (BE_AT facts you happen to know):
${knowsBlock}
  wellbeing (your self-reported state — drives BE_STATE greeting answers):
    ${wellbeing}
${personaLine}
# Frame inventory
${frameLines}

# Output shape
{
  "predicate": ${predicateList},
  "mood": "declarative" | "imperative",
  "tense": "past" | "present" | "future",          // optional, default present
  "negated": boolean,                                // optional, default false
  "roles": { "<roleName>": <RoleFiller>, ... }
}

A <RoleFiller> is exactly one of:
  A) { "type": "ANIMATE"|"ITEM"|"LOCATION"|"ABSTRACT"|"EVENT", "conceptId": "<ID>", "number": "sg"|"pl" (optional) }
  B) "self" | "listener" | "reference" | "unknown"   — bare pronoun string
  C) { "kind": "frame", "frame": <FilledFrame> }    — only valid for SAY.content

# Hard constraints
- Every role of the chosen predicate must be filled.
- At most ONE role may be "unknown" across the whole frame.
- "self" and "listener" only fit roles whose type list includes ANIMATE.
- mood = "imperative" requires an action-category frame (GIVE, TAKE, MOVE, SAY, MAKE, EAT).
- EntityRef conceptIds MUST be drawn verbatim from this list:
  ${conceptIds.join(", ")}
  Do not invent IDs. If the natural answer is outside this list, pick the
  closest available concept. (Pronouns are NOT in this list — use the
  deictic strings above.)

# Behavioural guidance
- If the incoming frame contains an "unknown" filler (a question), answer
  it with a declarative frame whose roles are filled from your knowledge.
- If the player issues an imperative you can comply with, respond with
  the matching declarative committing to the action.
- If the player issues an imperative you CANNOT comply with (you lack the
  item, etc.), respond with a related negated state (e.g. HAVE … negated).
- If the player declares something, acknowledge with a related declarative
  or counter-question (declarative + "unknown").
- If the player greets you with a BE_STATE question (experiencer="listener",
  state="unknown"), answer with a BE_STATE declarative whose experiencer is
  "self" and state is GOOD. If your wellbeing is "good", emit it as-is; if
  your wellbeing is "bad", emit the same frame with negated:true. Never
  invent a non-GOOD ABSTRACT concept here.
- Prefer concise frames. Do not nest unless the response truly requires it.

# Examples

${exampleBlock}
`;
}
