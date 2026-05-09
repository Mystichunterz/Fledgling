import Phaser from 'phaser';

export const CUTSCENE_WIDTH = 320;
export const CUTSCENE_HEIGHT = 180;

const PLANE_KEY = 'intro_plane';
const PLANE_PATH = '/assets/sprite_intro_plane.png';

const BGM_KEY = 'bgm_cutscene';
const BGM_PATH = '/assets/audio/Before_the_Heavens_Break.mp3';

const SKY_CALM = 0x2b557a;
const SKY_STORM = 0x1a2030;

const PHASE_DURATION = {
  calm:  4000,
  storm: 4000,
  crash: 3000,
  flash:  500,
  black:  500,
};

const EXPOSITION_LINES: readonly string[] = [
  'When you wake, the sky is quiet.',
  'Salt on your lips. Smoke on the wind.',
  'There are voices on the path. You do not know the words.',
];
const EXPO_LINE_FADE_MS = 900;
const EXPO_LINE_GAP_MS = 1500;
const EXPO_FINAL_HOLD_MS = 1800;

type Phase = 'calm' | 'storm' | 'crash' | 'flash' | 'black' | 'exposition' | 'done';

interface Smoke {
  rect: Phaser.GameObjects.Rectangle;
  vy: number;
  vx: number;
  life: number;
  maxLife: number;
}

class PlaneOverlay {
  x = 0;
  y = 0;
  angle = 0;
  private img: HTMLImageElement;
  private canvas: HTMLCanvasElement;
  private internalW: number;
  private internalH: number;
  private displaySize: number;

  constructor(
    imgId: string,
    canvas: HTMLCanvasElement,
    internalW: number,
    internalH: number,
    displaySize: number,
  ) {
    const el = document.getElementById(imgId);
    if (!(el instanceof HTMLImageElement)) {
      throw new Error(`PlaneOverlay: missing img #${imgId}`);
    }
    this.img = el;
    this.canvas = canvas;
    this.internalW = internalW;
    this.internalH = internalH;
    this.displaySize = displaySize;
  }

  setVisible(visible: boolean) {
    this.img.style.display = visible ? 'block' : 'none';
  }

  flush() {
    if (this.img.style.display === 'none') return;
    const rect = this.canvas.getBoundingClientRect();
    const scale = rect.width / this.internalW;
    const sizePx = this.displaySize * scale;
    const screenX = rect.left + this.x * scale;
    const screenY = rect.top + this.y * scale;
    this.img.style.width = sizePx + 'px';
    this.img.style.height = sizePx + 'px';
    this.img.style.transform =
      `translate(${screenX - sizePx / 2}px, ${screenY - sizePx / 2}px) rotate(${this.angle}deg)`;
  }

  destroy() {
    this.setVisible(false);
  }
}

class ExpoCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  lineAlphas: number[];
  promptAlpha = 0;
  promptText = '';
  hintText = '';
  hintAlpha = 0;
  private visible = false;
  private onResize: () => void;

  constructor(canvasId: string, lineCount: number) {
    const c = document.getElementById(canvasId);
    if (!(c instanceof HTMLCanvasElement)) {
      throw new Error(`ExpoCanvas: missing canvas #${canvasId}`);
    }
    this.canvas = c;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('ExpoCanvas: 2D context not available');
    this.ctx = ctx;
    this.lineAlphas = new Array(lineCount).fill(0);
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.resize();
    this.setVisible(true);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    this.canvas.style.display = visible ? 'block' : 'none';
  }

  reset() {
    this.lineAlphas.fill(0);
    this.promptAlpha = 0;
    this.promptText = '';
  }

  draw(lines: readonly string[]) {
    if (!this.visible) return;
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    let bgAlpha = this.promptAlpha;
    for (const a of this.lineAlphas) if (a > bgAlpha) bgAlpha = a;
    if (bgAlpha > 0) {
      ctx.globalAlpha = bgAlpha;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 22px ui-monospace, "Cascadia Code", "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    const lineH = 38;
    const startY = h / 2 - ((lines.length - 1) * lineH) / 2;
    for (let i = 0; i < lines.length; i++) {
      const a = this.lineAlphas[i] ?? 0;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillText(lines[i] ?? '', w / 2, startY + i * lineH);
    }

    if (this.promptAlpha > 0 && this.promptText) {
      ctx.globalAlpha = this.promptAlpha;
      ctx.font = '300 13px ui-monospace, "Cascadia Code", monospace';
      ctx.fillStyle = '#888888';
      ctx.fillText(this.promptText, w / 2, h - 60);
    }

    this.drawTextPill(
      this.hintText,
      '300 12px ui-monospace, "Cascadia Code", monospace',
      12, 14, 12, 'left', 'top', '#7d8aa3', this.hintAlpha,
      10, 5,
    );

    ctx.globalAlpha = 1;
  }

  private drawTextPill(
    text: string,
    font: string,
    fontSize: number,
    x: number,
    y: number,
    align: CanvasTextAlign,
    baseline: CanvasTextBaseline,
    textColor: string,
    alpha: number,
    paddingX: number,
    paddingY: number,
  ) {
    if (alpha <= 0 || !text) return;
    const ctx = this.ctx;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;

    const width = ctx.measureText(text).width;

    let bgX = x - paddingX;
    if (align === 'center') bgX = x - width / 2 - paddingX;
    else if (align === 'right') bgX = x - width - paddingX;

    let bgY = y - paddingY;
    if (baseline === 'middle') bgY = y - fontSize / 2 - paddingY;
    else if (baseline === 'bottom') bgY = y - fontSize - paddingY;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000000';
    ctx.fillRect(bgX, bgY, width + paddingX * 2, fontSize + paddingY * 2);

    ctx.fillStyle = textColor;
    ctx.fillText(text, x, y);
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    this.setVisible(false);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

export class IntroCutsceneScene extends Phaser.Scene {
  private sky!: Phaser.GameObjects.Rectangle;
  private clouds: Phaser.GameObjects.Rectangle[] = [];
  private plane!: PlaneOverlay;
  private rain: Phaser.GameObjects.Rectangle[] = [];
  private smokes: Smoke[] = [];
  private overlay!: Phaser.GameObjects.Rectangle;
  private expoCanvas!: ExpoCanvas;

  private phase: Phase = 'calm';
  private phaseStartedAt = 0;
  private rainSpawnAccum = 0;
  private smokeSpawnAccum = 0;
  private lightningAccum = 0;
  private crashShakeStarted = false;

  private planeBaseX = 168;
  private planeBaseY = 90;

  constructor() {
    super('intro-cutscene');
  }

  preload() {
    this.load.image(PLANE_KEY, PLANE_PATH);
    this.load.audio(BGM_KEY, BGM_PATH);
  }

  create() {
    this.sky = this.add.rectangle(
      CUTSCENE_WIDTH / 2, CUTSCENE_HEIGHT / 2,
      CUTSCENE_WIDTH, CUTSCENE_HEIGHT,
      SKY_CALM,
    ).setDepth(0);

    this.makeClouds();

    this.plane = new PlaneOverlay(
      'cutscene-plane', this.game.canvas, CUTSCENE_WIDTH, CUTSCENE_HEIGHT, 96,
    );
    this.plane.x = this.planeBaseX;
    this.plane.y = this.planeBaseY;
    this.plane.setVisible(true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.plane.destroy());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.plane.destroy());

    this.overlay = this.add.rectangle(
      CUTSCENE_WIDTH / 2, CUTSCENE_HEIGHT / 2,
      CUTSCENE_WIDTH, CUTSCENE_HEIGHT,
      0x000000, 0,
    ).setDepth(100);

    this.expoCanvas = new ExpoCanvas('expo-overlay', EXPOSITION_LINES.length);
    this.expoCanvas.hintText = 'space/enter = skip phase   R = restart';
    this.expoCanvas.hintAlpha = 0.6;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.expoCanvas.destroy());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.expoCanvas.destroy());

    // Cutscene BGM — loops while the demo is on-screen. Browsers gate
    // audio behind a user gesture; if the SoundManager is locked, defer
    // playback until Phaser fires `unlocked` (the cutscene's space/click
    // skip is the typical trigger).
    const startBgm = () => {
      this.sound.play(BGM_KEY, { loop: true, volume: 0.45 });
    };
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, startBgm);
    } else {
      startBgm();
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.sound.stopByKey(BGM_KEY));
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.sound.stopByKey(BGM_KEY));

    this.bindInput();

    this.enterPhase('calm');
  }

  override update(_time: number, deltaMs: number) {
    const elapsed = this.time.now - this.phaseStartedAt;

    this.driftClouds(deltaMs);

    switch (this.phase) {
      case 'calm':
        this.tickCalm(elapsed, deltaMs);
        break;
      case 'storm':
        this.tickStorm(elapsed, deltaMs);
        break;
      case 'crash':
        this.tickCrash(elapsed, deltaMs);
        break;
      case 'flash':
        this.tickFlash(elapsed);
        break;
      case 'black':
        this.tickBlack(elapsed);
        break;
      case 'exposition':
      case 'done':
        break;
    }

    this.plane.flush();
    this.expoCanvas.draw(EXPOSITION_LINES);
  }

  private tickCalm(elapsed: number, deltaMs: number) {
    this.plane.y = this.planeBaseY + Math.sin(this.time.now / 600) * 1.5;
    this.plane.x -= 0.004 * deltaMs;
    if (elapsed >= PHASE_DURATION.calm) this.enterPhase('storm');
  }

  private tickStorm(elapsed: number, deltaMs: number) {
    const t = Phaser.Math.Clamp(elapsed / PHASE_DURATION.storm, 0, 1);
    this.lerpSky(t);

    const amp = 0.5 + t * 3;
    this.plane.x = this.planeBaseX + (Math.random() - 0.5) * amp * 2;
    this.plane.y = this.planeBaseY + (Math.random() - 0.5) * amp * 2;
    this.plane.angle = (Math.random() - 0.5) * t * 6;

    this.spawnRain(deltaMs, 0.4 + t * 0.6);
    this.tickRain(deltaMs);

    if (t > 0.6) this.spawnSmoke(deltaMs, 0.3);
    this.tickSmoke(deltaMs);

    this.lightningAccum += deltaMs;
    if (t > 0.35 && Math.random() < 0.005 && this.lightningAccum > 600) {
      this.cameras.main.flash(100, 240, 240, 250);
      this.lightningAccum = 0;
    }

    if (elapsed >= PHASE_DURATION.storm) this.enterPhase('crash');
  }

  private tickCrash(elapsed: number, deltaMs: number) {
    const t = Phaser.Math.Clamp(elapsed / PHASE_DURATION.crash, 0, 1);
    const fall = t * t;
    this.plane.angle = t * 65;
    this.plane.x = this.planeBaseX - fall * 28 + (Math.random() - 0.5) * 1.5;
    this.plane.y = this.planeBaseY + fall * 220;

    this.tickRain(deltaMs);
    this.spawnSmoke(deltaMs, 1);
    this.tickSmoke(deltaMs);

    if (!this.crashShakeStarted) {
      this.cameras.main.shake(PHASE_DURATION.crash, 0.006);
      this.crashShakeStarted = true;
    }

    if (elapsed >= PHASE_DURATION.crash) this.enterPhase('flash');
  }

  private tickFlash(elapsed: number) {
    const t = Phaser.Math.Clamp(elapsed / PHASE_DURATION.flash, 0, 1);
    this.overlay.fillColor = 0xffffff;
    this.overlay.alpha = t < 0.3 ? t / 0.3 : 1;
    if (elapsed >= PHASE_DURATION.flash) this.enterPhase('black');
  }

  private tickBlack(elapsed: number) {
    const fadeMs = 300;
    if (elapsed < fadeMs) {
      const t = elapsed / fadeMs;
      const v = Math.round(255 * (1 - t));
      this.overlay.fillColor = (v << 16) | (v << 8) | v;
      this.overlay.alpha = 1;
    } else {
      this.overlay.fillColor = 0x000000;
      this.overlay.alpha = 1;
    }
    if (elapsed >= PHASE_DURATION.black) this.enterPhase('exposition');
  }

  private enterPhase(next: Phase) {
    this.phase = next;
    this.phaseStartedAt = this.time.now;

    if (next === 'flash') {
      this.destroyRain();
    }
    if (next === 'exposition') {
      this.overlay.fillColor = 0x000000;
      this.overlay.alpha = 1;
      this.plane.setVisible(false);
      this.destroyRain();
      this.destroySmoke();
      for (const c of this.clouds) c.setVisible(false);
      this.expoCanvas.setVisible(true);
      this.startTypewriter();
    }
  }

  private startTypewriter() {
    let lineIdx = 0;
    const showNext = () => {
      if (lineIdx >= EXPOSITION_LINES.length) {
        this.time.delayedCall(EXPO_FINAL_HOLD_MS, () => {
          this.expoCanvas.promptText = '— press space to begin —';
          this.tweens.addCounter({
            from: 0, to: 1, duration: 600,
            onUpdate: tween => {
              this.expoCanvas.promptAlpha = (tween.getValue() ?? 0) as number;
            },
            onComplete: () => { this.expoCanvas.promptAlpha = 1; },
          });
          this.phase = 'done';
        });
        return;
      }
      const idxAtCall = lineIdx;
      this.tweens.addCounter({
        from: 0, to: 1, duration: EXPO_LINE_FADE_MS,
        onUpdate: tween => {
          this.expoCanvas.lineAlphas[idxAtCall] = (tween.getValue() ?? 0) as number;
        },
        onComplete: () => {
          this.expoCanvas.lineAlphas[idxAtCall] = 1;
          this.time.delayedCall(EXPO_LINE_GAP_MS, () => {
            lineIdx++;
            showNext();
          });
        },
      });
    };
    showNext();
  }

  private makeClouds() {
    for (let i = 0; i < 7; i++) {
      const w = Phaser.Math.Between(8, 18);
      const h = Phaser.Math.Between(2, 4);
      const x = Phaser.Math.Between(0, CUTSCENE_WIDTH);
      const y = Phaser.Math.Between(12, 70);
      const c = this.add.rectangle(x, y, w, h, 0xffffff, 0.85).setDepth(1);
      this.clouds.push(c);
    }
  }

  private driftClouds(deltaMs: number) {
    for (const c of this.clouds) {
      c.x -= 0.012 * deltaMs;
      if (c.x < -20) c.x = CUTSCENE_WIDTH + 20;
    }
  }

  private lerpSky(t: number) {
    const calm = Phaser.Display.Color.IntegerToRGB(SKY_CALM);
    const storm = Phaser.Display.Color.IntegerToRGB(SKY_STORM);
    const r = Math.round(calm.r + (storm.r - calm.r) * t);
    const g = Math.round(calm.g + (storm.g - calm.g) * t);
    const b = Math.round(calm.b + (storm.b - calm.b) * t);
    this.sky.fillColor = (r << 16) | (g << 8) | b;
  }

  private spawnRain(deltaMs: number, intensity: number) {
    this.rainSpawnAccum += deltaMs * intensity;
    while (this.rainSpawnAccum > 25) {
      this.rainSpawnAccum -= 25;
      const r = this.add.rectangle(
        Phaser.Math.Between(-30, CUTSCENE_WIDTH + 10),
        Phaser.Math.Between(-30, 0),
        1, 4, 0xc8d4e0, 0.7,
      ).setDepth(8);
      this.rain.push(r);
    }
  }

  private tickRain(deltaMs: number) {
    const dt = deltaMs / 16;
    const surviving: Phaser.GameObjects.Rectangle[] = [];
    for (const r of this.rain) {
      r.y += 5 * dt;
      r.x += 1.4 * dt;
      if (r.y > CUTSCENE_HEIGHT + 6) {
        r.destroy();
        continue;
      }
      surviving.push(r);
    }
    this.rain = surviving;
  }

  private spawnSmoke(deltaMs: number, intensity: number) {
    this.smokeSpawnAccum += deltaMs * intensity;
    while (this.smokeSpawnAccum > 35) {
      this.smokeSpawnAccum -= 35;
      const size = Phaser.Math.Between(2, 5);
      const rect = this.add.rectangle(
        this.plane.x + (Math.random() - 0.5) * 12,
        this.plane.y + (Math.random() - 0.5) * 6,
        size, size, 0x3a3a3a, 0.55,
      ).setDepth(6);
      this.smokes.push({
        rect,
        vy: -0.4 - Math.random() * 0.5,
        vx: 0.15 + Math.random() * 0.2,
        life: 0,
        maxLife: 800 + Math.random() * 700,
      });
    }
  }

  private tickSmoke(deltaMs: number) {
    const dt = deltaMs / 16;
    const surviving: Smoke[] = [];
    for (const s of this.smokes) {
      s.life += deltaMs;
      if (s.life >= s.maxLife) {
        s.rect.destroy();
        continue;
      }
      s.rect.y += s.vy * dt;
      s.rect.x += s.vx * dt;
      const t = s.life / s.maxLife;
      s.rect.alpha = (1 - t) * 0.55;
      surviving.push(s);
    }
    this.smokes = surviving;
  }

  private destroyRain() {
    for (const r of this.rain) r.destroy();
    this.rain = [];
  }

  private destroySmoke() {
    for (const s of this.smokes) s.rect.destroy();
    this.smokes = [];
  }

  private bindInput() {
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.skipForward());
      this.input.keyboard.on('keydown-ENTER', () => this.skipForward());
      this.input.keyboard.on('keydown-R', () => this.restart());
    }
    this.input.on('pointerdown', () => this.skipForward());
  }

  private skipForward() {
    switch (this.phase) {
      case 'calm':       this.enterPhase('storm');      break;
      case 'storm':      this.enterPhase('crash');      break;
      case 'crash':      this.enterPhase('flash');      break;
      case 'flash':      this.enterPhase('black');      break;
      case 'black':      this.enterPhase('exposition'); break;
      case 'exposition':
        for (let i = 0; i < EXPOSITION_LINES.length; i++) {
          this.expoCanvas.lineAlphas[i] = 1;
        }
        this.expoCanvas.promptText = '— press space to begin —';
        this.expoCanvas.promptAlpha = 1;
        this.phase = 'done';
        break;
      case 'done':
        // hand-off point: in production this transitions into BootScene/CrashSiteScene.
        break;
    }
  }

  private restart() {
    this.scene.restart();
  }
}
