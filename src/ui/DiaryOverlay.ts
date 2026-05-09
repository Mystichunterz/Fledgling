import { getDiary, setGuess, subscribeDiary, clearDiary } from '../sim/diary';
import { npcById } from '../sim/npcRoster';

// Toggleable book/diary modal. Mounts its own button to the right of the
// inventory hotbar (rendered by PlayerHudScene) — kept as a plain DOM
// sibling of the hotbar so we don't touch PlayerHudScene or index.html.
export class DiaryOverlay {
  private button: HTMLButtonElement;
  private root: HTMLDivElement;
  private listEl: HTMLDivElement;
  private isOpen = false;
  private unsub: (() => void) | null = null;
  private keyHandler: (ev: KeyboardEvent) => void;

  constructor() {
    this.button = this.makeButton();
    document.body.appendChild(this.button);

    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: fixed; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      width: min(720px, 90vw); height: min(560px, 80vh);
      background: linear-gradient(180deg, rgba(56,38,22,0.97) 0%, rgba(40,28,16,0.98) 100%);
      border: 3px solid #5a3a1c;
      border-radius: 6px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      color: #e8dcc1;
      font-family: ui-monospace, "Cascadia Code", "Courier New", monospace;
      padding: 18px 24px;
      box-sizing: border-box;
      display: none;
      flex-direction: column;
      z-index: 1100;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;';

    const title = document.createElement('div');
    title.textContent = "Diary — words I've heard";
    title.style.cssText = `
      font-size: 18px; font-weight: 700; color: #f2c97a;
      letter-spacing: 0.04em;
    `;
    header.appendChild(title);

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.title = 'Reset the diary';
    clearBtn.style.cssText = `
      font-family: inherit; font-size: 11px;
      color: #b89a6a; background: transparent;
      border: 1px solid #5a4828; border-radius: 3px;
      padding: 3px 8px; cursor: pointer;
    `;
    clearBtn.onclick = () => { if (confirm('Clear all diary entries?')) clearDiary(); };
    header.appendChild(clearBtn);

    this.root.appendChild(header);

    const help = document.createElement('div');
    help.textContent = 'Write what you think each word means. Hover for the lines you heard it in.';
    help.style.cssText = `
      font-size: 12px; color: #9d8a6a; margin-bottom: 12px; font-style: italic;
    `;
    this.root.appendChild(help);

    this.listEl = document.createElement('div');
    this.listEl.style.cssText = `
      flex: 1; overflow-y: auto;
      display: flex; flex-direction: column; gap: 4px;
      padding-right: 6px;
    `;
    this.root.appendChild(this.listEl);

    document.body.appendChild(this.root);

    this.keyHandler = (ev: KeyboardEvent) => {
      // Don't toggle while user is typing into a text field (the diary's
      // own inputs are .diary-guess; allow B inside them).
      const inField = document.activeElement?.tagName === 'INPUT';
      if ((ev.key === 'b' || ev.key === 'B') && !inField) {
        ev.stopPropagation();
        ev.preventDefault();
        this.toggle();
      } else if (ev.key === 'Escape' && this.isOpen) {
        ev.stopPropagation();
        this.close();
      }
    };
    window.addEventListener('keydown', this.keyHandler, true);
  }

  private makeButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = 'B';
    btn.title = 'Diary (B)';
    // Pinned to the right of the hotbar. Hotbar is 6 slots × ~78px + padding
    // ≈ 480 wide, centred via translateX(-50%). Right edge ≈ centre + 240;
    // we sit at +250 with the same vertical baseline.
    btn.style.cssText = `
      position: fixed; bottom: 22px; left: calc(50% + 250px);
      width: 72px; height: 72px;
      font-family: ui-monospace, "Cascadia Code", "Courier New", monospace;
      font-size: 30px; font-weight: 700;
      color: rgba(42, 20, 8, 0.92);
      background: linear-gradient(rgba(248, 208, 130, 0.88), rgba(208, 138, 60, 0.88));
      border: 2px solid rgba(42, 20, 8, 0.55);
      box-shadow:
        inset 1px 1px 0 rgba(255, 240, 200, 0.45),
        inset -1px -1px 0 rgba(140, 70, 20, 0.4),
        0 4px 12px rgba(0, 0, 0, 0.25);
      cursor: pointer;
      z-index: 901;
      pointer-events: auto;
      user-select: none;
    `;
    btn.onclick = () => this.toggle();
    return btn;
  }

  toggle() { this.isOpen ? this.close() : this.open(); }

  open() {
    this.root.style.display = 'flex';
    this.isOpen = true;
    this.refresh();
    this.unsub = subscribeDiary(() => this.refresh());
  }

  close() {
    this.root.style.display = 'none';
    this.isOpen = false;
    this.unsub?.();
    this.unsub = null;
  }

  private refresh() {
    const entries = getDiary();
    if (entries.length === 0) {
      this.listEl.innerHTML = `
        <div style="text-align: center; padding: 24px; color: #7d6a4a; font-style: italic;">
          You haven't heard any words yet. Talk to villagers to fill these pages.
        </div>
      `;
      return;
    }
    this.listEl.innerHTML = '';
    for (const entry of entries) {
      const speaker = (() => {
        try { return npcById(entry.firstHeardFrom).displayName; }
        catch { return entry.firstHeardFrom; }
      })();

      const row = document.createElement('div');
      row.style.cssText = `
        display: grid; grid-template-columns: minmax(110px, 1fr) auto minmax(180px, 2fr) auto;
        gap: 12px; align-items: center;
        padding: 6px 10px;
        background: rgba(80,56,32,0.35);
        border: 1px solid rgba(120,90,52,0.4);
        border-radius: 3px;
      `;

      const tokenEl = document.createElement('div');
      tokenEl.textContent = entry.token;
      tokenEl.style.cssText = `
        font-weight: 700; color: #f2c97a;
        font-size: 14px; letter-spacing: 0.03em;
      `;
      tokenEl.title = `Heard ${entry.encounters}× — first from ${speaker}\n\n${entry.contexts.join('\n— — —\n')}`;
      row.appendChild(tokenEl);

      const sep = document.createElement('div');
      sep.textContent = '=';
      sep.style.color = '#9d8a6a';
      row.appendChild(sep);

      const input = document.createElement('input');
      input.type = 'text';
      input.value = entry.playerGuess;
      input.placeholder = 'your guess…';
      input.className = 'diary-guess';
      input.style.cssText = `
        font-family: inherit; font-size: 14px;
        background: rgba(40,28,16,0.65);
        color: #e8dcc1;
        border: 1px solid #5a4828;
        border-radius: 3px;
        padding: 4px 8px;
        outline: none;
      `;
      input.onfocus = () => { input.style.borderColor = '#a88848'; };
      input.onblur = () => { input.style.borderColor = '#5a4828'; setGuess(entry.token, input.value.trim()); };
      input.onchange = () => setGuess(entry.token, input.value.trim());
      row.appendChild(input);

      const meta = document.createElement('div');
      meta.textContent = `×${entry.encounters}`;
      meta.style.cssText = 'font-size: 11px; color: #9d8a6a; min-width: 32px; text-align: right;';
      row.appendChild(meta);

      this.listEl.appendChild(row);
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler, true);
    this.button.remove();
    this.root.remove();
    this.unsub?.();
  }
}
