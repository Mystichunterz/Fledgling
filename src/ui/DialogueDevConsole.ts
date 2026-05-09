import type { DialogueTree, DialogueNode, LineSegment, PlayerOption } from '../sim/dialogueTypes';
import type { FilledFrame } from '../lang/frames';
import type { LanguageSpec } from '../lang/language-spec';
import { formatFrameText } from '../lang/frame-text';
import { encodeFrame } from '../lang/encoder';
import { glossFrame } from '../lang/gloss';

const TOGGLE_KEY = 'fledgling:devConsole:open';

const safe = <T>(label: string, fn: () => T): { ok: true; value: T } | { ok: false; err: string } => {
  try { return { ok: true, value: fn() }; }
  catch (err) { return { ok: false, err: `${label}: ${(err as Error).message}` }; }
};

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderFrame = (spec: LanguageSpec, frame: FilledFrame): string => {
  const dsl = formatFrameText(frame);
  const enc = safe('encode', () => encodeFrame(spec, frame));
  const gloss = safe('gloss', () => glossFrame(spec, frame));

  const surfaceLine = enc.ok ? enc.value : `<span class="dc-err">${escapeHtml(enc.err)}</span>`;
  let glossLine = '';
  if (gloss.ok) {
    glossLine = gloss.value.words
      .map(w => {
        const tagPart = w.tags.length ? `-${w.tags.join('-')}` : '';
        return `<span class="dc-word"><span class="dc-surface">${escapeHtml(w.surface)}</span><span class="dc-gloss-line">${escapeHtml(w.label + tagPart)}</span></span>`;
      })
      .join(' ');
  } else {
    glossLine = `<span class="dc-err">${escapeHtml(gloss.err)}</span>`;
  }

  return `
    <div class="dc-frame">
      <div class="dc-dsl">${escapeHtml(dsl)}</div>
      <div class="dc-surface-line">→ ${escapeHtml(surfaceLine)}</div>
      <div class="dc-gloss">${glossLine}</div>
    </div>
  `;
};

const renderSegments = (spec: LanguageSpec, segments: LineSegment[]): string =>
  segments.map((seg, i) => {
    if (seg.kind !== 'speech') {
      return `<div class="dc-segment dc-stage">[${escapeHtml(seg.kind)}] ${escapeHtml(JSON.stringify(seg))}</div>`;
    }
    const frames = seg.frames ?? [];
    const framesHtml = frames.length === 0
      ? `<div class="dc-empty">(no frames — english fallback)</div>`
      : frames.map(f => renderFrame(spec, f)).join('');
    return `
      <div class="dc-segment">
        <div class="dc-seg-label">segment ${i} — speech</div>
        <div class="dc-english">EN: ${escapeHtml(seg.english)}</div>
        ${framesHtml}
      </div>
    `;
  }).join('');

const renderOptions = (spec: LanguageSpec, options: PlayerOption[]): string =>
  options.map((opt, i) => {
    const tag = opt.kind === 'gesture'
      ? `<span class="dc-tag dc-gesture">gesture</span>`
      : `<span class="dc-tag dc-utterance">utterance</span>`;
    const frames = opt.frames ?? [];
    const framesHtml = opt.kind === 'gesture'
      ? `<div class="dc-empty">(gesture — no frames)</div>`
      : frames.length === 0
        ? `<div class="dc-empty">(no frames)</div>`
        : frames.map(f => renderFrame(spec, f)).join('');
    const gated = opt.gatedBy ? ` <span class="dc-gated">gatedBy=${escapeHtml(String(opt.gatedBy))}</span>` : '';
    return `
      <div class="dc-option">
        <div class="dc-opt-head">[${i + 1}] ${tag} → ${escapeHtml(String(opt.next))} · react=${escapeHtml(opt.react)}${gated}</div>
        <div class="dc-english">EN: ${escapeHtml(opt.english)}</div>
        ${framesHtml}
      </div>
    `;
  }).join('');

const renderEffects = (node: DialogueNode): string => {
  const fx = node.sideEffects ?? [];
  if (fx.length === 0 && !node.trigger) return '';
  const fxLines = fx.map(e => `<div class="dc-fx">• ${escapeHtml(JSON.stringify(e))}</div>`).join('');
  const trig = node.trigger ? `<div class="dc-fx dc-trig">trigger: ${escapeHtml(JSON.stringify(node.trigger))}</div>` : '';
  return `<div class="dc-effects">${trig}${fxLines}</div>`;
};

// The authored English source — what the writer wrote, before any frame
// encoding. Speech segments render as plain text; stage segments render dim
// and italicised so they read as directorial cues.
const renderOriginal = (node: DialogueNode): string => {
  const lineParts = node.line.map(seg =>
    seg.kind === 'speech'
      ? `<span class="dc-orig-speech">${escapeHtml(seg.english)}</span>`
      : `<span class="dc-orig-stage">[${escapeHtml(seg.text)}]</span>`,
  ).join(' ');
  const optParts = node.options.map((opt, i) => {
    const tag = opt.kind === 'gesture' ? '*' : '"';
    const close = opt.kind === 'gesture' ? '*' : '"';
    return `<div class="dc-orig-opt">[${i + 1}] ${tag}${escapeHtml(opt.english)}${close}</div>`;
  }).join('');
  return `
    <div class="dc-original">
      <div class="dc-orig-line">${lineParts || '<span class="dc-empty">(empty line)</span>'}</div>
      ${optParts ? `<div class="dc-orig-opts">${optParts}</div>` : ''}
    </div>
  `;
};

export class DialogueDevConsole {
  private root: HTMLDivElement;
  private body: HTMLDivElement;
  private isOpen: boolean;
  private dialogueOpen = false;
  private lastTree: DialogueTree | null = null;
  private lastNodeId: string | null = null;
  private lastSpec: LanguageSpec | null = null;
  private keyHandler: (ev: KeyboardEvent) => void;

  constructor() {
    this.isOpen = localStorage.getItem(TOGGLE_KEY) === '1';

    const style = document.createElement('style');
    style.textContent = `
      .dc-root {
        position: fixed; top: 12px; right: 12px;
        width: 32vw; min-width: 380px; max-width: 560px;
        max-height: calc(100vh - 24px);
        background: rgba(14,14,18,0.94);
        border: 1px solid #3a4a5a; border-radius: 6px;
        color: #cfe0d4; font: 12px/1.45 ui-monospace, "SF Mono", monospace;
        z-index: 1100; display: none; flex-direction: column;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      }
      .dc-root.open { display: flex; }
      .dc-header {
        padding: 8px 12px; background: #1c242e;
        border-bottom: 1px solid #3a4a5a; border-radius: 6px 6px 0 0;
        display: flex; justify-content: space-between; align-items: center;
        font-weight: 700; color: #8fd3a8; letter-spacing: 0.04em;
      }
      .dc-hint { font-weight: 400; color: #6a7888; font-size: 11px; }
      .dc-body { padding: 10px 12px; overflow-y: auto; }
      .dc-section-title { color: #f2c97a; margin: 10px 0 4px; font-weight: 700; }
      .dc-section-title:first-child { margin-top: 0; }
      .dc-meta { color: #889; font-size: 11px; margin-bottom: 8px; }
      .dc-segment, .dc-option {
        background: rgba(40,46,54,0.55); border-left: 2px solid #4a6480;
        padding: 6px 8px; margin-bottom: 6px; border-radius: 0 3px 3px 0;
      }
      .dc-stage { border-left-color: #886a4a; color: #b89878; }
      .dc-seg-label, .dc-opt-head { color: #6fa2c8; font-size: 11px; margin-bottom: 4px; }
      .dc-english { color: #c4d8c8; margin-bottom: 4px; }
      .dc-frame {
        margin: 4px 0; padding: 4px 6px;
        background: rgba(20,28,36,0.6); border-radius: 3px;
      }
      .dc-dsl { color: #f2c97a; font-weight: 600; }
      .dc-surface-line { color: #d4e8d8; margin: 2px 0; }
      .dc-gloss { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
      .dc-word { display: inline-flex; flex-direction: column; align-items: flex-start; }
      .dc-surface { color: #e0e0e6; }
      .dc-gloss-line { color: #7a9a82; font-size: 10px; }
      .dc-tag {
        display: inline-block; padding: 0 6px; border-radius: 2px;
        font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
      }
      .dc-utterance { background: #2a4458; color: #8fc8e8; }
      .dc-gesture { background: #4a3a28; color: #d4b078; }
      .dc-gated { color: #c87878; font-size: 10px; }
      .dc-empty { color: #5a6878; font-style: italic; font-size: 11px; }
      .dc-effects { margin: 6px 0; padding: 6px 8px; background: rgba(28,36,28,0.5); border-radius: 3px; }
      .dc-fx { color: #8fc8a8; font-size: 11px; }
      .dc-trig { color: #c8a878; }
      .dc-err { color: #e88; font-style: italic; }
      .dc-original {
        background: rgba(36,30,20,0.55); border-left: 2px solid #8a6f3a;
        padding: 8px 10px; margin-bottom: 8px; border-radius: 0 3px 3px 0;
      }
      .dc-orig-line { color: #e8dcc1; font-size: 13px; line-height: 1.5; }
      .dc-orig-speech { color: #e8dcc1; }
      .dc-orig-stage { color: #b89878; font-style: italic; }
      .dc-orig-opts { margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(138,111,58,0.35); }
      .dc-orig-opt { color: #d4c89a; font-size: 12px; line-height: 1.4; }
    `;
    document.head.appendChild(style);

    this.root = document.createElement('div');
    this.root.className = 'dc-root';
    if (this.isOpen) this.root.classList.add('open');

    const header = document.createElement('div');
    header.className = 'dc-header';
    header.innerHTML = `<span>Dialogue Dev Console</span><span class="dc-hint">backtick (\`) to toggle</span>`;

    this.body = document.createElement('div');
    this.body.className = 'dc-body';

    this.root.append(header, this.body);
    document.body.appendChild(this.root);

    this.keyHandler = (ev: KeyboardEvent) => {
      if (ev.key === '`' || ev.key === '~') {
        const target = ev.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
        ev.stopPropagation();
        ev.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener('keydown', this.keyHandler, true);
  }

  toggle() {
    this.isOpen = !this.isOpen;
    localStorage.setItem(TOGGLE_KEY, this.isOpen ? '1' : '0');
    this.applyVisibility();
  }

  private applyVisibility() {
    const visible = this.isOpen && this.dialogueOpen;
    this.root.classList.toggle('open', visible);
  }

  notifyDialogueOpened() {
    this.dialogueOpen = true;
    this.applyVisibility();
  }

  notifyDialogueClosed() {
    this.dialogueOpen = false;
    this.lastTree = null;
    this.lastNodeId = null;
    this.applyVisibility();
    this.body.innerHTML = '';
  }

  update(tree: DialogueTree, node: DialogueNode, spec: LanguageSpec) {
    this.lastTree = tree;
    this.lastNodeId = node.id;
    this.lastSpec = spec;
    this.render();
  }

  private render() {
    if (!this.lastTree || !this.lastNodeId || !this.lastSpec) return;
    const node = this.lastTree.nodes[this.lastNodeId];
    if (!node) return;
    const spec = this.lastSpec;

    const html = `
      <div class="dc-meta">
        tree=<b>${escapeHtml(this.lastTree.npcId)}</b> ·
        node=<b>${escapeHtml(node.id)}</b> ·
        speaker=<b>${escapeHtml(node.speaker)}</b> ·
        lang=<b>${escapeHtml(spec.id ?? '?')}</b>
      </div>
      ${renderEffects(node)}
      <div class="dc-section-title">Original</div>
      ${renderOriginal(node)}
      <div class="dc-section-title">Line</div>
      ${renderSegments(spec, node.line)}
      <div class="dc-section-title">Options</div>
      ${node.options.length === 0 ? '<div class="dc-empty">(no options)</div>' : renderOptions(spec, node.options)}
    `;
    this.body.innerHTML = html;
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler, true);
    this.root.remove();
  }
}
