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
    // The player spritesheet's frames are cropped too high — there's a gap
    // above the head and the feet sit at the frame bottom. Shift the crop
    // window down AND reduce its height by the same amount so we trim the
    // top gap without bleeding into the next row's character below.
    const PLAYER_FRAME_Y_SHIFT = 25;
    const playerTex = this.textures.get(SpriteKeys.PLAYER);
    for (const name of playerTex.getFrameNames()) {
      const frame = playerTex.frames[name];
      frame.setSize(
        frame.cutWidth,
        frame.cutHeight - PLAYER_FRAME_Y_SHIFT,
        frame.cutX,
        frame.cutY + PLAYER_FRAME_Y_SHIFT,
      );
    }

    this.scene.run(SceneKeys.PLAYER_HUD);
    if (isDev()) this.scene.run(SceneKeys.DEBUG);
    this.scene.start(SceneKeys.VILLAGE);
  }
}
