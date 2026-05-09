export const SpriteKeys = {
  PLAYER:    'player',
  LOC_HUT:    'loc_hut',
  LOC_STATUE: 'loc_statue',
  LOC_FIRE:   'loc_fire',
  LOC_BEACON: 'loc_beacon',
  LOC_BEACON_OFF: 'loc_beacon_off',
  LOC_BOAT:   'loc_boat',
  LOC_BAKERY: 'loc_bakery',
  LOC_GUARDPOST: 'loc_guardpost',
  LOC_PLAYGROUND: 'loc_playground',
  LOC_FARM: 'loc_farm',
  NPC_CHIEF_0: 'npc_chief_0',
  NPC_CHIEF_1: 'npc_chief_1',
  NPC_CHIEF_2: 'npc_chief_2',
  NPC_CHILD_0: 'npc_child_0',
  NPC_CHILD_1: 'npc_child_1',
  NPC_CHILD_2: 'npc_child_2',
  NPC_MAN_0: 'npc_man_0',
  NPC_MAN_1: 'npc_man_1',
  NPC_MAN_2: 'npc_man_2',
  NPC_ELDER_0: 'npc_elder_0',
  NPC_ELDER_1: 'npc_elder_1',
  NPC_ELDER_2: 'npc_elder_2',
  ITEM_WOOD:  'item_wood',
  ITEM_OIL:   'item_oil',
  ITEM_FLINT: 'item_flint',
  ITEM_FRUIT: 'item_fruit',
  ITEM_WATER: 'item_water',
  ITEM_ROPE:  'item_rope',
  ITEM_BASKET:'item_basket',
  PROP_DIARY: 'prop_diary',
  TILES_TERRAIN: 'tiles_terrain',
} as const;
export type SpriteKey = typeof SpriteKeys[keyof typeof SpriteKeys];

export const FontKeys = {} as const;
export type FontKey = typeof FontKeys[keyof typeof FontKeys];

export const AudioKeys = {
  BGM_ISLAND:   'bgm_island',
  BGM_CUTSCENE: 'bgm_cutscene',
} as const;
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
