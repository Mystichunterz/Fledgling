// Renders the leave/stay end screen per agents/story-dialogue-trees.md §4.6
// "Endings". Listens for `fledgling:encounter` events with nodeId END_LEAVE
// or END_STAY, queues the screen, and fades in once Hala's last line has
// had a couple of seconds to read.

type Ending = 'leave' | 'stay';

const ENDINGS: Record<Ending, { title: string; body: string; tint: string }> = {
  leave: {
    title: 'You sailed at first light.',
    body: [
      'The lighthouse beam swept past the bow once, twice, then dropped behind the headland.',
      'Hala stood on the cliff. She did not wave.',
      '',
      'You will write to them. The bread on this side of the world is the wrong shape.',
      'The sea is louder here.',
    ].join('\n'),
    tint: '#c2a868',
  },
  stay: {
    title: 'You stayed.',
    body: [
      'Naro\'s bread was still warm. There was a stool at Lemu\'s press. Senu had a second axe.',
      'Toka grunted, half-satisfied, and tossed you the striker.',
      '',
      'Hala read the letter once a year for the rest of her winters.',
      'Sometimes you helped her read it.',
    ].join('\n'),
    tint: '#e8b878',
  },
};

const DELAY_BEFORE_SHOW_MS = 2400;

export class EndScreen {
  private root: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private hintEl: HTMLDivElement;
  private pendingTimer: number | null = null;
  private isActive = false;

  constructor() {
    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(8, 6, 4, 0.96);
      color: #e8dcc1;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      box-sizing: border-box;
      z-index: 2400;
      font-family: "Georgia", "Cambria", "Times New Roman", serif;
      text-align: center;
      opacity: 0;
      transition: opacity 1.2s ease;
    `;

    this.titleEl = document.createElement('div');
    this.titleEl.style.cssText = `
      font-size: 32px; font-weight: 600; margin-bottom: 24px;
      letter-spacing: 0.02em;
    `;
    this.root.appendChild(this.titleEl);

    this.bodyEl = document.createElement('div');
    this.bodyEl.style.cssText = `
      font-size: 18px; line-height: 1.6;
      max-width: 640px; white-space: pre-wrap;
      color: #d4c89a;
    `;
    this.root.appendChild(this.bodyEl);

    this.hintEl = document.createElement('div');
    this.hintEl.style.cssText = `
      position: absolute; bottom: 28px;
      font-family: ui-monospace, monospace;
      font-size: 12px; color: #7d6a4a;
      letter-spacing: 0.1em;
      opacity: 0; transition: opacity 1.5s ease;
    `;
    this.hintEl.textContent = 'press any key to return to title';
    this.root.appendChild(this.hintEl);

    document.body.appendChild(this.root);

    window.addEventListener('fledgling:encounter', (ev) => {
      const detail = (ev as CustomEvent<{ nodeId?: string }>).detail;
      const nodeId = detail?.nodeId;
      if (nodeId === 'END_LEAVE') this.queue('leave');
      else if (nodeId === 'END_STAY') this.queue('stay');
    });
  }

  private queue(ending: Ending) {
    if (this.pendingTimer !== null) clearTimeout(this.pendingTimer);
    this.pendingTimer = window.setTimeout(() => {
      this.show(ending);
      this.pendingTimer = null;
    }, DELAY_BEFORE_SHOW_MS);
  }

  private show(ending: Ending) {
    if (this.isActive) return;
    this.isActive = true;

    const { title, body, tint } = ENDINGS[ending];
    this.titleEl.textContent = title;
    this.titleEl.style.color = tint;
    this.bodyEl.textContent = body;

    this.root.style.display = 'flex';
    requestAnimationFrame(() => {
      this.root.style.opacity = '1';
      window.setTimeout(() => { this.hintEl.style.opacity = '0.7'; }, 4000);
    });

    const onAny = (ev: KeyboardEvent | MouseEvent) => {
      ev.stopPropagation();
      if ('preventDefault' in ev) ev.preventDefault();
      window.removeEventListener('keydown', onAny as EventListener, true);
      window.removeEventListener('mousedown', onAny as EventListener, true);
      window.location.reload();
    };
    window.setTimeout(() => {
      window.addEventListener('keydown', onAny as EventListener, true);
      window.addEventListener('mousedown', onAny as EventListener, true);
    }, 1500);
  }
}
