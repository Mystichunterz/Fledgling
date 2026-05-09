export const SpriteKeys = {
  PLAYER:    'player',
  LOC_HUT:    'loc_hut',
  LOC_STATUE: 'loc_statue',
  LOC_FIRE:   'loc_fire',
  LOC_BEACON: 'loc_beacon',
  LOC_BOAT:   'loc_boat',
  ITEM_WOOD:  'item_wood',
  ITEM_OIL:   'item_oil',
  ITEM_FLINT: 'item_flint',
  ITEM_FRUIT: 'item_fruit',
  TILES_TERRAIN: 'tiles_terrain',
} as const;
export type SpriteKey = typeof SpriteKeys[keyof typeof SpriteKeys];

export const FontKeys = {} as const;
export type FontKey = typeof FontKeys[keyof typeof FontKeys];

export const AudioKeys = {} as const;
export type AudioKey = typeof AudioKeys[keyof typeof AudioKeys];

export const SceneKeys = {
  BOOT: 'boot',
  CRASH_SITE: 'crash_site',
  VILLAGE: 'village',
  HUT: 'hut',
  LIGHTHOUSE: 'lighthouse',
  DEBUG: 'debug',
  PLAYER_HUD: 'player_hud',
} as const;
export type SceneKey = typeof SceneKeys[keyof typeof SceneKeys];
