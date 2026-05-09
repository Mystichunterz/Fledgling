import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CrashSiteScene } from './scenes/CrashSiteScene';
import { VillageScene } from './scenes/VillageScene';
import { HutScene } from './scenes/HutScene';
import { LighthouseScene } from './scenes/LighthouseScene';
import { DebugScene } from './scenes/DebugScene';

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
  dom: { createContainer: true },
  backgroundColor: '#0a0a14',
  scene: [BootScene, CrashSiteScene, VillageScene, HutScene, LighthouseScene, DebugScene],
};
