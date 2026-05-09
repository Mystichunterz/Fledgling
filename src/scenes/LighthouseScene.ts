import Phaser from 'phaser';
import { SceneKeys, SpriteKeys } from '../assets/keys';
import { Depths } from '../engine/depths';
import {
  checkTransitions,
  fadeInOnEnter,
  resolveSpawn,
  TransitionZone,
  SpawnPoint,
  SceneEnterData,
} from '../engine/transitions';
import { GameRegistry } from '../state/GameRegistry';
import { Player } from '../actors/Player';
import { isDev } from '../engine/dev';
import { drawDevGrid, drawBorderFog, drawCornerMarkers } from '../engine/worldDecor';
import { paintFill } from '../engine/terrainTiles';
import { attachProximityHighlight } from '../engine/highlight';
import { LighthouseMenu } from '../ui/LighthouseMenu';
import { snappedFollow } from '../engine/camera';
import { CAMERA_ZOOM } from '../config';

let sharedMenu: LighthouseMenu | null = null;
const ensureMenu = () => {
  if (!sharedMenu) sharedMenu = new LighthouseMenu();
  return sharedMenu;
};

export const LIGHTHOUSE_WIDTH = 640;
export const LIGHTHOUSE_HEIGHT = 360;

const PYRE_X = LIGHTHOUSE_WIDTH / 2;
const PYRE_Y = 200;

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
  private beacon: Phaser.GameObjects.Image;
  private fire?: Phaser.GameObjects.Image;
  private flameGlow?: Phaser.GameObjects.Rectangle;

  constructor() {
    super(SceneKeys.LIGHTHOUSE);
  }

  private spawnXY: { x: number; y: number } | null = null;

  init(data: SceneEnterData) {
    this.spawnAt = data.spawnAt;
    this.spawnXY = data.x != null && data.y != null ? { x: data.x, y: data.y } : null;
  }

  create() {
    GameRegistry.currentScene = SceneKeys.LIGHTHOUSE;
    GameRegistry.worldWidth = LIGHTHOUSE_WIDTH;
    GameRegistry.worldHeight = LIGHTHOUSE_HEIGHT;
    this.cameras.main.setBackgroundColor(0x6e4030);
    this.cameras.main.setBounds(0, 0, LIGHTHOUSE_WIDTH, LIGHTHOUSE_HEIGHT);
    this.cameras.main.setZoom(CAMERA_ZOOM);

    // Cool, weather-bleached dirt for the headland cliffs — tinted grey-blue.
    paintFill(this, 0, 0, LIGHTHOUSE_WIDTH, 240, 'dirt', 0xb0a898);
    this.add.rectangle(LIGHTHOUSE_WIDTH / 2, LIGHTHOUSE_HEIGHT, LIGHTHOUSE_WIDTH, 120, 0x2a3858)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_SKY);

    const initialBeaconKey = GameRegistry.beaconLit ? SpriteKeys.LOC_BEACON : SpriteKeys.LOC_BEACON_OFF;
    this.beacon = this.add.image(PYRE_X, PYRE_Y, initialBeaconKey)
      .setOrigin(0.5, 1)
      .setDisplaySize(96, 96)
      .setDepth(Depths.BG_DECOR + 200);

    // Invisible click target spanning the full pyre. Doubles as the anchor
    // for the proximity highlight so the yellow ring frames the visible
    // structure, not just one log.
    const interact = this.add.rectangle(PYRE_X, PYRE_Y - 12, 64, 36, 0x000000, 0)
      .setOrigin(0.5, 0.5)
      .setDepth(Depths.ACTORS)
      .setInteractive({ useHandCursor: true });
    interact.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation?.();
      ensureMenu().open({ onLight: () => this.igniteBeacon() });
    });
    attachProximityHighlight(this, interact, { radius: 56 });

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
      this.spawnXY?.x ?? spawn.x, this.spawnXY?.y ?? spawn.y,
      {
        x0: 24,
        y0: 8,
        x1: LIGHTHOUSE_WIDTH - 24,
        y1: 230,
      },
    );

    snappedFollow(this, this.player.sprite);

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
  }

  private igniteBeacon() {
    if (GameRegistry.beaconLit) return;
    GameRegistry.beaconLit = true;
    this.applyLitVisual(true);
  }

  private applyLitVisual(animate: boolean) {
    this.beacon.setTexture(SpriteKeys.LOC_BEACON).setDisplaySize(96, 96);
    const beaconHeight = this.beacon.displayHeight || 0;
    const fireY = PYRE_Y - beaconHeight * 0.55;

    this.fire = this.add.image(PYRE_X, fireY, SpriteKeys.LOC_FIRE)
      .setOrigin(0.5, 1)
      .setDisplaySize(48, 48)
      .setDepth(Depths.FX);
    this.flameGlow = this.add.rectangle(PYRE_X, fireY + 8, 120, 80, 0xff8030, 0.35)
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
    // Tween relative to the post-setDisplaySize scale, not absolute. The fire
    // texture is 2048×2048; a `from: 1.0` would snap it to native size and
    // engulf the camera.
    const baseScaleX = this.fire.scaleX;
    const baseScaleY = this.fire.scaleY;
    this.tweens.add({
      targets: this.fire,
      scaleY: { from: baseScaleY * 0.94, to: baseScaleY * 1.06 },
      scaleX: { from: baseScaleX * 1.02, to: baseScaleX * 0.98 },
      duration: 280,
      yoyo: true,
      repeat: -1,
    });
  }
}
