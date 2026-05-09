import Phaser from 'phaser';

export interface MenuOption {
  id: string;
  label: string;
  onPick: () => void;
}

export class InteractionMenu {
  private root: HTMLDivElement;
  private clickAwayHandler: (ev: MouseEvent) => void;
  private dismissKeyHandler: (ev: KeyboardEvent) => void;
  private isOpen = false;

  constructor() {
    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: fixed; display: none;
      background: rgba(20,18,12,0.95);
      border: 1px solid #8a6f3a; border-radius: 4px;
      padding: 4px; z-index: 999;
      font-family: ui-monospace, "SF Mono", monospace;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(this.root);

    // Stop mousedowns inside the menu from reaching the window-level
    // clickAwayHandler. The contains() guard there should also handle this,
    // but with transform: translate on the root it's possible for ev.target
    // to resolve to a sibling/ancestor and trip a spurious close — which
    // hides the menu before the Talk button's click event can fire.
    this.root.addEventListener('mousedown', (ev) => ev.stopPropagation());

    this.clickAwayHandler = (ev: MouseEvent) => {
      if (!this.isOpen) return;
      if (this.root.contains(ev.target as Node)) return;
      this.close();
    };

    // The menu is anchored at world coords at open() time and doesn't follow
    // the camera, so any movement intent dismisses it. Escape too, for parity
    // with the dialogue overlay.
    this.dismissKeyHandler = (ev: KeyboardEvent) => {
      if (!this.isOpen) return;
      const k = ev.key;
      const movement =
        k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown' ||
        k === 'w' || k === 'a' || k === 's' || k === 'd' ||
        k === 'W' || k === 'A' || k === 'S' || k === 'D';
      if (movement || k === 'Escape') this.close();
    };
  }

  open(scene: Phaser.Scene, worldX: number, worldY: number, options: MenuOption[]) {
    this.root.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        display: block; width: 100%; min-width: 110px; text-align: left;
        padding: 6px 12px; font-size: 13px; font-family: inherit;
        color: #e8dcc1; background: transparent;
        border: 0; border-radius: 2px; cursor: pointer;
      `;
      btn.onmouseenter = () => { btn.style.background = 'rgba(138,111,58,0.4)'; };
      btn.onmouseleave = () => { btn.style.background = 'transparent'; };
      btn.textContent = opt.label;
      btn.onclick = () => { this.close(); opt.onPick(); };
      this.root.appendChild(btn);
    });

    const screen = this.worldToScreen(scene, worldX, worldY);
    this.root.style.left = `${screen.x}px`;
    this.root.style.top = `${screen.y}px`;
    // Centre the menu on the anchor (NPC's bounding-box centre) so it sits on
    // the proximity highlight rather than floating above the sprite.
    this.root.style.transform = 'translate(-50%, -50%)';
    this.root.style.display = 'block';
    this.isOpen = true;
    // Defer the click-away listener so the click that opened the menu doesn't immediately close it.
    setTimeout(() => {
      window.addEventListener('mousedown', this.clickAwayHandler);
      window.addEventListener('keydown', this.dismissKeyHandler);
    }, 0);
  }

  close() {
    this.root.style.display = 'none';
    this.isOpen = false;
    window.removeEventListener('mousedown', this.clickAwayHandler);
    window.removeEventListener('keydown', this.dismissKeyHandler);
  }

  private worldToScreen(scene: Phaser.Scene, worldX: number, worldY: number): { x: number; y: number } {
    const cam = scene.cameras.main;
    const canvas = scene.scale.canvas;
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width / scene.scale.width;
    const sy = rect.height / scene.scale.height;
    // Project via cam.worldView (already factors zoom + scroll + bounds-clamp).
    // Using cam.scrollX directly is wrong at zoom > 1: Phaser computes
    // midPoint = scrollX + cam.width/2 (unscaled), so worldView.x diverges
    // from scrollX as zoom rises. Mirror Enterprise's NpcLabel formula.
    const view = cam.worldView;
    const canvasX = cam.x + ((worldX - view.x) / view.width) * cam.width;
    const canvasY = cam.y + ((worldY - view.y) / view.height) * cam.height;
    return {
      x: rect.left + canvasX * sx,
      y: rect.top + canvasY * sy,
    };
  }

  destroy() {
    window.removeEventListener('mousedown', this.clickAwayHandler);
    window.removeEventListener('keydown', this.dismissKeyHandler);
    this.root.remove();
  }
}
