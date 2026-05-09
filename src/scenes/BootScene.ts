import Phaser from 'phaser';
import { SceneKeys, SpriteKeys } from '../assets/keys';
import { isDev } from '../engine/dev';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT);
  }

  preload() {
    this.load.setPath('assets');
    this.load.spritesheet(SpriteKeys.PLAYER, 'village-man-spritesheet.png', {
      frameWidth: 181,
      frameHeight: 181,
      margin: 2,
      spacing: 2,
    });
    this.load.image(SpriteKeys.LOC_HUT,    'sprite_location_hut.png');
    this.load.image(SpriteKeys.LOC_STATUE, 'sprite_location_statue.png');
    this.load.image(SpriteKeys.LOC_FIRE,   'sprite_location_fire.png');
    this.load.image(SpriteKeys.LOC_BEACON, 'sprite_location_lighthouse_headland_beacon.png');
    this.load.image(SpriteKeys.LOC_BEACON_OFF, 'sprite_location_lighthouse_OFF.png');
    this.load.image(SpriteKeys.LOC_BOAT,   'sprite_location_boat.png');
    this.load.image(SpriteKeys.LOC_BAKERY, 'sprite_location_bakery.png');
    this.load.image(SpriteKeys.LOC_GUARDPOST, 'sprite_location_guardpost.png');
    this.load.image(SpriteKeys.LOC_PLAYGROUND, 'sprite_location_playground.png');
    this.load.image(SpriteKeys.LOC_FARM, 'sprite_location_farm.png');
    this.load.image(SpriteKeys.ITEM_WOOD,  'sprite_item_wood.png');
    this.load.image(SpriteKeys.ITEM_OIL,   'sprite_item_oil.png');
    this.load.image(SpriteKeys.ITEM_FLINT, 'sprite_item_flint.png');
    this.load.image(SpriteKeys.ITEM_FRUIT, 'sprite_item_fruit.png');
    this.load.spritesheet(SpriteKeys.TILES_TERRAIN, 'tiles_terrain.png', {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 1,
    });
  }

  create() {
    // Every cell in the player spritesheet is misaligned: the character art
    // sits ~25 px below the cell top, which means each frame Phaser extracts
    // contains the previous row's feet at the top and clips the current
    // row's feet off the bottom. Shift each frame's source window down by
    // 25 px to align with the actual character art. Clamp cutHeight against
    // the texture bottom so the last row doesn't read past the image.
    const PLAYER_FRAME_Y_SHIFT = 25;
    const playerTex = this.textures.get(SpriteKeys.PLAYER);
    const texH = playerTex.source[0].height;
    for (const name of playerTex.getFrameNames()) {
      const frame = playerTex.frames[name];
      const newCutY = frame.cutY + PLAYER_FRAME_Y_SHIFT;
      const newCutHeight = Math.min(frame.cutHeight, texH - newCutY);
      frame.setSize(frame.cutWidth, newCutHeight, frame.cutX, newCutY);
    }

    this.scene.run(SceneKeys.PLAYER_HUD);
    if (isDev()) this.scene.run(SceneKeys.DEBUG);
    this.scene.start(SceneKeys.VILLAGE);
  }
}
