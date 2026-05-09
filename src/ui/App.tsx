import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  FRAMES,
  FilledFrame,
  FrameSpec,
  RoleFiller,
  RoleSpec,
  RoleType,
  validateFilledFrame,
} from "../lang/frames.js";
import {
  Case,
  LanguageSpec,
  LexiconEntry,
  MoodTag,
  WH_FOR_TYPE,
  caseForGrammar,
} from "../lang/language-spec.js";
import { encodeFrame } from "../lang/encoder.js";
import { ParseError, decodeText } from "../lang/decoder.js";
import { EXAMPLE_LANGUAGE } from "../lang/example-language.js";
import { randomLanguage, randomSeedString } from "../lang/random-language.js";
import {
  FrameGloss,
  GlossedWord,
  formatGlossLabel,
  glossFrame,
} from "../lang/gloss.js";

const FRAME_LIST = Object.values(FRAMES);

// The active language is held in App state and exposed via context so deep
// children don't need explicit prop drilling.
const LanguageContext = createContext<LanguageSpec>(EXAMPLE_LANGUAGE);
const useLanguage = (): LanguageSpec => useContext(LanguageContext);

// Sample frame used to seed the parse panel with a known-good sentence in
// whatever language is active.
const PARSE_SEED_FRAME: FilledFrame = {
  predicate: "WANT",
  mood: "interrogative",
  roles: {
    wanter: { type: "ANIMATE", conceptId: "SMITH" },
    desired: "?",
  },
};

// ============================================================
// Helpers
// ============================================================

function compatibleConcepts(
  spec: LanguageSpec,
  types: readonly RoleType[],
): { conceptId: string; entry: LexiconEntry }[] {
  const out: { conceptId: string; entry: LexiconEntry }[] = [];
  for (const [conceptId, entry] of Object.entries(spec.lexicon)) {
    if (entry.category === "verb") continue;
    if (entry.category === "wh") continue;
    if (!entry.semanticType) continue;
    if (types.includes(entry.semanticType)) out.push({ conceptId, entry });
  }
  return out;
}

function defaultRolesFor(
  spec: LanguageSpec,
  frame: FrameSpec,
): Record<string, RoleFiller> {
  const roles: Record<string, RoleFiller> = {};
  for (const role of frame.roles) {
    const opts = compatibleConcepts(spec, role.types);
    const first = opts[0];
    if (!first) {
      throw new Error(
        `Lexicon has no concept for role "${role.name}" types ${role.types.join("|")}`,
      );
    }
    roles[role.name] = {
      type: first.entry.semanticType!,
      conceptId: first.conceptId,
    };
  }
  return roles;
}

type UiMood = "declarative" | "interrogative" | "imperative";

function moodOf(
  roles: Record<string, RoleFiller>,
  explicit: UiMood,
): UiMood {
  if (Object.values(roles).some((r) => r === "?")) return "interrogative";
  // No wildcard → declarative or imperative, depending on user choice.
  return explicit === "imperative" ? "imperative" : "declarative";
}

// ============================================================
// Root
// ============================================================

export function App() {
  const [L, setL] = useState<LanguageSpec>(EXAMPLE_LANGUAGE);
  // The seed currently displayed in the masthead. Empty when the seed
  // field is editable but unsubmitted, or when on the example language.
  const [seed, setSeed] = useState<string>("");
  // Lifted so the parse seed can refresh when the language changes.
  const [parseInput, setParseInput] = useState<string>(() =>
    encodeFrame(EXAMPLE_LANGUAGE, PARSE_SEED_FRAME),
  );

  const installLanguage = (next: LanguageSpec) => {
    setL(next);
    try {
      setParseInput(encodeFrame(next, PARSE_SEED_FRAME));
    } catch {
      setParseInput("");
    }
  };

  // Generate from the current seed field. If empty, mint a fresh seed and
  // populate the field so the user can copy it.
  const regenerate = () => {
    const trimmed = seed.trim();
    const used = trimmed === "" ? randomSeedString() : trimmed;
    installLanguage(randomLanguage(used));
    setSeed(used);
  };

  const reset = () => {
    installLanguage(EXAMPLE_LANGUAGE);
    setSeed("");
  };

  const isExample = L === EXAMPLE_LANGUAGE;

  return (
    <LanguageContext.Provider value={L}>
      <div className="page">
        <Masthead
          seed={seed}
          setSeed={setSeed}
          onRegenerate={regenerate}
          onReset={reset}
          canReset={!isExample}
        />
        <Workbench parseInput={parseInput} setParseInput={setParseInput} />
        <LexiconReference />
        <MorphologyReference />
        <Footer />
      </div>
    </LanguageContext.Provider>
  );
}

// ============================================================
// Masthead
// ============================================================

function Masthead({
  seed,
  setSeed,
  onRegenerate,
  onReset,
  canReset,
}: {
  seed: string;
  setSeed: (s: string) => void;
  onRegenerate: () => void;
  onReset: () => void;
  canReset: boolean;
}) {
  const L = useLanguage();
  const align = L.morphology.alignment;
  const order = L.syntax.wordOrder;
  const oblique = L.syntax.obliquePosition;
  const affixPosition = L.morphology.case.NOM.position;
  const stemCount = Object.keys(L.lexicon).length;
  return (
    <header>
      <div className="masthead">
        <div>
          <h1 className="title">
            Fledgling<em>.</em>
          </h1>
          <div className="subtitle">Translator Workbench · vol I</div>
        </div>
        <div className="colophon">
          <div><strong>Language</strong> {L.id}</div>
          <div>{stemCount} lexical entries</div>
          <div>frame ↔ surface bidirectional</div>
          <div className="lang-actions">
            <input
              className="seed-input"
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRegenerate();
              }}
              placeholder="seed (auto)"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="random language seed"
            />
            <button className="lang-btn" onClick={onRegenerate}>
              ⤬ generate
            </button>
            <button
              className="lang-btn"
              onClick={onReset}
              disabled={!canReset}
              title={canReset ? undefined : "already on the seed language"}
            >
              ↺ reset
            </button>
          </div>
        </div>
      </div>
      <p className="lang-tag">
        <span className="lang-name">{L.id}</span>
        <span className="sep">·</span>
        word order <strong>{order}</strong>
        <span className="sep">·</span>
        {align === "nom-acc" ? "nominative–accusative" : align}
        <span className="sep">·</span>
        {affixPosition === "suffix" ? "suffixing" : "prefixing"}
        <span className="sep">·</span>
        {oblique === "post-verb" ? "post-verbal obliques" : "pre-verbal obliques"}
      </p>
    </header>
  );
}

// ============================================================
// Workbench (Compose | Parse)
// ============================================================

function Workbench({
  parseInput,
  setParseInput,
}: {
  parseInput: string;
  setParseInput: (s: string) => void;
}) {
  return (
    <section className="section">
      <div className="section-head">
        <span className="section-no">§ I</span>
        <h2 className="section-title">Workbench</h2>
        <span className="section-tag">interactive</span>
      </div>
      <div className="workbench">
        <ComposePanel />
        <ParsePanel input={parseInput} setInput={setParseInput} />
      </div>
    </section>
  );
}

// ============================================================
// Compose: build a frame, see the surface text
// ============================================================

function ComposePanel() {
  const L = useLanguage();
  const [frameId, setFrameId] = useState<string>(FRAME_LIST[0]!.id);
  const frame = FRAMES[frameId]!;
  const [roles, setRoles] = useState<Record<string, RoleFiller>>(() =>
    defaultRolesFor(L, frame),
  );
  // Disambiguates declarative vs imperative when no wildcard is present.
  const [explicitMood, setExplicitMood] = useState<UiMood>("declarative");

  // Switching frames must update frameId and roles together — useEffect runs
  // after render, which would let the render see new role names against the
  // old roles map and crash inside RoleEditor.
  const selectFrame = (nextId: string) => {
    if (nextId === frameId) return;
    setFrameId(nextId);
    setRoles(defaultRolesFor(L, FRAMES[nextId]!));
    if (FRAMES[nextId]!.category !== "action" && explicitMood === "imperative") {
      setExplicitMood("declarative");
    }
  };

  const mood = moodOf(roles, explicitMood);
  const imperativeAllowed = frame.category === "action";

  const setMood = (next: UiMood) => {
    if (next === mood) return;
    if (next === "interrogative") {
      // Wildcard the last role.
      const last = frame.roles[frame.roles.length - 1]!;
      setRoles((prev) => ({ ...prev, [last.name]: "?" as const }));
      setExplicitMood("declarative"); // reset; mood derives from wildcard now
    } else {
      // declarative or imperative — both are wildcard-free.
      setRoles((prev) => {
        const out: Record<string, RoleFiller> = {};
        for (const role of frame.roles) {
          const cur = prev[role.name];
          if (cur === "?") {
            const [first] = compatibleConcepts(L, role.types);
            out[role.name] = {
              type: first!.entry.semanticType!,
              conceptId: first!.conceptId,
            };
          } else {
            out[role.name] = cur!;
          }
        }
        return out;
      });
      setExplicitMood(next);
    }
  };

  const setRoleValue = (roleName: string, value: string) => {
    const role = frame.roles.find((r) => r.name === roleName)!;
    setRoles((prev) => {
      const next = { ...prev };
      if (value === "?") {
        // Clear any other "?" first
        for (const r of frame.roles) {
          if (r.name !== roleName && next[r.name] === "?") {
            const [first] = compatibleConcepts(L, r.types);
            next[r.name] = {
              type: first!.entry.semanticType!,
              conceptId: first!.conceptId,
            };
          }
        }
        next[roleName] = "?";
      } else {
        const entry = L.lexicon[value];
        if (!entry) throw new Error(`unknown concept ${value}`);
        next[roleName] = {
          type: entry.semanticType!,
          conceptId: value,
        };
      }
      return next;
    });
  };

  const filled: FilledFrame = { predicate: frameId, mood, roles };

  let result: { gloss: FrameGloss; error: null } | { gloss: null; error: string };
  try {
    validateFilledFrame(filled);
    result = { gloss: glossFrame(L, filled), error: null };
  } catch (e) {
    result = { gloss: null, error: String(e instanceof Error ? e.message : e) };
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3 className="panel-name">§ I.a — Compose</h3>
        <span className="panel-flow">frame → text</span>
      </div>

      <div className="field">
        <div className="field-label">Predicate</div>
        <div className="pills">
          {FRAME_LIST.map((f) => (
            <button
              key={f.id}
              className="pill"
              aria-pressed={f.id === frameId}
              onClick={() => selectFrame(f.id)}
            >
              {f.id}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <div className="field-label">Mood</div>
        <div className="pills">
          <button
            className="pill"
            aria-pressed={mood === "declarative"}
            onClick={() => setMood("declarative")}
          >
            declarative
          </button>
          <button
            className="pill"
            aria-pressed={mood === "interrogative"}
            onClick={() => setMood("interrogative")}
          >
            interrogative
          </button>
          <button
            className="pill"
            aria-pressed={mood === "imperative"}
            onClick={() => setMood("imperative")}
            disabled={!imperativeAllowed}
            title={
              imperativeAllowed
                ? undefined
                : "imperative only applies to action frames"
            }
          >
            imperative
          </button>
        </div>
      </div>

      <div className="field">
        <div className="field-label">Roles</div>
        <div className="roles">
          {frame.roles.map((role) => (
            <RoleEditor
              key={role.name}
              role={role}
              value={roles[role.name]!}
              onChange={(v) => setRoleValue(role.name, v)}
            />
          ))}
        </div>
      </div>

      {result.gloss ? (
        <SurfaceOutput gloss={result.gloss} />
      ) : (
        <div className="surface">
          <div className="surface-label">surface</div>
          <div className="parse-status error">
            <span className="glyph">×</span> {result.error}
          </div>
        </div>
      )}
    </div>
  );
}

function RoleEditor({
  role,
  value,
  onChange,
}: {
  role: RoleSpec;
  value: RoleFiller;
  onChange: (v: string) => void;
}) {
  const L = useLanguage();
  const opts = compatibleConcepts(L, role.types);
  const isWild = value === "?";
  const selectValue = isWild ? "?" : value.conceptId;

  // Determine which wh-word would be used for this role's wildcard.
  const whConcept = WH_FOR_TYPE[role.types[0]!];
  const whEntry = L.lexicon[whConcept];

  return (
    <div className={`role-row ${isWild ? "is-wild" : ""}`}>
      <div className="role-meta">
        <span className="role-name">{role.name}</span>
        <span className="role-types">{role.types.join("|")}</span>
        <span className="role-grammar">· {role.grammar}</span>
      </div>
      <select
        className="select"
        value={selectValue}
        onChange={(e) => onChange(e.target.value)}
      >
        {opts.map((o) => (
          <option key={o.conceptId} value={o.conceptId}>
            {o.conceptId} ({o.entry.stem})
          </option>
        ))}
        <option value="?">
          ? — wildcard ({whEntry?.stem ?? "—"})
        </option>
      </select>
    </div>
  );
}

function SurfaceOutput({ gloss }: { gloss: FrameGloss }) {
  // Flash the box when the surface string changes.
  const ref = useRef<HTMLDivElement>(null);
  const lastSurface = useRef(gloss.surface);
  useEffect(() => {
    if (lastSurface.current !== gloss.surface) {
      lastSurface.current = gloss.surface;
      const el = ref.current;
      if (el) {
        el.classList.remove("flash");
        // force reflow
        void el.offsetWidth;
        el.classList.add("flash");
      }
    }
  }, [gloss.surface]);

  return (
    <div className="surface" ref={ref}>
      <div className="surface-label">surface · interlinear</div>
      <InterlinearGloss words={gloss.words} />
    </div>
  );
}

function InterlinearGloss({ words }: { words: GlossedWord[] }) {
  return (
    <div className="gloss-stack">
      {words.map((w, i) => (
        <div className="gloss-cell" key={i}>
          <div className="gloss-surface">{w.surface}</div>
          <div className="gloss-tag">
            <span className={`label ${w.label.startsWith("?") ? "wh" : ""}`}>
              {w.label}
            </span>
            {w.tags.map((t, j) => (
              <span key={j}>
                <span className="muted">.</span>
                <span className="feat">{t}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Parse: type text, see decoded frame
// ============================================================

function ParsePanel({
  input,
  setInput,
}: {
  input: string;
  setInput: (s: string) => void;
}) {
  const L = useLanguage();

  const parsed = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      return { kind: "empty" as const };
    }
    try {
      const frame = decodeText(L, trimmed);
      const gloss = glossFrame(L, frame);
      return { kind: "ok" as const, frame, gloss };
    } catch (e) {
      const message =
        e instanceof ParseError
          ? e.message
          : e instanceof Error
            ? e.message
            : String(e);
      return { kind: "error" as const, message };
    }
  }, [input, L]);

  return (
    <div className="panel">
      <div className="panel-head">
        <h3 className="panel-name">§ I.b — Parse</h3>
        <span className="panel-flow">text → frame</span>
      </div>

      <div className="field">
        <div className="field-label">Input</div>
        <input
          className={`parse-input ${parsed.kind === "error" ? "is-error" : ""}`}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`type a sentence in ${L.id}…`}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        {parsed.kind === "ok" && (
          <div className="parse-status ok">
            <span className="glyph">✓</span> parsed
          </div>
        )}
        {parsed.kind === "error" && (
          <div className="parse-status error">
            <span className="glyph">×</span> {parsed.message}
          </div>
        )}
        {parsed.kind === "empty" && (
          <div className="parse-status empty">
            <span className="glyph">·</span> awaiting input
          </div>
        )}
      </div>

      {parsed.kind === "ok" && (
        <>
          <div className="surface" style={{ marginTop: 22 }}>
            <div className="surface-label">interlinear</div>
            <InterlinearGloss words={parsed.gloss.words} />
          </div>
          <FrameDisplay frame={parsed.frame} />
        </>
      )}
    </div>
  );
}

function FrameDisplay({ frame }: { frame: FilledFrame }) {
  const L = useLanguage();
  const spec = FRAMES[frame.predicate]!;
  return (
    <div className="frame-display">
      <div className="frame-row">
        <div className="frame-key">predicate</div>
        <div className="frame-val">
          <span className="predicate">{frame.predicate}</span>
          <span className="badge">{frame.mood}</span>
        </div>
      </div>
      <div className="frame-row">
        <div className="frame-key">roles</div>
        <div className="frame-val">
          {spec.roles.map((role) => {
            const filler = frame.roles[role.name];
            const caseTag = caseForGrammar(L, role.grammar);
            return (
              <div className="role-bind" key={role.name}>
                <span className="role-tag">{role.name}</span>
                <span className="case-tag">{caseTag}</span>
                {filler === "?" ? (
                  <span className="filler wh">
                    ? · expects {role.types[0]}
                  </span>
                ) : (
                  <span className="filler">
                    {filler?.conceptId}{" "}
                    <span className="muted">
                      ({filler?.type.toLowerCase()})
                    </span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Lexicon reference
// ============================================================

function LexiconReference() {
  const L = useLanguage();
  // Bucket lexicon entries by category.
  const byCat: Record<string, [string, LexiconEntry][]> = {
    verb: [],
    noun: [],
    pronoun: [],
    wh: [],
  };
  for (const [conceptId, entry] of Object.entries(L.lexicon)) {
    byCat[entry.category]!.push([conceptId, entry]);
  }

  return (
    <section className="section">
      <div className="section-head">
        <span className="section-no">§ II</span>
        <h2 className="section-title">Lexicon</h2>
        <span className="section-tag">{Object.keys(L.lexicon).length} entries</span>
      </div>
      <div className="ref-grid">
        <RefColumn
          title="Verbs"
          rows={byCat.verb!.map(([id, e]) => [id, e.stem, `→ ${e.frame}`])}
        />
        <RefColumn
          title="Nouns"
          rows={byCat.noun!.map(([id, e]) => [id, e.stem, e.semanticType ?? ""])}
        />
        <RefColumn
          title="Pronouns"
          rows={byCat.pronoun!.map(([id, e]) => [id, e.stem, e.semanticType ?? ""])}
        />
        <RefColumn
          title="Wh-words"
          rows={byCat.wh!.map(([id, e]) => [id, e.stem, `for ${e.semanticType}`])}
        />
      </div>
    </section>
  );
}

function RefColumn({
  title,
  rows,
}: {
  title: string;
  rows: [string, string, string][];
}) {
  return (
    <div className="ref-col">
      <h4>{title}</h4>
      <table>
        <tbody>
          {rows.map(([id, stem, meta]) => (
            <tr key={id}>
              <td>{id}</td>
              <td>
                {stem}
                {meta && <span className="gloss-meta">{meta}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Morphology reference
// ============================================================

function MorphologyReference() {
  const L = useLanguage();
  const cases: Case[] = ["NOM", "ACC", "DAT"];
  const moods: MoodTag[] = ["DECL", "Q", "IMP"];

  return (
    <section className="section">
      <div className="section-head">
        <span className="section-no">§ III</span>
        <h2 className="section-title">Morphology &amp; Syntax</h2>
        <span className="section-tag">{L.morphology.alignment}</span>
      </div>
      <div className="morph-grid">
        <div className="morph-block">
          <h4>Case affixes</h4>
          {cases.map((c) => {
            const a = L.morphology.case[c];
            return (
              <div className="morph-row" key={c}>
                <span className="morph-tag">{c}</span>
                <span className="morph-form">
                  {a.form === "" ? (
                    <span className="zero">∅</span>
                  ) : (
                    <>{a.position === "prefix" ? `${a.form}-` : `-${a.form}`}</>
                  )}
                  <span className="pos">{a.position}</span>
                </span>
              </div>
            );
          })}
        </div>
        <div className="morph-block">
          <h4>Mood affixes</h4>
          {moods.map((m) => {
            const a = L.morphology.mood[m];
            return (
              <div className="morph-row" key={m}>
                <span className="morph-tag">{m}</span>
                <span className="morph-form">
                  {a.form === "" ? (
                    <span className="zero">∅</span>
                  ) : (
                    <>{a.position === "prefix" ? `${a.form}-` : `-${a.form}`}</>
                  )}
                  <span className="pos">{a.position}</span>
                </span>
              </div>
            );
          })}
        </div>
        <div className="morph-block">
          <h4>Syntax</h4>
          <div className="morph-meta">
            <div><span className="k">word order</span> {L.syntax.wordOrder}</div>
            <div><span className="k">obliques</span> {L.syntax.obliquePosition}</div>
            <div><span className="k">alignment</span> {L.morphology.alignment}</div>
            <div><span className="k">role → case</span> subject→NOM, object→ACC, oblique→DAT</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Footer
// ============================================================

function Footer() {
  return (
    <footer className="footer">
      <div>fledgling · v0.1 · translator workbench</div>
      <em>“one seed, one language.”</em>
    </footer>
  );
}
