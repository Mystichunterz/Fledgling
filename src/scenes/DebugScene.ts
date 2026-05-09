import Phaser from 'phaser';
import { SceneKeys } from '../assets/keys';
import { GameRegistry, giveItem, clearItems } from '../state/GameRegistry';
import { ITEMS, ITEM_LABEL, type ItemId } from '../state/items';
import { NPC_ROSTER } from '../sim/npcRoster';
import { setFlag, isFlagSet, clearFlags } from '../state/dialogueFlags';
import { clearDiary } from '../sim/diary';
import { resetPrologue } from './CrashPrologue';
import type { StateFlag } from '../sim/dialogueTypes';

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

// npcRoster.scene values match SceneKeys values 1:1 — they're both the
// runtime scene-key strings. Cast directly when teleporting.
const NPC_SCENE_TO_KEY: Record<string, string> = {
  crash_site: SceneKeys.CRASH_SITE,
  village:    SceneKeys.VILLAGE,
  hut:        SceneKeys.HUT,
  lighthouse: SceneKeys.LIGHTHOUSE,
};

// Dialogue/state flags exposed in the dev HUD as toggle pills, grouped by
// category for legibility. The full union lives in sim/dialogueTypes.ts.
const FLAG_GROUPS: Array<{ label: string; flags: Array<{ flag: StateFlag; label: string }> }> = [
  {
    label: 'anchor',
    flags: [
      { flag: 'anchor_known.hi',   label: 'hi' },
      { flag: 'anchor_known.me',   label: 'me' },
      { flag: 'anchor_known.you',  label: 'you' },
      { flag: 'anchor_known.want', label: 'want' },
      { flag: 'anchor_known.go',   label: 'go' },
    ],
  },
  {
    label: 'met',
    flags: [
      { flag: 'met_pemi', label: 'Pemi' },
      { flag: 'met_naro', label: 'Naro' },
      { flag: 'met_lemu', label: 'Lemu' },
      { flag: 'met_toka', label: 'Toka' },
      { flag: 'met_senu', label: 'Senu' },
      { flag: 'met_hala', label: 'Hala' },
    ],
  },
  {
    label: 'fetch',
    flags: [
      { flag: 'fetch_done_pemi', label: 'Pemi' },
      { flag: 'fetch_done_naro', label: 'Naro' },
      { flag: 'fetch_done_lemu', label: 'Lemu' },
      { flag: 'fetch_done_toka', label: 'Toka' },
      { flag: 'fetch_done_senu', label: 'Senu' },
      { flag: 'fetch_done_hala', label: 'Hala' },
    ],
  },
  {
    label: 'holding',
    flags: [
      { flag: 'holding_fruit',  label: 'fruit' },
      { flag: 'holding_water',  label: 'water' },
      { flag: 'holding_rope',   label: 'rope' },
      { flag: 'holding_basket', label: 'basket' },
    ],
  },
  {
    label: 'misc',
    flags: [
      { flag: 'has_visited_hut',  label: 'visited-hut' },
      { flag: 'holds_item_wood',  label: 'has-wood' },
      { flag: 'holds_item_oil',   label: 'has-oil' },
      { flag: 'holds_item_flint', label: 'has-flint' },
    ],
  },
];

export class DebugScene extends Phaser.Scene {
  private hudEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private buttons = new Map<string, HTMLButtonElement>();
  private itemButtons = new Map<ItemId, HTMLButtonElement>();
  private flagButtons = new Map<StateFlag, HTMLButtonElement>();
  private hudVisible = false;
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

    const npcs = document.createElement('div');
    npcs.className = 'teleport npcs';
    for (const npc of NPC_ROSTER) {
      const sceneKey = NPC_SCENE_TO_KEY[npc.scene];
      if (!sceneKey) continue;
      const btn = document.createElement('button');
      btn.dataset.npc = npc.id;
      btn.textContent = npc.displayName;
      btn.title = `Teleport to ${npc.displayName} (${npc.scene} ${npc.spawn.x},${npc.spawn.y})`;
      btn.addEventListener('click', () => this.jumpToCoords(sceneKey, npc.spawn.x, npc.spawn.y));
      npcs.appendChild(btn);
    }
    this.hudEl.appendChild(npcs);

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
    const clearItemsBtn = document.createElement('button');
    clearItemsBtn.textContent = 'Clear items';
    clearItemsBtn.title = 'Drop every item and unlight the beacon';
    clearItemsBtn.addEventListener('click', () => clearItems());
    items.appendChild(clearItemsBtn);
    this.hudEl.appendChild(items);

    for (const group of FLAG_GROUPS) {
      const row = document.createElement('div');
      row.className = 'teleport flags';
      const lbl = document.createElement('span');
      lbl.textContent = `${group.label}:`;
      lbl.style.cssText = 'opacity: 0.55; font-size: 10px; align-self: center; margin-right: 2px; min-width: 42px;';
      row.appendChild(lbl);
      for (const { flag, label } of group.flags) {
        const btn = document.createElement('button');
        btn.dataset.flag = flag;
        btn.textContent = label;
        btn.title = flag;
        btn.addEventListener('click', () => setFlag(flag, !isFlagSet(flag)));
        row.appendChild(btn);
        this.flagButtons.set(flag, btn);
      }
      this.hudEl.appendChild(row);
    }
    const flagsClearRow = document.createElement('div');
    flagsClearRow.className = 'teleport flags';
    const flagsClearLbl = document.createElement('span');
    flagsClearLbl.textContent = 'flags:';
    flagsClearLbl.style.cssText = 'opacity: 0.55; font-size: 10px; align-self: center; margin-right: 2px; min-width: 42px;';
    flagsClearRow.appendChild(flagsClearLbl);
    const flagsClearBtn = document.createElement('button');
    flagsClearBtn.textContent = 'Clear all';
    flagsClearBtn.addEventListener('click', () => clearFlags());
    flagsClearRow.appendChild(flagsClearBtn);
    this.hudEl.appendChild(flagsClearRow);

    const resetRow = document.createElement('div');
    resetRow.className = 'teleport reset-row';
    const newGameBtn = document.createElement('button');
    newGameBtn.className = 'new-game';
    newGameBtn.textContent = '↺ New Game (reset all)';
    newGameBtn.title = 'Wipe items, flags, diary, and prologue, then reload';
    newGameBtn.addEventListener('click', () => this.resetEverything());
    resetRow.appendChild(newGameBtn);
    this.hudEl.appendChild(resetRow);

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
    for (const [flag, btn] of this.flagButtons) {
      btn.classList.toggle('active', isFlagSet(flag));
    }
  }

  private resetEverything() {
    const ok = window.confirm('Reset to a fresh game? This clears items, dialogue flags, diary entries, and the prologue marker, then reloads at the crash site.');
    if (!ok) return;
    clearItems();
    clearFlags();
    clearDiary();
    resetPrologue();
    // Boot normally drops the player into the village. After a hard reset
    // we want the prologue to play, so flag the next boot to land at the
    // crash site instead. BootScene reads and clears this on startup.
    try { sessionStorage.setItem('fledgling:newgame', '1'); } catch { /* ignore */ }
    window.location.reload();
  }

  private toggle() {
    if (!this.hudEl) return;
    this.hudVisible = !this.hudVisible;
    this.hudEl.toggleAttribute('hidden', !this.hudVisible);
    window.dispatchEvent(new CustomEvent('dev:hud-toggled', { detail: { visible: this.hudVisible } }));
  }

  private jumpTo(target: string) {
    const current = GameRegistry.currentScene;
    if (!current || current === target) return;
    // game.scene (SceneManager) does NOT auto-shut-down the caller, unlike
    // this.scene.start which would kill DebugScene every teleport.
    this.game.scene.stop(current);
    this.game.scene.start(target, { spawnAt: 'default' });
  }

  // Teleport to specific world coordinates within a scene. Used by the NPC
  // jump buttons. If we're already in the target scene, just nudge the
  // existing player sprite — no scene swap needed.
  private jumpToCoords(target: string, x: number, y: number) {
    const current = GameRegistry.currentScene;
    if (!current) return;
    if (current === target) {
      const ws = this.game.scene.getScene(target) as Phaser.Scene & {
        player?: { sprite?: { x: number; y: number } };
      };
      if (ws?.player?.sprite) {
        ws.player.sprite.x = x;
        ws.player.sprite.y = y;
      }
      return;
    }
    this.game.scene.stop(current);
    this.game.scene.start(target, { x, y });
  }
}
