import Phaser from 'phaser';
import { SceneKeys } from '../assets/keys';
import { GameRegistry } from '../state/GameRegistry';
import { ITEM_GLYPH, ITEM_LABEL, type ItemId } from '../state/items';

const SLOT_COUNT = 6;

// Player-facing inventory HUD — Minecraft/Stardew-style hotbar. Always
// visible. Refreshed via rAF so it survives world-scene swaps (same pattern
// as DebugScene).
export class PlayerHudScene extends Phaser.Scene {
  private hudEl: HTMLElement | null = null;
  private slotEls: HTMLElement[] = [];
  private beaconEl: HTMLElement | null = null;
  private rafHandle = 0;

  constructor() {
    super(SceneKeys.PLAYER_HUD);
  }

  create() {
    this.hudEl = document.getElementById('player-hud');
    if (!this.hudEl) return;
    this.buildHud();
    this.startRefreshLoop();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
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
        slot.textContent = ITEM_GLYPH[item];
        slot.title = ITEM_LABEL[item];
      } else {
        slot.classList.remove('have');
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
  }
}
