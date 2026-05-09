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

export function drawTriggerZones(
  scene: Phaser.Scene,
  width: number,
  height: number,
  zones: ReadonlyArray<TransitionZone>,
  thickness = 16,
): void {
  for (const zone of zones) {
    let x = 0, y = 0, w = 0, h = 0;
    switch (zone.edge) {
      case 'north': x = 0;             y = 0;             w = width;     h = thickness; break;
      case 'south': x = 0;             y = height - thickness; w = width;     h = thickness; break;
      case 'west':  x = 0;             y = 0;             w = thickness; h = height;     break;
      case 'east':  x = width - thickness; y = 0;             w = thickness; h = height;     break;
    }
    scene.add.rectangle(x, y, w, h, 0xff00ff, 0.25)
      .setOrigin(0, 0)
      .setDepth(Depths.FX);
    scene.add.rectangle(x + w / 2, y + h / 2, 4, 4, 0xff00ff, 0.9)
      .setDepth(Depths.FX + 1);
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
