import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { IslandScene } from './scenes/IslandScene';

export const VIEWPORT_WIDTH = 320;
export const VIEWPORT_HEIGHT = 180;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: VIEWPORT_WIDTH,
  height: VIEWPORT_HEIGHT,
  parent: 'game',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#0a0a14',
  scene: [BootScene, IslandScene],
};
