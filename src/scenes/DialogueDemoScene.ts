import Phaser from 'phaser';
import { NPC_ROSTER } from '../sim/npcRoster';
import { attachInteraction } from '../actors/NPCInteraction';

export const DEMO_VIEWPORT_WIDTH = 960;
export const DEMO_VIEWPORT_HEIGHT = 540;

const labelStyle = (size = 11, color = '#e8dcc1') =>
  `font-family: ui-monospace, "Cascadia Code", "Courier New", monospace;`
  + ` font-size: ${size}px; color: ${color};`
  + ` text-shadow: 0 1px 0 #000, 1px 0 0 #000, -1px 0 0 #000, 0 -1px 0 #000;`
  + ` white-space: nowrap; pointer-events: none; user-select: none;`;

export class DialogueDemoScene extends Phaser.Scene {
  constructor() { super('dialogue-demo'); }

  create() {
    this.cameras.main.setBackgroundColor(0x1a2438);

    this.add.dom(16, 12, 'div', labelStyle(14, '#cdd9e8'),
      'Click an NPC. Press 1-4 to pick a choice. Esc to leave dialogue.')
      .setOrigin(0, 0);
    this.add.dom(16, 36, 'div', labelStyle(11, '#7d8aa3'),
      'UI demo only — village placement lives in main.ts hook + VillageScene.')
      .setOrigin(0, 0);

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
      this.add.dom(x, y + 6, 'div', labelStyle(11), label).setOrigin(0.5, 0);
      attachInteraction(sprite, npc.id);
    });
  }
}
