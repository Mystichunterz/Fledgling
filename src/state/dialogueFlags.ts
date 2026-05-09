import type { StateFlag, NodeTrigger } from '../sim/dialogueTypes';

const STORAGE_KEY = 'fledgling:flags:v1';

const data = new Map<StateFlag, boolean>();
const subscribers = new Set<() => void>();

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, boolean>;
    for (const [k, v] of Object.entries(obj)) data.set(k as StateFlag, v);
  } catch (e) {
    console.warn('[flags] load failed', e);
  }
};

const save = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(data)));
  } catch (e) {
    console.warn('[flags] save failed', e);
  }
};

const notify = () => subscribers.forEach(cb => cb());

let initialised = false;
export const initFlags = () => {
  if (initialised) return;
  initialised = true;
  load();
};

export const setFlag = (flag: StateFlag, value = true) => {
  if (data.get(flag) === value) return;
  data.set(flag, value);
  save();
  notify();
};

export const isFlagSet = (flag: StateFlag): boolean => data.get(flag) ?? false;

export const allFlags = (): Record<string, boolean> =>
  Object.fromEntries(data);

export const subscribeFlags = (cb: () => void): (() => void) => {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
};

export const clearFlags = () => {
  data.clear();
  save();
  notify();
};

// Returns true when every flag in `requires` is set AND every flag in
// `excludes` is not set. A missing trigger always matches.
export const matchesTrigger = (trigger?: NodeTrigger): boolean => {
  if (!trigger) return true;
  if (trigger.requires?.some(f => !isFlagSet(f))) return false;
  if (trigger.excludes?.some(f => isFlagSet(f))) return false;
  return true;
};
