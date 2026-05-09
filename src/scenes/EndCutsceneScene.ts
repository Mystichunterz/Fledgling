import Phaser from 'phaser';

// End-of-game cutscene — plays after the lighthouse beacon is lit. Same
// 320x180 stage + zoom-to-fit pattern as IntroCutsceneScene. A cargo ship
// sails across a dawn sea, then the screen fades to black and a few closing
// lines appear. Pressing a key on the final hold reloads to title.

export const END_CUTSCENE_WIDTH = 320;
export const END_CUTSCENE_HEIGHT = 180;

const SHIP_KEY = 'cargo_ship_trans';
const SHIP_PATH = '/assets/cargo_ship_trans.png';

const SKY_DAWN = 0x6a4868;
const SKY_DAWN_HORIZON = 0xc88a5a;
const SEA_DAWN = 0x2a3858;

const PHASE = {
  hold: 1200,
  sail: 9000,
  fade: 1500,
  black: 400,
};

// Sea surface is at y=110. Sprite has a red below-waterline strip at its
// bottom; sit the sprite a few px into the sea so the waterline-paint on the
// hull lines up with the sea surface and the hull looks sea-borne.
const SHIP_BASE_Y = 114;

const EXPO_LINES: readonly string[] = [
  'The fire on the cliff found the sea.',
  'A ship answered, the way it answered before.',
  'Wherever you sail from here, their words go with you.',
];
const EXPO_LINE_FADE_MS = 900;
const EXPO_LINE_GAP_MS = 1500;
const EXPO_FINAL_HOLD_MS = 2200;

type Phase = 'hold' | 'sail' | 'fade' | 'black' | 'exposition' | 'done';

const HUD_IDS = ['player-hud', 'debug-hud'] as const;
const HUD_RESTORE: Record<string, boolean> = {};
function setHudsHidden(hide: boolean) {
  for (const id of HUD_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (hide) {
      HUD_RESTORE[id] = el.hasAttribute('hidden');
      el.setAttribute('hidden', '');
    } else if (!HUD_RESTORE[id]) {
      el.removeAttribute('hidden');
    }
  }
}

// Lightweight DOM exposition surface — full-viewport overlay with stacked
// fade-in lines + a final "press any key" prompt. Same visual language as
// IntroCutsceneScene but built off plain DOM rather than the canvas-based
// ExpoCanvas, which lives privately in that file.
class EndExpoOverlay {
  private root: HTMLDivElement;
  private linesEl: HTMLDivElement;
  private lineEls: HTMLDivElement[] = [];
  private promptEl: HTMLDivElement;

  constructor(lines: readonly string[]) {
    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: fixed; inset: 0; z-index: 1700;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      pointer-events: none;
      font-family: ui-monospace, "Cascadia Code", "Courier New", monospace;
      color: #ffffff;
    `;

    this.linesEl = document.createElement('div');
    this.linesEl.style.cssText = `
      display: flex; flex-direction: column; gap: 16px;
      font-size: 22px; font-weight: 500; text-align: center;
      max-width: 760px;
    `;
    this.root.appendChild(this.linesEl);

    for (const text of lines) {
      const line = document.createElement('div');
      line.textContent = text;
      line.style.cssText = `opacity: 0; transition: opacity ${EXPO_LINE_FADE_MS}ms ease;`;
      this.linesEl.appendChild(line);
      this.lineEls.push(line);
    }

    this.promptEl = document.createElement('div');
    this.promptEl.textContent = '— press any key to return to title —';
    this.promptEl.style.cssText = `
      position: absolute; bottom: 60px;
      font-size: 13px; color: #888;
      opacity: 0; transition: opacity 600ms ease;
    `;
    this.root.appendChild(this.promptEl);

    document.body.appendChild(this.root);
  }

  showLine(idx: number) {
    const el = this.lineEls[idx];
    if (el) el.style.opacity = '1';
  }

  showAllLines() {
    for (const el of this.lineEls) el.style.opacity = '1';
  }

  showPrompt() {
    this.promptEl.style.opacity = '1';
  }

  destroy() {
    this.root.remove();
  }
}

export class EndCutsceneScene extends Phaser.Scene {
  private sky!: Phaser.GameObjects.Rectangle;
  private horizon!: Phaser.GameObjects.Rectangle;
  private sea!: Phaser.GameObjects.Rectangle;
  private clouds: Phaser.GameObjects.Rectangle[] = [];
  private ship!: Phaser.GameObjects.Image;
  private overlay!: Phaser.GameObjects.Rectangle;
  private expo: EndExpoOverlay | null = null;

  private phase: Phase = 'hold';
  private phaseStartedAt = 0;
  private shipStartX = 40;
  private shipEndX = END_CUTSCENE_WIDTH + 60;

  constructor() {
    super('end-cutscene');
  }

  preload() {
    this.load.image(SHIP_KEY, SHIP_PATH);
  }

  create() {
    const zoomX = this.scale.width / END_CUTSCENE_WIDTH;
    const zoomY = this.scale.height / END_CUTSCENE_HEIGHT;
    this.cameras.main.setZoom(Math.min(zoomX, zoomY));
    this.cameras.main.centerOn(END_CUTSCENE_WIDTH / 2, END_CUTSCENE_HEIGHT / 2);

    setHudsHidden(true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => setHudsHidden(false));
    this.events.once(Phaser.Scenes.Events.DESTROY, () => setHudsHidden(false));

    // Three-band sky: dusky purple top → warm horizon stripe → dark sea below.
    this.sky = this.add.rectangle(
      END_CUTSCENE_WIDTH / 2, 0,
      END_CUTSCENE_WIDTH, 110,
      SKY_DAWN,
    ).setOrigin(0.5, 0).setDepth(0);

    this.horizon = this.add.rectangle(
      END_CUTSCENE_WIDTH / 2, 110,
      END_CUTSCENE_WIDTH, 8,
      SKY_DAWN_HORIZON,
    ).setOrigin(0.5, 1).setDepth(1);

    this.sea = this.add.rectangle(
      END_CUTSCENE_WIDTH / 2, 110,
      END_CUTSCENE_WIDTH, END_CUTSCENE_HEIGHT - 110,
      SEA_DAWN,
    ).setOrigin(0.5, 0).setDepth(1);

    // Distant cloud band — light tinted bars drifting slowly across.
    for (let i = 0; i < 6; i++) {
      const w = Phaser.Math.Between(20, 36);
      const h = Phaser.Math.Between(2, 4);
      const x = Phaser.Math.Between(0, END_CUTSCENE_WIDTH);
      const y = Phaser.Math.Between(20, 80);
      const c = this.add.rectangle(x, y, w, h, 0xe8b878, 0.55).setDepth(2);
      this.clouds.push(c);
    }

    // The ship rides the horizon line.
    this.ship = this.add.image(this.shipStartX, SHIP_BASE_Y, SHIP_KEY)
      .setOrigin(0.5, 1)
      .setDepth(5);
    // Sprite is tight-cropped to the ship's bounding box (1102×436, ~2.53:1)
    // so origin-Y=1 lines up with the visible hull bottom. Pick a target width
    // and let height fall out of the aspect.
    const tex = this.textures.get(SHIP_KEY);
    if (tex && tex.source[0]) {
      const src = tex.source[0];
      const targetW = 80;
      this.ship.setDisplaySize(targetW, targetW * (src.height / src.width));
    } else {
      this.ship.setDisplaySize(80, 32);
    }

    this.overlay = this.add.rectangle(
      END_CUTSCENE_WIDTH / 2, END_CUTSCENE_HEIGHT / 2,
      END_CUTSCENE_WIDTH, END_CUTSCENE_HEIGHT,
      0x000000, 0,
    ).setDepth(100);

    this.bindInput();
    this.enterPhase('hold');
  }

  override update(_time: number, deltaMs: number) {
    const elapsed = this.time.now - this.phaseStartedAt;
    this.driftClouds(deltaMs);

    switch (this.phase) {
      case 'hold': this.tickHold(elapsed); break;
      case 'sail': this.tickSail(elapsed); break;
      case 'fade': this.tickFade(elapsed); break;
      case 'black': this.tickBlack(elapsed); break;
      case 'exposition':
      case 'done': break;
    }
  }

  private tickHold(elapsed: number) {
    // Ship enters from off-screen left during the hold, easing in.
    const t = Phaser.Math.Clamp(elapsed / PHASE.hold, 0, 1);
    this.ship.x = -40 + (this.shipStartX - -40) * t;
    this.ship.y = SHIP_BASE_Y + Math.sin(this.time.now / 700) * 0.6;
    if (elapsed >= PHASE.hold) this.enterPhase('sail');
  }

  private tickSail(elapsed: number) {
    const t = Phaser.Math.Clamp(elapsed / PHASE.sail, 0, 1);
    this.ship.x = this.shipStartX + (this.shipEndX - this.shipStartX) * t;
    this.ship.y = SHIP_BASE_Y + Math.sin(this.time.now / 700) * 0.6;
    if (elapsed >= PHASE.sail) this.enterPhase('fade');
  }

  private tickFade(elapsed: number) {
    const t = Phaser.Math.Clamp(elapsed / PHASE.fade, 0, 1);
    this.overlay.fillColor = 0x000000;
    this.overlay.alpha = t;
    // Ship continues drifting under the fade so the final frame is just sea.
    this.ship.x += 0.02 * (1 - t);
    if (elapsed >= PHASE.fade) this.enterPhase('black');
  }

  private tickBlack(elapsed: number) {
    this.overlay.alpha = 1;
    if (elapsed >= PHASE.black) this.enterPhase('exposition');
  }

  private enterPhase(next: Phase) {
    this.phase = next;
    this.phaseStartedAt = this.time.now;

    if (next === 'exposition') {
      this.expo = new EndExpoOverlay(EXPO_LINES);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.expo?.destroy());
      this.events.once(Phaser.Scenes.Events.DESTROY, () => this.expo?.destroy());
      this.startExpo();
    }
  }

  private startExpo() {
    let idx = 0;
    const showNext = () => {
      if (!this.expo) return;
      if (idx >= EXPO_LINES.length) {
        this.time.delayedCall(EXPO_FINAL_HOLD_MS, () => {
          this.expo?.showPrompt();
          this.phase = 'done';
        });
        return;
      }
      this.expo.showLine(idx);
      idx++;
      this.time.delayedCall(EXPO_LINE_FADE_MS + EXPO_LINE_GAP_MS, showNext);
    };
    showNext();
  }

  private driftClouds(deltaMs: number) {
    for (const c of this.clouds) {
      c.x -= 0.012 * deltaMs;
      if (c.x < -40) c.x = END_CUTSCENE_WIDTH + 40;
    }
  }

  private bindInput() {
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', () => this.advance());
    }
    this.input.on('pointerdown', () => this.advance());
  }

  private advance() {
    switch (this.phase) {
      case 'hold':       this.enterPhase('sail');       break;
      case 'sail':       this.enterPhase('fade');       break;
      case 'fade':       this.enterPhase('black');      break;
      case 'black':      this.enterPhase('exposition'); break;
      case 'exposition':
        this.expo?.showAllLines();
        this.expo?.showPrompt();
        this.phase = 'done';
        break;
      case 'done':
        window.location.reload();
        break;
    }
  }
}
