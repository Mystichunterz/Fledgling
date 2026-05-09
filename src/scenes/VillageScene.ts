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
import { makeGround, paintPatch, scatterTrees, TILE_SIZE } from '../engine/terrainTiles';

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
    // Tiled water fill across the whole world; paint a large grass island
    // patch in the middle and a smaller dirt clearing inside the grass.
    const ground = makeGround(this, VILLAGE_WIDTH, VILLAGE_HEIGHT);
    const cols = Math.floor(VILLAGE_WIDTH / TILE_SIZE);   // 80
    const rows = Math.floor(VILLAGE_HEIGHT / TILE_SIZE);  // 45

    const ISLAND_INSET = 4;
    const islandTx = ISLAND_INSET;
    const islandTy = ISLAND_INSET;
    const islandW = cols - ISLAND_INSET * 2;
    const islandH = rows - ISLAND_INSET * 2;
    paintPatch(ground, islandTx, islandTy, islandW, islandH, 'grass');

    const clearingW = 6;
    const clearingH = 5;
    const clearingTx = Math.floor(cols / 2) + 6;
    const clearingTy = Math.floor(rows / 2) + 2;
    paintPatch(ground, clearingTx, clearingTy, clearingW, clearingH, 'dirt');

    // Scatter trees over the grass island, leaving a clear band around the
    // perimeter (so corner/edge tiles read cleanly) and avoiding the dirt
    // clearing. Determinism not needed — the village layout is static once
    // the scene is created.
    const treeTx = islandTx + 2;
    const treeTy = islandTy + 2;
    const treeCols = islandW - 4;
    const treeRows = islandH - 4;
    scatterTrees(this, treeTx, treeTy, treeCols, treeRows, 18, 'grass');
    scatterTrees(this, clearingTx + 1, clearingTy + 1, clearingW - 2, clearingH - 2, 1, 'dirt');

    // Sand-colored bridges from the grass-island edge out to the world edge
    // at the three transition points. Player needs to reach the world edge
    // to trigger transitions; the bridges give visible footing over water.
    const cx = VILLAGE_WIDTH / 2;
    const cy = VILLAGE_HEIGHT / 2;
    const BRIDGE = 88;
    const SAND = 0xd4b88a;
    const SAND_DEPTH = Depths.BG_GROUND + 1;
    this.add.rectangle(cx - BRIDGE / 2, 0, BRIDGE, ISLAND_INSET * TILE_SIZE, SAND)
      .setOrigin(0, 0).setDepth(SAND_DEPTH);
    this.add.rectangle(0, cy - BRIDGE / 2, ISLAND_INSET * TILE_SIZE, BRIDGE, SAND)
      .setOrigin(0, 0).setDepth(SAND_DEPTH);
    this.add.rectangle(cx - BRIDGE / 2, VILLAGE_HEIGHT - ISLAND_INSET * TILE_SIZE, BRIDGE, ISLAND_INSET * TILE_SIZE, SAND)
      .setOrigin(0, 0).setDepth(SAND_DEPTH);
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

    // Statue — replaces the old "shrine" rectangle in the same plot.
    this.add.image(240, 380, SpriteKeys.LOC_STATUE)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + 380);

    // Hut landmark on the west, near the bridge to HutScene.
    this.add.image(140, 360, SpriteKeys.LOC_HUT)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + 360);

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
