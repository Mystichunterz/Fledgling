import Phaser from 'phaser';
import { gameConfig } from './config';
import { _debugTransitionState, _debugResetTransition } from './engine/transitions';
import { GameRegistry } from './state/GameRegistry';
import { SceneKeys } from './assets/keys';
import { spawnNpcsForScene } from './sim/spawnNpcs';
import { installHandoverListener } from './state/handovers';
import { initDiary } from './sim/diary';
import { DiaryOverlay } from './ui/DiaryOverlay';

installHandoverListener();
initDiary();
new DiaryOverlay();

const game = new Phaser.Game(gameConfig);

// Spawn NPCs whenever VillageScene's create() runs — keeps the integration
// out of VillageScene.ts itself so engine and sim lanes stay separable.
game.events.once('ready', () => {
  const village = game.scene.getScene(SceneKeys.VILLAGE);
  if (!village) return;
  village.events.on('create', () => spawnNpcsForScene(village, 'village'));
});

// Dev console helpers — type `window.__fledgling.state()` etc.
(window as Window & { __fledgling?: unknown }).__fledgling = {
  state: () => ({ ..._debugTransitionState(), ...GameRegistry }),
  resetTransition: _debugResetTransition,
};
