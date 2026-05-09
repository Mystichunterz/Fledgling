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

export type TerrainKind = 'grass' | 'dirt';

const FRAME_FOR_FILL: Record<TerrainKind, number> = {
  grass: TileFrames.GRASS_C,
  dirt:  TileFrames.DIRT_C,
};

const PALM_TREE_DISPLAY_W = 96;
const PALM_TREE_DISPLAY_H = 120;

const ROCK_DISPLAY_W = 40;
const ROCK_DISPLAY_H = 32;

/**
 * Fill a rectangular region with a repeated terrain tile (pure grass or pure
 * dirt). Uses a single TileSprite — one GameObject regardless of region size.
 *
 * An optional tint shifts the base hue without needing extra art (e.g.
 * lighthouse cliffs = cooler dirt, hut interior = warmer dirt). Pass the full
 * world size at (0,0) for a scene-wide ground; pass a sub-region to tile only
 * a band (sky/ground split).
 */
export function paintFill(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  kind: TerrainKind,
  tint?: number,
): Phaser.GameObjects.TileSprite {
  const ts = scene.add.tileSprite(
    x, y, width, height,
    SpriteKeys.TILES_TERRAIN,
    FRAME_FOR_FILL[kind],
  )
    .setOrigin(0, 0)
    .setDepth(Depths.BG_GROUND);
  if (tint !== undefined) ts.setTint(tint);
  return ts;
}

/**
 * Scatter `count` tree sprites at random tile cells inside the given pixel
 * rectangle. Trees are real GameObjects (not baked) so they y-sort against
 * actors via depth. Pass a seeded RNG for deterministic placement.
 */
export function scatterTrees(
  scene: Phaser.Scene,
  px: number,
  py: number,
  pw: number,
  ph: number,
  count: number,
  _variant: TerrainKind,
  rng: () => number = Math.random,
): Phaser.GameObjects.Image[] {
  const cols = Math.max(1, Math.floor(pw / TILE_SIZE));
  const rows = Math.max(1, Math.floor(ph / TILE_SIZE));
  const out: Phaser.GameObjects.Image[] = [];
  const used = new Set<string>();
  let safety = count * 8;
  while (out.length < count && safety-- > 0) {
    const rx = Math.floor(rng() * cols);
    const ry = Math.floor(rng() * rows);
    const k = `${rx},${ry}`;
    if (used.has(k)) continue;
    used.add(k);
    const cx = px + rx * TILE_SIZE + TILE_SIZE / 2;
    const cy = py + ry * TILE_SIZE + TILE_SIZE;
    const img = scene.add.image(cx, cy, SpriteKeys.PALM_TREE)
      .setOrigin(0.5, 1)
      .setDisplaySize(PALM_TREE_DISPLAY_W, PALM_TREE_DISPLAY_H)
      .setDepth(Depths.BG_DECOR + cy);
    out.push(img);
  }
  return out;
}

/**
 * Scatter `count` rock sprites at random tile cells inside the given pixel
 * rectangle. Y-sorts via depth so actors pass behind/in-front correctly.
 * Pass a seeded RNG for deterministic placement.
 */
export function scatterRocks(
  scene: Phaser.Scene,
  px: number,
  py: number,
  pw: number,
  ph: number,
  count: number,
  rng: () => number = Math.random,
): Phaser.GameObjects.Image[] {
  const cols = Math.max(1, Math.floor(pw / TILE_SIZE));
  const rows = Math.max(1, Math.floor(ph / TILE_SIZE));
  const out: Phaser.GameObjects.Image[] = [];
  const used = new Set<string>();
  let safety = count * 8;
  while (out.length < count && safety-- > 0) {
    const rx = Math.floor(rng() * cols);
    const ry = Math.floor(rng() * rows);
    const k = `${rx},${ry}`;
    if (used.has(k)) continue;
    used.add(k);
    const cx = px + rx * TILE_SIZE + TILE_SIZE / 2;
    const cy = py + ry * TILE_SIZE + TILE_SIZE;
    const img = scene.add.image(cx, cy, SpriteKeys.ROCK)
      .setOrigin(0.5, 1)
      .setDisplaySize(ROCK_DISPLAY_W, ROCK_DISPLAY_H)
      .setDepth(Depths.BG_DECOR + cy);
    out.push(img);
  }
  return out;
}
