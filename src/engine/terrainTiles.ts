import Phaser from 'phaser';
import { SpriteKeys } from '../assets/keys';
import { Depths } from './depths';

export const TILE_SIZE = 16;

// Frame index for a 1-based (col, row) cell on the 12x10 tiles_terrain sheet.
// frame = (row - 1) * 12 + (col - 1)
const SHEET_COLS = 12;
const f = (col: number, row: number) => (row - 1) * SHEET_COLS + (col - 1);

export const TileFrames = {
  WATER: f(7, 4),

  GRASS_NW: f(2, 4), GRASS_N: f(3, 4), GRASS_NE: f(4, 4),
  GRASS_W:  f(2, 5), GRASS_C: f(3, 5), GRASS_E:  f(4, 5),
  GRASS_SW: f(2, 6), GRASS_S: f(3, 6), GRASS_SE: f(4, 6),

  DIRT_NW: f(8, 4),  DIRT_N: f(9, 4),  DIRT_NE: f(10, 4),
  DIRT_W:  f(8, 5),  DIRT_C: f(9, 5),  DIRT_E:  f(10, 5),
  DIRT_SW: f(8, 6),  DIRT_S: f(9, 6),  DIRT_SE: f(10, 6),

  TREE_GRASS: f(1, 5),
  TREE_DIRT:  f(7, 5),
} as const;

type Patch = {
  NW: number; N: number; NE: number;
  W:  number; C: number; E:  number;
  SW: number; S: number; SE: number;
};

const GRASS_PATCH: Patch = {
  NW: TileFrames.GRASS_NW, N: TileFrames.GRASS_N, NE: TileFrames.GRASS_NE,
  W:  TileFrames.GRASS_W,  C: TileFrames.GRASS_C, E:  TileFrames.GRASS_E,
  SW: TileFrames.GRASS_SW, S: TileFrames.GRASS_S, SE: TileFrames.GRASS_SE,
};

const DIRT_PATCH: Patch = {
  NW: TileFrames.DIRT_NW, N: TileFrames.DIRT_N, NE: TileFrames.DIRT_NE,
  W:  TileFrames.DIRT_W,  C: TileFrames.DIRT_C, E:  TileFrames.DIRT_E,
  SW: TileFrames.DIRT_SW, S: TileFrames.DIRT_S, SE: TileFrames.DIRT_SE,
};

export type TerrainKind = 'grass' | 'dirt';

/**
 * Bake a tiled ground layer into a RenderTexture covering the full world.
 *
 * Returns the RenderTexture for further drawing (e.g. patches on top). Caller
 * is responsible for adding any decor sprites afterwards.
 */
export function makeGround(
  scene: Phaser.Scene,
  worldWidth: number,
  worldHeight: number,
  fill: number = TileFrames.WATER,
): Phaser.GameObjects.RenderTexture {
  const cols = Math.ceil(worldWidth / TILE_SIZE);
  const rows = Math.ceil(worldHeight / TILE_SIZE);
  const rt = scene.add.renderTexture(0, 0, cols * TILE_SIZE, rows * TILE_SIZE)
    .setOrigin(0, 0)
    .setDepth(Depths.BG_GROUND);
  const stampCfg = { originX: 0, originY: 0 };
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      rt.stamp(SpriteKeys.TILES_TERRAIN, fill, tx * TILE_SIZE, ty * TILE_SIZE, stampCfg);
    }
  }
  return rt;
}

/**
 * Paint a rectangular terrain island onto a RenderTexture using 9-slice tiles
 * (4 corners + 4 edges + filled center). Coordinates are in TILE units; the
 * patch occupies tiles [tx0, tx0+cols) x [ty0, ty0+rows). Requires cols >= 2
 * and rows >= 2 so all corners fit; for 1-tile-wide strips, just place the
 * appropriate tile manually.
 */
export function paintPatch(
  rt: Phaser.GameObjects.RenderTexture,
  tx0: number,
  ty0: number,
  cols: number,
  rows: number,
  kind: TerrainKind,
): void {
  if (cols < 2 || rows < 2) {
    throw new Error(`paintPatch requires cols>=2 and rows>=2, got ${cols}x${rows}`);
  }
  const p = kind === 'grass' ? GRASS_PATCH : DIRT_PATCH;
  for (let ry = 0; ry < rows; ry++) {
    for (let rx = 0; rx < cols; rx++) {
      const onN = ry === 0;
      const onS = ry === rows - 1;
      const onW = rx === 0;
      const onE = rx === cols - 1;
      let frame: number;
      if (onN && onW)      frame = p.NW;
      else if (onN && onE) frame = p.NE;
      else if (onS && onW) frame = p.SW;
      else if (onS && onE) frame = p.SE;
      else if (onN)        frame = p.N;
      else if (onS)        frame = p.S;
      else if (onW)        frame = p.W;
      else if (onE)        frame = p.E;
      else                 frame = p.C;
      const px = (tx0 + rx) * TILE_SIZE;
      const py = (ty0 + ry) * TILE_SIZE;
      rt.stamp(SpriteKeys.TILES_TERRAIN, frame, px, py, { originX: 0, originY: 0 });
    }
  }
}

/**
 * Scatter `count` tree sprites at random tile cells inside the given tile-rect.
 * Trees are drawn as actual GameObjects (not baked) so they can sort against
 * actors via depth = y. Pass a Phaser RNG-seeded source for determinism if
 * desired; otherwise Math.random is used.
 */
export function scatterTrees(
  scene: Phaser.Scene,
  tx0: number,
  ty0: number,
  cols: number,
  rows: number,
  count: number,
  variant: 'grass' | 'dirt',
  rng: () => number = Math.random,
): Phaser.GameObjects.Image[] {
  const frame = variant === 'grass' ? TileFrames.TREE_GRASS : TileFrames.TREE_DIRT;
  const out: Phaser.GameObjects.Image[] = [];
  const used = new Set<string>();
  let safety = count * 8;
  while (out.length < count && safety-- > 0) {
    const rx = Math.floor(rng() * cols);
    const ry = Math.floor(rng() * rows);
    const k = `${rx},${ry}`;
    if (used.has(k)) continue;
    used.add(k);
    const px = (tx0 + rx) * TILE_SIZE + TILE_SIZE / 2;
    const py = (ty0 + ry) * TILE_SIZE + TILE_SIZE;
    const img = scene.add.image(px, py, SpriteKeys.TILES_TERRAIN, frame)
      .setOrigin(0.5, 1)
      .setDepth(Depths.BG_DECOR + py);
    out.push(img);
  }
  return out;
}
