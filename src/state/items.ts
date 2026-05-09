export const ITEMS = ['wood', 'oil', 'flint'] as const;
export type ItemId = typeof ITEMS[number];

export const ITEM_LABEL: Record<ItemId, string> = {
  wood:  'Wood',
  oil:   'Oil',
  flint: 'Flint',
};

export const ITEM_GLYPH: Record<ItemId, string> = {
  wood:  'W',
  oil:   'O',
  flint: 'F',
};
