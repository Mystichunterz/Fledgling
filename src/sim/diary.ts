import type { NpcId } from './dialogueTypes';

const STORAGE_KEY = 'fledgling:diary:v1';
const MAX_CONTEXTS = 3;

export interface DiaryEntry {
  token: string;
  firstHeardFrom: NpcId;
  firstHeardAt: number;
  encounters: number;
  contexts: string[];
  playerGuess: string;
}

interface EncounterDetail {
  speaker: NpcId;
  line: string;
  nodeId: string;
}

const data = new Map<string, DiaryEntry>();
const subscribers = new Set<() => void>();

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, DiaryEntry>;
    for (const [k, v] of Object.entries(obj)) data.set(k, v);
  } catch (e) {
    console.warn('[diary] load failed', e);
  }
};

const save = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(data)));
  } catch (e) {
    console.warn('[diary] save failed', e);
  }
};

const notify = () => subscribers.forEach(cb => cb());

// Strips bracketed stage directions, punctuation, lowercases, splits on
// whitespace. Single-char tokens dropped as noise.
export const tokenise = (text: string): string[] => {
  return text
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[.,!?;:"'—…()]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length >= 2);
};

// Splits a string into alternating word and gap segments while preserving the
// original spacing and punctuation, so the renderer can rebuild the line as
// DOM with overlay glosses anchored over each word. Word runs match
// /[A-Za-z]+/ — Telopa surface forms are ASCII letters; punctuation and
// whitespace fall through as gaps.
export type GlossSegment =
  | { kind: 'word'; text: string; key: string }
  | { kind: 'gap'; text: string };

export const tokeniseWithGaps = (text: string): GlossSegment[] => {
  const segments: GlossSegment[] = [];
  const re = /[A-Za-z]+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ kind: 'gap', text: text.slice(last, m.index) });
    }
    segments.push({ kind: 'word', text: m[0], key: m[0].toLowerCase() });
    last = re.lastIndex;
  }
  if (last < text.length) segments.push({ kind: 'gap', text: text.slice(last) });
  return segments;
};

const onEncounter = (ev: Event) => {
  const detail = (ev as CustomEvent<EncounterDetail>).detail;
  if (!detail) return;
  const { speaker, line } = detail;
  const tokens = tokenise(line);
  if (tokens.length === 0) return;
  const now = Date.now();
  const seen = new Set<string>();
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    const existing = data.get(token);
    if (existing) {
      existing.encounters += 1;
      if (!existing.contexts.includes(line)) {
        existing.contexts.push(line);
        if (existing.contexts.length > MAX_CONTEXTS) existing.contexts.shift();
      }
    } else {
      data.set(token, {
        token,
        firstHeardFrom: speaker,
        firstHeardAt: now,
        encounters: 1,
        contexts: [line],
        playerGuess: '',
      });
    }
  }
  save();
  notify();
};

let initialised = false;
export const initDiary = () => {
  if (initialised) return;
  initialised = true;
  load();
  window.addEventListener('fledgling:encounter', onEncounter);
};

export const getDiary = (): DiaryEntry[] =>
  [...data.values()].sort((a, b) => b.firstHeardAt - a.firstHeardAt);

export const setGuess = (token: string, guess: string) => {
  const entry = data.get(token);
  if (!entry) return;
  entry.playerGuess = guess;
  save();
  notify();
};

export const subscribeDiary = (cb: () => void): (() => void) => {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
};

export const clearDiary = () => {
  data.clear();
  save();
  notify();
};
