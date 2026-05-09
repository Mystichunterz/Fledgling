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

export const VILLAGE_WIDTH = 1280;
export const VILLAGE_HEIGHT = 720;

const SPAWN_POINTS: Record<string, SpawnPoint> = {
  fromCrash:    { x: 640, y: 90,  facing: 'south' },
  fromHut:      { x: 32,  y: 360, facing: 'east' },
  fromLighthouse: { x: 640, y: 656, facing: 'north' },
  default:      { x: 640, y: 360, facing: 'south' },
};

const ZONES: ReadonlyArray<TransitionZone> = [
  { edge: 'north', targetScene: SceneKeys.CRASH_SITE, spawnAt: 'fromVillage' },
  { edge: 'west',  targetScene: SceneKeys.HUT,        spawnAt: 'fromVillage' },
  { edge: 'south', targetScene: SceneKeys.LIGHTHOUSE, spawnAt: 'fromVillage' },
];

export class VillageScene extends Phaser.Scene {
  private player: Player;
  private spawnAt: string | undefined;

  constructor() {
    super(SceneKeys.VILLAGE);
  }

  init(data: SceneEnterData) {
    this.spawnAt = data.spawnAt;
  }

  create() {
    GameRegistry.currentScene = SceneKeys.VILLAGE;
    GameRegistry.worldWidth = VILLAGE_WIDTH;
    GameRegistry.worldHeight = VILLAGE_HEIGHT;
    this.cameras.main.setBackgroundColor(0x2b557a);
    this.cameras.main.setBounds(0, 0, VILLAGE_WIDTH, VILLAGE_HEIGHT);

    this.buildGround();
    this.buildLandmarks();

    if (isDev()) {
      drawDevGrid(this, VILLAGE_WIDTH, VILLAGE_HEIGHT);
      drawTriggerZones(this, VILLAGE_WIDTH, VILLAGE_HEIGHT, ZONES);
      drawCornerMarkers(this, VILLAGE_WIDTH, VILLAGE_HEIGHT);
    }

    const spawn = resolveSpawn(SPAWN_POINTS, this.spawnAt, 'default');
    this.player = new Player(
      this,
      spawn.x, spawn.y,
      {
        x0: 8,
        y0: 8,
        x1: VILLAGE_WIDTH - 8,
        y1: VILLAGE_HEIGHT - 8,
      },
    );

    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);
    fadeInOnEnter(this);
  }

  override update(_time: number, delta: number) {
    this.player.update(delta);
    GameRegistry.playerX = this.player.sprite.x;
    GameRegistry.playerY = this.player.sprite.y;
    checkTransitions(this, this.player, VILLAGE_WIDTH, VILLAGE_HEIGHT, ZONES);
  }

  private buildGround() {
    const cx = VILLAGE_WIDTH / 2;
    const cy = VILLAGE_HEIGHT / 2;
    this.add.rectangle(cx, cy, VILLAGE_WIDTH - 32, VILLAGE_HEIGHT - 32, 0xd4b88a)
      .setStrokeStyle(1, 0x8a6f4f)
      .setDepth(Depths.BG_GROUND);
    this.add.rectangle(cx, cy, VILLAGE_WIDTH - 96, VILLAGE_HEIGHT - 96, 0x6a8e54)
      .setDepth(Depths.BG_GROUND + 10);
  }

  private buildLandmarks() {
    type Landmark = { x: number; y: number; w: number; h: number; color: number; label: string };
    const landmarks: Landmark[] = [
      { x: 240, y: 180, w: 56, h: 44, color: 0xb56a3a, label: 'bakery' },
      { x: 800, y: 180, w: 40, h: 44, color: 0x6a6a8a, label: 'guard' },
      { x: 240, y: 380, w: 32, h: 32, color: 0x8a6a3a, label: 'shrine' },
      { x: 800, y: 380, w: 24, h: 24, color: 0x4a8a4a, label: 'play' },
      { x: 320, y: 580, w: 96, h: 56, color: 0xc8a050, label: 'farm' },
    ];
    for (const l of landmarks) {
      this.add.rectangle(l.x, l.y, l.w, l.h, l.color)
        .setOrigin(0.5, 1)
        .setStrokeStyle(1, 0x3a2a14)
        .setDepth(Depths.BG_DECOR + Math.round(l.y));
    }

    this.add.rectangle(640, 32, 64, 12, 0xb8a070)
      .setOrigin(0.5, 0)
      .setDepth(Depths.BG_DECOR);
    this.add.rectangle(32, 360, 12, 64, 0xb8a070)
      .setOrigin(0, 0.5)
      .setDepth(Depths.BG_DECOR);
    this.add.rectangle(640, VILLAGE_HEIGHT - 32, 64, 12, 0xb8a070)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR);
  }
}
