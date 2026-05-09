import { setFlag } from '../state/dialogueFlags';
import { GameRegistry } from '../state/GameRegistry';

const PREDECESSOR_NAME = 'Maren';

// Journal page left in the predecessor's hut. Renders in English (player's
// own language — they're reading words written by another castaway). Sets
// has_visited_hut, which unlocks {{predecessorName}}-flavoured dialogue
// branches across all NPCs. The four glossed words at the top are pulled
// live from GameRegistry.language — the surface-language lexicon is
// procedurally generated per seed, so any hard-coded stems here would
// disagree with what NPCs actually say.
const buildPage = (): string => {
  const lex = GameRegistry.language.lexicon;
  // Verb stems are keyed by frame id; noun/abstract stems by concept id.
  const stems = [
    { word: lex.GREET?.stem ?? '?', gloss: 'they say it arriving and parting both' },
    { word: lex.GOOD?.stem  ?? '?', gloss: 'good (?) — what they ask after, when they meet you' },
    { word: lex.GIVE?.stem  ?? '?', gloss: 'they say it when they pass things across' },
    { word: lex.HUT?.stem   ?? '?', gloss: "this — the four walls i'm writing inside of" },
  ];
  const width = Math.max(...stems.map(s => s.word.length)) + 3;
  const lines = stems.map(s => `  ${s.word.padEnd(width)}${s.gloss}`).join('\n');
  return `the bread is the wrong shape here. salt in everything.\n\nfour winters now. words i think i have —\n\n${lines}\n\nthe others are kind in pieces.\nshe's the one who keeps trying. hala.\ni find her at the lighthouse most evenings now.\n\nthink i'll walk up there tonight.\n\n— ${PREDECESSOR_NAME}`;
};

export class JournalOverlay {
  private root: HTMLDivElement;
  private pageEl: HTMLDivElement;
  private hintEl: HTMLDivElement;
  private currentPage = 0;
  private pages: string[] = [];
  private isActive = false;
  private keyHandler: (ev: KeyboardEvent) => void;
  private clickHandler: (ev: MouseEvent) => void;

  constructor() {
    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0.86);
      color: #3a2410;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      box-sizing: border-box;
      z-index: 1800;
    `;

    const page = document.createElement('div');
    page.style.cssText = `
      width: min(640px, 90vw);
      min-height: 380px;
      background: linear-gradient(180deg, #f5e4c2 0%, #ead5a8 100%);
      border: 4px solid #4a2e16;
      border-radius: 4px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.7);
      padding: 36px 44px;
      box-sizing: border-box;
      font-family: "Georgia", "Cambria", "Times New Roman", serif;
      font-size: 18px;
      line-height: 1.6;
      white-space: pre-wrap;
      color: #3a2410;
    `;
    this.pageEl = page;
    this.root.appendChild(page);

    this.hintEl = document.createElement('div');
    this.hintEl.style.cssText = `
      margin-top: 18px;
      font-family: ui-monospace, "Cascadia Code", monospace;
      font-size: 12px; color: #c2a868;
      letter-spacing: 0.08em;
    `;
    this.root.appendChild(this.hintEl);

    document.body.appendChild(this.root);

    this.keyHandler = (ev: KeyboardEvent) => {
      if (!this.isActive) return;
      ev.stopPropagation();
      ev.preventDefault();
      this.advance();
    };
    this.clickHandler = (ev: MouseEvent) => {
      if (!this.isActive) return;
      ev.stopPropagation();
      this.advance();
    };
  }

  open() {
    this.isActive = true;
    this.currentPage = 0;
    this.pages = [buildPage()];
    this.root.style.display = 'flex';
    this.renderPage();
    window.addEventListener('keydown', this.keyHandler, true);
    this.root.addEventListener('click', this.clickHandler);
  }

  private renderPage() {
    this.pageEl.textContent = this.pages[this.currentPage] ?? '';
    const last = this.currentPage >= this.pages.length - 1;
    this.hintEl.textContent = last
      ? 'click or press any key to close'
      : `click or press any key for next page  (${this.currentPage + 1} / ${this.pages.length})`;
  }

  private advance() {
    if (this.currentPage >= this.pages.length - 1) {
      this.close();
      return;
    }
    this.currentPage += 1;
    this.renderPage();
  }

  private close() {
    this.isActive = false;
    this.root.style.display = 'none';
    window.removeEventListener('keydown', this.keyHandler, true);
    this.root.removeEventListener('click', this.clickHandler);
    setFlag('has_visited_hut', true);
  }
}

let singleton: JournalOverlay | null = null;
const getJournal = () => {
  if (!singleton) singleton = new JournalOverlay();
  return singleton;
};

// Open the journal — re-readable any time. First read sets has_visited_hut
// to unlock {{predecessorName}} dialogue branches; subsequent reads are
// idempotent on the flag.
export const openJournal = () => {
  getJournal().open();
};
