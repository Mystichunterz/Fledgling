import Phaser from 'phaser';
import { Depths } from '../engine/depths';
import { attachInteraction } from '../actors/NPCInteraction';
import { NPC_ROSTER, NpcSceneKey } from './npcRoster';

export const spawnNpcsForScene = (scene: Phaser.Scene, sceneKey: NpcSceneKey) => {
  const npcs = NPC_ROSTER.filter(n => n.scene === sceneKey);
  return npcs.map(npc => {
    const sprite = scene.add.rectangle(npc.spawn.x, npc.spawn.y, 12, 18, npc.spriteColor)
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0x000000)
      .setDepth(Depths.ACTORS + Math.round(npc.spawn.y));
    // DOMElement, not Text — Phaser.Text rasterises browser font AA into a
    // canvas texture which then upscales blurry under pixelArt:true.
    // DOM lives in CSS px on a separate layer, stays crisp at any zoom.
    scene.add.dom(npc.spawn.x, npc.spawn.y + 3, 'div',
      'font-family: ui-monospace, "Cascadia Code", "Courier New", monospace;'
      + ' font-size: 11px; color: #f2e6c9;'
      + ' text-shadow: 0 1px 0 #000, 1px 0 0 #000, -1px 0 0 #000, 0 -1px 0 #000;'
      + ' white-space: nowrap; pointer-events: none; user-select: none;',
      npc.displayName,
    ).setOrigin(0.5, 0);
    attachInteraction(sprite, npc.id);
    return sprite;
  });
};
