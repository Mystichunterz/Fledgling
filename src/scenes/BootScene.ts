import Phaser from 'phaser';
import { AudioKeys, SceneKeys, SpriteKeys } from '../assets/keys';
import { isDev } from '../engine/dev';
import { hasSeenIntro } from './IntroCutsceneScene';
import { safeFire, ensureWorld } from '../integration';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT);
  }

  preload() {
    this.load.setPath('assets');
    // Explorer sprite sheet — row 0: 6 idle frames, row 1: 8 walking frames.
    // Generated from source art with magenta keyed out and frames normalized
    // to a common 317x591 cell with bottom-center alignment so feet stay put
    // across both anims. See public/assets/explorer-spritesheet.png.
    this.load.spritesheet(SpriteKeys.PLAYER, 'explorer-spritesheet.png', {
      frameWidth: 317,
      frameHeight: 591,
    });
    this.load.image(SpriteKeys.LOC_HUT,    'sprite_location_hut.png');
    this.load.image(SpriteKeys.LOC_STATUE, 'sprite_location_statue.png');
    this.load.image(SpriteKeys.LOC_FIRE,   'sprite_location_fire.png');
    this.load.image(SpriteKeys.LOC_BEACON, 'sprite_location_lighthouse_headland_beacon.png');
    this.load.image(SpriteKeys.LOC_BEACON_OFF, 'sprite_location_lighthouse_OFF.png');
    this.load.image(SpriteKeys.LOC_BOAT,   'sprite_location_boat.png');
    this.load.image(SpriteKeys.LOC_PLANE_DEBRIS, 'sprite_plane_debris.png');
    this.load.image(SpriteKeys.LOC_BAKERY, 'sprite_location_bakery.png');
    this.load.image(SpriteKeys.LOC_GUARDPOST, 'sprite_location_guardpost.png');
    this.load.image(SpriteKeys.LOC_PLAYGROUND, 'sprite_location_playground.png');
    this.load.image(SpriteKeys.LOC_FARM, 'sprite_location_farm.png');
    for (let i = 0; i < 3; i++) {
      this.load.image(`npc_chief_${i}`, `sprite_npc_chief_${i}.png`);
      this.load.image(`npc_child_${i}`, `sprite_npc_child_${i}.png`);
      this.load.image(`npc_man_${i}`,   `sprite_npc_man_${i}.png`);
      this.load.image(`npc_elder_${i}`, `sprite_npc_elder_${i}.png`);
    }
    this.load.image(SpriteKeys.ITEM_WOOD,  'sprite_item_wood.png');
    this.load.image(SpriteKeys.ITEM_OIL,   'sprite_item_oil.png');
    this.load.image(SpriteKeys.ITEM_FLINT, 'sprite_item_flint.png');
    this.load.image(SpriteKeys.ITEM_FRUIT, 'sprite_item_fruit.png');
    this.load.image(SpriteKeys.ITEM_WATER, 'sprite_item_water.png');
    this.load.image(SpriteKeys.ITEM_ROPE,  'sprite_item_rope.png');
    this.load.image(SpriteKeys.ITEM_BASKET,'sprite_item_basket.png');
    this.load.image(SpriteKeys.PROP_DIARY, 'sprite_diary.png');
    this.load.spritesheet(SpriteKeys.TILES_TERRAIN, 'tiles_terrain.png', {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 1,
    });
    this.load.image(SpriteKeys.PALM_TREE, 'sprite_palm_tree.png');
    this.load.image(SpriteKeys.ROCK, 'sprite_rock.png');
    this.load.audio(AudioKeys.BGM_ISLAND, 'audio/Vows_Of_The_Awakened.mp3');
  }

  create() {
    // Idempotent worldState seed so subsequent collectItem/lightBeacon/etc
    // mutations have a row to mutate. Fire-and-forget; game runs offline if
    // Convex is down.
    safeFire(() => ensureWorld());

    // Apply persisted mute state ONCE at boot — affects the global
    // SoundManager so every later play() inherits it. PlayerHudScene's
    // top-right music button reads/toggles the same flag.
    try {
      if (window.localStorage.getItem('fledgling.musicMuted') === '1') {
        this.sound.mute = true;
      }
    } catch { /* localStorage unavailable; default to unmuted */ }

    this.scene.run(SceneKeys.PLAYER_HUD);
    if (isDev()) this.scene.run(SceneKeys.DEBUG);

    // Dev "New Game" reset stashes a one-shot flag so the next boot replays
    // the intro cutscene. First-time players (no intro_seen marker) also
    // get routed through the cutscene; returning players land in the
    // village they last saw.
    let startScene: string = SceneKeys.VILLAGE;
    let newGame = false;
    try {
      if (sessionStorage.getItem('fledgling:newgame') === '1') {
        sessionStorage.removeItem('fledgling:newgame');
        newGame = true;
      }
    } catch { /* ignore */ }
    const goingToIntro = newGame || !hasSeenIntro();
    if (goingToIntro) startScene = SceneKeys.INTRO_CUTSCENE;

    // Island BGM — only start it if we're going straight to gameplay. The
    // intro cutscene has its own BGM and will kick the island track off when
    // it hands over to the crash site, so we don't double up here.
    if (!goingToIntro) startIslandBgm(this);

    this.scene.start(startScene);
  }
}

// Browsers gate audio behind a user gesture; defer playback until Phaser
// fires `unlocked` if the SoundManager is still locked. Shared with the
// intro cutscene's done→CRASH_SITE handover.
export const startIslandBgm = (scene: Phaser.Scene) => {
  const play = () => {
    scene.sound.play(AudioKeys.BGM_ISLAND, { loop: true, volume: 0.4 });
  };
  if (scene.sound.locked) {
    scene.sound.once(Phaser.Sound.Events.UNLOCKED, play);
  } else {
    play();
  }
};
