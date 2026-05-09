import Phaser from 'phaser';
import { InteractionMenu } from '../ui/InteractionMenu';
import { DialogueOverlay } from '../ui/DialogueOverlay';
import { DIALOGUE_TREES } from '../sim/dialogueTrees';
import { npcById } from '../sim/npcRoster';
import type { NpcId } from '../sim/dialogueTypes';

let sharedMenu: InteractionMenu | null = null;
let sharedOverlay: DialogueOverlay | null = null;

const ensureSingletons = (scene: Phaser.Scene) => {
  if (!sharedMenu) sharedMenu = new InteractionMenu(scene);
  if (!sharedOverlay) sharedOverlay = new DialogueOverlay();
  return { menu: sharedMenu, overlay: sharedOverlay };
};

type ClickableSprite = Phaser.GameObjects.GameObject & { x: number; y: number };

export const attachInteraction = (
  scene: Phaser.Scene,
  sprite: ClickableSprite,
  npcId: NpcId,
) => {
  const { menu, overlay } = ensureSingletons(scene);
  const interactive = sprite as unknown as { setInteractive?: (cfg?: object) => void };
  interactive.setInteractive?.({ useHandCursor: true });

  sprite.on('pointerdown', () => {
    menu.open(sprite.x, sprite.y, [
      {
        id: 'talk',
        label: 'Talk',
        onPick: () => {
          const npc = npcById(npcId);
          const tree = DIALOGUE_TREES[npcId];
          if (!tree) {
            console.warn('[NPCInteraction] no tree for', npcId);
            return;
          }
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
