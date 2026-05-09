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
    scene.add.text(npc.spawn.x, npc.spawn.y + 3, npc.displayName, {
      fontSize: '10px', color: '#f2e6c9',
      fontFamily: 'ui-monospace, "Cascadia Code", "Courier New", monospace',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(Depths.ACTOR_OVERLAY + Math.round(npc.spawn.y));
    attachInteraction(sprite, npc.id);
    return sprite;
  });
};
