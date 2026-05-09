import type { FillerItem, ItemKind } from '../sim/dialogueTypes';
import { isFlagSet, subscribeFlags } from '../state/dialogueFlags';

const FILLERS: FillerItem[] = ['fruit', 'water', 'rope', 'basket'];
const CRITICAL: ItemKind[] = ['wood', 'oil', 'flint'];

const FILLER_GLYPH: Record<FillerItem, string> = {
  fruit: 'r',
  water: 'w',
  rope: 'p',
  basket: 'b',
};

const CRITICAL_GLYPH: Record<ItemKind, string> = {
  wood: 'W',
  oil: 'O',
  flint: 'F',
};

// Fixed top-right panel; lists currently-held fillers and acquired critical
// items. Driven by dialogueFlags state — refreshes on any flag change.
export class InventoryHud {
  private root: HTMLDivElement;
  private listEl: HTMLDivElement;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: fixed; top: 12px; right: 12px;
      background: rgba(20, 16, 10, 0.78);
      border: 1px solid #6a4d20;
      border-radius: 4px;
      padding: 6px 10px;
      font-family: ui-monospace, "Cascadia Code", monospace;
      font-size: 12px;
      color: #e8dcc1;
      z-index: 800;
      pointer-events: none;
      min-width: 88px;
      letter-spacing: 0.04em;
    `;

    const header = document.createElement('div');
    header.textContent = 'INVENTORY';
    header.style.cssText = `
      font-size: 9px; color: #c2a868; letter-spacing: 0.12em;
      margin-bottom: 4px; text-transform: uppercase;
    `;
    this.root.appendChild(header);

    this.listEl = document.createElement('div');
    this.listEl.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';
    this.root.appendChild(this.listEl);

    document.body.appendChild(this.root);

    this.render();
    this.unsubscribe = subscribeFlags(() => this.render());
  }

  private render() {
    const lines: string[] = [];
    for (const f of FILLERS) {
      if (isFlagSet(`holding_${f}` as const)) lines.push(`[${FILLER_GLYPH[f]}] ${f}`);
    }
    for (const c of CRITICAL) {
      if (isFlagSet(`holds_item_${c}` as const)) lines.push(`[${CRITICAL_GLYPH[c]}] ${c}`);
    }
    if (lines.length === 0) {
      this.listEl.innerHTML = '<div style="color: #7d6a4a; font-style: italic;">empty</div>';
      return;
    }
    this.listEl.innerHTML = lines.map(l => `<div>${l}</div>`).join('');
  }

  destroy() {
    this.unsubscribe?.();
    this.root.remove();
  }
}
