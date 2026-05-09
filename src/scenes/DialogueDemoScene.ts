import Phaser from 'phaser';
import { NPC_ROSTER } from '../sim/npcRoster';
import { attachInteraction } from '../actors/NPCInteraction';

export const DEMO_VIEWPORT_WIDTH = 960;
export const DEMO_VIEWPORT_HEIGHT = 540;

export class DialogueDemoScene extends Phaser.Scene {
  constructor() { super('dialogue-demo'); }

  create() {
    this.cameras.main.setBackgroundColor(0x1a2438);
    this.add.text(16, 12,
      'Click an NPC. Press 1-4 to pick a choice. Esc to leave dialogue.',
      { fontSize: '14px', color: '#cdd9e8', fontFamily: 'ui-monospace, monospace' });
    this.add.text(16, 36,
      'UI demo only — village placement lives in main.ts hook + VillageScene.',
      { fontSize: '11px', color: '#7d8aa3', fontFamily: 'ui-monospace, monospace' });

    // Demo lays NPCs out in a horizontal row independent of their canonical
    // village spawn coords — this scene is for testing the dialogue UI in
    // isolation, not for representing the world.
    const stride = (DEMO_VIEWPORT_WIDTH - 160) / Math.max(NPC_ROSTER.length - 1, 1);
    NPC_ROSTER.forEach((npc, i) => {
      const x = 80 + i * stride;
      const y = DEMO_VIEWPORT_HEIGHT / 2;
      const sprite = this.add.rectangle(x, y, 24, 36, npc.spriteColor)
        .setStrokeStyle(2, 0x000000)
        .setOrigin(0.5, 1);
      const label = npc.holdsItem
        ? `${npc.displayName} (${npc.archetype}, ${npc.holdsItem})`
        : `${npc.displayName} (${npc.archetype})`;
      this.add.text(x, y + 6, label, {
        fontSize: '11px', color: '#e8dcc1', fontFamily: 'ui-monospace, monospace',
      }).setOrigin(0.5, 0);
      attachInteraction(sprite, npc.id);
    });
  }
}
