import Phaser from 'phaser';
import { GameRegistry } from '../state/GameRegistry';
import { isFlagSet } from '../state/dialogueFlags';
import { maybeOpenJournalOnHutEntry } from '../ui/JournalOverlay';

// Village hut sprite is at (520, 380) origin (0.5, 1) — its visual centre
// is around (520, 332). Trigger when the player walks within ~56px so the
// journal pops just as they approach the porch.
const HUT_X = 520;
const HUT_Y = 332;
const TRIGGER_RADIUS = 56;
const TRIGGER_RADIUS_SQ = TRIGGER_RADIUS * TRIGGER_RADIUS;

export const attachHutJournalProximity = (scene: Phaser.Scene): void => {
  if (isFlagSet('has_visited_hut')) return;

  const onUpdate = () => {
    if (isFlagSet('has_visited_hut')) {
      scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
      return;
    }
    const dx = HUT_X - GameRegistry.playerX;
    const dy = HUT_Y - GameRegistry.playerY;
    if (dx * dx + dy * dy > TRIGGER_RADIUS_SQ) return;
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
    maybeOpenJournalOnHutEntry();
  };

  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
  });
};
