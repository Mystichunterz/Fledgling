import { encodeFrame } from "../lang/encoder.js";
import { EXAMPLE_LANGUAGE } from "../lang/example-language.js";
import {
  NPC,
  TickEntry,
  makeStartingNPCs,
  makeStartingWorld,
  tickAll,
} from "./village.js";

const LANG = EXAMPLE_LANGUAGE;
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

const els = {
  npcs: $("#npcs") as HTMLDivElement,
  lex: $("#lex") as HTMLDivElement,
  stream: $("#stream") as HTMLElement,
  tickNum: $("#tick-num") as HTMLSpanElement,
  play: $("#play") as HTMLButtonElement,
  step: $("#step") as HTMLButtonElement,
  reset: $("#reset") as HTMLButtonElement,
  speed: $("#speed") as HTMLInputElement,
  speedVal: $("#speed-val") as HTMLSpanElement,
  glossToggle: $("#gloss-toggle") as HTMLInputElement,
};

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
      <div class="gloss">${decision.gloss}</div>
    `;
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
  const entries = tickAll(state.world, state.npcs);
  appendTick(state.tick, entries);

  // Briefly highlight whichever NPC just acted last (most recent)
  const last = entries[entries.length - 1];
  renderNPCs(last?.npc.id);
  if (last) {
    setTimeout(() => renderNPCs(undefined), Math.min(intervalMs * 0.6, 800));
  }
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
  els.tickNum.textContent = "0";
  els.stream.innerHTML = "";
  renderNPCs();
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

els.glossToggle.addEventListener("change", () => {
  els.stream.classList.toggle("no-gloss", !els.glossToggle.checked);
});

// Spacebar: play/pause.
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
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
renderLexicon();
renderNPCs();
els.speedVal.textContent = `${(intervalMs / 1000).toFixed(1)}s`;
