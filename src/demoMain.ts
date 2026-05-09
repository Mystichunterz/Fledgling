import Phaser from 'phaser';
import { DialogueDemoScene, DEMO_VIEWPORT_WIDTH, DEMO_VIEWPORT_HEIGHT } from './scenes/DialogueDemoScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: DEMO_VIEWPORT_WIDTH,
  height: DEMO_VIEWPORT_HEIGHT,
  parent: 'demo',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#0a0a14',
  scene: [DialogueDemoScene],
});
