import Phaser from 'phaser';
import { Depths } from '../engine/depths';
import { attachInteraction } from '../actors/NPCInteraction';
import { attachProximityHighlight } from '../engine/highlight';
import { attachLabel } from '../ui/NpcLabel';
import { NPC_ROSTER, type NpcSceneKey, type NpcDef } from './npcRoster';

export const spawnNpc = (
  scene: Phaser.Scene,
  npc: NpcDef,
): Phaser.GameObjects.Rectangle => {
  const sprite = scene.add.rectangle(npc.spawn.x, npc.spawn.y, 12, 18, npc.spriteColor)
    .setOrigin(0.5, 1)
    .setStrokeStyle(1, 0x000000)
    .setDepth(Depths.ACTORS + Math.round(npc.spawn.y));
  attachLabel(scene, sprite, npc.displayName);
  attachInteraction(sprite, npc.id);
  attachProximityHighlight(scene, sprite, { radius: 48 });
  return sprite;
};

export const spawnNpcsForScene = (scene: Phaser.Scene, sceneKey: NpcSceneKey) => {
  const npcs = NPC_ROSTER
    .filter(n => n.scene === sceneKey)
    // Pemi is special — handled separately via the prologue flow on the
    // first crash-site visit, not auto-spawned here.
    .filter(n => n.id !== 'pemi');
  return npcs.map(npc => spawnNpc(scene, npc));
};
