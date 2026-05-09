export const SpriteKeys = {} as const;
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
} as const;
export type SceneKey = typeof SceneKeys[keyof typeof SceneKeys];
