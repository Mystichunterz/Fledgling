import Phaser from 'phaser';
import { GameRegistry } from '../state/GameRegistry';
import { CRITICAL_ITEMS, ITEM_LABEL } from '../state/items';

export interface LighthouseMenuOpenOptions {
  onLight: () => void;
}

export class LighthouseMenu {
  private root: HTMLDivElement;
  private clickAwayHandler: (ev: MouseEvent) => void;
  private isOpen = false;

  constructor() {
    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: fixed; display: none;
      left: 50%; top: 50%; transform: translate(-50%, -50%);
      min-width: 240px;
      padding: 14px 18px 16px;
      background: linear-gradient(rgba(200, 144, 88, 0.92), rgba(160, 100, 50, 0.92));
      border: 2px solid rgba(42, 20, 8, 0.7);
      box-shadow:
        inset 0 1px 0 rgba(255, 230, 180, 0.25),
        0 6px 18px rgba(0, 0, 0, 0.45);
      font-family: ui-monospace, "SF Mono", "Cascadia Code", monospace;
      color: rgba(42, 20, 8, 0.92);
      z-index: 1000;
      user-select: none;
    `;
    document.body.appendChild(this.root);

    this.clickAwayHandler = (ev: MouseEvent) => {
      if (!this.isOpen) return;
      if (this.root.contains(ev.target as Node)) return;
      this.close();
    };
  }

  open(options: LighthouseMenuOpenOptions) {
    this.render(options);
    this.root.style.display = 'block';
    this.isOpen = true;
    setTimeout(() => window.addEventListener('mousedown', this.clickAwayHandler), 0);
  }

  close() {
    this.root.style.display = 'none';
    this.isOpen = false;
    window.removeEventListener('mousedown', this.clickAwayHandler);
  }

  private render(options: LighthouseMenuOpenOptions) {
    this.root.innerHTML = '';

    const title = document.createElement('div');
    title.textContent = 'The Beacon Pyre';
    title.style.cssText = `
      font-size: 14px; font-weight: 700; letter-spacing: 0.5px;
      text-transform: uppercase; text-align: center;
      color: rgba(42, 20, 8, 0.92);
      text-shadow: 1px 1px 0 rgba(255, 240, 200, 0.35);
      margin-bottom: 10px;
    `;
    this.root.appendChild(title);

    if (GameRegistry.beaconLit) {
      const lit = document.createElement('div');
      lit.textContent = 'The beacon burns bright.';
      lit.style.cssText = `
        font-size: 12px; text-align: center; padding: 6px 0 10px;
        color: rgba(60, 22, 4, 0.92);
      `;
      this.root.appendChild(lit);
      this.root.appendChild(this.makeButton('Close', true, () => this.close()));
      return;
    }

    const list = document.createElement('div');
    list.style.cssText = 'margin-bottom: 12px;';
    for (const id of CRITICAL_ITEMS) {
      const has = GameRegistry.itemsCollected.has(id);
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex; align-items: center; gap: 8px;
        font-size: 13px; padding: 3px 4px;
        color: ${has ? 'rgba(42, 20, 8, 0.92)' : 'rgba(42, 20, 8, 0.45)'};
      `;
      const box = document.createElement('span');
      box.textContent = has ? '☑' : '☐';
      box.style.cssText = `
        font-size: 16px; min-width: 18px;
        color: ${has ? '#5a2e08' : 'rgba(42, 20, 8, 0.4)'};
      `;
      const label = document.createElement('span');
      label.textContent = ITEM_LABEL[id];
      label.style.cssText = has ? 'font-weight: 700;' : '';
      row.appendChild(box);
      row.appendChild(label);
      list.appendChild(row);
    }
    this.root.appendChild(list);

    const allHave = CRITICAL_ITEMS.every(id => GameRegistry.itemsCollected.has(id));
    this.root.appendChild(
      this.makeButton(
        allHave ? 'Light the Beacon' : `Need ${this.missingCount()} more`,
        allHave,
        () => {
          this.close();
          options.onLight();
        },
      ),
    );
  }

  private missingCount(): number {
    return CRITICAL_ITEMS.filter(id => !GameRegistry.itemsCollected.has(id)).length;
  }

  private makeButton(label: string, enabled: boolean, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.disabled = !enabled;
    btn.style.cssText = `
      display: block; width: 100%;
      padding: 8px 14px;
      font-family: inherit; font-size: 13px; font-weight: 700;
      letter-spacing: 0.6px; text-transform: uppercase;
      color: ${enabled ? '#fff0c8' : 'rgba(42, 20, 8, 0.4)'};
      background: ${enabled ? 'linear-gradient(#5c2a08, #3a1604)' : 'rgba(60, 30, 12, 0.35)'};
      border: 2px solid ${enabled ? '#2a1408' : 'rgba(42, 20, 8, 0.4)'};
      cursor: ${enabled ? 'pointer' : 'not-allowed'};
      box-shadow: ${enabled
        ? 'inset 0 1px 0 rgba(255, 200, 120, 0.35), inset 0 -2px 0 rgba(0, 0, 0, 0.4)'
        : 'none'};
      text-shadow: ${enabled ? '1px 1px 0 rgba(0, 0, 0, 0.5)' : 'none'};
    `;
    if (enabled) {
      btn.onmouseenter = () => { btn.style.filter = 'brightness(1.18)'; };
      btn.onmouseleave = () => { btn.style.filter = 'none'; };
      btn.onclick = (ev) => { ev.stopPropagation(); onClick(); };
    }
    return btn;
  }

  destroy() {
    window.removeEventListener('mousedown', this.clickAwayHandler);
    this.root.remove();
  }
}
