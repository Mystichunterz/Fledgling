import type { ItemId } from './items';
import type { LanguageSpec } from '../lang/language-spec';
import { EXAMPLE_LANGUAGE } from '../lang/example-language';

export interface GameRegistryShape {
  currentScene: string | null;
  playerX: number;
  playerY: number;
  worldWidth: number;
  worldHeight: number;
  itemsCollected: Set<ItemId>;
  beaconLit: boolean;
  // Active conlang spec used to encode dialogue frames into surface text.
  // Defaults to the hand-authored fixture (tovari); a language picker can
  // swap this at runtime later.
  language: LanguageSpec;
}

export const GameRegistry: GameRegistryShape = {
  currentScene: null,
  playerX: 0,
  playerY: 0,
  worldWidth: 0,
  worldHeight: 0,
  itemsCollected: new Set(),
  beaconLit: false,
  language: EXAMPLE_LANGUAGE,
};

export function hasAllItems(): boolean {
  return GameRegistry.itemsCollected.has('wood')
    && GameRegistry.itemsCollected.has('oil')
    && GameRegistry.itemsCollected.has('flint');
}

export function giveItem(item: ItemId): void {
  GameRegistry.itemsCollected.add(item);
}

export function removeItem(item: ItemId): void {
  GameRegistry.itemsCollected.delete(item);
}

export function clearItems(): void {
  GameRegistry.itemsCollected.clear();
  GameRegistry.beaconLit = false;
}
