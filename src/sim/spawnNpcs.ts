import Phaser from 'phaser';
import { Depths } from '../engine/depths';
import { attachInteraction } from '../actors/NPCInteraction';
import { attachProximityHighlight } from '../engine/highlight';
import { attachLabel } from '../ui/NpcLabel';
import { NPC_ROSTER, NpcSceneKey } from './npcRoster';

export const spawnNpcsForScene = (scene: Phaser.Scene, sceneKey: NpcSceneKey) => {
  const npcs = NPC_ROSTER.filter(n => n.scene === sceneKey);
  return npcs.map(npc => {
    const sprite = scene.add.rectangle(npc.spawn.x, npc.spawn.y, 12, 18, npc.spriteColor)
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0x000000)
      .setDepth(Depths.ACTORS + Math.round(npc.spawn.y));
    attachLabel(scene, sprite, npc.displayName);
    attachInteraction(sprite, npc.id);
    attachProximityHighlight(scene, sprite, { radius: 48 });
    return sprite;
  });
};
