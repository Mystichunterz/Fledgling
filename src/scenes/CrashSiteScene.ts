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
import { snappedFollow } from '../engine/camera';
import { CAMERA_ZOOM } from '../config';
import { safeFire, setCurrentScene } from '../integration';

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

  private spawnXY: { x: number; y: number } | null = null;

  init(data: SceneEnterData) {
    this.spawnAt = data.spawnAt;
    this.spawnXY = data.x != null && data.y != null ? { x: data.x, y: data.y } : null;
  }

  create() {
    GameRegistry.currentScene = SceneKeys.CRASH_SITE;
    safeFire(() => setCurrentScene('beach'));
    GameRegistry.worldWidth = CRASH_WIDTH;
    GameRegistry.worldHeight = CRASH_HEIGHT;
    this.cameras.main.setBackgroundColor(0x1f4868);
    this.cameras.main.setBounds(0, 0, CRASH_WIDTH, CRASH_HEIGHT);
    this.cameras.main.setZoom(CAMERA_ZOOM);

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

    // Beach (sand) — middle band, tiled dirt tinted toward sand.
    paintFill(this, 0, 156, CRASH_WIDTH, 124, 'dirt', 0xf2d4a0);

    // Grass strip leading south to village — slightly cool tint to read as
    // distinct from the village proper.
    paintFill(this, 0, 280, CRASH_WIDTH, CRASH_HEIGHT - 280, 'grass', 0xc0e0b0);

    // Plane debris on the beach (mid-sand) — the player's wreck.
    this.add.image(320, 244, SpriteKeys.LOC_PLANE_DEBRIS)
      .setOrigin(0.5, 1)
      .setDisplaySize(160, 96)
      .setRotation(0.18)
      .setDepth(Depths.BG_DECOR + 240);

    // Path marker at the south edge — the way out toward village.
    this.add.rectangle(CRASH_WIDTH / 2, CRASH_HEIGHT - 4, 32, 4, 0xb8a070)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR);

    const spawn = resolveSpawn(SPAWN_POINTS, this.spawnAt, 'default');
    this.player = new Player(
      this,
      this.spawnXY?.x ?? spawn.x, this.spawnXY?.y ?? spawn.y,
      {
        x0: 24,
        y0: 160,                 // keep player on sand, off the wet shore + sea
        x1: CRASH_WIDTH - 24,
        y1: CRASH_HEIGHT - 8,    // reach south trigger
      },
    );

    snappedFollow(this, this.player.sprite);

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
