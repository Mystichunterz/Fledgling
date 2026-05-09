import type { ItemId } from './items';

export interface GameRegistryShape {
  currentScene: string | null;
  playerX: number;
  playerY: number;
  worldWidth: number;
  worldHeight: number;
  itemsCollected: Set<ItemId>;
  beaconLit: boolean;
}

export const GameRegistry: GameRegistryShape = {
  currentScene: null,
  playerX: 0,
  playerY: 0,
  worldWidth: 0,
  worldHeight: 0,
  itemsCollected: new Set(),
  beaconLit: false,
};

export function hasAllItems(): boolean {
  return GameRegistry.itemsCollected.has('wood')
    && GameRegistry.itemsCollected.has('oil')
    && GameRegistry.itemsCollected.has('flint');
}

export function giveItem(item: ItemId): void {
  GameRegistry.itemsCollected.add(item);
}

export function clearItems(): void {
  GameRegistry.itemsCollected.clear();
  GameRegistry.beaconLit = false;
}
