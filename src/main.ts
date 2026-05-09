import Phaser from 'phaser';
import { gameConfig } from './config';
import { _debugTransitionState, _debugResetTransition } from './engine/transitions';
import { GameRegistry } from './state/GameRegistry';
import { SceneKeys } from './assets/keys';
import { spawnNpcsForScene } from './sim/spawnNpcs';
import type { NpcSceneKey } from './sim/npcRoster';
import { installHandoverListener } from './state/handovers';
import { initDiary } from './sim/diary';
import { DiaryOverlay } from './ui/DiaryOverlay';
import { initFlags } from './state/dialogueFlags';

initFlags();
installHandoverListener();
initDiary();
new DiaryOverlay();

const game = new Phaser.Game(gameConfig);

// Spawn NPCs whenever a world scene's create() runs. Keeping the integration
// here means scene files don't need to know about the roster.
const NPC_SCENE_BINDINGS: Array<[string, NpcSceneKey]> = [
  [SceneKeys.CRASH_SITE, 'crash_site'],
  [SceneKeys.VILLAGE, 'village'],
  [SceneKeys.HUT, 'hut'],
  [SceneKeys.LIGHTHOUSE, 'lighthouse'],
];
game.events.once('ready', () => {
  for (const [sceneKey, npcSceneKey] of NPC_SCENE_BINDINGS) {
    const scene = game.scene.getScene(sceneKey);
    if (!scene) continue;
    scene.events.on('create', () => spawnNpcsForScene(scene, npcSceneKey));
  }
});

// Dev console helpers — type `window.__fledgling.state()` etc.
(window as Window & { __fledgling?: unknown }).__fledgling = {
  state: () => ({ ..._debugTransitionState(), ...GameRegistry }),
  resetTransition: _debugResetTransition,
};
