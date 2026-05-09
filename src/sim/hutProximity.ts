import Phaser from 'phaser';
import { Depths } from '../engine/depths';
import { attachProximityHighlight } from '../engine/highlight';
import { isFlagSet } from '../state/dialogueFlags';
import { maybeOpenJournalOnHutEntry } from '../ui/JournalOverlay';

interface JournalPageOptions {
  x: number;
  y: number;
}

// Maren's journal page sits on the hut floor as a clickable prop. Glows on
// proximity (same gold ring as NPCs) so the player knows it's interactable;
// click to read, which sets has_visited_hut. Quietly hides itself once the
// flag is set so re-entries don't re-render an already-read book.
export const attachJournalPage = (
  scene: Phaser.Scene,
  { x, y }: JournalPageOptions,
): void => {
  if (isFlagSet('has_visited_hut')) return;

  const depth = Depths.ACTORS + Math.round(y);
  const book = scene.add.rectangle(x, y, 14, 10, 0xead5a8)
    .setOrigin(0.5, 1)
    .setStrokeStyle(1, 0x4a2e16)
    .setDepth(depth)
    .setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-6, -16, 26, 22),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

  // Spine detail — a darker line down the middle so it reads as a book.
  const spine = scene.add.rectangle(x, y - 5, 1, 8, 0x4a2e16)
    .setOrigin(0.5, 0.5)
    .setDepth(depth + 1);

  attachProximityHighlight(scene, book, { radius: 48 });

  book.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    pointer.event?.stopPropagation?.();
    maybeOpenJournalOnHutEntry();
    book.destroy();
    spine.destroy();
  });
};
