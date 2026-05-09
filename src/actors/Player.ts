import Phaser from 'phaser';
import { Depths } from '../engine/depths';
import { clampToRect } from '../engine/coords';
import { SpriteKeys } from '../assets/keys';

const SPEED = 60;
const PLAYER_DISPLAY_SIZE = 32;
const PLAYER_ANIMS = {
  IDLE: 'player-idle',
  WALK_DOWN: 'player-walk-down',
  NOD: 'player-nod',
  PUZZLED: 'player-puzzled',
  FROWN: 'player-frown',
  LAUGH: 'player-laugh',
} as const;

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
  sprite: Phaser.GameObjects.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: WasdKeys;
  private bounds: PlayerBounds;

  constructor(scene: Phaser.Scene, x: number, y: number, bounds: PlayerBounds) {
    this.bounds = bounds;
    ensurePlayerAnimations(scene);
    this.sprite = scene.add.sprite(x, y, SpriteKeys.PLAYER, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE)
      .setDepth(Depths.ACTORS + Math.round(y));
    this.sprite.play(PLAYER_ANIMS.IDLE);

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
      if (dx !== 0) this.sprite.setFlipX(dx < 0);
      this.sprite.play(PLAYER_ANIMS.WALK_DOWN, true);
    } else {
      this.sprite.play(PLAYER_ANIMS.IDLE, true);
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

function ensurePlayerAnimations(scene: Phaser.Scene) {
  if (scene.anims.exists(PLAYER_ANIMS.IDLE)) return;

  const makeFrames = (row: number) =>
    scene.anims.generateFrameNumbers(SpriteKeys.PLAYER, {
      start: row * 8,
      end: row * 8 + 7,
    });

  scene.anims.create({
    key: PLAYER_ANIMS.IDLE,
    frames: makeFrames(0),
    frameRate: 5,
    repeat: -1,
  });
  scene.anims.create({
    key: PLAYER_ANIMS.WALK_DOWN,
    frames: makeFrames(1),
    frameRate: 10,
    repeat: -1,
  });
  scene.anims.create({
    key: PLAYER_ANIMS.NOD,
    frames: makeFrames(2),
    frameRate: 8,
    repeat: 0,
  });
  scene.anims.create({
    key: PLAYER_ANIMS.PUZZLED,
    frames: makeFrames(3),
    frameRate: 8,
    repeat: 0,
  });
  scene.anims.create({
    key: PLAYER_ANIMS.FROWN,
    frames: makeFrames(4),
    frameRate: 8,
    repeat: 0,
  });
  scene.anims.create({
    key: PLAYER_ANIMS.LAUGH,
    frames: makeFrames(5),
    frameRate: 8,
    repeat: 0,
  });
}
