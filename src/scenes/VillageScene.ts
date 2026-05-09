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
import { paintFill, scatterTrees } from '../engine/terrainTiles';
import { snappedFollow } from '../engine/camera';

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

    drawBorderFog(this, VILLAGE_WIDTH, VILLAGE_HEIGHT, ZONES);
    if (isDev()) {
      drawDevGrid(this, VILLAGE_WIDTH, VILLAGE_HEIGHT);
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

    snappedFollow(this, this.player.sprite);
    fadeInOnEnter(this);
  }

  override update(_time: number, delta: number) {
    this.player.update(delta);
    GameRegistry.playerX = this.player.sprite.x;
    GameRegistry.playerY = this.player.sprite.y;
    checkTransitions(this, this.player, VILLAGE_WIDTH, VILLAGE_HEIGHT, ZONES);
  }

  private buildGround() {
    // Pure grass base across the whole village world. Trees scatter in the
    // outer band so the village interior (landmarks/roads/NPCs) stays clear.
    paintFill(this, 0, 0, VILLAGE_WIDTH, VILLAGE_HEIGHT, 'grass');

    const MARGIN = 32;
    const INNER_INSET = 160;
    const innerW = VILLAGE_WIDTH - INNER_INSET * 2;
    const innerH = VILLAGE_HEIGHT - INNER_INSET * 2;

    // Top, bottom, left, right bands — trees only on the outer ring.
    scatterTrees(this, MARGIN, MARGIN, VILLAGE_WIDTH - MARGIN * 2, INNER_INSET - MARGIN, 6, 'grass');
    scatterTrees(this, MARGIN, INNER_INSET + innerH, VILLAGE_WIDTH - MARGIN * 2, INNER_INSET - MARGIN, 6, 'grass');
    scatterTrees(this, MARGIN, INNER_INSET, INNER_INSET - MARGIN, innerH, 4, 'grass');
    scatterTrees(this, INNER_INSET + innerW, INNER_INSET, INNER_INSET - MARGIN, innerH, 4, 'grass');
  }

  private buildLandmarks() {
    type Landmark = { x: number; y: number; w: number; h: number; color: number; label: string };
    const landmarks: Landmark[] = [
      { x: 240, y: 180, w: 56, h: 44, color: 0xb56a3a, label: 'bakery' },
      { x: 800, y: 180, w: 40, h: 44, color: 0x6a6a8a, label: 'guard' },
      { x: 800, y: 380, w: 24, h: 24, color: 0x4a8a4a, label: 'play' },
      { x: 320, y: 580, w: 96, h: 56, color: 0xc8a050, label: 'farm' },
    ];
    for (const l of landmarks) {
      this.add.rectangle(l.x, l.y, l.w, l.h, l.color)
        .setOrigin(0.5, 1)
        .setStrokeStyle(1, 0x3a2a14)
        .setDepth(Depths.BG_DECOR + Math.round(l.y));
    }

    // Statue — central plaza marker.
    this.add.image(640, 380, SpriteKeys.LOC_STATUE)
      .setOrigin(0.5, 1)
      .setDisplaySize(72, 72)
      .setDepth(Depths.BG_DECOR + 380);

    // Hut — west of the statue.
    this.add.image(520, 380, SpriteKeys.LOC_HUT)
      .setOrigin(0.5, 1)
      .setDisplaySize(96, 96)
      .setDepth(Depths.BG_DECOR + 380);

    // Roads — sit on top of the land bridges, run from the world edge into
    // the village interior. Player walks the path through mist to teleport.
    this.add.rectangle(640, 0, 16, 80, 0xb8a070)
      .setOrigin(0.5, 0)
      .setDepth(Depths.BG_DECOR);
    this.add.rectangle(0, 360, 80, 16, 0xb8a070)
      .setOrigin(0, 0.5)
      .setDepth(Depths.BG_DECOR);
    this.add.rectangle(640, VILLAGE_HEIGHT, 16, 80, 0xb8a070)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR);
  }
}
