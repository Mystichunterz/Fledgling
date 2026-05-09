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

export const HUT_WIDTH = 480;
export const HUT_HEIGHT = 270;

const SPAWN_POINTS: Record<string, SpawnPoint> = {
  fromVillage: { x: 440, y: 200, facing: 'west' },
  default:     { x: 240, y: 180, facing: 'south' },
};

const ZONES: ReadonlyArray<TransitionZone> = [
  { edge: 'east', targetScene: SceneKeys.VILLAGE, spawnAt: 'fromHut' },
];

export class HutScene extends Phaser.Scene {
  private player: Player;
  private spawnAt: string | undefined;

  constructor() {
    super(SceneKeys.HUT);
  }

  private spawnXY: { x: number; y: number } | null = null;

  init(data: SceneEnterData) {
    this.spawnAt = data.spawnAt;
    this.spawnXY = data.x != null && data.y != null ? { x: data.x, y: data.y } : null;
  }

  create() {
    GameRegistry.currentScene = SceneKeys.HUT;
    safeFire(() => setCurrentScene('hut'));
    GameRegistry.worldWidth = HUT_WIDTH;
    GameRegistry.worldHeight = HUT_HEIGHT;
    this.cameras.main.setBackgroundColor(0x344050);
    this.cameras.main.setBounds(0, 0, HUT_WIDTH, HUT_HEIGHT);
    this.cameras.main.setZoom(CAMERA_ZOOM);

    this.add.rectangle(HUT_WIDTH / 2, 60, HUT_WIDTH, 60, 0x2a3848)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_SKY);
    // Warm dirt floor for the hut interior — tinted slightly amber.
    paintFill(this, 0, 60, HUT_WIDTH, HUT_HEIGHT - 60, 'dirt', 0xe8c878);
    this.add.rectangle(HUT_WIDTH / 2, 64, HUT_WIDTH, 4, 0x404848)
      .setOrigin(0.5, 0.5)
      .setDepth(Depths.BG_GROUND + 1);

    this.add.image(160, 170, SpriteKeys.LOC_HUT)
      .setOrigin(0.5, 1)
      .setDisplaySize(140, 140)
      .setDepth(Depths.BG_DECOR + 170);

    const spawn = resolveSpawn(SPAWN_POINTS, this.spawnAt, 'default');
    this.player = new Player(
      this,
      this.spawnXY?.x ?? spawn.x, this.spawnXY?.y ?? spawn.y,
      {
        x0: 24,
        y0: 80,
        x1: HUT_WIDTH - 8,
        y1: HUT_HEIGHT - 24,
      },
    );

    snappedFollow(this, this.player.sprite);

    drawBorderFog(this, HUT_WIDTH, HUT_HEIGHT, ZONES);
    if (isDev()) {
      drawDevGrid(this, HUT_WIDTH, HUT_HEIGHT);
      drawCornerMarkers(this, HUT_WIDTH, HUT_HEIGHT);
    }

    fadeInOnEnter(this);
  }

  override update(_time: number, delta: number) {
    this.player.update(delta);
    GameRegistry.playerX = this.player.sprite.x;
    GameRegistry.playerY = this.player.sprite.y;
    checkTransitions(this, this.player, HUT_WIDTH, HUT_HEIGHT, ZONES);
  }
}
