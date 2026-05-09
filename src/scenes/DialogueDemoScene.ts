import Phaser from 'phaser';
import { NPC_ROSTER } from '../sim/npcRoster';
import { attachInteraction } from '../actors/NPCInteraction';
import { attachLabel } from '../ui/NpcLabel';

export const DEMO_VIEWPORT_WIDTH = 960;
export const DEMO_VIEWPORT_HEIGHT = 540;

export class DialogueDemoScene extends Phaser.Scene {
  private hudEls: HTMLElement[] = [];

  constructor() { super('dialogue-demo'); }

  create() {
    this.cameras.main.setBackgroundColor(0x1a2438);

    this.hudEls.push(this.makeHudText(8, 8, 14, '#cdd9e8',
      'Click an NPC. Press 1-4 to pick a choice. Esc to leave dialogue.'));
    this.hudEls.push(this.makeHudText(8, 32, 11, '#7d8aa3',
      'UI demo only — village placement lives in main.ts hook + VillageScene.'));

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
      attachLabel(this, sprite, label);
      attachInteraction(sprite, npc.id);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupHud());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanupHud());
  }

  private makeHudText(left: number, top: number, size: number, color: string, text: string): HTMLDivElement {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
      position: fixed; left: ${left}px; top: ${top}px;
      font-family: ui-monospace, "Cascadia Code", "Courier New", monospace;
      font-size: ${size}px; color: ${color};
      text-shadow: 0 1px 0 #000, 1px 0 0 #000, -1px 0 0 #000, 0 -1px 0 #000;
      pointer-events: none; user-select: none; z-index: 500;
    `;
    document.body.appendChild(el);
    return el;
  }

  private cleanupHud() {
    this.hudEls.forEach(e => e.remove());
    this.hudEls = [];
  }
}
