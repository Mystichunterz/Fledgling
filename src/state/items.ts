import { SpriteKeys, type SpriteKey } from '../assets/keys';

export const ITEMS = ['wood', 'oil', 'flint', 'fruit'] as const;
export type ItemId = typeof ITEMS[number];

export const ITEM_LABEL: Record<ItemId, string> = {
  wood:  'Wood',
  oil:   'Oil',
  flint: 'Flint',
  fruit: 'Fruit',
};

export const ITEM_GLYPH: Record<ItemId, string> = {
  wood:  'W',
  oil:   'O',
  flint: 'F',
  fruit: 'R',
};

export const ITEM_SPRITE: Record<ItemId, SpriteKey> = {
  wood:  SpriteKeys.ITEM_WOOD,
  oil:   SpriteKeys.ITEM_OIL,
  flint: SpriteKeys.ITEM_FLINT,
  fruit: SpriteKeys.ITEM_FRUIT,
};
