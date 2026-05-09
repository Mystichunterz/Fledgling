import { decodeText, ParseError } from "../lang/decoder.js";
import { encodeFrame } from "../lang/encoder.js";
import { FilledFrame } from "../lang/frames.js";
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

// ─── Conlang stream ────────────────────────────────────────────────
function appendTick(tickNum: number, entries: TickEntry[]): void {
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

    u.innerHTML = `
      <div class="who">
        <span class="name">${npc.displayName}</span>
        <span class="frame-tag">${decision.frame.predicate}</span>
        ${tenseTag}
      </div>
      <div class="conlang"><span class="quote">«</span>${conlang}<span class="quote">»</span></div>
    `;
    const schema = document.createElement("pre");
    schema.className = "schema";
    schema.textContent = JSON.stringify(decision.frame, null, 2);
    u.appendChild(schema);
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

  u.innerHTML = `
    <div class="who">
      <span class="name">player</span>
      ${predTag}
      ${moodTag}
      ${tenseTag}
      ${steerTag}
    </div>
    <div class="conlang"><span class="quote">«</span>${escapeHtml(rawText)}<span class="quote">»</span></div>
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

  if (frame) {
    const schema = document.createElement("pre");
    schema.className = "schema";
    schema.textContent = JSON.stringify(frame, null, 2);
    u.appendChild(schema);
  }

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
