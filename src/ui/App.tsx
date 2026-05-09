import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  EntityRef,
  FRAMES,
  FilledFrame,
  FrameSpec,
  Pronoun,
  RoleFiller,
  RoleSpec,
  RoleType,
  isEntityRef,
  isNestedFrame,
  isPronoun,
  isUnknown,
} from "../lang/frames.js";
import {
  Affix,
  Case,
  Difficulty,
  LanguageSpec,
  LexiconEntry,
  MoodTag,
  caseForGrammar,
} from "../lang/language-spec.js";
import type { Number_, Tense } from "../lang/frames.js";
import { encodeFrame } from "../lang/encoder.js";
import { ParseError, decodeText } from "../lang/decoder.js";
import { EXAMPLE_LANGUAGE } from "../lang/example-language.js";
import { randomLanguage, randomSeedString } from "../lang/random-language.js";
import {
  FrameGloss,
  GlossedWord,
  glossFrame,
} from "../lang/gloss.js";
import {
  FrameTextError,
  formatFrameText,
  parseFrameText,
} from "../lang/frame-text.js";

const FRAME_LIST = Object.values(FRAMES);

// The active language is held in App state and exposed via context so deep
// children don't need explicit prop drilling.
const LanguageContext = createContext<LanguageSpec>(EXAMPLE_LANGUAGE);
const useLanguage = (): LanguageSpec => useContext(LanguageContext);

// Sample frame used to seed the parse panel with a known-good sentence in
// whatever language is active. WANT(SMITH, ?) → "what does the smith want?"
// — a question, signalled by the "unknown" filler in the desired role.
const PARSE_SEED_FRAME: FilledFrame = {
  predicate: "WANT",
  mood: "declarative",
  roles: {
    wanter: { type: "ANIMATE", conceptId: "SMITH" },
    desired: "unknown",
  },
};

// ============================================================
// Compose helpers — frame DSL examples
// ============================================================

const COMPOSE_EXAMPLES: { label: string; dsl: string }[] = [
  { label: "declarative",        dsl: "WANT(wanter=SMITH, desired=FLINT)" },
  { label: "wh-question",        dsl: "WANT(wanter=listener, desired=unknown)" },
  { label: "polar question",     dsl: "?HAVE(owner=listener, theme=FLINT)" },
  { label: "imperative",         dsl: "!GIVE(agent=listener, recipient=self, theme=STICK)" },
  { label: "negated · past",     dsl: "~HAVE.past(owner=SMITH, theme=BREAD)" },
  { label: "1st-person",         dsl: "EAT(agent=self, patient=BREAD)" },
  { label: "3rd-person anaphor", dsl: "WANT(wanter=reference, desired=FLINT)" },
  { label: "plural",             dsl: "EAT(agent=SMITH.pl, patient=BREAD)" },
  { label: "nested",             dsl: "SAY(speaker=SMITH, recipient=self, content=[WANT(wanter=listener, desired=FLINT)])" },
];

// ============================================================
// Root
// ============================================================

export function App() {
  const [L, setL] = useState<LanguageSpec>(EXAMPLE_LANGUAGE);
  const [seed, setSeed] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty>("full");
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

  const regenerate = () => {
    const trimmed = seed.trim();
    const used = trimmed === "" ? randomSeedString() : trimmed;
    installLanguage(randomLanguage(used, difficulty));
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
          difficulty={difficulty}
          setDifficulty={setDifficulty}
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
  difficulty,
  setDifficulty,
  onRegenerate,
  onReset,
  canReset,
}: {
  seed: string;
  setSeed: (s: string) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
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
  const activeDifficulty: Difficulty = L.difficulty ?? "full";
  return (
    <header>
      <div className="masthead">
        <div>
          <h1 className="title">
            Fledgling<em>.</em>
          </h1>
          <div className="subtitle">Translator Workbench · vol II</div>
        </div>
        <div className="colophon">
          <div><strong>Language</strong> {L.id}</div>
          <div>{stemCount} lexical entries</div>
          <div>frame ↔ surface bidirectional</div>
          <div className="lang-actions difficulty-row" role="group" aria-label="difficulty">
            <span className="difficulty-label">difficulty</span>
            <button
              type="button"
              className="pill difficulty-pill"
              aria-pressed={difficulty === "simple"}
              onClick={() => setDifficulty("simple")}
              title="bare stems · mood as sentence particle"
            >
              simple
            </button>
            <button
              type="button"
              className="pill difficulty-pill"
              aria-pressed={difficulty === "full"}
              onClick={() => setDifficulty("full")}
              title="case + tense + number affixes, optional agreement"
            >
              full
            </button>
          </div>
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
        <span className={`difficulty-tag is-${activeDifficulty}`}>{activeDifficulty}</span>
        <span className="sep">·</span>
        word order <strong>{order}</strong>
        <span className="sep">·</span>
        {align === "nom-acc" ? "nominative–accusative" : align}
        <span className="sep">·</span>
        {affixPosition === "suffix" ? "suffixing" : "prefixing"}
        <span className="sep">·</span>
        {oblique === "post-verb" ? "post-verbal obliques" : "pre-verbal obliques"}
        <span className="sep">·</span>
        {L.syntax.negationStrategy === "affix"
          ? "affixal negation"
          : `${L.syntax.negationStrategy} negation`}
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
// Compose helpers — build default frames + role filler choices
// ============================================================

// Concepts (entity refs) compatible with a role's accepted types. Excludes
// verbs and wh-words (those aren't role fillers); pronouns are handled
// separately by `pronounsFor`. Sorted by conceptId for stable UI ordering.
function conceptsFor(
  spec: LanguageSpec,
  types: readonly RoleType[],
): { conceptId: string; entry: LexiconEntry; type: RoleType }[] {
  const out: { conceptId: string; entry: LexiconEntry; type: RoleType }[] = [];
  for (const [conceptId, entry] of Object.entries(spec.lexicon)) {
    if (entry.category !== "noun") continue;
    if (!entry.semanticType) continue;
    if (!types.includes(entry.semanticType)) continue;
    out.push({ conceptId, entry, type: entry.semanticType });
  }
  out.sort((a, b) => a.conceptId.localeCompare(b.conceptId));
  return out;
}

// Pronouns valid as a filler for a given role. self/listener are 1st/2nd
// person and only fit ANIMATE-accepting roles; reference and unknown are
// always offered (reference can stand in for any prior salient entity;
// unknown is the wh-wildcard that turns the frame into a question).
function pronounsFor(types: readonly RoleType[]): Pronoun[] {
  const animateOk = types.includes("ANIMATE");
  const out: Pronoun[] = [];
  if (animateOk) out.push("self", "listener");
  out.push("reference", "unknown");
  return out;
}

// Default filler for a role: first compatible concept, falling back to
// "unknown" when the lexicon has no matching entity. Returning unknown is
// safe — it just means the seeded frame asks a question.
function defaultFillerFor(spec: LanguageSpec, role: RoleSpec): RoleFiller {
  const opts = conceptsFor(spec, role.types);
  const first = opts[0];
  if (first) return { type: first.type, conceptId: first.conceptId };
  return "unknown";
}

function defaultRolesFor(
  spec: LanguageSpec,
  frame: FrameSpec,
): Record<string, RoleFiller> {
  const out: Record<string, RoleFiller> = {};
  for (const role of frame.roles) {
    out[role.name] = defaultFillerFor(spec, role);
  }
  return out;
}

function defaultFrameFor(
  spec: LanguageSpec,
  predicate: string,
): FilledFrame {
  const frame = FRAMES[predicate]!;
  const isAction = frame.category === "action";
  return {
    predicate,
    mood: isAction ? "declarative" : "declarative",
    roles: defaultRolesFor(spec, frame),
  };
}

// Round-trip a filler into the select-option string used by RoleEditor.
// `concept:FLINT`, `pronoun:self`, `nested` are the three families.
function fillerToToken(filler: RoleFiller): string {
  if (isNestedFrame(filler)) return "nested";
  if (isPronoun(filler)) return `pronoun:${filler}`;
  if (isEntityRef(filler)) return `concept:${filler.conceptId}`;
  return "";
}

// Default nested frame inserted when the user picks "[nested]" — a small
// well-formed WANT statement, easy to edit further via the DSL textbox.
function defaultNestedFrame(spec: LanguageSpec): FilledFrame {
  return defaultFrameFor(spec, "WANT");
}

// ============================================================
// Compose: build a frame, see the surface text
// ============================================================

const SEED_TEXT = formatFrameText(PARSE_SEED_FRAME);

function ComposePanel() {
  const L = useLanguage();
  // Frame state is the source of truth; the DSL textbox is a derived,
  // bidirectionally-editable view. Structured controls mutate `frame`
  // and reformat the text; text edits re-parse and update `frame`.
  const [frame, setFrame] = useState<FilledFrame>(PARSE_SEED_FRAME);
  const [text, setText] = useState<string>(SEED_TEXT);
  const [parseError, setParseError] = useState<string | null>(null);

  const updateFromText = (next: string) => {
    setText(next);
    const trimmed = next.trim();
    if (!trimmed) {
      setParseError(null);
      return;
    }
    try {
      const parsed = parseFrameText(
        trimmed,
        (id) => L.lexicon[id]?.semanticType,
      );
      setFrame(parsed);
      setParseError(null);
    } catch (e) {
      const message =
        e instanceof FrameTextError || e instanceof Error
          ? e.message
          : String(e);
      setParseError(message);
    }
  };

  const updateFrame = (mut: (f: FilledFrame) => FilledFrame) => {
    const next = mut(frame);
    setFrame(next);
    setText(formatFrameText(next));
    setParseError(null);
  };

  // Recompute gloss on every render — `frame` is whatever the user has
  // most recently committed (either via structured controls or a valid DSL
  // edit). Errors don't disturb it.
  const gloss = useMemo<FrameGloss | null>(() => {
    try {
      return glossFrame(L, frame);
    } catch {
      return null;
    }
  }, [frame, L]);

  const spec = FRAMES[frame.predicate];
  const isAction = spec?.category === "action";

  // ── handlers for the structured controls ──────────────────────
  const setPredicate = (id: string) => {
    if (id === frame.predicate) return;
    updateFrame(() => defaultFrameFor(L, id));
  };

  const setMood = (mood: "declarative" | "imperative") => {
    if (mood === frame.mood) return;
    updateFrame((f) => ({ ...f, mood }));
  };

  const setTense = (tense: "past" | "present" | "future") => {
    updateFrame((f) => {
      const next = { ...f };
      if (tense === "present") delete next.tense;
      else next.tense = tense;
      return next;
    });
  };

  const setNegated = (negated: boolean) => {
    updateFrame((f) => {
      const next = { ...f };
      if (negated) next.negated = true;
      else delete next.negated;
      return next;
    });
  };

  const setRoleFiller = (roleName: string, token: string) => {
    updateFrame((f) => {
      const role = FRAMES[f.predicate]!.roles.find((r) => r.name === roleName)!;
      let nextFiller: RoleFiller;
      if (token === "nested") {
        nextFiller = { kind: "frame", frame: defaultNestedFrame(L) };
      } else if (token.startsWith("pronoun:")) {
        nextFiller = token.slice("pronoun:".length) as Pronoun;
      } else if (token.startsWith("concept:")) {
        const conceptId = token.slice("concept:".length);
        const entry = L.lexicon[conceptId];
        const type = (entry?.semanticType ?? role.types[0]) as RoleType;
        const ref: EntityRef = { type, conceptId };
        // Preserve plurality if the previous filler was a plural entity ref.
        const prev = f.roles[roleName];
        if (prev && isEntityRef(prev) && prev.number === "pl") ref.number = "pl";
        nextFiller = ref;
      } else {
        return f;
      }
      // Switching one role to "unknown" must clear any other "unknown" —
      // validateFilledFrame allows at most one wildcard.
      const nextRoles: Record<string, RoleFiller> = { ...f.roles };
      if (nextFiller === "unknown") {
        for (const r of FRAMES[f.predicate]!.roles) {
          if (r.name !== roleName && nextRoles[r.name] === "unknown") {
            nextRoles[r.name] = defaultFillerFor(L, r);
          }
        }
      }
      nextRoles[roleName] = nextFiller;
      return { ...f, roles: nextRoles };
    });
  };

  const setRoleNumber = (roleName: string, number: "sg" | "pl") => {
    updateFrame((f) => {
      const filler = f.roles[roleName];
      if (!filler || !isEntityRef(filler)) return f;
      const nextRef: EntityRef = { type: filler.type, conceptId: filler.conceptId };
      if (number === "pl") nextRef.number = "pl";
      return { ...f, roles: { ...f.roles, [roleName]: nextRef } };
    });
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h3 className="panel-name">§ I.a — Compose</h3>
        <span className="panel-flow">structured · frame → surface</span>
      </div>

      <div className="field">
        <div className="field-label">Predicate</div>
        <div className="pills">
          {FRAME_LIST.map((f) => (
            <button
              key={f.id}
              className="pill"
              type="button"
              aria-pressed={f.id === frame.predicate}
              onClick={() => setPredicate(f.id)}
              title={`${f.id} · ${f.category} · ${f.roles.map((r) => r.name).join(", ")}`}
            >
              {f.id}
            </button>
          ))}
        </div>
      </div>

      <div className="field compose-modifiers">
        <div className="modifier-group">
          <div className="field-label">Mood</div>
          <div className="pills">
            <button
              className="pill"
              type="button"
              aria-pressed={frame.mood === "declarative"}
              onClick={() => setMood("declarative")}
            >
              declarative
            </button>
            <button
              className="pill"
              type="button"
              aria-pressed={frame.mood === "imperative"}
              onClick={() => setMood("imperative")}
              disabled={!isAction}
              title={
                isAction
                  ? undefined
                  : "imperative requires an action frame"
              }
            >
              imperative
            </button>
          </div>
        </div>
        <div className="modifier-group">
          <div className="field-label">Tense</div>
          <div className="pills">
            {(["past", "present", "future"] as const).map((t) => {
              const active = (frame.tense ?? "present") === t;
              return (
                <button
                  key={t}
                  className="pill"
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTense(t)}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
        <div className="modifier-group">
          <div className="field-label">Polarity</div>
          <div className="pills">
            <button
              className="pill"
              type="button"
              aria-pressed={!frame.negated}
              onClick={() => setNegated(false)}
            >
              affirmative
            </button>
            <button
              className="pill"
              type="button"
              aria-pressed={!!frame.negated}
              onClick={() => setNegated(true)}
            >
              negated
            </button>
          </div>
        </div>
      </div>

      <div className="field">
        <div className="field-label">Roles</div>
        {spec ? (
          <div className="roles">
            {spec.roles.map((role) => (
              <RoleEditor
                key={role.name}
                role={role}
                filler={frame.roles[role.name]}
                onSelect={(token) => setRoleFiller(role.name, token)}
                onNumber={(n) => setRoleNumber(role.name, n)}
              />
            ))}
          </div>
        ) : (
          <div className="parse-status error">
            <span className="glyph">×</span> unknown predicate "{frame.predicate}"
          </div>
        )}
      </div>

      <div className="field">
        <div className="field-label">Frame · DSL</div>
        <textarea
          className={`frame-dsl-input parse-input ${
            parseError ? "is-error" : ""
          }`}
          value={text}
          onChange={(e) => updateFromText(e.target.value)}
          rows={3}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="PRED(role=filler, …) — e.g. WANT(wanter=self, desired=FLINT)"
        />
        {parseError ? (
          <div className="parse-status error">
            <span className="glyph">×</span> {parseError}
          </div>
        ) : (
          <div className="parse-status ok">
            <span className="glyph">✓</span> valid frame
          </div>
        )}
      </div>

      <div className="field">
        <div className="field-label">Examples</div>
        <div className="pills">
          {COMPOSE_EXAMPLES.map((ex) => (
            <button
              key={ex.dsl}
              className="pill"
              aria-pressed={ex.dsl === text.trim()}
              onClick={() => updateFromText(ex.dsl)}
              title={ex.dsl}
              type="button"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {gloss && <SurfaceOutput gloss={gloss} />}
    </div>
  );
}

function RoleEditor({
  role,
  filler,
  onSelect,
  onNumber,
}: {
  role: RoleSpec;
  filler: RoleFiller | undefined;
  onSelect: (token: string) => void;
  onNumber: (n: "sg" | "pl") => void;
}) {
  const L = useLanguage();
  const concepts = conceptsFor(L, role.types);
  const pronouns = pronounsFor(role.types);
  const token = filler ? fillerToToken(filler) : "";
  const isWild = filler === "unknown";
  const isNested = filler !== undefined && isNestedFrame(filler);
  const number =
    filler && isEntityRef(filler) ? filler.number ?? "sg" : "sg";

  return (
    <div
      className={`role-row ${isWild ? "is-wild" : ""} ${isNested ? "has-nested" : ""}`}
    >
      <div className="role-meta">
        <span className="role-name">{role.name}</span>
        <span className="role-types">{role.types.join("|")}</span>
        <span className="role-grammar">· {role.grammar}</span>
      </div>
      <div className="role-controls">
        <select
          className="select"
          value={token}
          onChange={(e) => onSelect(e.target.value)}
        >
          <optgroup label="Concepts">
            {concepts.map((c) => (
              <option key={c.conceptId} value={`concept:${c.conceptId}`}>
                {c.conceptId} ({c.entry.stem})
              </option>
            ))}
            {concepts.length === 0 && (
              <option value="" disabled>
                — none in lexicon —
              </option>
            )}
          </optgroup>
          <optgroup label="Pronouns / wildcard">
            {pronouns.map((p) => (
              <option key={p} value={`pronoun:${p}`}>
                {p === "unknown" ? "? unknown (wh-wildcard)" : p}
              </option>
            ))}
          </optgroup>
          {role.allowsNested && (
            <optgroup label="Nested">
              <option value="nested">[ nested frame ]</option>
            </optgroup>
          )}
        </select>
        {filler && isEntityRef(filler) && (
          <div className="pills num-pills">
            <button
              className="pill"
              type="button"
              aria-pressed={number === "sg"}
              onClick={() => onNumber("sg")}
            >
              sg
            </button>
            <button
              className="pill"
              type="button"
              aria-pressed={number === "pl"}
              onClick={() => onNumber("pl")}
            >
              pl
            </button>
          </div>
        )}
        {isNested && (
          <span className="filler-hint">edit nested via DSL</span>
        )}
      </div>
    </div>
  );
}

function SurfaceOutput({ gloss }: { gloss: FrameGloss }) {
  const ref = useRef<HTMLDivElement>(null);
  const lastSurface = useRef(gloss.surface);
  useEffect(() => {
    if (lastSurface.current !== gloss.surface) {
      lastSurface.current = gloss.surface;
      const el = ref.current;
      if (el) {
        el.classList.remove("flash");
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
          <div className="surface" style={{ marginTop: 14 }}>
            <div className="surface-label">frame · DSL</div>
            <pre className="frame-dsl-output">
              {formatFrameText(parsed.frame)}
            </pre>
          </div>
          <FrameDisplay frame={parsed.frame} />
        </>
      )}
    </div>
  );
}

function FrameDisplay({ frame, depth = 0 }: { frame: FilledFrame; depth?: number }) {
  const L = useLanguage();
  const spec = FRAMES[frame.predicate]!;
  const isQuestion = Object.values(frame.roles).some(isUnknown);

  return (
    <div className={`frame-display ${depth > 0 ? "nested" : ""}`}>
      <div className="frame-row">
        <div className="frame-key">predicate</div>
        <div className="frame-val">
          <span className="predicate">{frame.predicate}</span>
          <span className="badge">{frame.mood}</span>
          {isQuestion && <span className="badge q">interrogative</span>}
          {frame.tense && frame.tense !== "present" && (
            <span className="badge tense">{frame.tense}</span>
          )}
          {frame.negated && <span className="badge neg">NEG</span>}
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
                <FillerView filler={filler} role={role} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FillerView({
  filler,
  role,
}: {
  filler: RoleFiller | undefined;
  role: RoleSpec;
}) {
  if (filler === undefined) {
    return <span className="filler missing">— missing —</span>;
  }
  if (isUnknown(filler)) {
    return (
      <span className="filler wh">
        unknown · wh-{role.types[0]?.toLowerCase()}
      </span>
    );
  }
  if (isPronoun(filler)) {
    return (
      <span className="filler pronoun">
        {filler} <span className="muted">(deictic)</span>
      </span>
    );
  }
  if (isNestedFrame(filler)) {
    return (
      <div className="filler nested-filler">
        <span className="muted">↳ nested</span>
        <FrameDisplay frame={filler.frame} depth={1} />
      </div>
    );
  }
  // EntityRef
  return (
    <span className="filler">
      {filler.conceptId}{" "}
      <span className="muted">({filler.type.toLowerCase()})</span>
      {filler.number === "pl" && <span className="num-tag">pl</span>}
    </span>
  );
}

// ============================================================
// Lexicon reference
// ============================================================

function LexiconReference() {
  const L = useLanguage();
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
          rows={byCat.pronoun!.map(([id, e]) => [
            id,
            e.stem,
            e.person ? `${e.person} · ${e.semanticType?.toLowerCase() ?? ""}` : "",
          ])}
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

function fmtAffix(a: Affix): React.ReactNode {
  if (a.form === "") return <span className="zero">∅</span>;
  return a.position === "prefix" ? `${a.form}-` : `-${a.form}`;
}

function AffixRow({ tag, affix }: { tag: string; affix: Affix }) {
  return (
    <div className="morph-row">
      <span className="morph-tag">{tag}</span>
      <span className="morph-form">
        {fmtAffix(affix)}
        <span className="pos">{affix.position}</span>
      </span>
    </div>
  );
}

function MorphologyReference() {
  const L = useLanguage();
  const cases: Case[] = ["NOM", "ACC", "DAT"];
  const moods: MoodTag[] = ["DECL", "Q", "IMP"];
  const numbers: Number_[] = ["sg", "pl"];
  const tenses: Tense[] = ["present", "past", "future"];
  const isSimple = L.difficulty === "simple";

  return (
    <section className="section">
      <div className="section-head">
        <span className="section-no">§ III</span>
        <h2 className="section-title">Morphology &amp; Syntax</h2>
        <span className="section-tag">{L.morphology.alignment}</span>
      </div>
      <div className="morph-grid">
        <div className="morph-block">
          <h4>Case</h4>
          {cases.map((c) => <AffixRow key={c} tag={c} affix={L.morphology.case[c]} />)}
        </div>

        <div className="morph-block">
          <h4>Mood</h4>
          {moods.map((m) => <AffixRow key={m} tag={m} affix={L.morphology.mood[m]} />)}
        </div>

        <div className="morph-block">
          <h4>Number</h4>
          {numbers.map((n) => <AffixRow key={n} tag={n.toUpperCase()} affix={L.morphology.number[n]} />)}
        </div>

        <div className="morph-block">
          <h4>Tense</h4>
          {tenses.map((t) => (
            <AffixRow key={t} tag={t.toUpperCase().slice(0, 3)} affix={L.morphology.tense[t]} />
          ))}
        </div>

        <div className="morph-block">
          <h4>Negation</h4>
          <AffixRow tag="NEG" affix={L.morphology.negation} />
          <div className="morph-meta">
            <div><span className="k">strategy</span> {L.syntax.negationStrategy}</div>
          </div>
        </div>

        <div className="morph-block">
          <h4>Agreement</h4>
          <div className="morph-meta">
            <div>
              <span className="k">subject↔verb number</span>{" "}
              {L.syntax.agreement.subjectVerbNumber ? "yes" : "no"}
            </div>
          </div>
        </div>

        {isSimple && L.particles && (
          <div className="morph-block">
            <h4>Particles (simple)</h4>
            <div className="morph-row">
              <span className="morph-tag">Q</span>
              <span className="morph-form">
                <strong>{L.particles.Q.form}</strong>
                <span className="pos">{L.particles.Q.position}</span>
              </span>
            </div>
            <div className="morph-row">
              <span className="morph-tag">IMP</span>
              <span className="morph-form">
                <strong>{L.particles.IMP.form}</strong>
                <span className="pos">{L.particles.IMP.position}</span>
              </span>
            </div>
          </div>
        )}

        <div className="morph-block wide">
          <h4>Syntax</h4>
          <div className="morph-meta">
            <div><span className="k">word order</span> {L.syntax.wordOrder}</div>
            <div><span className="k">obliques</span> {L.syntax.obliquePosition}</div>
            <div><span className="k">head direction</span> {L.syntax.headDirection}</div>
            <div><span className="k">adpositions</span> {L.syntax.adpositionOrder}</div>
            <div><span className="k">adjectives</span> {L.syntax.adjectiveOrder}</div>
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
      <div>fledgling · v0.2 · translator workbench</div>
      <em>“one seed, one language.”</em>
    </footer>
  );
}
