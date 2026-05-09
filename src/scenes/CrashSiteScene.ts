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
import { drawDevGrid, drawTriggerZones, drawCornerMarkers } from '../engine/worldDecor';

export const CRASH_WIDTH = 640;
export const CRASH_HEIGHT = 360;

const SPAWN_POINTS: Record<string, SpawnPoint> = {
  fromVillage: { x: 320, y: 220, facing: 'south' },
  default:     { x: 320, y: 200, facing: 'south' },
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
    this.cameras.main.setBackgroundColor(0x1d4868);
    this.cameras.main.setBounds(0, 0, CRASH_WIDTH, CRASH_HEIGHT);

    this.add.rectangle(CRASH_WIDTH / 2, 110, CRASH_WIDTH, 220, 0x1d4868)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_SKY);
    this.add.rectangle(CRASH_WIDTH / 2, 270, CRASH_WIDTH, 320, 0xd4b88a)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_GROUND);

    this.add.rectangle(320, 130, 96, 32, 0x4a4a5a)
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0x202028)
      .setDepth(Depths.BG_DECOR + 130);
    this.add.rectangle(360, 110, 32, 12, 0x4a4a5a)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + 130);

    this.add.rectangle(CRASH_WIDTH / 2, CRASH_HEIGHT - 8, 32, 4, 0xb8a070)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR);

    const spawn = resolveSpawn(SPAWN_POINTS, this.spawnAt, 'default');
    this.player = new Player(
      this,
      spawn.x, spawn.y,
      {
        x0: 24,
        y0: 24,
        x1: CRASH_WIDTH - 24,
        y1: CRASH_HEIGHT - 8,
      },
    );

    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);

    if (isDev()) {
      drawDevGrid(this, CRASH_WIDTH, CRASH_HEIGHT);
      drawTriggerZones(this, CRASH_WIDTH, CRASH_HEIGHT, ZONES);
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
