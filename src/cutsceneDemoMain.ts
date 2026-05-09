import Phaser from 'phaser';
import { IntroCutsceneScene, CUTSCENE_WIDTH, CUTSCENE_HEIGHT } from './scenes/IntroCutsceneScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: CUTSCENE_WIDTH,
  height: CUTSCENE_HEIGHT,
  parent: 'cutscene-demo',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  dom: { createContainer: true },
  backgroundColor: '#0a0a14',
  scene: [IntroCutsceneScene],
});
