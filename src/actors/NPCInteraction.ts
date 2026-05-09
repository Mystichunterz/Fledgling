import Phaser from 'phaser';
import { InteractionMenu } from '../ui/InteractionMenu';
import { DialogueOverlay } from '../ui/DialogueOverlay';
import { DIALOGUE_TREES } from '../sim/dialogueTrees';
import { npcById } from '../sim/npcRoster';
import type { NpcId } from '../sim/dialogueTypes';
import { matchesTrigger } from '../state/dialogueFlags';
import { INTERACTION_RADIUS } from '../engine/highlight';
import { GameRegistry } from '../state/GameRegistry';

let sharedMenu: InteractionMenu | null = null;
let sharedOverlay: DialogueOverlay | null = null;

const ensureSingletons = () => {
  if (!sharedMenu) sharedMenu = new InteractionMenu();
  if (!sharedOverlay) sharedOverlay = new DialogueOverlay();
  return { menu: sharedMenu, overlay: sharedOverlay };
};

// Pick the entry node for an NPC by walking the tree's `entries` list in
// priority order and matching each node's trigger against current flags.
// Falls back to the last entry (most-general phase) if nothing matches.
const resolveEntry = (npcId: NpcId): string | null => {
  const tree = DIALOGUE_TREES[npcId];
  if (!tree) return null;
  for (const id of tree.entries) {
    const node = tree.nodes[id];
    if (node && matchesTrigger(node.trigger)) return id;
  }
  return tree.entries[tree.entries.length - 1] ?? null;
};

export const attachInteraction = (sprite: Phaser.GameObjects.Rectangle, npcId: NpcId) => {
  const { menu, overlay } = ensureSingletons();

  const w = sprite.width;
  const h = sprite.height;
  const pad = 8;
  sprite.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(-w / 2 - pad, -h - pad, w + pad * 2, h + pad * 2),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  });

  // Listen for react animation events for our NPC and tween the sprite.
  // Placeholder until per-NPC sprite animations exist.
  const onReact = (ev: Event) => {
    const detail = (ev as CustomEvent<{ speaker: NpcId; anim: string }>).detail;
    if (!detail || detail.speaker !== npcId) return;
    if (!sprite.scene) return;
    sprite.scene.tweens.add({
      targets: sprite,
      scaleX: { from: 1, to: 1.15 },
      scaleY: { from: 1, to: 1.15 },
      duration: 100,
      yoyo: true,
      ease: 'Sine.InOut',
    });
  };
  window.addEventListener('fledgling:react', onReact);
  sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
    window.removeEventListener('fledgling:react', onReact);
  });

  const radiusSq = INTERACTION_RADIUS * INTERACTION_RADIUS;
  sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
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
          const tree = DIALOGUE_TREES[npcId];
          const entryId = resolveEntry(npcId);
          if (!tree || !entryId) {
            console.warn('[NPCInteraction] no dialogue for', npcId);
            return;
          }
          // npc looked up just to validate it exists in the roster
          npcById(npcId);
          overlay.open(tree, entryId);
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
