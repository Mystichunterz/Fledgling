import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CrashSiteScene } from './scenes/CrashSiteScene';
import { VillageScene } from './scenes/VillageScene';
import { HutScene } from './scenes/HutScene';
import { LighthouseScene } from './scenes/LighthouseScene';
import { DebugScene } from './scenes/DebugScene';
import { PlayerHudScene } from './scenes/PlayerHudScene';

// Internal framebuffer size. World coords stay in the original 320x180-style
// units; the camera zooms in by CAMERA_ZOOM so the visible world area is
// unchanged but each world unit gets CAMERA_ZOOM-many framebuffer pixels.
// This buys us higher render fidelity (notably, smooth bilinear downsamples
// of the player's high-res asset) without rescaling any gameplay code.
export const VIEWPORT_WIDTH = 640;
export const VIEWPORT_HEIGHT = 360;
export const CAMERA_ZOOM = 2;

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
  scene: [BootScene, CrashSiteScene, VillageScene, HutScene, LighthouseScene, PlayerHudScene, DebugScene],
};
