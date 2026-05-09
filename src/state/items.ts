import { SpriteKeys, type SpriteKey } from '../assets/keys';

// Critical items go to the lighthouse pyre. Filler items are picked up at
// well/forest tiles and traded to villagers in exchange for the criticals.
export const CRITICAL_ITEMS = ['wood', 'oil', 'flint'] as const;
export const FILLER_ITEMS = ['fruit', 'water', 'rope', 'basket'] as const;
export const ITEMS = [...CRITICAL_ITEMS, ...FILLER_ITEMS] as const;
export type ItemId = typeof ITEMS[number];
export type CriticalItemId = typeof CRITICAL_ITEMS[number];
export type FillerItemId = typeof FILLER_ITEMS[number];

export const ITEM_LABEL: Record<ItemId, string> = {
  wood:   'Wood',
  oil:    'Oil',
  flint:  'Flint',
  fruit:  'Fruit',
  water:  'Water',
  rope:   'Rope',
  basket: 'Basket',
};

export const ITEM_GLYPH: Record<ItemId, string> = {
  wood:   'W',
  oil:    'O',
  flint:  'F',
  fruit:  'r',
  water:  'w',
  rope:   'p',
  basket: 'b',
};

// Sprites only exist for the four "real" items today (wood/oil/flint/fruit).
// Water/rope/basket fall back to the glyph in the hotbar slot.
export const ITEM_SPRITE: Partial<Record<ItemId, SpriteKey>> = {
  wood:  SpriteKeys.ITEM_WOOD,
  oil:   SpriteKeys.ITEM_OIL,
  flint: SpriteKeys.ITEM_FLINT,
  fruit: SpriteKeys.ITEM_FRUIT,
};
