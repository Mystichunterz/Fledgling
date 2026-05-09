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
  private fadeOutHandler: (ev: Event) => void;
  private fadeInHandler: (ev: Event) => void;

  constructor() {
    this.button = this.makeButton();
    document.body.appendChild(this.button);

    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: fixed; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      width: min(820px, 92vw); height: min(620px, 84vh);
      background:
        repeating-linear-gradient(
          0deg,
          rgba(120, 90, 50, 0.06) 0,
          rgba(120, 90, 50, 0.06) 1px,
          transparent 1px,
          transparent 26px
        ),
        linear-gradient(180deg, #f5e4c2 0%, #ead5a8 100%);
      border: 4px solid #4a2e16;
      border-radius: 4px;
      box-shadow:
        inset 0 0 0 1px rgba(120, 80, 40, 0.4),
        inset 0 0 30px rgba(140, 90, 40, 0.18),
        0 12px 40px rgba(0,0,0,0.65);
      color: #3a2410;
      font-family: "Georgia", "Cambria", "Times New Roman", serif;
      padding: 22px 28px 18px;
      box-sizing: border-box;
      display: none;
      flex-direction: column;
      z-index: 1100;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;';

    const title = document.createElement('div');
    title.textContent = "My Diary";
    title.style.cssText = `
      font-size: 26px; font-weight: 700; color: #4a2e10;
      letter-spacing: 0.06em;
      font-family: "Georgia", "Cambria", "Times New Roman", serif;
      font-style: italic;
    `;
    header.appendChild(title);

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.title = 'Reset the diary';
    clearBtn.style.cssText = `
      font-family: inherit; font-size: 12px; font-style: italic;
      color: #7a5028; background: transparent;
      border: 1px solid rgba(122, 80, 40, 0.5); border-radius: 3px;
      padding: 3px 10px; cursor: pointer;
    `;
    clearBtn.onmouseenter = () => { clearBtn.style.background = 'rgba(122, 80, 40, 0.12)'; };
    clearBtn.onmouseleave = () => { clearBtn.style.background = 'transparent'; };
    clearBtn.onclick = () => { if (confirm('Clear all diary entries?')) clearDiary(); };
    header.appendChild(clearBtn);

    this.root.appendChild(header);

    const rule = document.createElement('div');
    rule.style.cssText = `
      height: 1px; margin: 4px 0 12px;
      background: linear-gradient(90deg,
        transparent 0%, rgba(74, 46, 16, 0.55) 12%,
        rgba(74, 46, 16, 0.55) 88%, transparent 100%);
    `;
    this.root.appendChild(rule);

    const help = document.createElement('div');
    help.textContent = 'Words I have heard the villagers speak. I write what I think each one means.';
    help.style.cssText = `
      font-size: 13px; color: #6a4828; margin-bottom: 14px; font-style: italic;
      letter-spacing: 0.02em;
    `;
    this.root.appendChild(help);

    this.listEl = document.createElement('div');
    this.listEl.style.cssText = `
      flex: 1; overflow-y: auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 10px 14px;
      padding: 2px 6px 6px 2px;
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

    // Sync the button with Phaser's camera fade. The button is a DOM sibling
    // of the canvas, so the camera fade alone leaves it floating above the
    // black layer.
    this.fadeOutHandler = () => {
      this.button.style.opacity = '0';
      this.button.style.pointerEvents = 'none';
      // Don't leave the modal stranded mid-transition.
      if (this.isOpen) this.close();
    };
    this.fadeInHandler = () => {
      this.button.style.opacity = '1';
      this.button.style.pointerEvents = 'auto';
    };
    window.addEventListener('fledgling:fade-out', this.fadeOutHandler);
    window.addEventListener('fledgling:fade-in', this.fadeInHandler);
  }

  private makeButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.title = 'Diary (B)';
    btn.setAttribute('aria-label', 'Open diary (hotkey B)');
    // Pinned to the right of the hotbar. Hotbar is 6 slots × ~78px + padding
    // ≈ 480 wide, centred via translateX(-50%). Right edge ≈ centre + 240;
    // we sit at +280 to leave a clear ~30px gap.
    btn.style.cssText = `
      position: fixed; bottom: 22px; left: calc(50% + 280px);
      width: 72px; height: 72px;
      padding: 0;
      color: rgba(42, 20, 8, 0.92);
      background: linear-gradient(rgba(248, 208, 130, 0.88), rgba(208, 138, 60, 0.88));
      border: 2px solid rgba(42, 20, 8, 0.55);
      box-shadow:
        inset 1px 1px 0 rgba(255, 240, 200, 0.45),
        inset -1px -1px 0 rgba(140, 70, 20, 0.4),
        0 4px 12px rgba(0, 0, 0, 0.25);
      cursor: pointer;
      z-index: 901;
      pointer-events: none;
      user-select: none;
      display: flex; align-items: center; justify-content: center;
      opacity: 0;
      transition: opacity 200ms linear;
    `;
    btn.innerHTML = `
      <span style="position: relative; width: 100%; height: 100%; display: block;">
        <svg viewBox="0 0 24 24" width="44" height="44"
             style="position: absolute; inset: 0; margin: auto; display: block;
                    color: rgba(42, 20, 8, 0.95);"
             xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <!-- Book body -->
          <rect x="4" y="3" width="16" height="18" rx="1.2"
                fill="currentColor"/>
          <!-- Spine groove -->
          <line x1="6.4" y1="3.6" x2="6.4" y2="20.4"
                stroke="rgba(255, 240, 200, 0.55)" stroke-width="0.85"/>
          <!-- Page-edge line on the right -->
          <line x1="18.8" y1="4.6" x2="18.8" y2="19.4"
                stroke="rgba(255, 240, 200, 0.4)" stroke-width="0.55"/>
          <!-- Cover label frame -->
          <rect x="9" y="6.6" width="8.2" height="10.8" rx="0.5"
                fill="none" stroke="rgba(255, 240, 200, 0.6)" stroke-width="0.65"/>
          <!-- Title block strokes inside the frame -->
          <line x1="10.4" y1="9.4" x2="15.8" y2="9.4"
                stroke="rgba(255, 240, 200, 0.55)" stroke-width="0.8"
                stroke-linecap="round"/>
          <line x1="10.4" y1="12.0" x2="15.8" y2="12.0"
                stroke="rgba(255, 240, 200, 0.4)" stroke-width="0.55"
                stroke-linecap="round"/>
          <line x1="10.4" y1="13.7" x2="14.6" y2="13.7"
                stroke="rgba(255, 240, 200, 0.4)" stroke-width="0.55"
                stroke-linecap="round"/>
          <!-- Bookmark ribbon -->
          <path d="M15.6 3 L15.6 7.6 L16.7 6.55 L17.8 7.6 L17.8 3 Z"
                fill="rgba(255, 238, 200, 0.92)"
                stroke="rgba(42, 20, 8, 0.55)" stroke-width="0.4"
                stroke-linejoin="round"/>
        </svg>
        <span style="
          position: absolute; right: 3px; bottom: 1px;
          font-family: ui-monospace, 'Cascadia Code', 'Courier New', monospace;
          font-size: 11px; font-weight: 700; line-height: 1;
          color: rgba(42, 20, 8, 0.95);
          background: rgba(255, 240, 200, 0.78);
          border: 1px solid rgba(42, 20, 8, 0.55);
          border-radius: 2px;
          padding: 1px 4px;
          letter-spacing: 0.02em;
        ">B</span>
      </span>
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
        <div style="
          grid-column: 1 / -1;
          text-align: center; padding: 48px 24px;
          color: #7a5028; font-style: italic; font-size: 14px;
          letter-spacing: 0.02em;
        ">
          The pages are blank. Speak with the villagers and their words<br/>
          will gather here.
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

      const card = document.createElement('div');
      card.style.cssText = `
        position: relative;
        display: flex; flex-direction: column; gap: 6px;
        padding: 10px 12px 10px;
        background: rgba(255, 248, 226, 0.45);
        border: 1px solid rgba(120, 80, 40, 0.35);
        border-left: 3px solid rgba(122, 80, 32, 0.65);
        border-radius: 2px;
        box-shadow: inset 0 0 0 1px rgba(255, 250, 230, 0.5);
      `;

      const top = document.createElement('div');
      top.style.cssText = 'display: flex; align-items: baseline; justify-content: space-between; gap: 8px;';

      const tokenEl = document.createElement('div');
      tokenEl.textContent = entry.token;
      tokenEl.style.cssText = `
        font-family: ui-monospace, "Cascadia Code", "Courier New", monospace;
        font-weight: 700; color: #4a2e10;
        font-size: 18px; letter-spacing: 0.04em;
      `;
      tokenEl.title = `Heard ${entry.encounters}× — first from ${speaker}\n\n${entry.contexts.join('\n— — —\n')}`;
      top.appendChild(tokenEl);

      const badge = document.createElement('div');
      badge.textContent = `heard ×${entry.encounters}`;
      badge.style.cssText = `
        font-size: 10px; font-style: italic;
        color: #7a5028;
        letter-spacing: 0.04em;
        white-space: nowrap;
      `;
      top.appendChild(badge);
      card.appendChild(top);

      const input = document.createElement('input');
      input.type = 'text';
      input.value = entry.playerGuess;
      input.placeholder = 'I think this means…';
      input.className = 'diary-guess';
      input.style.cssText = `
        font-family: "Georgia", "Cambria", "Times New Roman", serif;
        font-size: 14px; font-style: italic;
        background: rgba(255, 252, 240, 0.75);
        color: #3a2410;
        border: none;
        border-bottom: 1px solid rgba(122, 80, 40, 0.45);
        border-radius: 0;
        padding: 4px 2px;
        outline: none;
        width: 100%;
        box-sizing: border-box;
      `;
      input.onfocus = () => { input.style.borderBottomColor = '#7a5028'; input.style.background = 'rgba(255, 252, 240, 0.95)'; };
      input.onblur = () => {
        input.style.borderBottomColor = 'rgba(122, 80, 40, 0.45)';
        input.style.background = 'rgba(255, 252, 240, 0.75)';
        setGuess(entry.token, input.value.trim());
      };
      input.onchange = () => setGuess(entry.token, input.value.trim());
      // Eat movement-key keydown at input target so it never bubbles to
      // Phaser's window listener and walks the player around. Default
      // action (typing the character) still runs.
      input.addEventListener('keydown', (ev) => {
        const k = ev.key;
        const movement =
          k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown' ||
          k === 'w' || k === 'a' || k === 's' || k === 'd' ||
          k === 'W' || k === 'A' || k === 'S' || k === 'D';
        if (movement) ev.stopPropagation();
      });
      card.appendChild(input);

      const footer = document.createElement('div');
      footer.textContent = `first heard from ${speaker}`;
      footer.style.cssText = `
        font-size: 10px; font-style: italic;
        color: #8a6238;
        letter-spacing: 0.03em;
      `;
      card.appendChild(footer);

      this.listEl.appendChild(card);
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler, true);
    window.removeEventListener('fledgling:fade-out', this.fadeOutHandler);
    window.removeEventListener('fledgling:fade-in', this.fadeInHandler);
    this.button.remove();
    this.root.remove();
    this.unsub?.();
  }
}
