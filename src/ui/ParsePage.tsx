import { useState } from "react";
import {
  FRAMES,
  FilledFrame,
  RoleFiller,
  isEntityRef,
  isNestedFrame,
  isWildcard,
  validateFilledFrame,
} from "../lang/frames.js";
import { encodeFrame } from "../lang/encoder.js";
import { EXAMPLE_LANGUAGE } from "../lang/example-language.js";

const EXAMPLES = [
  "I want flint.",
  "What do you want?",
  "Where is the flint?",
  "Give me the stick!",
  "The smith does not have bread.",
  "The smith said you want flint.",
];

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; frame: FilledFrame; surface: string | null; surfaceError: string | null }
  | { kind: "error"; message: string };

export function ParsePage() {
  const [input, setInput] = useState<string>(EXAMPLES[0]!);
  const [state, setState] = useState<State>({ kind: "idle" });

  const submit = async (text?: string) => {
    const sentence = (text ?? input).trim();
    if (!sentence) return;
    if (text !== undefined) setInput(text);
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: sentence }),
      });
      const payload = await res.json();
      if (!res.ok || payload.error) {
        setState({ kind: "error", message: payload.error ?? `HTTP ${res.status}` });
        return;
      }
      const frame = payload.frame as FilledFrame;
      try {
        validateFilledFrame(frame);
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
        surface = encodeFrame(EXAMPLE_LANGUAGE, frame);
      } catch (e) {
        surfaceError = e instanceof Error ? e.message : String(e);
      }
      setState({ kind: "ok", frame, surface, surfaceError });
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
            <div className="subtitle">English → Frame · Groq parser</div>
          </div>
          <div className="colophon">
            <div><strong>Model</strong> llama-3.3-70b-versatile</div>
            <div>via /api/parse</div>
            <div>round-trip into <code>{EXAMPLE_LANGUAGE.id}</code></div>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="section-head">
          <span className="section-no">§ I</span>
          <h2 className="section-title">Parse</h2>
          <span className="section-tag">English → FilledFrame</span>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-name">§ I.a — Input</h3>
            <span className="panel-flow">natural language</span>
          </div>

          <div className="field">
            <div className="field-label">Sentence</div>
            <input
              className="parse-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="type an English sentence…"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button
                className="lang-btn"
                onClick={() => submit()}
                disabled={state.kind === "loading"}
              >
                {state.kind === "loading" ? "parsing…" : "→ parse"}
              </button>
            </div>
          </div>

          <div className="field">
            <div className="field-label">Examples</div>
            <div className="pills">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  className="pill"
                  aria-pressed={ex === input}
                  onClick={() => submit(ex)}
                  disabled={state.kind === "loading"}
                >
                  {ex}
                </button>
              ))}
            </div>
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

        {state.kind === "ok" && (
          <div className="panel">
            <div className="panel-head">
              <h3 className="panel-name">§ I.b — Frame</h3>
              <span className="panel-flow">structured output</span>
            </div>
            <FrameView frame={state.frame} />
            <div className="surface" style={{ marginTop: 22 }}>
              <div className="surface-label">round-trip · {EXAMPLE_LANGUAGE.id}</div>
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
        )}
      </section>

      <footer className="footer">
        <div>fledgling · groq parser demo</div>
        <em>“type one, get one.”</em>
      </footer>
    </div>
  );
}

function FrameView({ frame }: { frame: FilledFrame }) {
  const spec = FRAMES[frame.predicate];
  const orderedRoleNames = spec ? spec.roles.map((r) => r.name) : Object.keys(frame.roles);
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
      {isWildcard(filler) ? (
        <span className="filler wh">?</span>
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
    if (isWildcard(filler)) parts.push(`${name}=?`);
    else if (isEntityRef(filler)) parts.push(`${name}=${filler.conceptId}`);
    else if (isNestedFrame(filler)) parts.push(`${name}=[…]`);
  }
  return <span>{parts.join(" · ")}</span>;
}
