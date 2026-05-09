import Phaser from 'phaser';
import { createSimWorld } from '../sim/routines/world';
import { tickSim } from '../sim/routines/tick';
import { earshotAlpha, EARSHOT_RADIUS } from '../sim/routines/earshot';
import type {
  Activity,
  Conversation,
  ConversationLine,
  FsmState,
  SimNpc,
  SimWorld,
} from '../sim/routines/types';

export const SIM_DEMO_WIDTH = 1280;
export const SIM_DEMO_HEIGHT = 720;

const MS_PER_INGAME_MIN = 40;
const PLAYER_SPEED = 100;
const NPC_BODY_W = 16;
const NPC_BODY_H = 24;
const BUBBLE_LIFETIME_MS = 3500;
const BUBBLE_FADE_MS = 600;

interface NpcView {
  body: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

interface BubbleView {
  text: Phaser.GameObjects.Text;
  spawnedAtRealMs: number;
  speakerId: string;
}

interface WasdKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

export class SimDemoScene extends Phaser.Scene {
  private world!: SimWorld;
  private npcViews = new Map<string, NpcView>();
  private playerView!: Phaser.GameObjects.Rectangle;
  private earshotRing!: Phaser.GameObjects.Graphics;
  private bubbles: BubbleView[] = [];
  private renderedLineCount = new Map<string, number>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WasdKeys;
  private hudEl!: HTMLDivElement;

  constructor() { super('sim-demo'); }

  create() {
    this.cameras.main.setBackgroundColor(0x0e1726);
    this.drawLandmarks();

    this.world = createSimWorld({ msPerMin: MS_PER_INGAME_MIN, startMin: 350 });

    for (const npc of this.world.npcs) {
      const body = this.add.rectangle(npc.pos.x, npc.pos.y, NPC_BODY_W, NPC_BODY_H, npc.color)
        .setStrokeStyle(2, 0x000000)
        .setOrigin(0.5, 1)
        .setDepth(Math.round(npc.pos.y));
      const label = this.add.text(npc.pos.x, npc.pos.y - NPC_BODY_H - 4, npc.name, {
        fontSize: '11px', fontFamily: 'monospace', color: '#ffffff',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(Math.round(npc.pos.y) + 1);
      this.npcViews.set(npc.id, { body, label });
    }

    this.playerView = this.add.rectangle(
      this.world.player.pos.x, this.world.player.pos.y,
      10, 14, 0xf2e6c9,
    ).setStrokeStyle(1, 0x000000).setOrigin(0.5, 1);

    this.earshotRing = this.add.graphics().setDepth(5);

    if (!this.input.keyboard) throw new Error('SimDemoScene: keyboard not available');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D') as WasdKeys;
    this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,W,A,S,D');

    this.hudEl = this.makeHud();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());
  }

  override update(_time: number, deltaMs: number) {
    this.handlePlayerInput(deltaMs);
    tickSim(this.world, deltaMs);
    this.syncNpcViews();
    this.surfaceNewLines();
    this.tickBubbles();
    this.drawEarshotRing();
    this.updateHud();
  }

  private handlePlayerInput(deltaMs: number) {
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown  || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up.isDown    || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown  || this.wasd.S.isDown) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const dt = deltaMs / 1000;
      const p = this.world.player.pos;
      p.x = Phaser.Math.Clamp(p.x + (dx / len) * PLAYER_SPEED * dt, 0, SIM_DEMO_WIDTH);
      p.y = Phaser.Math.Clamp(p.y + (dy / len) * PLAYER_SPEED * dt, 0, SIM_DEMO_HEIGHT);
    }
    this.playerView.x = this.world.player.pos.x;
    this.playerView.y = this.world.player.pos.y;
    this.playerView.setDepth(Math.round(this.world.player.pos.y));
  }

  private syncNpcViews() {
    for (const npc of this.world.npcs) {
      const view = this.npcViews.get(npc.id);
      if (!view) continue;
      view.body.x = npc.pos.x;
      view.body.y = npc.pos.y;
      view.body.setDepth(Math.round(npc.pos.y));
      view.label.x = npc.pos.x;
      view.label.y = npc.pos.y - NPC_BODY_H - 4;
      view.label.setDepth(Math.round(npc.pos.y) + 1);
    }
  }

  private surfaceNewLines() {
    for (const convo of this.world.conversations) {
      const rendered = this.renderedLineCount.get(convo.id) ?? 0;
      for (let i = rendered; i < convo.lines.length; i++) {
        const line = convo.lines[i];
        if (line) this.spawnBubble(line);
      }
      this.renderedLineCount.set(convo.id, convo.lines.length);
    }
  }

  private spawnBubble(line: ConversationLine) {
    const speaker = this.findNpc(line.speaker);
    if (!speaker) return;
    const text = this.add.text(
      speaker.pos.x,
      speaker.pos.y - NPC_BODY_H - 16,
      line.textProcedural,
      {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#1a1a2e',
        backgroundColor: '#f5f3e7',
        padding: { x: 4, y: 2 },
      },
    ).setOrigin(0.5, 1).setDepth(10000);
    this.bubbles.push({
      text,
      spawnedAtRealMs: this.time.now,
      speakerId: line.speaker,
    });
  }

  private tickBubbles() {
    const now = this.time.now;
    const surviving: BubbleView[] = [];
    for (const b of this.bubbles) {
      const age = now - b.spawnedAtRealMs;
      if (age >= BUBBLE_LIFETIME_MS) {
        b.text.destroy();
        continue;
      }
      const speaker = this.findNpc(b.speakerId);
      if (speaker) {
        b.text.x = speaker.pos.x;
        b.text.y = speaker.pos.y - NPC_BODY_H - 16;
      }
      const distAlpha = speaker ? earshotAlpha(this.world.player.pos, speaker.pos) : 0;
      const ageAlpha = age > BUBBLE_LIFETIME_MS - BUBBLE_FADE_MS
        ? Math.max(0, (BUBBLE_LIFETIME_MS - age) / BUBBLE_FADE_MS)
        : 1;
      b.text.setAlpha(distAlpha * ageAlpha);
      surviving.push(b);
    }
    this.bubbles = surviving;
  }

  private drawEarshotRing() {
    this.earshotRing.clear();
    this.earshotRing.lineStyle(1, 0x88ccee, 0.3);
    this.earshotRing.strokeCircle(
      this.world.player.pos.x,
      this.world.player.pos.y,
      EARSHOT_RADIUS,
    );
  }

  private drawLandmarks() {
    type Mark = { x: number; y: number; w: number; h: number; color: number; label: string };
    const marks: Mark[] = [
      { x: 220, y: 200, w: 64, h: 40, color: 0xb56a3a, label: 'bakery' },
      { x: 340, y: 580, w: 80, h: 40, color: 0xc8a050, label: 'farm' },
      { x: 800, y: 180, w: 48, h: 40, color: 0x6a6a8a, label: 'guard hut' },
      { x: 240, y: 410, w: 40, h: 32, color: 0x8a6a3a, label: 'shrine' },
      { x: 800, y: 380, w: 32, h: 24, color: 0x4a8a4a, label: 'play' },
      { x: 640, y: 280, w: 24, h: 24, color: 0x4a78a8, label: 'well' },
    ];
    for (const m of marks) {
      this.add.rectangle(m.x, m.y, m.w, m.h, m.color)
        .setStrokeStyle(1, 0x3a2a14)
        .setOrigin(0.5, 1)
        .setDepth(Math.round(m.y) - 1);
      this.add.text(m.x, m.y + 4, m.label, {
        fontSize: '9px', fontFamily: 'monospace', color: '#7d8aa3',
      }).setOrigin(0.5, 0).setDepth(2);
    }
  }

  private findNpc(id: string): SimNpc | undefined {
    return this.world.npcs.find(n => n.id === id);
  }

  private makeHud(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed; left: 8px; top: 8px;
      font-family: ui-monospace, "Cascadia Code", monospace; font-size: 11px;
      color: #cdd9e8; background: rgba(10,10,20,0.78);
      padding: 8px 10px; border-radius: 4px;
      pointer-events: none; user-select: none; z-index: 500;
      white-space: pre; line-height: 1.45;
    `;
    document.body.appendChild(el);
    return el;
  }

  private updateHud() {
    const w = this.world;
    const hh = String(Math.floor(w.nowMin / 60)).padStart(2, '0');
    const mm = String(Math.floor(w.nowMin % 60)).padStart(2, '0');
    const dayLen = (1440 * MS_PER_INGAME_MIN / 1000).toFixed(0);
    const active = w.conversations.filter(c => c.state !== 'ended').length;

    const out: string[] = [];
    out.push(`time   ${hh}:${mm}   (1 min = ${MS_PER_INGAME_MIN}ms, full day ≈ ${dayLen}s)`);
    out.push(`convos ${active} active / ${w.conversations.length} total`);
    out.push('');
    for (const npc of w.npcs) {
      const e = npc.schedule[npc.scheduleIdx];
      if (!e) continue;
      const act = describeActivity(e.activity);
      const fsm = describeFsm(npc.fsm);
      out.push(`${pad(npc.name, 6)} ${pad(fsm, 12)} ${pad(act, 22)} → ${e.location.tag}`);
    }
    out.push('');
    out.push('WASD/arrows = move.  Earshot ring shows hearing range.');
    out.push('Walk near a "meet" location to overhear conversations.');
    this.hudEl.textContent = out.join('\n');
  }

  private cleanup() {
    if (this.hudEl?.parentNode) this.hudEl.parentNode.removeChild(this.hudEl);
    for (const b of this.bubbles) b.text.destroy();
    this.bubbles = [];
  }
}

function pad(s: string, n: number): string {
  return (s + ' '.repeat(n)).slice(0, n);
}

function describeActivity(a: Activity): string {
  switch (a.kind) {
    case 'sleep':  return 'sleep';
    case 'work':   return `work[${a.jobId}]`;
    case 'wander': return 'wander';
    case 'meet':   return `meet ${a.with.replace(/^npc\./, '')}`;
  }
}

function describeFsm(f: FsmState): string {
  switch (f.kind) {
    case 'travelling': return 'travel';
    case 'working':    return 'working';
    case 'conversing': return `chat ${f.partner.replace(/^npc\./, '')}`;
    case 'sleeping':   return 'sleep';
    case 'idle':       return 'idle';
  }
}
