import Phaser from 'phaser';
import { gameConfig } from './config';
import { _debugTransitionState, _debugResetTransition } from './engine/transitions';
import { GameRegistry } from './state/GameRegistry';
import { SceneKeys } from './assets/keys';
import { spawnNpcsForScene, spawnNpc } from './sim/spawnNpcs';
import { npcById, type NpcSceneKey } from './sim/npcRoster';
import { spawnPickupTiles } from './sim/pickupTiles';
import { attachJournalPage } from './sim/hutProximity';
import { installHandoverListener } from './state/handovers';
import { initDiary } from './sim/diary';
import { DiaryOverlay } from './ui/DiaryOverlay';
import { EndScreen } from './ui/EndScreen';
import { initFlags, isFlagSet } from './state/dialogueFlags';
import { CrashPrologue, hasSeenPrologue } from './scenes/CrashPrologue';

initFlags();
installHandoverListener();
initDiary();
new DiaryOverlay();
new EndScreen();
const prologue = new CrashPrologue();

const game = new Phaser.Game(gameConfig);

// Spawn world-NPCs whenever a scene's create() runs. The crash-site case is
// special: Pemi waits for the prologue to finish on first visit and is
// suppressed entirely after met_pemi is set.
const NPC_SCENE_BINDINGS: Array<[string, NpcSceneKey]> = [
  [SceneKeys.CRASH_SITE, 'crash_site'],
  [SceneKeys.VILLAGE, 'village'],
  [SceneKeys.HUT, 'hut'],
  [SceneKeys.LIGHTHOUSE, 'lighthouse'],
];

const handlePemiAtBeach = (scene: Phaser.Scene) => {
  if (isFlagSet('met_pemi')) return;
  const pemi = npcById('pemi');
  let pemiSprite: Phaser.GameObjects.Image | null = null;
  const dropPemi = () => { pemiSprite = spawnNpc(scene, pemi); };

  // Once Pemi's first conversation closes (which is the only path that sets
  // `met_pemi`), she runs south past the dunes — matching her own line:
  // "Go — go village. Naro. Go!". Listener is one-shot.
  const onClosed = (ev: Event) => {
    const detail = (ev as CustomEvent<{ npcId: string }>).detail;
    if (detail?.npcId !== 'pemi') return;
    if (!isFlagSet('met_pemi')) return;
    if (!pemiSprite || !pemiSprite.scene) return;
    window.removeEventListener('fledgling:dialogue-closed', onClosed);
    const sprite = pemiSprite;
    pemiSprite = null;
    scene.tweens.add({
      targets: sprite,
      y: sprite.y + 140,
      alpha: { from: 1, to: 0 },
      duration: 1400,
      ease: 'Sine.In',
      onComplete: () => sprite.destroy(),
    });
  };
  window.addEventListener('fledgling:dialogue-closed', onClosed);

  if (!hasSeenPrologue()) prologue.start(dropPemi);
  else dropPemi();
};

game.events.once('ready', () => {
  for (const [sceneKey, npcSceneKey] of NPC_SCENE_BINDINGS) {
    const scene = game.scene.getScene(sceneKey);
    if (!scene) continue;
    scene.events.on('create', () => {
      spawnNpcsForScene(scene, npcSceneKey);
      spawnPickupTiles(scene, npcSceneKey);
      if (sceneKey === SceneKeys.CRASH_SITE) handlePemiAtBeach(scene);
      // Maren's journal sits on the hut floor — clickable, glows on approach.
      // Placed left of the existing prop row so it stands clear of them.
      if (sceneKey === SceneKeys.HUT) attachJournalPage(scene, { x: 180, y: 220 });
    });
  }
});

// Dev console helpers — type `window.__fledgling.state()` etc.
(window as Window & { __fledgling?: unknown }).__fledgling = {
  state: () => ({ ..._debugTransitionState(), ...GameRegistry }),
  resetTransition: _debugResetTransition,
};
