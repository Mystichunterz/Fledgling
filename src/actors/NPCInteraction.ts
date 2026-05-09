import Phaser from 'phaser';
import { InteractionMenu } from '../ui/InteractionMenu';
import { DialogueOverlay } from '../ui/DialogueOverlay';
import { DIALOGUE_TREES } from '../sim/dialogueTrees';
import { npcById } from '../sim/npcRoster';
import type { NpcId } from '../sim/dialogueTypes';
import { INTERACTION_RADIUS } from '../engine/highlight';
import { GameRegistry } from '../state/GameRegistry';

let sharedMenu: InteractionMenu | null = null;
let sharedOverlay: DialogueOverlay | null = null;

const ensureSingletons = () => {
  if (!sharedMenu) sharedMenu = new InteractionMenu();
  if (!sharedOverlay) sharedOverlay = new DialogueOverlay();
  return { menu: sharedMenu, overlay: sharedOverlay };
};

export const attachInteraction = (sprite: Phaser.GameObjects.Rectangle, npcId: NpcId) => {
  const { menu, overlay } = ensureSingletons();

  // Explicit hit area in local coords. Origin is (0.5, 1) so the rectangle
  // spans (-w/2, -h, w, h) relative to the sprite's position. Pad it
  // generously so users don't need pixel-perfect aim.
  const w = sprite.width;
  const h = sprite.height;
  const pad = 8;
  sprite.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(-w / 2 - pad, -h - pad, w + pad * 2, h + pad * 2),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  });

  const radiusSq = INTERACTION_RADIUS * INTERACTION_RADIUS;
  sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    // Same proximity gate as the highlight (bbox center vs player), so the
    // NPC is only clickable while their glow is visible.
    const bb = sprite.getBounds();
    const dx = bb.centerX - GameRegistry.playerX;
    const dy = bb.centerY - GameRegistry.playerY;
    if (dx * dx + dy * dy > radiusSq) return;
    pointer.event?.stopPropagation?.();
    menu.open(sprite.scene, sprite.x, sprite.y, [
      {
        id: 'talk',
        label: 'Talk',
        onPick: () => {
          const npc = npcById(npcId);
          const tree = DIALOGUE_TREES[npcId];
          if (!tree) return;
          overlay.open(tree, npc.dialogueRootId);
        },
      },
    ]);
  });
};

export const teardownNPCInteraction = () => {
  sharedMenu?.destroy();
  sharedOverlay?.destroy();
  sharedMenu = null;
  sharedOverlay = null;
};
