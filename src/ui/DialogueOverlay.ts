import type { DialogueTree, DialogueNode, LineSegment, PlayerOption, NodeSideEffect } from '../sim/dialogueTypes';
import { npcById } from '../sim/npcRoster';
import { isFlagSet, setFlag } from '../state/dialogueFlags';
import { GameRegistry } from '../state/GameRegistry';
import { encodeFrame } from '../lang/encoder';
import type { FilledFrame } from '../lang/frames';
import { subscribeDiary } from '../sim/diary';
import { renderGlossed } from './glossRender';
import { isDev } from '../engine/dev';
import { DialogueDevConsole } from './DialogueDevConsole';
import { safeFire, logDialogue, engineSceneToConvex } from '../integration';

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

// Marker shown when a speech segment or utterance option is authored without
// frames. We never want to surface raw english as a fallback — the player is
// learning the conlang and seeing english in place of conlang would defeat
// that. Stage directions stay english (they're authorial framing, not spoken
// dialogue), but speech and utterance options must always render the conlang
// surface or this marker.
const UNENCODED_MARKER = '…';

// Walk segments in author order: stage segments render as `(english)` so the
// player sees the framing/context the author wrote; speech segments encode
// their frames into the active conlang surface (or the marker if unframed).
const renderLine = (segments: LineSegment[]): string => {
  const parts: string[] = [];
  for (const s of segments) {
    if (s.kind === 'stage') {
      const t = s.text.trim();
      if (t) parts.push(`(${t})`);
      continue;
    }
    const surface = s.frames && s.frames.length > 0 ? encodeSurface(s.frames) : '';
    parts.push(surface || UNENCODED_MARKER);
  }
  return parts.join(' ');
};

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
  private diaryUnsub: (() => void) | null = null;

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
      font-size: 17px; line-height: 1.6; color: #e8dcc1;
      padding-top: 14px;
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

    // Re-render the active line + buttons whenever the player edits a gloss
    // in the diary, so changes appear inline without closing the dialogue.
    // Side effects + the encounter event do NOT re-fire on rerender — those
    // belong to first node entry only.
    this.diaryUnsub = subscribeDiary(() => this.rerender());
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

    const rendered = renderLine(node.line);

    // Encounter hook for the diary to subscribe to. Diary tokenises the
    // displayed string, so we send the rendered surface, not the segment array.
    window.dispatchEvent(new CustomEvent('fledgling:encounter', {
      detail: { speaker: node.speaker, line: rendered, nodeId: node.id },
    }));

    // Mirror to Convex dialogueLog so the dashboard shows live activity.
    // Fire-and-forget; falls back silently if Convex is offline. Only emits
    // when the current scene maps to a Convex Scene enum value (intro
    // cutscene and unmapped scenes are skipped).
    const convexScene = engineSceneToConvex(GameRegistry.currentScene ?? '');
    if (convexScene) {
      const speakerName = npcById(node.speaker).displayName;
      safeFire(() =>
        logDialogue({
          speakerSlug: node.speaker,
          speakerName,
          line: rendered,
          nodeId: node.id,
          scene: convexScene,
        }),
      );
    }

    this.paint(node, rendered);
  }

  // Re-applies the current node's painted DOM without firing side effects or
  // the encounter event. Called when the diary fires (player edited a gloss)
  // so the inline gloss tags update live during an open conversation.
  private rerender() {
    if (!this.currentNodeId || !this.currentTree) return;
    const node = this.currentTree.nodes[this.currentNodeId];
    if (!node) return;
    this.paint(node, renderLine(node.line));
  }

  private paint(node: DialogueNode, rendered: string) {
    if (this.devConsole && this.currentTree) {
      this.devConsole.update(this.currentTree, node, GameRegistry.language);
    }

    const npc = npcById(node.speaker);
    this.speakerEl.textContent = npc.displayName;

    // renderGlossed walks plain-text tokens and overlays the player's diary
    // guesses as floating italic tags. Stage directions stay as `(...)` text
    // — they tokenise to nothing the diary tracks, so they pass through.
    renderGlossed(rendered, this.lineEl);

    this.choicesEl.innerHTML = '';
    const visible = node.options.filter(o => !o.gatedBy || isFlagSet(o.gatedBy));
    visible.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        text-align: left; padding: 18px 12px 8px; font-size: 14px;
        font-family: inherit; color: #d4c89a; background: rgba(50,40,28,0.65);
        border: 1px solid #5a4828; border-radius: 4px; cursor: pointer;
        transition: background 0.08s, border-color 0.08s;
        line-height: 1.4;
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

      // Prefix (number + opening quote for utterances) is plain; the surface
      // text gets the gloss render so player guesses overlay any words.
      const prefix = document.createElement('span');
      if (choice.kind === 'gesture') {
        prefix.textContent = `${i + 1}. `;
        btn.appendChild(prefix);
        const labelSpan = document.createElement('span');
        labelSpan.textContent = choice.english;
        btn.appendChild(labelSpan);
      } else {
        const surface = choice.frames && choice.frames.length > 0
          ? encodeSurface(choice.frames)
          : '';
        // Player utterances must surface as conlang. Falling back to the
        // authored english would teach the player nothing — show the
        // unencoded marker instead so the gap is visible but not pretending
        // to be the conlang surface.
        const labelText = surface || UNENCODED_MARKER;
        prefix.textContent = `${i + 1}. "`;
        btn.appendChild(prefix);
        const labelSpan = document.createElement('span');
        renderGlossed(labelText, labelSpan);
        btn.appendChild(labelSpan);
        btn.appendChild(document.createTextNode('"'));
      }

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
    this.diaryUnsub?.();
    this.diaryUnsub = null;
    this.devConsole?.destroy();
    this.devConsole = null;
    this.root.remove();
  }
}
