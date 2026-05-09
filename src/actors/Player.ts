import Phaser from 'phaser';
import { Depths } from '../engine/depths';
import { clampToRect } from '../engine/coords';

const SPEED = 60;

export interface PlayerBounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface WasdKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

export class Player {
  sprite: Phaser.GameObjects.Rectangle;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: WasdKeys;
  private bounds: PlayerBounds;

  constructor(scene: Phaser.Scene, x: number, y: number, bounds: PlayerBounds) {
    this.bounds = bounds;
    this.sprite = scene.add.rectangle(x, y, 8, 12, 0xf2e6c9)
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0x000000)
      .setDepth(Depths.ACTORS + Math.round(y));

    if (!scene.input.keyboard) {
      throw new Error('Player: keyboard input not available on this scene');
    }
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys('W,A,S,D') as WasdKeys;
    scene.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,W,A,S,D');
  }

  update(deltaMs: number) {
    const dt = deltaMs / 1000;
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown  || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up.isDown    || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown  || this.wasd.S.isDown) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      this.sprite.x += (dx / len) * SPEED * dt;
      this.sprite.y += (dy / len) * SPEED * dt;
    }

    const { x, y } = clampToRect(
      this.sprite.x, this.sprite.y,
      this.bounds.x0, this.bounds.y0,
      this.bounds.x1, this.bounds.y1,
    );
    // Keep sub-pixel position; roundPixels in game config snaps at render time.
    // Rounding here would discard < 1 px deltas at high frame rates and freeze the player.
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.setDepth(Depths.ACTORS + Math.round(this.sprite.y));
  }
}
