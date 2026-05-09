import Phaser from 'phaser';
import { SceneKeys } from '../assets/keys';
import { GameRegistry, giveItem, clearItems } from '../state/GameRegistry';
import { ITEMS, ITEM_LABEL, type ItemId } from '../state/items';

const HOTKEY_TO_SCENE: Record<string, string> = {
  '1': SceneKeys.CRASH_SITE,
  '2': SceneKeys.VILLAGE,
  '3': SceneKeys.HUT,
  '4': SceneKeys.LIGHTHOUSE,
};

const TELEPORTS: Array<{ key: string; label: string; sceneKey: string }> = [
  { key: '1', label: 'Crash',    sceneKey: SceneKeys.CRASH_SITE },
  { key: '2', label: 'Village',  sceneKey: SceneKeys.VILLAGE },
  { key: '3', label: 'Hut',      sceneKey: SceneKeys.HUT },
  { key: '4', label: 'Lighthouse', sceneKey: SceneKeys.LIGHTHOUSE },
];

export class DebugScene extends Phaser.Scene {
  private hudEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private buttons = new Map<string, HTMLButtonElement>();
  private itemButtons = new Map<ItemId, HTMLButtonElement>();
  private hudVisible = true;
  private rafHandle = 0;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    super(SceneKeys.DEBUG);
  }

  create() {
    this.hudEl = document.getElementById('debug-hud');
    if (!this.hudEl) return;

    this.buildHud();
    this.attachWindowKeys();
    this.startRefreshLoop();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
  }

  private buildHud() {
    if (!this.hudEl) return;
    this.hudEl.innerHTML = '';

    const status = document.createElement('div');
    status.className = 'status';
    this.hudEl.appendChild(status);
    this.statusEl = status;

    const teleport = document.createElement('div');
    teleport.className = 'teleport';
    for (const { key, label, sceneKey } of TELEPORTS) {
      const btn = document.createElement('button');
      btn.dataset.scene = sceneKey;
      btn.innerHTML = `<span class="key">${key}</span>${label}`;
      btn.addEventListener('click', () => this.jumpTo(sceneKey));
      teleport.appendChild(btn);
      this.buttons.set(sceneKey, btn);
    }
    this.hudEl.appendChild(teleport);

    const items = document.createElement('div');
    items.className = 'teleport items';
    for (const id of ITEMS) {
      const btn = document.createElement('button');
      btn.dataset.item = id;
      btn.textContent = ITEM_LABEL[id];
      btn.addEventListener('click', () => giveItem(id));
      items.appendChild(btn);
      this.itemButtons.set(id, btn);
    }
    const reset = document.createElement('button');
    reset.textContent = 'Reset';
    reset.addEventListener('click', () => clearItems());
    items.appendChild(reset);
    this.hudEl.appendChild(items);

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = '` toggle  ·  arrows / WASD walk';
    this.hudEl.appendChild(hint);

    this.refreshStatus();
  }

  // Refresh and key handling live on window/rAF, not the Phaser scene loop —
  // DebugScene appears to lose its update tick when world scenes swap, so
  // anchoring to the page lifecycle is more robust.
  private startRefreshLoop() {
    const tick = () => {
      if (this.hudVisible) this.refreshStatus();
      this.rafHandle = requestAnimationFrame(tick);
    };
    this.rafHandle = requestAnimationFrame(tick);
  }

  private attachWindowKeys() {
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const sceneKey = HOTKEY_TO_SCENE[e.key];
      if (sceneKey) {
        e.preventDefault();
        this.jumpTo(sceneKey);
        return;
      }
      if (e.key === '`') {
        e.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  private teardown() {
    if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
    this.rafHandle = 0;
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = null;
  }

  private refreshStatus() {
    if (!this.statusEl) return;
    const fps = Math.round(this.game.loop.actualFps);
    const sc = GameRegistry.currentScene ?? '—';
    const px = Math.round(GameRegistry.playerX);
    const py = Math.round(GameRegistry.playerY);
    const ww = GameRegistry.worldWidth;
    const wh = GameRegistry.worldHeight;
    const itemsLine = ITEMS.map(i =>
      GameRegistry.itemsCollected.has(i)
        ? `<b>${ITEM_LABEL[i]}</b>`
        : `<span style="opacity:.4">${ITEM_LABEL[i]}</span>`,
    ).join(' ');
    const beacon = GameRegistry.beaconLit ? ' &middot; <b style="color:#ffa040">beacon lit</b>' : '';
    this.statusEl.innerHTML = `
      <div><b>${sc}</b> &middot; ${fps} fps</div>
      <div>player ${px}, ${py} / ${ww}&times;${wh}</div>
      <div>items: ${itemsLine}${beacon}</div>
    `;
    for (const [sceneKey, btn] of this.buttons) {
      btn.classList.toggle('active', sceneKey === sc);
    }
    for (const [id, btn] of this.itemButtons) {
      btn.classList.toggle('active', GameRegistry.itemsCollected.has(id));
    }
  }

  private toggle() {
    if (!this.hudEl) return;
    this.hudVisible = !this.hudVisible;
    this.hudEl.toggleAttribute('hidden', !this.hudVisible);
  }

  private jumpTo(target: string) {
    const current = GameRegistry.currentScene;
    if (!current || current === target) return;
    // game.scene (SceneManager) does NOT auto-shut-down the caller, unlike
    // this.scene.start which would kill DebugScene every teleport.
    this.game.scene.stop(current);
    this.game.scene.start(target, { spawnAt: 'default' });
  }
}
