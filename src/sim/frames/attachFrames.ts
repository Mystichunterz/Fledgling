// Splices FilledFrame[] records into a DialogueTree at module load.
//
// Authoring keeps the line strings and option text in dialogueTrees.ts;
// frame translations live in sibling per-NPC files. This indirection lets
// us migrate trees one NPC at a time without touching the prose source —
// and keeps the encoder-facing data in one place per NPC.

import type { DialogueTree } from '../dialogueTypes';
import type { FilledFrame } from '../../lang/frames';

// A node's `line` may contain multiple speech segments interleaved with stage
// cues (e.g. "(beams) 'Hi.' (twirls) 'Go.'"). The flat shape FilledFrame[]
// applies to the first speech segment only — kept for single-speech-segment
// nodes so they don't need to churn. The nested shape FilledFrame[][]
// addresses each speech segment by index in declaration order, padding with
// `[]` for segments that should remain english-only.
export type LineFrameAttachment = FilledFrame[] | FilledFrame[][];

function isPerSegment(a: LineFrameAttachment): a is FilledFrame[][] {
  // An empty outer array is treated as "no frames" by either shape.
  return a.length > 0 && Array.isArray(a[0]);
}

export interface FrameAttachments {
  // Frames per node. See LineFrameAttachment above for the two shapes.
  lines: Record<string, LineFrameAttachment>;
  // Per-option frames. options[nodeId][i] applies to the i-th option in
  // declaration order. Length must match the node's options array (gestures
  // and unframable utterances use []).
  options: Record<string, FilledFrame[][]>;
}

export function attachFrames(tree: DialogueTree, attachments: FrameAttachments): DialogueTree {
  for (const [nodeId, raw] of Object.entries(attachments.lines)) {
    const node = tree.nodes[nodeId];
    if (!node) {
      // eslint-disable-next-line no-console
      console.warn(`[attachFrames] unknown node ${nodeId} for ${tree.npcId} line frames`);
      continue;
    }
    if (raw.length === 0) continue;
    const speechSegs = node.line.filter(s => s.kind === 'speech');
    if (speechSegs.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(`[attachFrames] node ${nodeId} has no speech segment to attach frames to`);
      continue;
    }

    const perSeg: FilledFrame[][] = isPerSegment(raw)
      ? raw
      : [raw as FilledFrame[]];

    if (perSeg.length > speechSegs.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `[attachFrames] frame-segment count mismatch for ${nodeId}: ` +
        `node has ${speechSegs.length} speech segments, got ${perSeg.length} frame arrays`,
      );
      continue;
    }

    perSeg.forEach((frames, i) => {
      const target = speechSegs[i];
      if (target && target.kind === 'speech' && frames.length > 0) target.frames = frames;
    });
  }

  for (const [nodeId, optFrames] of Object.entries(attachments.options)) {
    const node = tree.nodes[nodeId];
    if (!node) {
      // eslint-disable-next-line no-console
      console.warn(`[attachFrames] unknown node ${nodeId} for ${tree.npcId} option frames`);
      continue;
    }
    if (optFrames.length !== node.options.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `[attachFrames] option-frame count mismatch for ${nodeId}: ` +
        `expected ${node.options.length}, got ${optFrames.length}`,
      );
      continue;
    }
    optFrames.forEach((frames, i) => {
      if (frames.length > 0) node.options[i]!.frames = frames;
    });
  }

  return tree;
}
