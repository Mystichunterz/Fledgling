import Phaser from 'phaser';
import { SpriteKeys } from '../assets/keys';
import { Depths } from '../engine/depths';
import { attachProximityHighlight } from '../engine/highlight';
import { attachLabel } from '../ui/NpcLabel';
import { openJournal } from '../ui/JournalOverlay';

interface JournalPageOptions {
  x: number;
  y: number;
}

const BOOK_DISPLAY_W = 28;
const BOOK_DISPLAY_H = 28;

export const attachJournalPage = (
  scene: Phaser.Scene,
  { x, y }: JournalPageOptions,
): void => {

  const depth = Depths.ACTORS + Math.round(y);
  const book = scene.add.image(x, y, SpriteKeys.PROP_DIARY)
    .setOrigin(0.5, 1)
    .setDisplaySize(BOOK_DISPLAY_W, BOOK_DISPLAY_H)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true });

  attachLabel(scene, book, 'Maren’s journal');
  attachProximityHighlight(scene, book, { radius: 48 });

  book.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    pointer.event?.stopPropagation?.();
    openJournal();
  });
};
