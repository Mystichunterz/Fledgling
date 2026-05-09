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
import { GameRegistry } from '../state/GameRegistry';
import { Player } from '../actors/Player';
import { isDev } from '../engine/dev';
import { drawDevGrid, drawBorderFog, drawCornerMarkers } from '../engine/worldDecor';

export const CRASH_WIDTH = 640;
export const CRASH_HEIGHT = 360;

const SPAWN_POINTS: Record<string, SpawnPoint> = {
  fromVillage: { x: 320, y: 320, facing: 'north' },
  default:     { x: 320, y: 240, facing: 'north' },
};

const ZONES: ReadonlyArray<TransitionZone> = [
  { edge: 'south', targetScene: SceneKeys.VILLAGE, spawnAt: 'fromCrash' },
];

export class CrashSiteScene extends Phaser.Scene {
  private player: Player;
  private spawnAt: string | undefined;

  constructor() {
    super(SceneKeys.CRASH_SITE);
  }

  init(data: SceneEnterData) {
    this.spawnAt = data.spawnAt;
  }

  create() {
    GameRegistry.currentScene = SceneKeys.CRASH_SITE;
    GameRegistry.worldWidth = CRASH_WIDTH;
    GameRegistry.worldHeight = CRASH_HEIGHT;
    this.cameras.main.setBackgroundColor(0x1f4868);
    this.cameras.main.setBounds(0, 0, CRASH_WIDTH, CRASH_HEIGHT);

    // Sea at the north (top) — this is the north shore.
    this.add.rectangle(CRASH_WIDTH / 2, 0, CRASH_WIDTH, 140, 0x2a5878)
      .setOrigin(0.5, 0)
      .setDepth(Depths.BG_SKY);
    // Wave/horizon ripple line.
    this.add.rectangle(CRASH_WIDTH / 2, 132, CRASH_WIDTH, 4, 0x6a98b8, 0.6)
      .setOrigin(0.5, 0.5)
      .setDepth(Depths.BG_SKY + 1);
    // Wet shore band.
    this.add.rectangle(CRASH_WIDTH / 2, 144, CRASH_WIDTH, 12, 0xb89a70)
      .setOrigin(0.5, 0)
      .setDepth(Depths.BG_GROUND - 1);

    // Beach (sand) — middle band.
    this.add.rectangle(CRASH_WIDTH / 2, 156, CRASH_WIDTH, 124, 0xd4b88a)
      .setOrigin(0.5, 0)
      .setDepth(Depths.BG_GROUND);

    // Grass/path strip leading south to village — where the player exits.
    this.add.rectangle(CRASH_WIDTH / 2, 280, CRASH_WIDTH, CRASH_HEIGHT - 280, 0x6a8e54)
      .setOrigin(0.5, 0)
      .setDepth(Depths.BG_GROUND + 1);

    // Plane wreckage on the beach (mid-sand).
    this.add.rectangle(320, 240, 96, 32, 0x4a4a5a)
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0x202028)
      .setDepth(Depths.BG_DECOR + 240);
    this.add.rectangle(360, 220, 32, 12, 0x4a4a5a)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + 240);
    // Broken wing piece in the sand.
    this.add.rectangle(232, 256, 36, 8, 0x3a3a4a)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + 256);

    // Path marker at the south edge — the way out toward village.
    this.add.rectangle(CRASH_WIDTH / 2, CRASH_HEIGHT - 4, 32, 4, 0xb8a070)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR);

    const spawn = resolveSpawn(SPAWN_POINTS, this.spawnAt, 'default');
    this.player = new Player(
      this,
      spawn.x, spawn.y,
      {
        x0: 24,
        y0: 160,                 // keep player on sand, off the wet shore + sea
        x1: CRASH_WIDTH - 24,
        y1: CRASH_HEIGHT - 8,    // reach south trigger
      },
    );

    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);

    drawBorderFog(this, CRASH_WIDTH, CRASH_HEIGHT, ZONES);
    if (isDev()) {
      drawDevGrid(this, CRASH_WIDTH, CRASH_HEIGHT);
      drawCornerMarkers(this, CRASH_WIDTH, CRASH_HEIGHT);
    }

    fadeInOnEnter(this);
  }

  override update(_time: number, delta: number) {
    this.player.update(delta);
    GameRegistry.playerX = this.player.sprite.x;
    GameRegistry.playerY = this.player.sprite.y;
    checkTransitions(this, this.player, CRASH_WIDTH, CRASH_HEIGHT, ZONES);
  }
}
