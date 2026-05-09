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

export const HEADLAND_WIDTH = 640;
export const HEADLAND_HEIGHT = 360;

const SPAWN_POINTS: Record<string, SpawnPoint> = {
  fromVillage: { x: 320, y: 60, facing: 'south' },
  default:     { x: 320, y: 120, facing: 'south' },
};

const ZONES: ReadonlyArray<TransitionZone> = [
  { edge: 'north', targetScene: SceneKeys.VILLAGE, spawnAt: 'fromHeadland' },
];

export class HeadlandScene extends Phaser.Scene {
  private player: Player;
  private spawnAt: string | undefined;

  constructor() {
    super(SceneKeys.HEADLAND);
  }

  init(data: SceneEnterData) {
    this.spawnAt = data.spawnAt;
  }

  create() {
    GameRegistry.currentScene = SceneKeys.HEADLAND;
    GameRegistry.worldWidth = HEADLAND_WIDTH;
    GameRegistry.worldHeight = HEADLAND_HEIGHT;
    this.cameras.main.setBackgroundColor(0x6e4030);
    this.cameras.main.setBounds(0, 0, HEADLAND_WIDTH, HEADLAND_HEIGHT);

    this.add.rectangle(HEADLAND_WIDTH / 2, 240, HEADLAND_WIDTH, 240, 0x8a6040)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_GROUND);
    this.add.rectangle(HEADLAND_WIDTH / 2, HEADLAND_HEIGHT, HEADLAND_WIDTH, 120, 0x2a3858)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_SKY);

    this.add.rectangle(HEADLAND_WIDTH / 2, 200, 56, 20, 0x4a3020)
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0x1a1008)
      .setDepth(Depths.BG_DECOR + 200);
    this.add.rectangle(HEADLAND_WIDTH / 2 - 8, 196, 24, 12, 0x6a4830)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + 200);
    this.add.rectangle(HEADLAND_WIDTH / 2 + 12, 192, 20, 8, 0x6a4830)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + 200);

    this.add.rectangle(140, 220, 16, 24, 0x504030)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + 220);
    this.add.rectangle(500, 220, 14, 22, 0x504030)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + 220);

    const spawn = resolveSpawn(SPAWN_POINTS, this.spawnAt, 'default');
    this.player = new Player(
      this,
      spawn.x, spawn.y,
      {
        x0: 24,
        y0: 8,
        x1: HEADLAND_WIDTH - 24,
        y1: 230,
      },
    );

    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);

    if (isDev()) {
      drawDevGrid(this, HEADLAND_WIDTH, HEADLAND_HEIGHT);
      drawTriggerZones(this, HEADLAND_WIDTH, HEADLAND_HEIGHT, ZONES);
      drawCornerMarkers(this, HEADLAND_WIDTH, HEADLAND_HEIGHT);
    }

    fadeInOnEnter(this);
  }

  override update(_time: number, delta: number) {
    this.player.update(delta);
    GameRegistry.playerX = this.player.sprite.x;
    GameRegistry.playerY = this.player.sprite.y;
    checkTransitions(this, this.player, HEADLAND_WIDTH, HEADLAND_HEIGHT, ZONES);
  }
}
