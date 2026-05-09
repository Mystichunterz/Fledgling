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
    // The player spritesheet's row 0 (idle) has ~26 px of empty padding
    // above the head. Rows 1-5 (walk/nod/puzzled/frown/laugh) have the
    // character filling the cell with no head gap. So shift only row 0's
    // frames down — applying the shift globally would decapitate every
    // animated frame. Frames are indexed 0-47, 8 per row, top-to-bottom.
    const FRAMES_PER_ROW = 8;
    const PER_ROW_TOP_TRIM = [26, 0, 0, 0, 0, 0];
    const playerTex = this.textures.get(SpriteKeys.PLAYER);
    for (const name of playerTex.getFrameNames()) {
      const idx = parseInt(name, 10);
      if (Number.isNaN(idx)) continue;
      const row = Math.floor(idx / FRAMES_PER_ROW);
      const topTrim = PER_ROW_TOP_TRIM[row] ?? 0;
      if (topTrim === 0) continue;
      const frame = playerTex.frames[name];
      frame.setSize(
        frame.cutWidth,
        frame.cutHeight - topTrim,
        frame.cutX,
        frame.cutY + topTrim,
      );
    }

    this.scene.run(SceneKeys.PLAYER_HUD);
    if (isDev()) this.scene.run(SceneKeys.DEBUG);
    this.scene.start(SceneKeys.VILLAGE);
  }
}
