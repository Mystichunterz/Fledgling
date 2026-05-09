import Phaser from 'phaser';
import { SceneKeys } from '../assets/keys';
import { makeGround, paintPatch, scatterTrees, TILE_SIZE } from '../engine/terrainTiles';

// Sized to the 320x180 viewport: 20 tiles wide x 11 tiles tall, so the
// water perimeter, grass island borders, dirt clearing, and trees are all
// visible at once without scrolling. Hard-coded rather than imported from
// ../config to avoid the circular import (config imports this scene).
const COLS = 20;
const ROWS = 11;
const WORLD_W = COLS * TILE_SIZE;
const WORLD_H = ROWS * TILE_SIZE;

export class TileDemoScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.TILE_DEMO);
  }

  create() {
    this.cameras.main.setBackgroundColor(0x2b557a);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    const ground = makeGround(this, WORLD_W, WORLD_H);

    // Grass island, 14x7 tiles, inset 3 cols / 2 rows from the edges so the
    // water perimeter is plainly visible on every side.
    const islandTx = 3;
    const islandTy = 2;
    const islandW = 14;
    const islandH = 7;
    paintPatch(ground, islandTx, islandTy, islandW, islandH, 'grass');

    // Dirt clearing inside the grass — small enough to keep grass borders
    // around it on all sides, so the dirt 9-slice shows its corners cleanly.
    const clearingTx = 10;
    const clearingTy = 4;
    const clearingW = 4;
    const clearingH = 3;
    paintPatch(ground, clearingTx, clearingTy, clearingW, clearingH, 'dirt');

    // Trees: a handful on grass at fixed positions so the demo composition
    // is stable across reloads, and one tree centred on the dirt clearing.
    scatterTrees(this, islandTx + 1, islandTy + 1, 4, islandH - 2, 4, 'grass');
    scatterTrees(this, islandTx + 8, islandTy + 1, 2, 2, 2, 'grass');
    scatterTrees(this, clearingTx + 1, clearingTy + 1, clearingW - 2, clearingH - 2, 1, 'dirt');
  }
}
