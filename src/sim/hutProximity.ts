import Phaser from 'phaser';
import { GameRegistry } from '../state/GameRegistry';
import { isFlagSet } from '../state/dialogueFlags';
import { maybeOpenJournalOnHutEntry } from '../ui/JournalOverlay';

interface ProximityOptions {
  x: number;
  y: number;
  radius?: number;
}

// Fires Maren's journal once when the player walks within `radius` of the
// given anchor. Used in two scenes: the village hut sprite and the hut
// interior — whichever the player reaches first.
export const attachHutJournalProximity = (
  scene: Phaser.Scene,
  { x, y, radius = 56 }: ProximityOptions,
): void => {
  if (isFlagSet('has_visited_hut')) return;
  const radiusSq = radius * radius;

  const onUpdate = () => {
    if (isFlagSet('has_visited_hut')) {
      scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
      return;
    }
    const dx = x - GameRegistry.playerX;
    const dy = y - GameRegistry.playerY;
    if (dx * dx + dy * dy > radiusSq) return;
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
    maybeOpenJournalOnHutEntry();
  };

  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
  });
};
