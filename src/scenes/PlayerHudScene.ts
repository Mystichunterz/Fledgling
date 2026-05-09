import Phaser from 'phaser';
import { SceneKeys } from '../assets/keys';
import { GameRegistry } from '../state/GameRegistry';
import { ITEMS, ITEM_GLYPH, ITEM_LABEL, ITEM_SPRITE, type ItemId } from '../state/items';

const SLOT_COUNT = 6;
const MUSIC_MUTE_KEY = 'fledgling.musicMuted';

// Player-facing inventory HUD — Minecraft/Stardew-style hotbar. Always
// visible. Refreshed via rAF so it survives world-scene swaps (same pattern
// as DebugScene).
export class PlayerHudScene extends Phaser.Scene {
  private hudEl: HTMLElement | null = null;
  private slotEls: HTMLElement[] = [];
  private beaconEl: HTMLElement | null = null;
  private musicBtn: HTMLButtonElement | null = null;
  private musicClickHandler: (() => void) | null = null;
  private rafHandle = 0;

  constructor() {
    super(SceneKeys.PLAYER_HUD);
  }

  create() {
    this.hudEl = document.getElementById('player-hud');
    if (!this.hudEl) return;
    this.buildHud();
    this.bindMusicToggle();
    this.preloadIconImages();
    this.startRefreshLoop();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
  }

  // Phaser's load.image populates its own texture cache, but the hotbar
  // renders icons via CSS url() — a separate browser fetch. Without this
  // pre-warm, the first pickup of water/rope/basket waits on an HTTP load
  // before the slot icon appears. Decoding off-thread (decode()) means the
  // slot paint won't stutter either.
  private preloadIconImages() {
    for (const item of ITEMS) {
      const sprite = ITEM_SPRITE[item];
      if (!sprite) continue;
      const img = new Image();
      img.src = `/assets/sprite_${sprite}.png`;
      img.decode().catch(() => { /* ignore decode failures */ });
    }
  }

  private bindMusicToggle() {
    const btn = document.getElementById('music-toggle');
    if (!(btn instanceof HTMLButtonElement)) return;
    this.musicBtn = btn;

    // BootScene already applied the persisted mute state to the global
    // sound manager before playback started, so reflect the current value
    // rather than re-reading localStorage.
    this.applyMuted(this.sound.mute);

    this.musicClickHandler = () => {
      const next = !this.sound.mute;
      this.applyMuted(next);
      try {
        window.localStorage.setItem(MUSIC_MUTE_KEY, next ? '1' : '0');
      } catch { /* ignore */ }
    };
    btn.addEventListener('click', this.musicClickHandler);
  }

  private applyMuted(muted: boolean) {
    this.sound.mute = muted;
    if (this.musicBtn) {
      this.musicBtn.classList.toggle('muted', muted);
      this.musicBtn.title = muted ? 'Music off — click to unmute' : 'Music on — click to mute';
      this.musicBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    }
  }

  private buildHud() {
    if (!this.hudEl) return;
    this.hudEl.innerHTML = '';

    const beacon = document.createElement('div');
    beacon.className = 'beacon';
    beacon.textContent = 'Beacon Lit';
    this.hudEl.appendChild(beacon);
    this.beaconEl = beacon;

    const pack = document.createElement('div');
    pack.className = 'pack';
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      pack.appendChild(slot);
      this.slotEls.push(slot);
    }
    this.hudEl.appendChild(pack);
  }

  private startRefreshLoop() {
    const tick = () => {
      this.refresh();
      this.rafHandle = requestAnimationFrame(tick);
    };
    this.rafHandle = requestAnimationFrame(tick);
  }

  private refresh() {
    // Set iteration order in JS is insertion order — items appear in the
    // hotbar in the order the player collected them.
    const collected = [...GameRegistry.itemsCollected] as ItemId[];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = this.slotEls[i];
      if (!slot) continue;
      const item = collected[i];
      if (item) {
        slot.classList.add('have');
        const sprite = ITEM_SPRITE[item];
        if (sprite) {
          slot.style.backgroundImage = `url('/assets/sprite_${sprite}.png')`;
          slot.style.backgroundRepeat = 'no-repeat';
          slot.style.backgroundPosition = 'center';
          slot.style.backgroundSize = 'contain';
          slot.textContent = '';
        } else {
          slot.style.backgroundImage = '';
          slot.textContent = ITEM_GLYPH[item];
        }
        slot.title = ITEM_LABEL[item];
      } else {
        slot.classList.remove('have');
        slot.style.backgroundImage = '';
        slot.textContent = '';
        slot.removeAttribute('title');
      }
    }
    if (this.beaconEl) {
      this.beaconEl.classList.toggle('lit', GameRegistry.beaconLit);
    }
  }

  private teardown() {
    if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
    this.rafHandle = 0;
    if (this.musicBtn && this.musicClickHandler) {
      this.musicBtn.removeEventListener('click', this.musicClickHandler);
    }
    this.musicClickHandler = null;
    this.musicBtn = null;
  }
}
