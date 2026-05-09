// 5-beat English prologue at the Crash Site. Per agents/story-dialogue-trees.md
// §4.0 — the only English-displayed surface in the runtime besides the
// ending screens. Plays once per playthrough; gated by localStorage so
// players who refresh mid-game don't sit through it again.

interface Beat { text: string; durationMs: number; }

const BEATS: Beat[] = [
  { text: 'You wake on the sand.', durationMs: 3000 },
  { text: 'The plane is in pieces.\nThere is a village past the dunes.', durationMs: 3000 },
  { text: "The people there don't speak your language.\nYou don't speak theirs.", durationMs: 4000 },
  { text: 'Listen. Watch what they do.\nHover any word to write what you think it means.', durationMs: 4000 },
  { text: "Your guesses are the only translation you'll have.\nA child runs across the sand toward you.", durationMs: 3000 },
];

const STORAGE_KEY = 'fledgling:prologue_seen:v1';

export const hasSeenPrologue = (): boolean => {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
};

export const markPrologueSeen = () => {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
};

export const resetPrologue = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
};

export class CrashPrologue {
  private root: HTMLDivElement;
  private textEl: HTMLDivElement;
  private hintEl: HTMLDivElement;
  private currentBeat = -1;
  private timer: number | null = null;
  private onComplete: (() => void) | null = null;
  private keyHandler: (ev: KeyboardEvent) => void;
  private isActive = false;

  constructor() {
    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0.94);
      color: #e8dcc1;
      font-family: ui-monospace, "Cascadia Code", "Courier New", monospace;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      box-sizing: border-box;
      z-index: 2000;
      text-align: center;
      transition: opacity 0.6s ease;
    `;

    this.textEl = document.createElement('div');
    this.textEl.style.cssText = `
      font-size: 28px; line-height: 1.55;
      max-width: 760px;
      white-space: pre-wrap;
      opacity: 0;
      transition: opacity 0.5s ease;
    `;
    this.root.appendChild(this.textEl);

    this.hintEl = document.createElement('div');
    this.hintEl.textContent = 'press any key to skip ahead';
    this.hintEl.style.cssText = `
      position: absolute; bottom: 28px;
      font-size: 12px; color: #7d6a4a;
      letter-spacing: 0.08em;
      opacity: 0; transition: opacity 1.2s ease;
    `;
    this.root.appendChild(this.hintEl);

    document.body.appendChild(this.root);

    this.keyHandler = (ev: KeyboardEvent) => {
      if (!this.isActive) return;
      // Don't let the player skip Beat 1 — they need to see SOMETHING first.
      if (this.currentBeat <= 0) return;
      ev.stopPropagation();
      ev.preventDefault();
      this.advance();
    };
  }

  start(onComplete: () => void) {
    this.onComplete = onComplete;
    this.isActive = true;
    this.currentBeat = -1;
    this.root.style.display = 'flex';
    this.root.style.opacity = '1';
    window.addEventListener('keydown', this.keyHandler, true);
    this.advance();
    // Reveal the skip hint after Beat 1 has been visible for a moment.
    window.setTimeout(() => { this.hintEl.style.opacity = '0.7'; }, 2400);
  }

  private advance() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.currentBeat += 1;
    if (this.currentBeat >= BEATS.length) {
      this.finish();
      return;
    }
    const beat = BEATS[this.currentBeat]!;
    this.textEl.style.opacity = '0';
    window.setTimeout(() => {
      this.textEl.textContent = beat.text;
      this.textEl.style.opacity = '1';
    }, 220);
    this.timer = window.setTimeout(() => this.advance(), beat.durationMs);
  }

  private finish() {
    this.textEl.style.opacity = '0';
    this.hintEl.style.opacity = '0';
    this.root.style.opacity = '0';
    window.setTimeout(() => {
      this.root.style.display = 'none';
      this.isActive = false;
      window.removeEventListener('keydown', this.keyHandler, true);
      markPrologueSeen();
      const fn = this.onComplete;
      this.onComplete = null;
      fn?.();
    }, 600);
  }

  destroy() {
    if (this.timer !== null) clearTimeout(this.timer);
    window.removeEventListener('keydown', this.keyHandler, true);
    this.root.remove();
  }
}
