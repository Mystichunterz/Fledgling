import Phaser from 'phaser';
import { Depths } from '../engine/depths';
import { attachInteraction } from '../actors/NPCInteraction';
import { attachProximityHighlight } from '../engine/highlight';
import { attachLabel } from '../ui/NpcLabel';
import { NPC_ROSTER, type NpcSceneKey, type NpcDef, type NpcArchetype } from './npcRoster';

// Target rendered height in world pixels. Width follows the source PNG's
// aspect ratio via uniform setScale so portraits stay un-squashed.
const NPC_DISPLAY_HEIGHT = 32;
const VARIANT_COUNT = 3;

const ARCHETYPE_KEY: Record<NpcArchetype, string> = {
  chief: 'npc_chief',
  child: 'npc_child',
  man: 'npc_man',
  elder_woman: 'npc_elder',
};

// Stable variant pick keyed off the NPC id — same Naro looks the same every
// time you re-enter the village, but different NPCs of the same archetype
// (Naro vs Lemu, Toka vs Senu) get distinct variants when their hashes differ.
const variantFor = (id: string): number => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % VARIANT_COUNT;
};

export const spawnNpc = (
  scene: Phaser.Scene,
  npc: NpcDef,
): Phaser.GameObjects.Image => {
  const textureKey = `${ARCHETYPE_KEY[npc.archetype]}_${variantFor(npc.id)}`;
  const sprite = scene.add.image(npc.spawn.x, npc.spawn.y, textureKey)
    .setOrigin(0.5, 1)
    .setDepth(Depths.ACTORS + Math.round(npc.spawn.y));
  sprite.setScale(NPC_DISPLAY_HEIGHT / sprite.height);
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
