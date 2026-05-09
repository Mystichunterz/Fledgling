import Phaser from 'phaser';
import { SceneKeys } from '../assets/keys';
import { isDev } from '../engine/dev';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT);
  }

  preload() {
    this.load.setPath('assets');
  }

  create() {
    if (isDev()) this.scene.run(SceneKeys.DEBUG);
    this.scene.start(SceneKeys.VILLAGE);
  }
}
