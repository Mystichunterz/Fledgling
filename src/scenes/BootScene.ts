import Phaser from 'phaser';
import { SceneKeys } from '../assets/keys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT);
  }

  preload() {
    this.load.setPath('assets');
    // Future: bitmap fonts, atlases, voice manifest go here.
  }

  create() {
    this.scene.start(SceneKeys.ISLAND);
  }
}
