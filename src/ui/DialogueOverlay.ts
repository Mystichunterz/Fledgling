import type { DialogueTree, DialogueNode, PlayerOption, NodeSideEffect } from '../sim/dialogueTypes';
import { npcById } from '../sim/npcRoster';
import { isFlagSet, setFlag } from '../state/dialogueFlags';

const applySideEffects = (effects?: NodeSideEffect[]) => {
  if (!effects) return;
  for (const e of effects) {
    if (e.kind === 'set_flag') setFlag(e.flag);
    else if (e.kind === 'set_anchor') setFlag(`anchor_known.${e.anchor}` as const);
    else if (e.kind === 'log_hint') {
      window.dispatchEvent(new CustomEvent('fledgling:hint', { detail: { hint: e.hint } }));
    }
  }
};

export class DialogueOverlay {
  private root: HTMLDivElement;
  private speakerEl: HTMLDivElement;
  private lineEl: HTMLDivElement;
  private choicesEl: HTMLDivElement;
  private currentTree: DialogueTree | null = null;
  private currentNodeId: string | null = null;
  private onClose: (() => void) | null = null;
  private keyHandler: (ev: KeyboardEvent) => void;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'fledgling-dialogue';
    this.root.style.cssText = `
      position: fixed; left: 0; right: 0; bottom: 0;
      height: 38vh; min-height: 240px;
      background: linear-gradient(180deg, rgba(20,18,12,0.92) 0%, rgba(36,28,18,0.96) 100%);
      border-top: 2px solid #8a6f3a;
      color: #e8dcc1;
      font-family: ui-monospace, "SF Mono", monospace;
      padding: 16px 24px 18px 24px;
      box-sizing: border-box;
      display: none;
      z-index: 1000;
    `;

    this.speakerEl = document.createElement('div');
    this.speakerEl.style.cssText = `
      font-weight: 700; font-size: 14px; color: #f2c97a;
      letter-spacing: 0.04em; text-transform: uppercase;
      margin-bottom: 6px;
    `;

    this.lineEl = document.createElement('div');
    this.lineEl.style.cssText = `
      font-size: 17px; line-height: 1.45; color: #e8dcc1;
      margin-bottom: 14px; min-height: 50px;
    `;

    this.choicesEl = document.createElement('div');
    this.choicesEl.style.cssText = `display: flex; flex-direction: column; gap: 6px;`;

    this.root.append(this.speakerEl, this.lineEl, this.choicesEl);
    document.body.appendChild(this.root);

    this.keyHandler = (ev: KeyboardEvent) => {
      if (this.currentNodeId === null) return;
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        ev.preventDefault();
        this.close();
        return;
      }
      const idx = parseInt(ev.key, 10);
      if (isFinite(idx) && idx >= 1 && idx <= 9) {
        const node = this.currentTree?.nodes[this.currentNodeId];
        const visible = (node?.options ?? []).filter(o => !o.gatedBy || isFlagSet(o.gatedBy));
        const choice = visible[idx - 1];
        if (choice) {
          ev.stopPropagation();
          ev.preventDefault();
          this.pickChoice(choice);
        }
      }
    };
    window.addEventListener('keydown', this.keyHandler, true);
  }

  open(tree: DialogueTree, rootId: string, onClose?: () => void) {
    this.currentTree = tree;
    this.onClose = onClose ?? null;
    this.root.style.display = 'block';
    this.renderNode(rootId);
  }

  close() {
    this.root.style.display = 'none';
    this.currentTree = null;
    this.currentNodeId = null;
    const fn = this.onClose;
    this.onClose = null;
    fn?.();
  }

  private renderNode(nodeId: string) {
    const node: DialogueNode | undefined = this.currentTree?.nodes[nodeId];
    if (!node) {
      console.warn('[DialogueOverlay] node not found:', nodeId);
      this.close();
      return;
    }
    this.currentNodeId = nodeId;
    applySideEffects(node.sideEffects);

    const npc = npcById(node.speaker);
    this.speakerEl.textContent = npc.displayName;

    // Encounter hook for the diary to subscribe to.
    window.dispatchEvent(new CustomEvent('fledgling:encounter', {
      detail: { speaker: node.speaker, line: node.line, nodeId: node.id },
    }));

    this.lineEl.textContent = node.line;

    this.choicesEl.innerHTML = '';
    const visible = node.options.filter(o => !o.gatedBy || isFlagSet(o.gatedBy));
    visible.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        text-align: left; padding: 8px 12px; font-size: 14px;
        font-family: inherit; color: #d4c89a; background: rgba(50,40,28,0.65);
        border: 1px solid #5a4828; border-radius: 4px; cursor: pointer;
        transition: background 0.08s, border-color 0.08s;
        ${choice.kind === 'gesture' ? 'font-style: italic; color: #b8a878;' : ''}
      `;
      btn.onmouseenter = () => {
        btn.style.background = 'rgba(80,64,40,0.85)';
        btn.style.borderColor = '#a88848';
      };
      btn.onmouseleave = () => {
        btn.style.background = 'rgba(50,40,28,0.65)';
        btn.style.borderColor = '#5a4828';
      };
      const label = choice.kind === 'utterance' ? `"${choice.text}"` : choice.text;
      btn.textContent = `${i + 1}. ${label}`;
      btn.onclick = () => this.pickChoice(choice);
      this.choicesEl.appendChild(btn);
    });
  }

  private pickChoice(choice: PlayerOption) {
    // Fire NPC react animation. NPCInteraction listens and tweens the sprite
    // (placeholder until per-NPC sprite anims land).
    if (choice.react !== 'none' && this.currentTree) {
      window.dispatchEvent(new CustomEvent('fledgling:react', {
        detail: { speaker: this.currentTree.npcId, anim: choice.react },
      }));
    }
    if (choice.next === 'END') this.close();
    else this.renderNode(choice.next);
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler, true);
    this.root.remove();
  }
}
