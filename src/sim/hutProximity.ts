import Phaser from 'phaser';
import { GameRegistry } from '../state/GameRegistry';
import { isFlagSet } from '../state/dialogueFlags';
import { maybeOpenJournalOnHutEntry } from '../ui/JournalOverlay';

// Village hut anchor per Calvin's playtest. Generous trigger radius so the
// journal pops anywhere on the porch, not just dead-centre.
const HUT_X = 176;
const HUT_Y = 137;
const TRIGGER_RADIUS = 80;
const TRIGGER_RADIUS_SQ = TRIGGER_RADIUS * TRIGGER_RADIUS;

export const attachHutJournalProximity = (scene: Phaser.Scene): void => {
  if (isFlagSet('has_visited_hut')) {
    console.info('[hut-proximity] has_visited_hut already set — journal disabled this run');
    return;
  }
  console.info('[hut-proximity] attached at', HUT_X, HUT_Y, 'radius', TRIGGER_RADIUS);

  const onUpdate = () => {
    if (isFlagSet('has_visited_hut')) {
      scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
      return;
    }
    const dx = HUT_X - GameRegistry.playerX;
    const dy = HUT_Y - GameRegistry.playerY;
    if (dx * dx + dy * dy > TRIGGER_RADIUS_SQ) return;
    console.info('[hut-proximity] firing journal at player', GameRegistry.playerX, GameRegistry.playerY);
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
    maybeOpenJournalOnHutEntry();
  };

  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
  });
};
