import { useMemo, useState } from "react";
import {
  FRAMES,
  FilledFrame,
  RoleFiller,
  isEntityRef,
  isNestedFrame,
  isPronoun,
  isUnknown,
  validateFilledFrame,
} from "../lang/frames.js";
import { encodeFrame } from "../lang/encoder.js";
import { EXAMPLE_LANGUAGE } from "../lang/example-language.js";
import {
  buildSystemPrompt,
  conceptIdsFromLanguage,
  type NpcContext,
} from "../lang/respond-prompt.js";

// Canonical incoming frames the user can fire at the NPC. Mirrors the eval
// fixtures. Under the new model, questions are declarative frames with an
// "unknown" filler in the queried role, and "self"/"listener" are bare
// pronoun strings (no EntityRef / conceptId).
const INCOMING: { label: string; frame: FilledFrame }[] = [
  {
    label: "what do you want?",
    frame: {
      predicate: "WANT",
      mood: "declarative",
      roles: { wanter: "listener", desired: "unknown" },
    },
  },
  {
    label: "where is the flint?",
    frame: {
      predicate: "BE_AT",
      mood: "declarative",
      roles: {
        figure: { type: "ITEM", conceptId: "FLINT" },
        ground: "unknown",
      },
    },
  },
  {
    label: "what do you have?",
    frame: {
      predicate: "HAVE",
      mood: "declarative",
      roles: { owner: "listener", theme: "unknown" },
    },
  },
  {
    label: "give me bread!",
    frame: {
      predicate: "GIVE",
      mood: "imperative",
      roles: {
        agent: "listener",
        recipient: "self",
        theme: { type: "ITEM", conceptId: "BREAD" },
      },
    },
  },
  {
    label: "give me flint!",
    frame: {
      predicate: "GIVE",
      mood: "imperative",
      roles: {
        agent: "listener",
        recipient: "self",
        theme: { type: "ITEM", conceptId: "FLINT" },
      },
    },
  },
  {
    label: "who wants flint?",
    frame: {
      predicate: "WANT",
      mood: "declarative",
      roles: {
        wanter: "unknown",
        desired: { type: "ITEM", conceptId: "FLINT" },
      },
    },
  },
  {
    label: "you good?",
    frame: {
      predicate: "BE_STATE",
      mood: "declarative",
      roles: { experiencer: "listener", state: "unknown" },
    },
  },
];

const PRESETS: Record<string, NpcContext> = {
  smith: {
    self: "SMITH",
    desires: ["FLINT"],
    inventory: ["BREAD"],
    knows: [
      { figure: "FLINT", ground: "CAVE" },
      { figure: "STICK", ground: "FOREST" },
    ],
    persona: "gruff, terse village blacksmith",
  },
  woodsman: {
    self: "WOODSMAN",
    desires: ["WATER"],
    inventory: ["STICK", "LIGHTER"],
    knows: [
      { figure: "WATER", ground: "MEADOW" },
      { figure: "FLINT", ground: "CAVE" },
    ],
    persona: "wandering forester, friendly",
    wellbeing: "good",
  },
  // Same persona as the smith but in a foul mood — used to demo the
  // negated BE_STATE response to "you good?". Toggle wellbeing in the
  // textarea to flip it back without reaching for a different preset.
  "smith (off day)": {
    self: "SMITH",
    desires: ["FLINT"],
    inventory: [],
    knows: [{ figure: "FLINT", ground: "CAVE" }],
    persona: "gruff, terse village blacksmith — having a rough morning",
    wellbeing: "bad",
  },
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; frame: FilledFrame; surface: string | null; surfaceError: string | null }
  | { kind: "error"; message: string };

export function RespondPage() {
  const [contextText, setContextText] = useState<string>(
    JSON.stringify(PRESETS.smith, null, 2),
  );
  const [incoming, setIncoming] = useState<FilledFrame>(INCOMING[0]!.frame);
  const [state, setState] = useState<State>({ kind: "idle" });

  // Parse the context textarea into a real NpcContext or surface a
  // structural error before we even hit the API.
  const parsedContext = useMemo<
    { ok: true; ctx: NpcContext } | { ok: false; err: string }
  >(() => {
    try {
      const parsed = JSON.parse(contextText) as Partial<NpcContext>;
      if (!parsed || typeof parsed !== "object") throw new Error("not an object");
      if (typeof parsed.self !== "string") throw new Error("missing string `self`");
      if (!Array.isArray(parsed.desires)) throw new Error("`desires` must be an array");
      if (!Array.isArray(parsed.inventory)) throw new Error("`inventory` must be an array");
      if (!Array.isArray(parsed.knows)) throw new Error("`knows` must be an array");
      return { ok: true, ctx: parsed as NpcContext };
    } catch (e) {
      return { ok: false, err: e instanceof Error ? e.message : String(e) };
    }
  }, [contextText]);

  // Live-rebuild the exact system prompt the server would send. Same
  // function the backend calls, so what you see is what Groq sees.
  const systemPrompt = useMemo(() => {
    if (!parsedContext.ok) return null;
    const conceptIds = conceptIdsFromLanguage(EXAMPLE_LANGUAGE);
    return buildSystemPrompt(conceptIds, parsedContext.ctx);
  }, [parsedContext]);

  // Char count is a fast proxy for token count; ~4 chars/token for English.
  const promptCharCount = systemPrompt?.length ?? 0;
  const promptTokenEst = Math.round(promptCharCount / 4);
  const userPayloadJson = JSON.stringify({ incoming }, null, 2);
  const userTokenEst = Math.round(userPayloadJson.length / 4);

  const submit = async (frame?: FilledFrame) => {
    if (!parsedContext.ok) return;
    const inc = frame ?? incoming;
    if (frame) setIncoming(frame);
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ incoming: inc, context: parsedContext.ctx }),
      });
      const payload = await res.json();
      if (!res.ok || payload.error) {
        setState({ kind: "error", message: payload.error ?? `HTTP ${res.status}` });
        return;
      }
      const out = payload.frame as FilledFrame;
      try {
        validateFilledFrame(out);
      } catch (e) {
        setState({
          kind: "error",
          message: `validation: ${e instanceof Error ? e.message : String(e)}`,
        });
        return;
      }
      let surface: string | null = null;
      let surfaceError: string | null = null;
      try {
        surface = encodeFrame(EXAMPLE_LANGUAGE, out);
      } catch (e) {
        surfaceError = e instanceof Error ? e.message : String(e);
      }
      setState({ kind: "ok", frame: out, surface, surfaceError });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <div className="page">
      <header>
        <div className="masthead">
          <div>
            <h1 className="title">
              Fledgling<em>.</em>
            </h1>
            <div className="subtitle">Frame → Frame · Groq NPC responder</div>
          </div>
          <div className="colophon">
            <div><strong>Model</strong> llama-3.3-70b-versatile</div>
            <div>via /api/respond</div>
            <div>response surface in <code>{EXAMPLE_LANGUAGE.id}</code></div>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="section-head">
          <span className="section-no">§ I</span>
          <h2 className="section-title">NPC context</h2>
          <span className="section-tag">deictic anchor</span>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-name">§ I.a — Persona &amp; state</h3>
            <span className="panel-flow">JSON</span>
          </div>
          <div className="field">
            <div className="field-label">Presets</div>
            <div className="pills">
              {Object.entries(PRESETS).map(([name, ctx]) => (
                <button
                  key={name}
                  className="pill"
                  onClick={() => setContextText(JSON.stringify(ctx, null, 2))}
                  disabled={state.kind === "loading"}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <div className="field-label">NpcContext</div>
            <textarea
              className="parse-input"
              style={{
                width: "100%",
                minHeight: 200,
                fontFamily: "var(--mono)",
                fontSize: 12,
                whiteSpace: "pre",
                resize: "vertical",
              }}
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              spellCheck={false}
            />
            {!parsedContext.ok && (
              <div className="parse-status error" style={{ marginTop: 8 }}>
                <span className="glyph">×</span> {parsedContext.err}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="section-no">§ II</span>
          <h2 className="section-title">Incoming utterance</h2>
          <span className="section-tag">player → NPC frame</span>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-name">§ II.a — Pick a frame</h3>
            <span className="panel-flow">canonical</span>
          </div>
          <div className="field">
            <div className="pills">
              {INCOMING.map((inc) => (
                <button
                  key={inc.label}
                  className="pill"
                  aria-pressed={inc.frame === incoming}
                  onClick={() => submit(inc.frame)}
                  disabled={state.kind === "loading" || !parsedContext.ok}
                >
                  {inc.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <div className="field-label">Selected incoming frame</div>
            <FrameView frame={incoming} />
          </div>
          {state.kind === "error" && (
            <div className="parse-status error">
              <span className="glyph">×</span> {state.message}
            </div>
          )}
          {state.kind === "loading" && (
            <div className="parse-status empty">
              <span className="glyph">·</span> awaiting Groq…
            </div>
          )}
        </div>
      </section>

      {state.kind === "ok" && (
        <section className="section">
          <div className="section-head">
            <span className="section-no">§ III</span>
            <h2 className="section-title">Response</h2>
            <span className="section-tag">NPC → player frame</span>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3 className="panel-name">§ III.a — Response frame</h3>
              <span className="panel-flow">structured output</span>
            </div>
            <FrameView frame={state.frame} />
            <div className="surface" style={{ marginTop: 22 }}>
              <div className="surface-label">surface · {EXAMPLE_LANGUAGE.id}</div>
              {state.surface ? (
                <div className="gloss-cell">
                  <div className="gloss-surface">{state.surface}</div>
                </div>
              ) : (
                <div className="parse-status error">
                  <span className="glyph">×</span> {state.surfaceError}
                </div>
              )}
            </div>
            <details style={{ marginTop: 22 }}>
              <summary className="field-label" style={{ cursor: "pointer" }}>
                raw JSON
              </summary>
              <pre
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  margin: "12px 0 0",
                }}
              >
                {JSON.stringify(state.frame, null, 2)}
              </pre>
            </details>
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <span className="section-no">§ IV</span>
          <h2 className="section-title">System prompt</h2>
          <span className="section-tag">what Groq sees</span>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-name">§ IV.a — Live prompt</h3>
            <span className="panel-flow">
              {systemPrompt
                ? `~${promptTokenEst} tokens system · ~${userTokenEst} tokens user`
                : "(invalid context)"}
            </span>
          </div>
          {systemPrompt ? (
            <>
              <details>
                <summary
                  className="field-label"
                  style={{ cursor: "pointer", marginBottom: 8 }}
                >
                  show system prompt ({promptCharCount} chars)
                </summary>
                <pre
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    margin: "12px 0 0",
                    padding: 14,
                    background: "var(--paper-deep)",
                    border: "1px solid var(--paper-edge)",
                    maxHeight: 480,
                    overflow: "auto",
                  }}
                >
                  {systemPrompt}
                </pre>
              </details>
              <details style={{ marginTop: 12 }}>
                <summary
                  className="field-label"
                  style={{ cursor: "pointer", marginBottom: 8 }}
                >
                  show user message ({userPayloadJson.length} chars)
                </summary>
                <pre
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    margin: "12px 0 0",
                    padding: 14,
                    background: "var(--paper-deep)",
                    border: "1px solid var(--paper-edge)",
                  }}
                >
                  {userPayloadJson}
                </pre>
              </details>
            </>
          ) : (
            <div className="parse-status error">
              <span className="glyph">×</span> Fix the NpcContext above to render the prompt.
            </div>
          )}
        </div>
      </section>

      <footer className="footer">
        <div>fledgling · groq npc-responder demo</div>
        <em>“speak, and be answered.”</em>
      </footer>
    </div>
  );
}

function FrameView({ frame }: { frame: FilledFrame }) {
  const spec = FRAMES[frame.predicate];
  const orderedRoleNames = spec
    ? spec.roles.map((r) => r.name)
    : Object.keys(frame.roles);
  return (
    <div className="frame-display">
      <div className="frame-row">
        <div className="frame-key">predicate</div>
        <div className="frame-val">
          <span className="predicate">{frame.predicate}</span>
          <span className="badge">{frame.mood}</span>
          {frame.tense && <span className="badge">{frame.tense}</span>}
          {frame.negated && <span className="badge">negated</span>}
        </div>
      </div>
      <div className="frame-row">
        <div className="frame-key">roles</div>
        <div className="frame-val">
          {orderedRoleNames.map((name) => (
            <RoleBind key={name} name={name} filler={frame.roles[name]!} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleBind({ name, filler }: { name: string; filler: RoleFiller }) {
  return (
    <div className="role-bind">
      <span className="role-tag">{name}</span>
      {isUnknown(filler) ? (
        <span className="filler wh">unknown</span>
      ) : isPronoun(filler) ? (
        <span className="filler">
          <span className="muted">pronoun</span> {filler}
        </span>
      ) : isNestedFrame(filler) ? (
        <span className="filler">
          <span className="muted">[nested]</span> <NestedInline frame={filler.frame} />
        </span>
      ) : isEntityRef(filler) ? (
        <span className="filler">
          {filler.conceptId}{" "}
          <span className="muted">({filler.type.toLowerCase()})</span>
        </span>
      ) : null}
    </div>
  );
}

function NestedInline({ frame }: { frame: FilledFrame }) {
  const parts: string[] = [`${frame.predicate}/${frame.mood}`];
  for (const [name, filler] of Object.entries(frame.roles)) {
    if (isPronoun(filler)) parts.push(`${name}=${filler}`);
    else if (isEntityRef(filler)) parts.push(`${name}=${filler.conceptId}`);
    else if (isNestedFrame(filler)) parts.push(`${name}=[…]`);
  }
  return <span>{parts.join(" · ")}</span>;
}
