import type { ItemId } from './items';
import type { Difficulty, LanguageSpec } from '../lang/language-spec';
import { EXAMPLE_LANGUAGE } from '../lang/example-language';
import { randomLanguage } from '../lang/random-language';

export interface GameRegistryShape {
  currentScene: string | null;
  playerX: number;
  playerY: number;
  worldWidth: number;
  worldHeight: number;
  itemsCollected: Set<ItemId>;
  beaconLit: boolean;
  // Active conlang spec used to encode dialogue frames into surface text.
  // Boot-time: derived from URL params (?seed=, ?difficulty=) via
  // randomLanguage(); falls back to the tovari fixture if generation fails.
  language: LanguageSpec;
  languageSeed: string;
  languageDifficulty: Difficulty;
}

const DEFAULT_SEED = 'banana';
const DEFAULT_DIFFICULTY: Difficulty = 'simple';

function bootLanguage(): { language: LanguageSpec; seed: string; difficulty: Difficulty } {
  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const seedParam = params?.get('seed')?.trim();
  const seed = seedParam && seedParam.length > 0 ? seedParam : DEFAULT_SEED;
  const diffParam = params?.get('difficulty');
  const difficulty: Difficulty = diffParam === 'full' ? 'full' : DEFAULT_DIFFICULTY;
  try {
    return { language: randomLanguage(seed, difficulty), seed, difficulty };
  } catch (err) {
    console.warn(
      `[fledgling] randomLanguage("${seed}", "${difficulty}") failed; falling back to tovari fixture.`,
      err,
    );
    return { language: EXAMPLE_LANGUAGE, seed: EXAMPLE_LANGUAGE.id, difficulty };
  }
}

const boot = bootLanguage();

export const GameRegistry: GameRegistryShape = {
  currentScene: null,
  playerX: 0,
  playerY: 0,
  worldWidth: 0,
  worldHeight: 0,
  itemsCollected: new Set(),
  beaconLit: false,
  language: boot.language,
  languageSeed: boot.seed,
  languageDifficulty: boot.difficulty,
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
