import Phaser from 'phaser';
import { SimDemoScene, SIM_DEMO_WIDTH, SIM_DEMO_HEIGHT } from './scenes/SimDemoScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: SIM_DEMO_WIDTH,
  height: SIM_DEMO_HEIGHT,
  parent: 'sim-demo',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  dom: { createContainer: true },
  backgroundColor: '#0a0a14',
  scene: [SimDemoScene],
});
