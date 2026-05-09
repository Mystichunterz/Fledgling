import { SpriteKeys, type SpriteKey } from '../assets/keys';

// Critical items go to the lighthouse pyre. Filler items are picked up at
// well/forest tiles and traded to villagers in exchange for the criticals.
// Bread is a one-off souvenir Naro hands over for fruit — it stays in the
// hotbar as a keepsake (no further use).
export const CRITICAL_ITEMS = ['wood', 'oil', 'flint'] as const;
export const FILLER_ITEMS = ['fruit', 'water', 'rope', 'basket'] as const;
export const SOUVENIR_ITEMS = ['bread'] as const;
export const ITEMS = [...CRITICAL_ITEMS, ...FILLER_ITEMS, ...SOUVENIR_ITEMS] as const;
export type ItemId = typeof ITEMS[number];
export type CriticalItemId = typeof CRITICAL_ITEMS[number];
export type FillerItemId = typeof FILLER_ITEMS[number];
export type SouvenirItemId = typeof SOUVENIR_ITEMS[number];

export const ITEM_LABEL: Record<ItemId, string> = {
  wood:   'Wood',
  oil:    'Oil',
  flint:  'Flint',
  fruit:  'Fruit',
  water:  'Water',
  rope:   'Rope',
  basket: 'Basket',
  bread:  'Bread',
};

export const ITEM_GLYPH: Record<ItemId, string> = {
  wood:   'W',
  oil:    'O',
  flint:  'F',
  fruit:  'r',
  water:  'w',
  rope:   'p',
  basket: 'b',
  bread:  'B',
};

export const ITEM_SPRITE: Partial<Record<ItemId, SpriteKey>> = {
  wood:   SpriteKeys.ITEM_WOOD,
  oil:    SpriteKeys.ITEM_OIL,
  flint:  SpriteKeys.ITEM_FLINT,
  fruit:  SpriteKeys.ITEM_FRUIT,
  water:  SpriteKeys.ITEM_WATER,
  rope:   SpriteKeys.ITEM_ROPE,
  basket: SpriteKeys.ITEM_BASKET,
};
