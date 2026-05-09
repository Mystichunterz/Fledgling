export interface GameRegistryShape {
  currentScene: string | null;
  playerX: number;
  playerY: number;
  worldWidth: number;
  worldHeight: number;
}

export const GameRegistry: GameRegistryShape = {
  currentScene: null,
  playerX: 0,
  playerY: 0,
  worldWidth: 0,
  worldHeight: 0,
};
