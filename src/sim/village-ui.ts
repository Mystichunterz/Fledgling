import { decodeText, ParseError } from "../lang/decoder.js";
import { encodeFrame } from "../lang/encoder.js";
import {
  FilledFrame,
  RoleFiller,
  isEntityRef,
  isNestedFrame,
  isPronoun,
} from "../lang/frames.js";
import { Difficulty } from "../lang/language-spec.js";
import {
  customLanguageNames,
  randomLanguage,
  randomSeedString,
} from "../lang/random-language.js";
import {
  Decision,
  NPC,
  TickEntry,
  decisionFromImperative,
  makeStartingNPCs,
  makeStartingWorld,
  tickAll,
} from "./village.js";

// Generated language used for this demo. Deterministic given (seed,
// difficulty) — see src/lang/random-language.ts. Reassigned in place by
// setLanguage() so the rest of the module always sees the current spec.
let currentSeed = "banana";
let currentDifficulty: Difficulty = "simple";
let LANG = randomLanguage(currentSeed, currentDifficulty);
const MAX_STREAM_TICKS = 60; // hard cap on rendered ticks; older ones get pruned

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`missing element: ${sel}`);
  return el as T;
};

interface SimState {
  world: ReturnType<typeof makeStartingWorld>;
  npcs: NPC[];
  tick: number;
}

function freshState(): SimState {
  return {
    world: makeStartingWorld(),
    npcs: makeStartingNPCs(),
    tick: 0,
  };
}

let state = freshState();
let playing = false;
let timer: number | null = null;
let intervalMs = 1300;

// Pending overrides for upcoming tick — keyed by NPC id. The player's
// imperatives drop a Decision in here; tickAll() consumes one per NPC.
const pendingOverrides = new Map<string, Decision>();

const els = {
  npcs: $("#npcs") as HTMLDivElement,
  lex: $("#lex") as HTMLDivElement,
  morph: $("#morph") as HTMLDivElement,
  headerMeta: $("#header-meta") as HTMLSpanElement,
  stream: $("#stream") as HTMLElement,
  tickNum: $("#tick-num") as HTMLSpanElement,
  play: $("#play") as HTMLButtonElement,
  step: $("#step") as HTMLButtonElement,
  reset: $("#reset") as HTMLButtonElement,
  speed: $("#speed") as HTMLInputElement,
  speedVal: $("#speed-val") as HTMLSpanElement,
  schemaToggle: $("#schema-toggle") as HTMLInputElement,
  cmdForm: $("#cmd-form") as HTMLFormElement,
  cmdInput: $("#cmd-input") as HTMLInputElement,
  cmdTarget: $("#cmd-target") as HTMLSelectElement,
  cmdError: $("#cmd-error") as HTMLDivElement,
  langForm: $("#lang-form") as HTMLFormElement,
  langSeed: $("#lang-seed") as HTMLInputElement,
  langDifficulty: $("#lang-difficulty") as HTMLSelectElement,
  langRandom: $("#lang-random") as HTMLButtonElement,
  langPresets: $("#lang-presets") as HTMLSpanElement,
};

function renderHeaderMeta(): void {
  const parts = [
    LANG.id,
    LANG.syntax.wordOrder,
    LANG.morphology.alignment,
    `${LANG.difficulty ?? "full"}-mode`,
  ];
  els.headerMeta.textContent = parts.join(" · ");
}

// Format an affix as "-foo" / "foo-" / "∅" depending on form/position.
function fmtAffix(a: { form: string; position: "prefix" | "suffix" }): string {
  if (a.form === "") return "∅";
  return a.position === "prefix" ? `${a.form}-` : `-${a.form}`;
}

// ─── Morphology / particle cheat sheet ─────────────────────────────
function renderMorphology(): void {
  els.morph.innerHTML = "";
  const m = LANG.morphology;
  const sx = LANG.syntax;
  const isSimple = LANG.difficulty === "simple";

  const pairs: { name: string; val: string }[] = [];
  pairs.push({ name: "order", val: sx.wordOrder });

  if (isSimple) {
    // In simple mode every affix is zero — show the mood particles
    // that actually carry information.
    if (LANG.particles) {
      const q = LANG.particles.Q;
      const imp = LANG.particles.IMP;
      pairs.push({ name: "Q", val: `${q.form} (${q.position})` });
      pairs.push({ name: "IMP", val: `${imp.form} (${imp.position})` });
    }
    pairs.push({ name: "marks", val: "case/number/tense all unmarked" });
  } else {
    // Full mode: list whichever affix forms are non-zero.
    if (m.case.ACC.form) pairs.push({ name: "ACC", val: fmtAffix(m.case.ACC) });
    if (m.case.DAT.form) pairs.push({ name: "DAT", val: fmtAffix(m.case.DAT) });
    if (m.number.pl.form) pairs.push({ name: "PL", val: fmtAffix(m.number.pl) });
    if (m.tense.past.form) pairs.push({ name: "PAST", val: fmtAffix(m.tense.past) });
    if (m.tense.future.form) pairs.push({ name: "FUT", val: fmtAffix(m.tense.future) });
    if (m.mood.Q.form) pairs.push({ name: "Q", val: fmtAffix(m.mood.Q) });
    if (m.mood.IMP.form) pairs.push({ name: "IMP", val: fmtAffix(m.mood.IMP) });
  }

  const div = document.createElement("div");
  div.className = "lex-group";
  const label = document.createElement("span");
  label.className = "grp";
  label.textContent = isSimple ? "Particles & order" : "Affixes";
  const row = document.createElement("div");
  row.className = "pairs";
  for (const { name, val } of pairs) {
    const p = document.createElement("span");
    p.className = "pair";
    p.innerHTML = `<b>${val}</b> ${name}`;
    row.appendChild(p);
  }
  div.appendChild(label);
  div.appendChild(row);
  els.morph.appendChild(div);
}

// ─── Lexicon cheat sheet ───────────────────────────────────────────
function renderLexicon(): void {
  const groups: Record<string, string[]> = {
    Verbs: ["EAT", "MOVE", "SEE", "WANT", "TAKE", "BE_AT", "SAY"],
    Items: ["BREAD", "WATER"],
    Locations: ["FOREST", "MEADOW", "FORGE", "CAVE"],
    NPCs: ["WOODSMAN", "SMITH"],
  };
  els.lex.innerHTML = "";
  for (const [grp, ids] of Object.entries(groups)) {
    const div = document.createElement("div");
    div.className = "lex-group";
    const label = document.createElement("span");
    label.className = "grp";
    label.textContent = grp;
    const pairs = document.createElement("div");
    pairs.className = "pairs";
    for (const id of ids) {
      const stem = LANG.lexicon[id]?.stem ?? "??";
      const p = document.createElement("span");
      p.className = "pair";
      p.innerHTML = `<b>${stem}</b> ${id.toLowerCase()}`;
      pairs.appendChild(p);
    }
    div.appendChild(label);
    div.appendChild(pairs);
    els.lex.appendChild(div);
  }
}

// ─── NPC panels ────────────────────────────────────────────────────
function renderNPCs(actingId?: string): void {
  els.npcs.innerHTML = "";
  for (const npc of state.npcs) {
    const card = document.createElement("div");
    card.className = "npc";
    if (npc.id === actingId) card.classList.add("acting");

    const inv =
      npc.inventory.size === 0
        ? `<span style="color:var(--ink-faint)">empty</span>`
        : [...npc.inventory]
            .map((i) => `<span class="item">${i.toLowerCase()}</span>`)
            .join("");

    const needRow = (label: string, val: number, threshold: number) => {
      const over = val > threshold ? " over" : "";
      return `
        <div class="need${over}">
          <div class="need-label"><span>${label}</span><span class="val">${val}</span></div>
          <div class="meter"><span style="width:${val}%"></span></div>
        </div>`;
    };

    card.innerHTML = `
      <h2>${npc.displayName}<span class="loc">${npc.location.toLowerCase()}</span></h2>
      <div class="id">${npc.id.toLowerCase()} · stem “${LANG.lexicon[npc.id]?.stem ?? "?"}”</div>
      ${needRow("hunger", npc.hunger, npc.threshold.hunger)}
      ${needRow("thirst", npc.thirst, npc.threshold.thirst)}
      <div class="inv">carrying: ${inv}</div>
    `;
    els.npcs.appendChild(card);
  }
}

// ─── English gloss ─────────────────────────────────────────────────
// Rough word-for-word English rendering of a FilledFrame. Not real
// translation — just enough to read a stream entry without thinking
// about frame structure. Resolves NPC ids to display names; everything
// else is lowercased ("bread", "meadow"). Tense = past/present/future,
// imperative gets "!" and an addressee prefix when known.

function npcDisplayName(id: string): string | null {
  const n = state.npcs.find((n) => n.id === id);
  return n ? n.displayName : null;
}

// `selfNP` and `listenerNP` are how the deictic pronouns "self" and
// "listener" should be rendered at this scope. At the top level we
// pass the decision-owner's display name as selfNP so action narrations
// read "Henu eats bread", not "I eats bread". Inside a SAY's nested
// content frame we pass "I"/"you" so quoted speech reads naturally.
type GlossCtx = { selfNP?: string; listenerNP?: string };

function englishNP(
  filler: RoleFiller,
  ctx: GlossCtx,
  opts?: { whFor?: "ANIMATE" | "ITEM" | "LOCATION" },
): string {
  if (filler === "self") return ctx.selfNP ?? "I";
  if (filler === "listener") return ctx.listenerNP ?? "you";
  if (filler === "reference") return "they";
  if (filler === "unknown") {
    switch (opts?.whFor) {
      case "ANIMATE": return "who";
      case "LOCATION": return "where";
      case "ITEM":
      default: return "what";
    }
  }
  if (isPronoun(filler)) return String(filler);
  if (isNestedFrame(filler)) return `"${englishGloss(filler.frame, ctx)}"`;
  if (isEntityRef(filler)) {
    if (filler.type === "ANIMATE") {
      return npcDisplayName(filler.conceptId) ?? filler.conceptId.toLowerCase();
    }
    const base = filler.conceptId.toLowerCase();
    return filler.number === "pl" ? `${base}s` : base;
  }
  return "?";
}

// "I"/"you"/"they"/proper-name take a bare verb in the present;
// 3rd-person singular nouns take -s. Past/future use canonical forms.
function conjugate(
  np: string,
  forms: { present3sg: string; presentBare: string; past: string; future: string },
  tense?: "past" | "present" | "future",
): string {
  const t = tense ?? "present";
  if (t === "past") return forms.past;
  if (t === "future") return forms.future;
  const bare = np === "I" || np === "you" || np === "they";
  return bare ? forms.presentBare : forms.present3sg;
}

const VERB_FORMS: Record<
  string,
  { present3sg: string; presentBare: string; past: string; future: string }
> = {
  EAT:   { present3sg: "eats",   presentBare: "eat",   past: "ate",     future: "will eat" },
  MOVE:  { present3sg: "goes",   presentBare: "go",    past: "went",    future: "will go" },
  TAKE:  { present3sg: "takes",  presentBare: "take",  past: "took",    future: "will take" },
  SEE:   { present3sg: "sees",   presentBare: "see",   past: "saw",     future: "will see" },
  WANT:  { present3sg: "wants",  presentBare: "want",  past: "wanted",  future: "will want" },
  HAVE:  { present3sg: "has",    presentBare: "have",  past: "had",     future: "will have" },
  GIVE:  { present3sg: "gives",  presentBare: "give",  past: "gave",    future: "will give" },
  MAKE:  { present3sg: "makes",  presentBare: "make",  past: "made",    future: "will make" },
  SAY:   { present3sg: "says",   presentBare: "say",   past: "said",    future: "will say" },
  BE_AT: { present3sg: "is",     presentBare: "are",   past: "was",     future: "will be" },
};

function cap(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

// At the top level, pass `{ selfNP: npc.displayName }` so the speaker's
// own deictic refs render as their name in narration ("Henu eats bread").
// Inside a SAY's nested content the perspective shifts to 1st/2nd
// person ("I ate bread" / "I see you") — that's set up automatically by
// the SAY case below.
export function englishGloss(frame: FilledFrame, ctx: GlossCtx = {}): string {
  const tense = frame.tense ?? "present";
  const isImp = frame.mood === "imperative";
  const neg = frame.negated ? " not" : "";

  const conj = (np: string, predicate: string) => {
    const forms = VERB_FORMS[predicate];
    if (!forms) return predicate.toLowerCase();
    return conjugate(np, forms, tense);
  };

  const r = frame.roles;

  const buildSentence = (subject: string, verbAndRest: string): string => {
    if (isImp) return `${verbAndRest}!`;
    return `${cap(subject)} ${verbAndRest}`;
  };

  switch (frame.predicate) {
    case "EAT": {
      const subj = englishNP(r.agent!, ctx);
      const obj = englishNP(r.patient!, ctx, { whFor: "ITEM" });
      return buildSentence(subj, `${conj(subj, "EAT")}${neg} ${obj}`);
    }
    case "TAKE": {
      const subj = englishNP(r.agent!, ctx);
      const obj = englishNP(r.theme!, ctx, { whFor: "ITEM" });
      return buildSentence(subj, `${conj(subj, "TAKE")}${neg} ${obj}`);
    }
    case "MOVE": {
      const subj = englishNP(r.agent!, ctx);
      const dest = englishNP(r.destination!, ctx, { whFor: "LOCATION" });
      const where = dest === "where" ? "where" : `to ${dest}`;
      return buildSentence(subj, `${conj(subj, "MOVE")}${neg} ${where}`);
    }
    case "SEE": {
      const subj = englishNP(r.viewer!, ctx);
      const obj = englishNP(r.target!, ctx, { whFor: "ITEM" });
      return buildSentence(subj, `${conj(subj, "SEE")}${neg} ${obj}`);
    }
    case "WANT": {
      const subj = englishNP(r.wanter!, ctx);
      const obj = englishNP(r.desired!, ctx, { whFor: "ITEM" });
      return buildSentence(subj, `${conj(subj, "WANT")}${neg} ${obj}`);
    }
    case "HAVE": {
      const subj = englishNP(r.owner!, ctx);
      const obj = englishNP(r.theme!, ctx, { whFor: "ITEM" });
      return buildSentence(subj, `${conj(subj, "HAVE")}${neg} ${obj}`);
    }
    case "GIVE": {
      const subj = englishNP(r.agent!, ctx);
      const obj = englishNP(r.theme!, ctx, { whFor: "ITEM" });
      const rec = englishNP(r.recipient!, ctx, { whFor: "ANIMATE" });
      return buildSentence(subj, `${conj(subj, "GIVE")}${neg} ${obj} to ${rec}`);
    }
    case "MAKE": {
      const subj = englishNP(r.agent!, ctx);
      const obj = englishNP(r.patient!, ctx, { whFor: "ITEM" });
      const src = r.source ? ` from ${englishNP(r.source, ctx, { whFor: "ITEM" })}` : "";
      return buildSentence(subj, `${conj(subj, "MAKE")}${neg} ${obj}${src}`);
    }
    case "BE_AT": {
      const fig = englishNP(r.figure!, ctx, { whFor: "ITEM" });
      const grd = r.ground;
      if (grd === "unknown") {
        const v = conj(fig, "BE_AT");
        return `where ${v}${neg} ${fig}?`;
      }
      const grdStr = englishNP(grd!, ctx, { whFor: "LOCATION" });
      return `${cap(fig)} ${conj(fig, "BE_AT")}${neg} in ${grdStr}`;
    }
    case "SAY": {
      // Outer narration: render speaker/recipient using the OUTER ctx
      // (so "self" → npc display name, "listener" → addressee name).
      // Then for the nested quoted content we shift to 1st/2nd person —
      // "self" → "I", "listener" → "you" — which is the natural way to
      // read reported speech.
      const subj = englishNP(r.speaker!, ctx);
      const rec = englishNP(r.recipient!, ctx, { whFor: "ANIMATE" });
      const innerCtx: GlossCtx = { selfNP: "I", listenerNP: "you" };
      const content = r.content!;
      const what = isNestedFrame(content)
        ? `"${englishGloss(content.frame, innerCtx)}"`
        : englishNP(content, ctx, { whFor: "ITEM" });
      const verb = conj(subj, "SAY");
      return `${cap(subj)} ${verb}${neg} to ${rec}: ${what}`;
    }
    default:
      return frame.predicate.toLowerCase();
  }
}

// Wraps the frame JSON in a collapsed <details> element. The footer
// "show schema" toggle hides the entire details element when off.
function buildSchemaDetails(frame: FilledFrame): HTMLDetailsElement {
  const d = document.createElement("details");
  d.className = "schema-details";
  const s = document.createElement("summary");
  s.textContent = "schema";
  const pre = document.createElement("pre");
  pre.className = "schema";
  pre.textContent = JSON.stringify(frame, null, 2);
  d.appendChild(s);
  d.appendChild(pre);
  return d;
}

// ─── Conlang stream ────────────────────────────────────────────────
function appendTick(tickNum: number, entries: TickEntry[]): void {
  // Silent tick — every NPC stayed quiet (alone with no need / nothing
  // to say). Skip the divider entirely so the stream stays a record of
  // actual speech and visible action.
  if (entries.length === 0) return;

  const div = document.createElement("div");
  div.className = "tick-divider";
  div.textContent = `tick ${tickNum}`;
  els.stream.appendChild(div);

  for (const { npc, decision } of entries) {
    const conlang = encodeFrame(LANG, decision.frame);
    const u = document.createElement("div");
    u.className = "utter";

    const tenseTag = decision.frame.tense
      ? `<span class="frame-tag tense">${decision.frame.tense}</span>`
      : "";

    // Top-level narration: render this NPC's deictic "self" as their
    // display name so the gloss reads "Henu eats bread", not "I eats bread".
    const gloss = englishGloss(decision.frame, { selfNP: npc.displayName });
    u.innerHTML = `
      <div class="who">
        <span class="name">${npc.displayName}</span>
        <span class="frame-tag">${decision.frame.predicate}</span>
        ${tenseTag}
      </div>
      <div class="conlang"><span class="quote">«</span>${conlang}<span class="quote">»</span></div>
      <div class="gloss">${escapeHtml(gloss)}</div>
    `;
    u.appendChild(buildSchemaDetails(decision.frame));
    els.stream.appendChild(u);
  }

  // Prune oldest ticks so the DOM doesn't grow without bound.
  const dividers = els.stream.querySelectorAll<HTMLElement>(".tick-divider");
  if (dividers.length > MAX_STREAM_TICKS) {
    const cutoff = dividers[dividers.length - MAX_STREAM_TICKS]!;
    while (els.stream.firstChild && els.stream.firstChild !== cutoff) {
      els.stream.removeChild(els.stream.firstChild);
    }
  }

  // Auto-scroll to the newest entry.
  els.stream.scrollTop = els.stream.scrollHeight;
}

// ─── Sim driving ───────────────────────────────────────────────────
function doStep(): void {
  state.tick += 1;
  els.tickNum.textContent = String(state.tick);
  const entries = tickAll(state.world, state.npcs, pendingOverrides);
  appendTick(state.tick, entries);

  // Briefly highlight whichever NPC just acted last (most recent)
  const last = entries[entries.length - 1];
  renderNPCs(last?.npc.id);
  if (last) {
    setTimeout(() => renderNPCs(undefined), Math.min(intervalMs * 0.6, 800));
  }
}

// ─── Player input ──────────────────────────────────────────────────
function populateAddressee(): void {
  const cur = els.cmdTarget.value;
  els.cmdTarget.innerHTML = "";
  for (const npc of state.npcs) {
    const opt = document.createElement("option");
    opt.value = npc.id;
    opt.textContent = npc.displayName;
    els.cmdTarget.appendChild(opt);
  }
  if (cur && state.npcs.some((n) => n.id === cur)) els.cmdTarget.value = cur;
}

function showCmdError(msg: string): void {
  els.cmdError.textContent = msg;
  els.cmdError.classList.add("show");
}
function clearCmdError(): void {
  els.cmdError.classList.remove("show");
}

function appendPlayerUtterance(
  rawText: string,
  frame: FilledFrame | null,
  status: { steered: NPC | null; error?: string },
): void {
  const u = document.createElement("div");
  u.className = "utter player" + (status.error ? " error" : "");

  const tenseTag = frame?.tense
    ? `<span class="frame-tag tense">${frame.tense}</span>`
    : "";
  const moodTag = frame?.mood === "imperative"
    ? `<span class="frame-tag tense">imp</span>`
    : "";
  const predTag = frame
    ? `<span class="frame-tag">${frame.predicate}</span>`
    : `<span class="frame-tag">?</span>`;
  const steerTag = status.steered
    ? `<span class="frame-tag" style="color:var(--good)">→ ${status.steered.displayName}</span>`
    : "";

  // Round-tripped surface form (only when we got a frame). Mostly the
  // same as the user's input; differences highlight what the canoniser
  // changed (case agreement, particle position, etc.).
  const canonical = frame ? encodeFrame(LANG, frame) : null;

  // Player perspective: "self" is the player ("I") and "listener" is the
  // addressee NPC if one is selected (so "take bread!" glosses to
  // "Tova, take bread!" via listenerNP, not "you, take bread!").
  const glossCtx: GlossCtx = { selfNP: "I" };
  if (status.steered) glossCtx.listenerNP = status.steered.displayName;
  const glossLine = frame
    ? `<div class="gloss">${escapeHtml(englishGloss(frame, glossCtx))}</div>`
    : "";
  u.innerHTML = `
    <div class="who">
      <span class="name">player</span>
      ${predTag}
      ${moodTag}
      ${tenseTag}
      ${steerTag}
    </div>
    <div class="conlang"><span class="quote">«</span>${escapeHtml(rawText)}<span class="quote">»</span></div>
    ${glossLine}
  `;

  if (canonical && canonical.toLowerCase() !== rawText.trim().toLowerCase()) {
    const note = document.createElement("div");
    note.style.cssText =
      "font-size:11px;color:var(--ink-faint);margin-top:2px;font-family:var(--mono);";
    note.textContent = `canonical: ${canonical}`;
    u.appendChild(note);
  }

  if (status.error) {
    const err = document.createElement("div");
    err.style.cssText =
      "font-size:11px;color:var(--warn);margin-top:4px;font-family:var(--mono);";
    err.textContent = status.error;
    u.appendChild(err);
  }

  if (frame) u.appendChild(buildSchemaDetails(frame));

  els.stream.appendChild(u);
  els.stream.scrollTop = els.stream.scrollHeight;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function handlePlayerInput(rawText: string): void {
  const text = rawText.trim();
  if (!text) return;

  let frame: FilledFrame;
  try {
    frame = decodeText(LANG, text);
  } catch (err) {
    const msg = err instanceof ParseError ? err.message : String(err);
    showCmdError(msg);
    appendPlayerUtterance(text, null, { steered: null, error: msg });
    return;
  }

  clearCmdError();
  const targetId = els.cmdTarget.value;
  const target = state.npcs.find((n) => n.id === targetId) ?? null;

  let steered: NPC | null = null;
  if (frame.mood === "imperative" && target) {
    const decision = decisionFromImperative(frame, target, state.npcs, state.world);
    if (decision) {
      pendingOverrides.set(target.id, decision);
      steered = target;
    }
  }

  appendPlayerUtterance(text, frame, { steered });
  els.cmdInput.value = "";

  // If the player just steered an NPC, run a tick now so they see the
  // effect immediately rather than waiting on the play timer.
  if (steered && !playing) doStep();
}

function play(): void {
  if (playing) return;
  playing = true;
  els.play.textContent = "⏸ Pause";
  els.play.classList.remove("primary");
  doStep();
  scheduleNext();
}

function scheduleNext(): void {
  if (!playing) return;
  timer = window.setTimeout(() => {
    doStep();
    scheduleNext();
  }, intervalMs);
}

function pause(): void {
  if (!playing) return;
  playing = false;
  els.play.textContent = "▶ Play";
  els.play.classList.add("primary");
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
}

function reset(): void {
  pause();
  state = freshState();
  pendingOverrides.clear();
  els.tickNum.textContent = "0";
  els.stream.innerHTML = "";
  clearCmdError();
  els.cmdInput.value = "";
  populateAddressee();
  renderNPCs();
}

// ─── Language switching ────────────────────────────────────────────
// Rebuilds LANG from a new (seed, difficulty), repaints lexicon /
// morphology / header, and clears the stream because every prior
// utterance was encoded against the old spec. World state and tick
// count survive — the village is language-independent.
function setLanguage(seed: string, difficulty: Difficulty): void {
  const trimmed = seed.trim();
  let next;
  try {
    next = randomLanguage(trimmed === "" ? undefined : trimmed, difficulty);
  } catch (err) {
    showCmdError(`language gen failed: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  LANG = next;
  currentSeed = trimmed;
  currentDifficulty = difficulty;
  // Custom seeds (e.g. Malay) ignore difficulty and pick their own — sync
  // the picker so the UI reflects what's actually in effect.
  if (LANG.difficulty) currentDifficulty = LANG.difficulty;
  els.langSeed.value = currentSeed || LANG.id;
  els.langDifficulty.value = currentDifficulty;

  pendingOverrides.clear();
  els.stream.innerHTML = "";
  clearCmdError();
  els.cmdInput.value = "";
  renderHeaderMeta();
  renderLexicon();
  renderMorphology();
  renderNPCs();
}

function renderPresets(): void {
  const names = customLanguageNames();
  els.langPresets.innerHTML = "";
  if (names.length === 0) return;
  els.langPresets.appendChild(document.createTextNode("presets: "));
  for (const name of names) {
    const a = document.createElement("a");
    a.textContent = name;
    a.addEventListener("click", () => {
      els.langSeed.value = name;
      setLanguage(name, currentDifficulty);
    });
    els.langPresets.appendChild(a);
  }
}

// ─── Wire controls ─────────────────────────────────────────────────
els.play.addEventListener("click", () => (playing ? pause() : play()));
els.step.addEventListener("click", () => {
  pause();
  doStep();
});
els.reset.addEventListener("click", reset);

els.speed.addEventListener("input", () => {
  intervalMs = Number(els.speed.value);
  els.speedVal.textContent = `${(intervalMs / 1000).toFixed(1)}s`;
});

els.schemaToggle.addEventListener("change", () => {
  els.stream.classList.toggle("no-schema", !els.schemaToggle.checked);
});

els.cmdForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handlePlayerInput(els.cmdInput.value);
});
els.cmdInput.addEventListener("input", () => {
  if (els.cmdError.classList.contains("show")) clearCmdError();
});

els.langForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const diff = els.langDifficulty.value as Difficulty;
  setLanguage(els.langSeed.value, diff);
});
els.langRandom.addEventListener("click", () => {
  els.langSeed.value = randomSeedString();
  const diff = els.langDifficulty.value as Difficulty;
  setLanguage(els.langSeed.value, diff);
});

// Spacebar: play/pause.
window.addEventListener("keydown", (e) => {
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLSelectElement ||
    e.target instanceof HTMLTextAreaElement
  ) return;
  if (e.code === "Space") {
    e.preventDefault();
    playing ? pause() : play();
  } else if (e.code === "KeyN") {
    pause();
    doStep();
  } else if (e.code === "KeyR") {
    reset();
  }
});

// ─── Initial paint ─────────────────────────────────────────────────
els.langSeed.value = currentSeed;
els.langDifficulty.value = currentDifficulty;
renderPresets();
renderHeaderMeta();
renderLexicon();
renderMorphology();
renderNPCs();
populateAddressee();
els.speedVal.textContent = `${(intervalMs / 1000).toFixed(1)}s`;
