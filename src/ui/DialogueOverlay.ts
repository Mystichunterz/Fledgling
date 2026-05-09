import type { DialogueTree, DialogueNode, LineSegment, PlayerOption, NodeSideEffect } from '../sim/dialogueTypes';
import { npcById } from '../sim/npcRoster';
import { isFlagSet, setFlag } from '../state/dialogueFlags';
import { GameRegistry } from '../state/GameRegistry';
import { encodeFrame } from '../lang/encoder';
import type { FilledFrame } from '../lang/frames';
import { isDev } from '../engine/dev';
import { DialogueDevConsole } from './DialogueDevConsole';

// Encode a frame array into surface text, capitalised + period-terminated like
// a sentence. Failures here would crash the dialogue UI, so we trap and fall
// back to a marker — the english stays in the diary regardless.
const encodeSurface = (frames: FilledFrame[]): string => {
  try {
    return frames.map(f => {
      const s = encodeFrame(GameRegistry.language, f);
      return s.charAt(0).toUpperCase() + s.slice(1) + '.';
    }).join(' ');
  } catch (err) {
    console.warn('[DialogueOverlay] encode failed:', err);
    return '';
  }
};

// Speech segments display as text; stage segments drive sprite anims and never
// surface as text. When a speech segment carries frames we encode them into the
// active language; otherwise we fall back to the authored english.
const renderLine = (segments: LineSegment[]): string =>
  segments
    .filter(s => s.kind === 'speech')
    .map(s => {
      if (s.kind !== 'speech') return '';
      const surface = s.frames && s.frames.length > 0 ? encodeSurface(s.frames) : '';
      return surface || s.english;
    })
    .join(' ');

const applySideEffects = (effects?: NodeSideEffect[]) => {
  if (!effects) return;
  for (const e of effects) {
    if (e.kind === 'set_flag') setFlag(e.flag, e.value ?? true);
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
  private devConsole: DialogueDevConsole | null = null;

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

    if (isDev()) this.devConsole = new DialogueDevConsole();
  }

  open(tree: DialogueTree, rootId: string, onClose?: () => void) {
    this.currentTree = tree;
    this.onClose = onClose ?? null;
    this.root.style.display = 'block';
    this.devConsole?.notifyDialogueOpened();
    this.renderNode(rootId);
  }

  close() {
    const closingNpcId = this.currentTree?.npcId ?? null;
    this.root.style.display = 'none';
    this.currentTree = null;
    this.currentNodeId = null;
    this.devConsole?.notifyDialogueClosed();
    if (closingNpcId) {
      window.dispatchEvent(new CustomEvent('fledgling:dialogue-closed', { detail: { npcId: closingNpcId } }));
    }
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

    if (this.devConsole && this.currentTree) {
      this.devConsole.update(this.currentTree, node, GameRegistry.language);
    }

    const npc = npcById(node.speaker);
    this.speakerEl.textContent = npc.displayName;

    const rendered = renderLine(node.line);

    // Encounter hook for the diary to subscribe to. Diary tokenises the
    // displayed string, so we send the rendered surface, not the segment array.
    window.dispatchEvent(new CustomEvent('fledgling:encounter', {
      detail: { speaker: node.speaker, line: rendered, nodeId: node.id },
    }));

    this.lineEl.textContent = rendered;

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
      let label: string;
      if (choice.kind === 'gesture') {
        label = choice.english;
      } else {
        const surface = choice.frames && choice.frames.length > 0
          ? encodeSurface(choice.frames)
          : '';
        // §8.2: utterance options should later overlay english as a hover hint
        // until every word's anchor is known. For now we just display whichever
        // surface exists — Telopa if framed, english otherwise.
        label = `"${surface || choice.english}"`;
      }
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
    this.devConsole?.destroy();
    this.devConsole = null;
    this.root.remove();
  }
}
