import Phaser from 'phaser';
import { Depths } from './depths';
import type { TransitionZone } from './transitions';

const GRID_STEP = 64;

export function drawDevGrid(
  scene: Phaser.Scene,
  width: number,
  height: number,
): void {
  const g = scene.add.graphics();
  g.setDepth(Depths.BG_GROUND + 5);
  g.lineStyle(1, 0x000000, 0.15);
  for (let x = 0; x <= width; x += GRID_STEP) {
    g.lineBetween(x, 0, x, height);
  }
  for (let y = 0; y <= height; y += GRID_STEP) {
    g.lineBetween(0, y, width, y);
  }
}

// Soft fog at the world edges that lead to other scenes — shore mist /
// path-end haze, not a debug strip. Visible to the player, not just devs.
export function drawBorderFog(
  scene: Phaser.Scene,
  width: number,
  height: number,
  zones: ReadonlyArray<TransitionZone>,
  thickness = 32,
): void {
  const FOG = 0xffffff;
  const A_EDGE = 0.45;
  const A_INNER = 0;

  for (const zone of zones) {
    const g = scene.add.graphics();
    g.setDepth(Depths.FX);
    let x = 0, y = 0, w = 0, h = 0;
    let aTL = 0, aTR = 0, aBL = 0, aBR = 0;
    switch (zone.edge) {
      case 'north':
        x = 0; y = 0; w = width; h = thickness;
        aTL = A_EDGE; aTR = A_EDGE; aBL = A_INNER; aBR = A_INNER;
        break;
      case 'south':
        x = 0; y = height - thickness; w = width; h = thickness;
        aTL = A_INNER; aTR = A_INNER; aBL = A_EDGE; aBR = A_EDGE;
        break;
      case 'west':
        x = 0; y = 0; w = thickness; h = height;
        aTL = A_EDGE; aTR = A_INNER; aBL = A_EDGE; aBR = A_INNER;
        break;
      case 'east':
        x = width - thickness; y = 0; w = thickness; h = height;
        aTL = A_INNER; aTR = A_EDGE; aBL = A_INNER; aBR = A_EDGE;
        break;
    }
    g.fillGradientStyle(FOG, FOG, FOG, FOG, aTL, aTR, aBL, aBR);
    g.fillRect(x, y, w, h);
  }
}

export function drawCornerMarkers(
  scene: Phaser.Scene,
  width: number,
  height: number,
): void {
  const corners: Array<readonly [number, number, number]> = [
    [0,        0,        0xff4040],
    [width,    0,        0x40ff40],
    [0,        height,   0x4040ff],
    [width,    height,   0xffff40],
  ];
  for (const [x, y, color] of corners) {
    scene.add.rectangle(x, y, 8, 8, color)
      .setOrigin(0.5, 0.5)
      .setDepth(Depths.FX + 2);
  }
}
