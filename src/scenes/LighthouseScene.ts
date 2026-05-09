import Phaser from 'phaser';
import { SceneKeys } from '../assets/keys';
import { Depths } from '../engine/depths';
import {
  checkTransitions,
  fadeInOnEnter,
  resolveSpawn,
  TransitionZone,
  SpawnPoint,
  SceneEnterData,
} from '../engine/transitions';
import { GameRegistry, hasAllItems } from '../state/GameRegistry';
import { Player } from '../actors/Player';
import { isDev } from '../engine/dev';
import { drawDevGrid, drawBorderFog, drawCornerMarkers } from '../engine/worldDecor';

export const LIGHTHOUSE_WIDTH = 640;
export const LIGHTHOUSE_HEIGHT = 360;

const PYRE_X = LIGHTHOUSE_WIDTH / 2;
const PYRE_Y = 200;
const PYRE_TRIGGER_RADIUS = 40;

const SPAWN_POINTS: Record<string, SpawnPoint> = {
  fromVillage: { x: 320, y: 60, facing: 'south' },
  default:     { x: 320, y: 120, facing: 'south' },
};

const ZONES: ReadonlyArray<TransitionZone> = [
  { edge: 'north', targetScene: SceneKeys.VILLAGE, spawnAt: 'fromLighthouse' },
];

export class LighthouseScene extends Phaser.Scene {
  private player: Player;
  private spawnAt: string | undefined;
  private pyreBase: Phaser.GameObjects.Rectangle;
  private pyreLog1: Phaser.GameObjects.Rectangle;
  private pyreLog2: Phaser.GameObjects.Rectangle;
  private flameCore?: Phaser.GameObjects.Rectangle;
  private flameGlow?: Phaser.GameObjects.Rectangle;
  private flameSpark?: Phaser.GameObjects.Rectangle;
  private ignitedThisFrame = false;

  constructor() {
    super(SceneKeys.LIGHTHOUSE);
  }

  init(data: SceneEnterData) {
    this.spawnAt = data.spawnAt;
  }

  create() {
    GameRegistry.currentScene = SceneKeys.LIGHTHOUSE;
    GameRegistry.worldWidth = LIGHTHOUSE_WIDTH;
    GameRegistry.worldHeight = LIGHTHOUSE_HEIGHT;
    this.cameras.main.setBackgroundColor(0x6e4030);
    this.cameras.main.setBounds(0, 0, LIGHTHOUSE_WIDTH, LIGHTHOUSE_HEIGHT);

    this.add.rectangle(LIGHTHOUSE_WIDTH / 2, 240, LIGHTHOUSE_WIDTH, 240, 0x8a6040)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_GROUND);
    this.add.rectangle(LIGHTHOUSE_WIDTH / 2, LIGHTHOUSE_HEIGHT, LIGHTHOUSE_WIDTH, 120, 0x2a3858)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_SKY);

    this.pyreBase = this.add.rectangle(PYRE_X, PYRE_Y, 56, 20, 0x4a3020)
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0x1a1008)
      .setDepth(Depths.BG_DECOR + 200);
    this.pyreLog1 = this.add.rectangle(PYRE_X - 8, PYRE_Y - 4, 24, 12, 0x6a4830)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + 200);
    this.pyreLog2 = this.add.rectangle(PYRE_X + 12, PYRE_Y - 8, 20, 8, 0x6a4830)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + 200);

    this.add.rectangle(140, 220, 16, 24, 0x504030)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + 220);
    this.add.rectangle(500, 220, 14, 22, 0x504030)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + 220);

    if (GameRegistry.beaconLit) {
      this.applyLitVisual(false);
    }

    const spawn = resolveSpawn(SPAWN_POINTS, this.spawnAt, 'default');
    this.player = new Player(
      this,
      spawn.x, spawn.y,
      {
        x0: 24,
        y0: 8,
        x1: LIGHTHOUSE_WIDTH - 24,
        y1: 230,
      },
    );

    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);

    drawBorderFog(this, LIGHTHOUSE_WIDTH, LIGHTHOUSE_HEIGHT, ZONES);
    if (isDev()) {
      drawDevGrid(this, LIGHTHOUSE_WIDTH, LIGHTHOUSE_HEIGHT);
      drawCornerMarkers(this, LIGHTHOUSE_WIDTH, LIGHTHOUSE_HEIGHT);
    }

    fadeInOnEnter(this);
  }

  override update(_time: number, delta: number) {
    this.player.update(delta);
    GameRegistry.playerX = this.player.sprite.x;
    GameRegistry.playerY = this.player.sprite.y;
    checkTransitions(this, this.player, LIGHTHOUSE_WIDTH, LIGHTHOUSE_HEIGHT, ZONES);

    if (!GameRegistry.beaconLit && hasAllItems()) {
      const dx = this.player.sprite.x - PYRE_X;
      const dy = this.player.sprite.y - PYRE_Y;
      if (Math.hypot(dx, dy) < PYRE_TRIGGER_RADIUS) {
        this.igniteBeacon();
      }
    }
  }

  private igniteBeacon() {
    if (this.ignitedThisFrame) return;
    this.ignitedThisFrame = true;
    GameRegistry.beaconLit = true;
    this.applyLitVisual(true);
  }

  private applyLitVisual(animate: boolean) {
    this.pyreLog1.setFillStyle(0xc4581c);
    this.pyreLog2.setFillStyle(0xe07028);

    this.flameCore = this.add.rectangle(PYRE_X, PYRE_Y - 18, 18, 22, 0xfff0a0)
      .setOrigin(0.5, 1)
      .setDepth(Depths.FX);
    this.flameSpark = this.add.rectangle(PYRE_X, PYRE_Y - 30, 6, 8, 0xfff8d0)
      .setOrigin(0.5, 1)
      .setDepth(Depths.FX + 1);
    this.flameGlow = this.add.rectangle(PYRE_X, PYRE_Y - 6, 96, 64, 0xff8030, 0.35)
      .setOrigin(0.5, 1)
      .setDepth(Depths.FX - 1);

    if (animate) {
      this.cameras.main.flash(180, 255, 220, 140);
    }

    this.tweens.add({
      targets: this.flameGlow,
      alpha: { from: 0.3, to: 0.55 },
      duration: 720,
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: this.flameCore,
      scaleY: { from: 0.92, to: 1.08 },
      duration: 280,
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: this.flameSpark,
      y: { from: PYRE_Y - 30, to: PYRE_Y - 38 },
      alpha: { from: 1, to: 0.4 },
      duration: 540,
      yoyo: true,
      repeat: -1,
    });
  }
}
