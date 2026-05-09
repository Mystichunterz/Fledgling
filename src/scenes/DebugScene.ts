import Phaser from 'phaser';
import { SceneKeys } from '../assets/keys';
import { GameRegistry } from '../state/GameRegistry';

const HOTKEYS: Record<string, string> = {
  ONE:   SceneKeys.CRASH_SITE,
  TWO:   SceneKeys.VILLAGE,
  THREE: SceneKeys.HUT,
  FOUR:  SceneKeys.HEADLAND,
};

const HOTKEY_LABEL: Record<string, string> = {
  [SceneKeys.CRASH_SITE]: '1 Crash',
  [SceneKeys.VILLAGE]:    '2 Village',
  [SceneKeys.HUT]:        '3 Hut',
  [SceneKeys.HEADLAND]:   '4 Headland',
};

export class DebugScene extends Phaser.Scene {
  private hudEl: HTMLElement | null = null;
  private hudVisible = true;

  constructor() {
    super(SceneKeys.DEBUG);
  }

  create() {
    this.hudEl = document.getElementById('debug-hud');

    if (this.input.keyboard) {
      for (const [keyName, sceneKey] of Object.entries(HOTKEYS)) {
        this.input.keyboard.on(`keydown-${keyName}`, () => this.jumpTo(sceneKey));
      }
      this.input.keyboard.on('keydown-BACKTICK', () => this.toggle());
    }
  }

  override update() {
    if (!this.hudEl || !this.hudVisible) return;
    this.hudEl.innerHTML = this.renderHud();
  }

  private toggle() {
    if (!this.hudEl) return;
    this.hudVisible = !this.hudVisible;
    this.hudEl.toggleAttribute('hidden', !this.hudVisible);
  }

  private jumpTo(target: string) {
    const current = GameRegistry.currentScene;
    if (!current || current === target) return;
    this.scene.stop(current);
    this.scene.start(target, { spawnAt: 'default' });
  }

  private renderHud(): string {
    const fps = Math.round(this.game.loop.actualFps);
    const sc = GameRegistry.currentScene ?? '—';
    const px = Math.round(GameRegistry.playerX);
    const py = Math.round(GameRegistry.playerY);
    const ww = GameRegistry.worldWidth;
    const wh = GameRegistry.worldHeight;
    const hotkeys = Object.entries(HOTKEY_LABEL)
      .map(([key, label]) => key === sc ? `<b>${label}</b>` : label)
      .join(' &middot; ');
    return `
      <div><b>${sc}</b> &middot; ${fps} fps</div>
      <div>player ${px}, ${py} / ${ww}&times;${wh}</div>
      <div class="hotkeys">${hotkeys}</div>
      <div class="hint">\` toggle</div>
    `;
  }
}
