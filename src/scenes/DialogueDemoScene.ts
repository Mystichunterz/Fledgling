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
      'Roster preview only — Enterprise (T13) owns world layout and pathing.',
      { fontSize: '11px', color: '#7d8aa3', fontFamily: 'ui-monospace, monospace' });

    NPC_ROSTER.forEach(npc => {
      const sprite = this.add.rectangle(npc.spawn.x, npc.spawn.y, 24, 36, npc.spriteColor)
        .setStrokeStyle(2, 0x000000)
        .setOrigin(0.5, 1);
      const label = npc.holdsItem
        ? `${npc.displayName} (${npc.archetype}, ${npc.holdsItem})`
        : `${npc.displayName} (${npc.archetype})`;
      this.add.text(npc.spawn.x, npc.spawn.y + 6, label, {
        fontSize: '11px', color: '#e8dcc1', fontFamily: 'ui-monospace, monospace',
      }).setOrigin(0.5, 0);
      attachInteraction(this, sprite, npc.id);
    });
  }
}
