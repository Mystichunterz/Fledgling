import Phaser from 'phaser';
import { SceneKeys } from '../assets/keys';
import { Depths } from '../engine/depths';
import { GameRegistry } from '../state/GameRegistry';
import { Player } from '../actors/Player';

export const ISLAND_WIDTH = 960;
export const ISLAND_HEIGHT = 540;

const SAND_INSET = 40;
const GRASS_INSET = 80;

const PLAYABLE_INSET = 56;

export class IslandScene extends Phaser.Scene {
  private player: Player;

  constructor() {
    super(SceneKeys.ISLAND);
  }

  create() {
    GameRegistry.currentScene = SceneKeys.ISLAND;

    this.cameras.main.setBackgroundColor(0x2b557a);
    this.cameras.main.setBounds(0, 0, ISLAND_WIDTH, ISLAND_HEIGHT);

    this.buildIsland();
    this.buildDecor();

    this.player = new Player(
      this,
      ISLAND_WIDTH / 2,
      ISLAND_HEIGHT / 2,
      {
        x0: PLAYABLE_INSET,
        y0: PLAYABLE_INSET,
        x1: ISLAND_WIDTH - PLAYABLE_INSET,
        y1: ISLAND_HEIGHT - PLAYABLE_INSET,
      },
    );

    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);
  }

  override update(_time: number, delta: number) {
    this.player.update(delta);
  }

  private buildIsland() {
    const cx = ISLAND_WIDTH / 2;
    const cy = ISLAND_HEIGHT / 2;

    this.add.rectangle(
      cx, cy,
      ISLAND_WIDTH - SAND_INSET * 2,
      ISLAND_HEIGHT - SAND_INSET * 2,
      0xd4b88a,
    )
      .setStrokeStyle(1, 0x8a6f4f)
      .setDepth(Depths.BG_GROUND);

    this.add.rectangle(
      cx, cy,
      ISLAND_WIDTH - GRASS_INSET * 2,
      ISLAND_HEIGHT - GRASS_INSET * 2,
      0x6a8e54,
    )
      .setDepth(Depths.BG_GROUND + 10);
  }

  private buildDecor() {
    const huts: Array<readonly [number, number]> = [
      [200, 180],
      [720, 360],
      [480, 240],
    ];
    for (const [x, y] of huts) {
      this.add.rectangle(x, y, 28, 26, 0x6b4f2a)
        .setOrigin(0.5, 1)
        .setStrokeStyle(1, 0x3a2a14)
        .setDepth(Depths.BG_DECOR + Math.round(y));
      this.add.rectangle(x, y - 22, 28, 6, 0x4a3a20)
        .setOrigin(0.5, 1)
        .setDepth(Depths.BG_DECOR + Math.round(y));
    }

    const bushes: Array<readonly [number, number]> = [
      [120, 240], [340, 200], [580, 140], [820, 280],
      [180, 420], [420, 460], [660, 440], [880, 380],
      [260, 320], [540, 380], [740, 200], [380, 100],
    ];
    for (const [x, y] of bushes) {
      this.add.rectangle(x, y, 10, 8, 0x4d6f3d)
        .setOrigin(0.5, 1)
        .setDepth(Depths.BG_DECOR + Math.round(y));
    }
  }
}
