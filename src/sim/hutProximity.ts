import Phaser from 'phaser';
import { Depths } from '../engine/depths';
import { attachProximityHighlight } from '../engine/highlight';
import { attachLabel } from '../ui/NpcLabel';
import { openJournal } from '../ui/JournalOverlay';

interface JournalPageOptions {
  x: number;
  y: number;
}

// Maren's journal page sits on the hut floor as a clickable prop. Always
// rendered — re-readable on every visit. Glows on proximity (same gold ring
// as NPCs); click to open. The first read sets has_visited_hut to unlock
// {{predecessorName}} dialogue branches.
export const attachJournalPage = (
  scene: Phaser.Scene,
  { x, y }: JournalPageOptions,
): void => {

  const depth = Depths.ACTORS + Math.round(y);
  // Burgundy leather binding so it reads as a book against the parchment
  // props on the same floor. Sized similar to an NPC sprite so the proximity
  // highlight ring frames it the same way.
  const book = scene.add.rectangle(x, y, 14, 18, 0x7a2820)
    .setOrigin(0.5, 1)
    .setStrokeStyle(1, 0x2a0a08)
    .setDepth(depth)
    .setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-8, -22, 30, 28),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

  // Page-edge detail — a thin parchment band along the top so it reads as
  // a closed book, not just a rectangle.
  const pages = scene.add.rectangle(x, y - 16, 12, 2, 0xead5a8)
    .setOrigin(0.5, 0.5)
    .setDepth(depth + 1);

  attachLabel(scene, book, 'Maren’s journal');
  attachProximityHighlight(scene, book, { radius: 48 });

  book.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    pointer.event?.stopPropagation?.();
    openJournal();
  });
};
