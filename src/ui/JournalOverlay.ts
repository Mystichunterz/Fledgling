import { isFlagSet, setFlag } from '../state/dialogueFlags';

const PREDECESSOR_NAME = 'Maren';

// Journal page left in the predecessor's hut. Renders in English (player's
// own language — they're reading words written by another castaway). Sets
// has_visited_hut, which unlocks {{predecessorName}}-flavoured dialogue
// branches across all NPCs.
const PAGES: string[] = [
  `If you're reading this, you washed up like I did.\n\nThe four to find:\n  Naro — well, bread\n  Lemu — firepit, oil\n  Toka — shrine, flint\n  Senu — forest, wood\n\nHala's in the lighthouse. She'll ask you a question.\nThere's no wrong answer — only one you can live with.\n\n— ${PREDECESSOR_NAME}`,
];

export class JournalOverlay {
  private root: HTMLDivElement;
  private pageEl: HTMLDivElement;
  private hintEl: HTMLDivElement;
  private currentPage = 0;
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
    this.root.style.display = 'flex';
    this.renderPage();
    window.addEventListener('keydown', this.keyHandler, true);
    this.root.addEventListener('click', this.clickHandler);
  }

  private renderPage() {
    this.pageEl.textContent = PAGES[this.currentPage] ?? '';
    const last = this.currentPage >= PAGES.length - 1;
    this.hintEl.textContent = last
      ? 'click or press any key to close'
      : `click or press any key for next page  (${this.currentPage + 1} / ${PAGES.length})`;
  }

  private advance() {
    if (this.currentPage >= PAGES.length - 1) {
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

// Open the journal once on first hut entry; subsequent visits silently
// keep has_visited_hut set.
export const maybeOpenJournalOnHutEntry = () => {
  if (isFlagSet('has_visited_hut')) return;
  getJournal().open();
};
