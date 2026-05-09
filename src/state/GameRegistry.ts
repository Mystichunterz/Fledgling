export interface GameRegistryShape {
  currentScene: string | null;
}

export const GameRegistry: GameRegistryShape = {
  currentScene: null,
};
